// OqusVPN — TunnelManager
// ---------------------------------------------------------------------------
// Full-device VPN on Windows via shadowsocks-rust `sslocal --protocol tun`
// (the current, maintained path — outline-go-tun2socks was archived in 2024).
//
//   • MOCK  (default)  — simulates the handshake so the UI runs with no
//                        binary/driver/admin. Great for dev on any machine.
//   • REAL  (OQUS_REAL=1) — creates a Wintun adapter, runs Shadowsocks in TUN
//                        mode, and routes ALL device traffic through it.
//
// REAL mode needs (all handled by the repo except the last one):
//   1. resources/bin/sslocal.exe   (shadowsocks-rust — prebuilt, no build)
//   2. resources/bin/wintun.dll    (WireGuard's userspace TUN driver)
//   3. The app running elevated (Administrator) to create the adapter + routes.
//
// Proven working: sslocal against the Azure server changes the exit IP.
// See VPN-SETUP.md.
const { EventEmitter } = require("node:events")
const { spawn, execFile } = require("node:child_process")
const dns = require("node:dns").promises
const path = require("node:path")
const fs = require("node:fs")

const REAL = process.env.OQUS_REAL === "1"

// --- virtual adapter layout ------------------------------------------------
const TUN_NAME = "OqusVPN"
const TUN_ADDR = "10.255.0.2"
const TUN_CIDR = "10.255.0.2/24"
const TUN_DNS = "9.9.9.9" // Quad9; resolves through the tunnel

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
    /* ignore (teardown / best-effort) */
  }
}

class TunnelManager extends EventEmitter {
  constructor() {
    super()
    /** @type {"disconnected"|"connecting"|"connected"} */
    this.status = "disconnected"
    this.detail = ""
    this.proc = null // sslocal child
    this.serverIp = null
    this.gateway = null // physical default gateway (server bypass)
    this.lastLog = ""
    this._mockTimer = null
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
    this._set("connecting", REAL ? "Starting tunnel…" : "Securing tunnel…")
    if (!REAL) return this._connectMock(config)
    try {
      await this._connectReal(config)
    } catch (err) {
      await this._teardownReal()
      this._set("disconnected", `Failed: ${(err && err.message) || err}`)
      throw err
    }
  }

  async disconnect() {
    if (this._mockTimer) {
      clearTimeout(this._mockTimer)
      this._mockTimer = null
    }
    if (REAL) await this._teardownReal()
    this._set("disconnected")
  }

  // --- MOCK ----------------------------------------------------------------
  _connectMock(config) {
    const target = config && config.host ? `${config.host}:${config.port}` : "unknown"
    this._mockTimer = setTimeout(() => {
      this._mockTimer = null
      this._set("connected", `Mock tunnel → ${target}`)
    }, 1600)
  }

  // --- REAL (Windows full-device via sslocal + Wintun) ---------------------
  async _connectReal(config) {
    if (process.platform !== "win32") throw new Error("Real mode is Windows-only for now")
    const { host, port, password, method } = config || {}
    if (!host || !port || !password || !method) throw new Error("Incomplete server config")

    const sslocal = path.join(binDir(), "sslocal.exe")
    const wintun = path.join(binDir(), "wintun.dll")
    if (!fs.existsSync(sslocal)) throw new Error(`sslocal.exe not found in ${binDir()}`)
    if (!fs.existsSync(wintun)) throw new Error(`wintun.dll not found in ${binDir()}`)

    this.serverIp = await this._resolve(host)
    const egress = await this._defaultEgress()
    if (!egress) throw new Error("Could not determine the default network interface")
    this.gateway = egress.gateway

    // 1) Launch Shadowsocks in TUN mode. wintun.dll (in cwd) creates the adapter.
    //    --outbound-bind-interface pins the SS connection to the physical NIC so
    //    it doesn't loop back into the tunnel.
    this.proc = spawn(
      sslocal,
      [
        "-s", `${this.serverIp}:${port}`,
        "-m", method,
        "-k", password,
        "--protocol", "tun",
        "--tun-interface-name", TUN_NAME,
        "--tun-interface-address", TUN_CIDR,
        "--outbound-bind-interface", egress.alias,
      ],
      { cwd: binDir(), windowsHide: true },
    )
    this.proc.stderr.on("data", (d) => {
      this.lastLog = String(d).trim().split(/\r?\n/).slice(-3).join(" | ")
      this.emit("log", String(d))
    })
    this.proc.on("exit", (code) => {
      if (this.status !== "disconnected") {
        this._teardownReal().finally(() =>
          this._set("disconnected", `sslocal exited (${code})${this.lastLog ? ": " + this.lastLog : ""}`),
        )
      }
    })

    // 2) Wait for the Wintun adapter to appear (fails fast if not elevated).
    const ifIndex = await this._waitForAdapter(TUN_NAME, 12000)
    if (!ifIndex) throw new Error("Tunnel adapter didn't come up — is the app running as Administrator?")

    // 3) Keep the Shadowsocks packets to the server off the tunnel (belt-and-braces).
    await runQuiet("route", ["add", this.serverIp, "mask", "255.255.255.255", this.gateway, "metric", "5"])

    // 4) Split-default: send all traffic into the tunnel without deleting the
    //    real default route, so teardown is clean.
    await run("route", ["add", "0.0.0.0", "mask", "128.0.0.0", TUN_ADDR, "if", String(ifIndex), "metric", "1"])
    await run("route", ["add", "128.0.0.0", "mask", "128.0.0.0", TUN_ADDR, "if", String(ifIndex), "metric", "1"])

    // 5) DNS through the tunnel.
    await runQuiet("netsh", ["interface", "ip", "set", "dnsservers", `name=${TUN_NAME}`, "static", TUN_DNS, "primary"])

    this._set("connected", `All traffic via ${config.city || host}`)
  }

  async _teardownReal() {
    await runQuiet("route", ["delete", "0.0.0.0", "mask", "128.0.0.0", TUN_ADDR])
    await runQuiet("route", ["delete", "128.0.0.0", "mask", "128.0.0.0", TUN_ADDR])
    if (this.serverIp) await runQuiet("route", ["delete", this.serverIp])
    if (this.proc && !this.proc.killed) {
      try {
        this.proc.kill() // sslocal removes its Wintun adapter on exit
      } catch {
        /* ignore */
      }
    }
    this.proc = null
    this.serverIp = null
    this.gateway = null
  }

  async _resolve(host) {
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
    const { address } = await dns.lookup(host, { family: 4 })
    return address
  }

  /** Physical default route's interface alias + next hop (for bind + bypass). */
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

  /** Poll for the Wintun adapter; returns its ifIndex once up. */
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
