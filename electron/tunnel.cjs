// OqusVPN — TunnelManager
// ---------------------------------------------------------------------------
// Owns the real, full-device VPN tunnel on Windows. Two modes:
//
//   • MOCK  (default)  — simulates the connect handshake so the UI runs with
//                        no driver/binary/admin. Great for dev on any machine.
//   • REAL  (OQUS_REAL=1) — the genuine article: a TUN/TAP device + tun2socks
//                        (Shadowsocks) + split-default routing so ALL traffic
//                        on the machine goes through the tunnel.
//
// REAL mode requires, on the user's machine:
//   1. A TAP adapter installed whose connection name === TAP_NAME below
//      (install tap-windows; rename the adapter to "OqusVPN-TAP").
//   2. resources/bin/tun2socks.exe  (build from Jigsaw-Code/outline-go-tun2socks).
//   3. The app running elevated (Administrator) so it can edit routes/DNS.
//
// See VPN-SETUP.md for exact steps.
const { EventEmitter } = require("node:events")
const { spawn, execFile } = require("node:child_process")
const dns = require("node:dns").promises
const path = require("node:path")
const fs = require("node:fs")

const REAL = process.env.OQUS_REAL === "1"

// --- virtual network layout for the TUN device -----------------------------
const TAP_NAME = "OqusVPN-TAP" // must match the TAP adapter's connection name
const TUN_ADDR = "10.0.85.2"
const TUN_GW = "10.0.85.1"
const TUN_MASK = "255.255.255.0"
const TUN_DNS = "9.9.9.9" // Quad9; change as you like

function binDir() {
  // Packaged: <resources>/bin ; Dev: <repo>/resources/bin
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

// Best-effort: run a command but never throw (used during teardown).
async function runQuiet(cmd, args) {
  try {
    await run(cmd, args)
  } catch {
    /* ignore */
  }
}

class TunnelManager extends EventEmitter {
  constructor() {
    super()
    /** @type {"disconnected"|"connecting"|"connected"} */
    this.status = "disconnected"
    this.detail = ""
    this.proc = null // tun2socks child process
    this.serverIp = null // resolved server IP (for the bypass route)
    this.physicalGateway = null // default gateway before we took over
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
    if (!REAL) return this._connectMock()
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
  _connectMock() {
    this._mockTimer = setTimeout(() => {
      this._mockTimer = null
      this._set("connected", "Mock tunnel (no real traffic routed)")
    }, 1600)
  }

  // --- REAL (Windows full-device) ------------------------------------------
  async _connectReal(config) {
    if (process.platform !== "win32") throw new Error("Real mode is Windows-only for now")
    const { host, port, password, method } = config || {}
    if (!host || !port || !password || !method) throw new Error("Incomplete server config")

    const tun2socks = path.join(binDir(), "tun2socks.exe")
    if (!fs.existsSync(tun2socks)) throw new Error(`tun2socks.exe not found in ${binDir()}`)

    // 1) Resolve the server to an IP and remember the current default gateway
    //    so the encrypted Shadowsocks packets can bypass the tunnel (no loop).
    this.serverIp = await this._resolve(host)
    this.physicalGateway = await this._defaultGateway()
    if (!this.physicalGateway) throw new Error("Could not determine default gateway")

    // 2) Configure the TAP adapter's address + DNS.
    await run("netsh", [
      "interface", "ip", "set", "address",
      `name=${TAP_NAME}`, "static", TUN_ADDR, TUN_MASK, TUN_GW,
    ])
    await run("netsh", ["interface", "ip", "set", "dnsservers", `name=${TAP_NAME}`, "static", TUN_DNS, "primary"])

    // 3) Launch tun2socks: it reads/writes the TAP device and forwards every
    //    packet to the Shadowsocks server. Flags per outline-go-tun2socks.
    this.proc = spawn(
      tun2socks,
      [
        "-tunName", TAP_NAME,
        "-tunAddr", TUN_ADDR,
        "-tunGw", TUN_GW,
        "-tunMask", TUN_MASK,
        "-tunDNS", TUN_DNS,
        "-proxyHost", this.serverIp,
        "-proxyPort", String(port),
        "-proxyPassword", password,
        "-proxyCipher", method,
        "-logLevel", "info",
      ],
      { windowsHide: true },
    )
    this.proc.stderr.on("data", (d) => this.emit("log", String(d)))
    this.proc.on("exit", (code) => {
      // If tun2socks dies while we thought we were up, surface a drop.
      if (this.status !== "disconnected") {
        this._teardownReal().finally(() => this._set("disconnected", `tun2socks exited (${code})`))
      }
    })

    // Give the interface a moment to come up before we redirect routes.
    await new Promise((r) => setTimeout(r, 1200))

    // 4) Bypass route: reach the SS server via the real gateway.
    await run("route", ["add", this.serverIp, "mask", "255.255.255.255", this.physicalGateway, "metric", "5"])

    // 5) Split the default route into two /1 halves pointing at the TAP gateway.
    //    This overrides 0.0.0.0/0 without deleting it — clean to reverse.
    await run("route", ["add", "0.0.0.0", "mask", "128.0.0.0", TUN_GW, "metric", "5"])
    await run("route", ["add", "128.0.0.0", "mask", "128.0.0.0", TUN_GW, "metric", "5"])

    this._set("connected", `All traffic via ${config.city || host}`)
  }

  async _teardownReal() {
    // Remove routes first so traffic falls back to the physical link.
    await runQuiet("route", ["delete", "0.0.0.0", "mask", "128.0.0.0", TUN_GW])
    await runQuiet("route", ["delete", "128.0.0.0", "mask", "128.0.0.0", TUN_GW])
    if (this.serverIp) await runQuiet("route", ["delete", this.serverIp])
    await runQuiet("netsh", ["interface", "ip", "set", "dnsservers", `name=${TAP_NAME}`, "dhcp"])
    if (this.proc && !this.proc.killed) {
      try {
        this.proc.kill()
      } catch {
        /* ignore */
      }
    }
    this.proc = null
    this.serverIp = null
    this.physicalGateway = null
  }

  async _resolve(host) {
    // Already an IP? use as-is.
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
    const { address } = await dns.lookup(host, { family: 4 })
    return address
  }

  async _defaultGateway() {
    // Ask PowerShell for the lowest-metric IPv4 default route's next hop.
    const out = await run("powershell", [
      "-NoProfile", "-Command",
      "(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | " +
        "Sort-Object RouteMetric | Select-Object -First 1).NextHop",
    ])
    const gw = out.trim().split(/\r?\n/)[0].trim()
    return gw && gw !== "0.0.0.0" ? gw : null
  }
}

module.exports = { TunnelManager }
