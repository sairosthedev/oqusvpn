// Throwaway Shadowsocks test server for OqusVPN.
// Runs shadowsocks-rust's `ssserver` (AEAD, compatible with tun2socks) using the
// same credentials the app defaults to, and prints the ss:// access key.
//
//   npm run ss:server            # listens on 0.0.0.0:8388, prints the key
//   npm run ss:server -- 1.2.3.4 # print the key for a remote host IP
//
// If `ssserver` isn't installed, this prints how to get it (or a Docker line).
import { spawn, execFileSync } from "node:child_process"
import { Buffer } from "node:buffer"

const METHOD = "chacha20-ietf-poly1305"
const PASSWORD = "oqus-test-pw"
const PORT = 8388
const BIND = "0.0.0.0"
// Host to advertise in the access key (what the CLIENT dials). Default localhost
// for a plumbing test; pass a LAN/public IP as arg 1 for a real full-device test.
const ADVERTISE = process.argv[2] || "127.0.0.1"

const accessKey = `ss://${Buffer.from(`${METHOD}:${PASSWORD}`).toString("base64")}@${ADVERTISE}:${PORT}`

function have(bin) {
  try {
    execFileSync(process.platform === "win32" ? "where" : "which", [bin], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

function banner() {
  console.log("\n─────────────────────────────────────────────")
  console.log(" OqusVPN throwaway Shadowsocks server")
  console.log("─────────────────────────────────────────────")
  console.log(` cipher   : ${METHOD}`)
  console.log(` password : ${PASSWORD}`)
  console.log(` listen   : ${BIND}:${PORT}`)
  console.log(` client host: ${ADVERTISE}`)
  console.log("\n Access key (set as VITE_OQUS_ACCESS_KEY in .env.local):")
  console.log("   " + accessKey)
  console.log("─────────────────────────────────────────────\n")
}

banner()

if (have("ssserver")) {
  console.log("Starting ssserver (shadowsocks-rust)…  Ctrl+C to stop.\n")
  const p = spawn(
    "ssserver",
    ["-s", `${BIND}:${PORT}`, "-k", PASSWORD, "-m", METHOD],
    { stdio: "inherit" },
  )
  p.on("exit", (c) => process.exit(c ?? 0))
} else {
  console.log("`ssserver` not found on PATH. Get a Shadowsocks server one of these ways:\n")
  console.log("  • shadowsocks-rust (recommended, single binary):")
  console.log("      https://github.com/shadowsocks/shadowsocks-rust/releases")
  console.log("      (unzip, put ssserver[.exe] on PATH, then re-run `npm run ss:server`)\n")
  console.log("  • Rust toolchain:  cargo install shadowsocks-rust\n")
  console.log("  • Docker (remote box):")
  console.log(
    `      docker run -d -p ${PORT}:${PORT} -p ${PORT}:${PORT}/udp ghcr.io/shadowsocks/ssserver-rust \\`,
  )
  console.log(`        ssserver -s 0.0.0.0:${PORT} -k ${PASSWORD} -m ${METHOD}\n`)
  console.log("  • Or run a full Outline server and paste its ss:// key into .env.local.\n")
  process.exit(1)
}
