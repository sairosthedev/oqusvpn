// OqusVPN — TunnelManager
// ---------------------------------------------------------------------------
// The real full-device VPN on Windows (no mock). PROVEN recipe — the exit IP
// changes device-wide:
//   sslocal (SOCKS5, tcp_and_udp)  +  tun2socks (tun://, Wintun)  +  on-link routing
//   + a fail-closed kill switch.
//
// Requires (all in the repo except the last):
//   resources/bin/sslocal.exe   (shadowsocks-rust — Shadowsocks client)
//   resources/bin/tun2socks.exe (xjasonlyu/tun2socks — TUN <-> SOCKS5)
//   resources/bin/wintun.dll    (WireGuard's userspace TUN driver)
//   + the app running as Administrator (creates the adapter, edits routes).
//
// Connecting without admin fails clearly ("adapter didn't come up"). See VPN-SETUP.md.
const { EventEmitter } = require("node:events")
const { spawn, execFile } = require("node:child_process")
const dns = require("node:dns").promises
const path = require("node:path")
const os = require("node:os")
const fs = require("node:fs")

// Kill switch: on by default; set OQUS_KILLSWITCH=0 to disable (e.g. debugging).
const KILLSWITCH = process.env.OQUS_KILLSWITCH !== "0"

const TUN_NAME = "OqusVPN"
const TUN_ADDR = "10.255.0.2"
const TUN_MASK = "255.255.255.0"
const TUN_DNS = "9.9.9.9"
const SOCKS_PORT = 10808 // local SOCKS5 that sslocal exposes and tun2socks uses
const KS_RULES = ["OqusKS-Tun", "OqusKS-Server", "OqusKS-Loopback", "OqusKS-DHCP"]

function binDir() {
  return process.resourcesPath && fs.existsSync(path.join(process.resourcesPath, "bin"))
    ? path.join(process.resourcesPath, "bin")
    : path.join(__dirname, "..", "resources", "bin")
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} ${args.join(" ")} → ${stderr || err.message}`))
      else resolve(String(stdout))
    })
  })
}

async function runQuiet(cmd, args) {
  try {
    await run(cmd, args)
  } catch {
    /* best-effort (teardown) */
  }
}

class TunnelManager extends EventEmitter {
  constructor() {
    super()
    /** @type {"disconnected"|"connecting"|"connected"} */
    this.status = "disconnected"
    this.detail = ""
    this.ss = null // sslocal process
    this.t2s = null // tun2socks process
    this.tunIdx = null // Wintun adapter interface index
    this.serverIp = null
    this.gateway = null
    this.lastLog = ""
    this.killSwitchOn = false
    this.connectedAt = null
    this.serverId = ""
    this._statsTimer = null
    // Self-heal: if a previous run crashed / was force-closed while connected,
    // the kill switch may have left the firewall blocking all outbound traffic.
    // Clear any stale block on startup so the network is never left broken.
    this.recoverStaleKillSwitch()
  }

  // Restore outbound connectivity and drop leftover OqusKS-* rules. Safe to run
  // anytime (no-op if nothing is stale). Best-effort — needs admin, quiet if not.
  async recoverStaleKillSwitch() {
    if (process.platform !== "win32") return
    await runQuiet("netsh", ["advfirewall", "set", "allprofiles", "firewallpolicy", "blockinbound,allowoutbound"])
    for (const name of KS_RULES) {
      await runQuiet("netsh", ["advfirewall", "firewall", "delete", "rule", `name=${name}`])
    }
  }

  getStatus() {
    return { status: this.status, detail: this.detail }
  }

  _set(status, detail = "") {
    this.status = status
    this.detail = detail
    this.emit("status", { status, detail })
  }

  async connect(config) {
    if (this.status === "connected" || this.status === "connecting") return
    this._set("connecting", "Starting tunnel…")
    try {
      await this._connectReal(config)
    } catch (err) {
      await this._teardownReal()
      this._set("disconnected", `Failed: ${(err && err.message) || err}`)
      throw err
    }
  }

  async disconnect() {
    await this._teardownReal()
    this._set("disconnected")
  }

  // --- Windows full-device tunnel ------------------------------------------
  async _connectReal(config) {
    if (process.platform !== "win32") throw new Error("The VPN tunnel is Windows-only for now")
    const { host, port, password, method } = config || {}
    if (!host || !port || !password || !method) throw new Error("Incomplete server config")

    const sslocal = path.join(binDir(), "sslocal.exe")
    const tun2socks = path.join(binDir(), "tun2socks.exe")
    const wintun = path.join(binDir(), "wintun.dll")
    for (const [f, name] of [[sslocal, "sslocal.exe"], [tun2socks, "tun2socks.exe"], [wintun, "wintun.dll"]]) {
      if (!fs.existsSync(f)) throw new Error(`${name} not found in ${binDir()} (see VPN-SETUP.md)`)
    }

    this.serverIp = await this._resolve(host)
    const egress = await this._defaultEgress()
    if (!egress) throw new Error("Could not determine the default network interface")
    this.gateway = egress.gateway

    // 1) sslocal — Shadowsocks client exposing a local SOCKS5 (TCP + UDP).
    const cfgPath = path.join(os.tmpdir(), "oqus-ss.json")
    fs.writeFileSync(
      cfgPath,
      JSON.stringify({
        local_address: "127.0.0.1",
        local_port: SOCKS_PORT,
        server: this.serverIp,
        server_port: Number(port),
        password,
        method,
        mode: "tcp_and_udp",
      }),
    )
    this.ss = spawn(sslocal, ["-c", cfgPath], { cwd: binDir(), windowsHide: true })
    this.ss.stderr.on("data", (d) => (this.lastLog = String(d).trim().split(/\r?\n/).slice(-1)[0]))
    this.ss.on("exit", (code) => this._onProcExit("sslocal", code))
    await new Promise((r) => setTimeout(r, 1200))

    // 2) tun2socks — reads the Wintun TUN device, forwards to that SOCKS5.
    this.t2s = spawn(
      tun2socks,
      ["-device", `tun://${TUN_NAME}`, "-proxy", `socks5://127.0.0.1:${SOCKS_PORT}`, "-loglevel", "warn"],
      { cwd: binDir(), windowsHide: true },
    )
    this.t2s.stderr.on("data", (d) => (this.lastLog = String(d).trim().split(/\r?\n/).slice(-1)[0]))
    this.t2s.on("exit", (code) => this._onProcExit("tun2socks", code))

    // 3) Wait for the adapter (fails fast if not elevated).
    this.tunIdx = await this._waitForAdapter(TUN_NAME, 12000)
    if (!this.tunIdx) throw new Error("Tunnel adapter didn't come up — is the app running as Administrator?")

    // 4) Address the adapter and keep the Shadowsocks packets off the tunnel.
    await run("netsh", ["interface", "ip", "set", "address", `name=${TUN_NAME}`, "static", TUN_ADDR, TUN_MASK])
    await runQuiet("route", ["add", this.serverIp, "mask", "255.255.255.255", this.gateway, "metric", "5"])

    // 5) On-link split-default routing into the tun (Wintun has no ARP, so no gateway).
    await runQuiet("netsh", ["interface", "ipv4", "set", "interface", String(this.tunIdx), "metric=1"])
    await run("netsh", ["interface", "ipv4", "add", "route", "prefix=0.0.0.0/1", `interface=${this.tunIdx}`, "metric=1", "store=active"])
    await run("netsh", ["interface", "ipv4", "add", "route", "prefix=128.0.0.0/1", `interface=${this.tunIdx}`, "metric=1", "store=active"])

    // 6) DNS through the tunnel.
    await runQuiet("netsh", ["interface", "ip", "set", "dnsservers", `name=${TUN_NAME}`, "static", TUN_DNS, "primary"])

    // 7) Kill switch — block everything that isn't the tunnel, the server, or loopback.
    //    Armed unless the user turned it off (config.killSwitch === false) or OQUS_KILLSWITCH=0.
    this.killSwitchOn = KILLSWITCH && config.killSwitch !== false
    if (this.killSwitchOn) await this._enableKillSwitch()

    this.serverId = config.id || ""
    this.connectedAt = Date.now()
    this._startThroughput()
    this._set("connected", `All traffic via ${config.city || host}`)
  }

  /** Live kill-switch toggle while connected. */
  async setKillSwitch(on) {
    if (this.status !== "connected") return
    if (on && !this.killSwitchOn) {
      await this._enableKillSwitch()
      this.killSwitchOn = true
    } else if (!on && this.killSwitchOn) {
      await this._disableKillSwitch()
      this.killSwitchOn = false
    }
  }

  // Poll the tun adapter's byte counters and emit real throughput (Mb/s).
  _startThroughput() {
    let lastRx = 0
    let lastTx = 0
    let lastT = Date.now()
    let first = true
    this._statsTimer = setInterval(async () => {
      try {
        const out = await run("powershell", [
          "-NoProfile", "-Command",
          `$s = Get-NetAdapterStatistics -Name '${TUN_NAME}' -ErrorAction SilentlyContinue; "$($s.ReceivedBytes)|$($s.SentBytes)"`,
        ])
        const [rxStr, txStr] = out.trim().split("|")
        const rx = Number(rxStr)
        const tx = Number(txStr)
        const now = Date.now()
        const dt = (now - lastT) / 1000
        if (!first && dt > 0 && Number.isFinite(rx) && Number.isFinite(tx)) {
          const down = Math.max(0, ((rx - lastRx) * 8) / 1e6 / dt) // Mb/s (download)
          const up = Math.max(0, ((tx - lastTx) * 8) / 1e6 / dt) // Mb/s (upload)
          this.emit("throughput", { down, up })
        }
        lastRx = rx
        lastTx = tx
        lastT = now
        first = false
      } catch {
        /* ignore a missed sample */
      }
    }, 1500)
  }

  _stopThroughput() {
    if (this._statsTimer) {
      clearInterval(this._statsTimer)
      this._statsTimer = null
    }
  }

  // Fail-closed firewall: default-block outbound, allow only tun-sourced traffic,
  // the Shadowsocks link to the server, loopback, and DHCP. If the tunnel drops,
  // fallback traffic leaves the physical NIC (source != tun IP) and is dropped.
  async _enableKillSwitch() {
    await run("netsh", ["advfirewall", "set", "allprofiles", "firewallpolicy", "blockinbound,blockoutbound"])
    await run("netsh", ["advfirewall", "firewall", "add", "rule", "name=OqusKS-Tun", "dir=out", "action=allow", `localip=${TUN_ADDR}`])
    await run("netsh", ["advfirewall", "firewall", "add", "rule", "name=OqusKS-Server", "dir=out", "action=allow", `remoteip=${this.serverIp}`])
    await run("netsh", ["advfirewall", "firewall", "add", "rule", "name=OqusKS-Loopback", "dir=out", "action=allow", "localip=127.0.0.1", "remoteip=127.0.0.1"])
    await run("netsh", ["advfirewall", "firewall", "add", "rule", "name=OqusKS-DHCP", "dir=out", "action=allow", "protocol=UDP", "localport=68", "remoteport=67"])
  }

  async _disableKillSwitch() {
    // Restore first so connectivity returns even if later teardown steps fail.
    await runQuiet("netsh", ["advfirewall", "set", "allprofiles", "firewallpolicy", "blockinbound,allowoutbound"])
    for (const name of KS_RULES) {
      await runQuiet("netsh", ["advfirewall", "firewall", "delete", "rule", `name=${name}`])
    }
  }

  _onProcExit(name, code) {
    if (this.status !== "disconnected") {
      this._teardownReal().finally(() =>
        this._set("disconnected", `${name} exited (${code})${this.lastLog ? ": " + this.lastLog : ""}`),
      )
    }
  }

  async _teardownReal() {
    this._stopThroughput()
    // Capture the session's usage from the (per-session) Wintun adapter counters
    // before we tear it down. tun2socks creates a fresh adapter each connect, so
    // its totals == this session's totals.
    let session = null
    if (this.connectedAt && this.tunIdx) {
      try {
        const out = await run("powershell", [
          "-NoProfile", "-Command",
          `$s = Get-NetAdapterStatistics -Name '${TUN_NAME}' -ErrorAction SilentlyContinue; "$($s.ReceivedBytes)|$($s.SentBytes)"`,
        ])
        const [rx, tx] = out.trim().split("|").map(Number)
        session = {
          serverId: this.serverId,
          bytesDown: Number.isFinite(rx) ? rx : 0,
          bytesUp: Number.isFinite(tx) ? tx : 0,
          durationSec: Math.round((Date.now() - this.connectedAt) / 1000),
        }
      } catch {
        /* skip usage report */
      }
    }
    this.connectedAt = null
    await this._disableKillSwitch() // restore connectivity first (safe/no-op if not set)
    this.killSwitchOn = false
    if (this.tunIdx) {
      await runQuiet("netsh", ["interface", "ipv4", "delete", "route", "prefix=0.0.0.0/1", `interface=${this.tunIdx}`])
      await runQuiet("netsh", ["interface", "ipv4", "delete", "route", "prefix=128.0.0.0/1", `interface=${this.tunIdx}`])
    }
    if (this.serverIp) await runQuiet("route", ["delete", this.serverIp])
    for (const p of [this.t2s, this.ss]) {
      if (p && !p.killed) {
        try {
          p.kill() // tun2socks removes its Wintun adapter on exit
        } catch {
          /* ignore */
        }
      }
    }
    this.t2s = null
    this.ss = null
    this.tunIdx = null
    this.serverIp = null
    this.gateway = null
    if (session) this.emit("session", session)
  }

  async _resolve(host) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
    const { address } = await dns.lookup(host, { family: 4 })
    return address
  }

  async _defaultEgress() {
    const out = await run("powershell", [
      "-NoProfile", "-Command",
      "$r = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | " +
        "Where-Object { $_.InterfaceAlias -ne '" + TUN_NAME + "' } | Sort-Object RouteMetric | Select-Object -First 1; " +
        '"$($r.InterfaceAlias)|$($r.NextHop)"',
    ])
    const [alias, gateway] = out.trim().split("|")
    return alias && gateway && gateway !== "0.0.0.0" ? { alias, gateway } : null
  }

  async _waitForAdapter(name, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      try {
        const out = await run("powershell", [
          "-NoProfile", "-Command",
          `(Get-NetAdapter -Name '${name}' -ErrorAction SilentlyContinue).ifIndex`,
        ])
        const idx = parseInt(out.trim(), 10)
        if (idx > 0) return idx
      } catch {
        /* not up yet */
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    return null
  }
}

module.exports = { TunnelManager }
