// Typed access to the Electron tunnel bridge (window.oqus, injected by preload).
// In a plain browser (vite dev / web build) window.oqus is undefined and callers
// fall back to the in-app mock, so the web experience is unchanged.

export type TunnelStatus = "disconnected" | "connecting" | "connected"

export type TunnelConfig = {
  host: string
  port: number
  password: string
  method: string
  id?: string
  city?: string
  killSwitch?: boolean
}

export type Throughput = { down: number; up: number }

export type OqusBridge = {
  connect: (config: TunnelConfig) => Promise<{ ok: boolean; error?: string }>
  disconnect: () => Promise<{ ok: boolean; error?: string }>
  getStatus: () => Promise<{ status: TunnelStatus; detail?: string }>
  onStatus: (cb: (p: { status: TunnelStatus; detail?: string }) => void) => () => void
  onThroughput: (cb: (p: Throughput) => void) => () => void
  setKillSwitch: (on: boolean) => Promise<{ ok: boolean; error?: string }>
  getAutoLaunch: () => Promise<boolean>
  setAutoLaunch: (on: boolean) => Promise<boolean>
}

declare global {
  interface Window {
    oqus?: OqusBridge
  }
}

/** True when running inside Electron with the tunnel bridge available. */
export function hasBridge(): boolean {
  return typeof window !== "undefined" && !!window.oqus
}

export function bridge(): OqusBridge | null {
  return typeof window !== "undefined" ? window.oqus ?? null : null
}

// --- Shadowsocks access-key (ss://) parsing --------------------------------
// Supports SIP002 (ss://base64(method:pass)@host:port#tag) and the legacy
// fully-base64 form (ss://base64(method:pass@host:port)#tag).
function b64decode(s: string): string {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/")
  const pad = norm + "=".repeat((4 - (norm.length % 4)) % 4)
  return atob(pad)
}

export function parseAccessKey(key: string): TunnelConfig {
  let s = key.trim().replace(/^ss:\/\//i, "")
  const hash = s.indexOf("#")
  if (hash >= 0) s = s.slice(0, hash)
  const q = s.indexOf("?")
  if (q >= 0) s = s.slice(0, q)

  let method = "", password = "", host = "", port = 0
  if (s.includes("@")) {
    const at = s.lastIndexOf("@")
    let userinfo = s.slice(0, at)
    const hostport = s.slice(at + 1)
    try {
      if (!userinfo.includes(":")) userinfo = b64decode(userinfo)
    } catch {
      /* leave as-is */
    }
    const i = userinfo.indexOf(":")
    method = userinfo.slice(0, i)
    password = userinfo.slice(i + 1)
    const c = hostport.lastIndexOf(":")
    host = hostport.slice(0, c)
    port = Number(hostport.slice(c + 1))
  } else {
    const decoded = b64decode(s)
    const at = decoded.lastIndexOf("@")
    const cred = decoded.slice(0, at)
    const hostport = decoded.slice(at + 1)
    const i = cred.indexOf(":")
    method = cred.slice(0, i)
    password = cred.slice(i + 1)
    const c = hostport.lastIndexOf(":")
    host = hostport.slice(0, c)
    port = Number(hostport.slice(c + 1))
  }
  return { host, port, password, method }
}
