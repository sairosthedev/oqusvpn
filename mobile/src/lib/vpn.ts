// The native-VPN seam.
//
// The whole app talks to this interface, never to a specific tunnel. Phase 1
// ships a Stub (simulates connecting) so the UI + backend flow work in Expo Go /
// any device today. Phase 2 drops in the real Android VpnService module behind
// the SAME interface — no UI changes needed.
import { NativeModules } from "react-native"

export type VpnStatus = "disconnected" | "connecting" | "connected"

export type ServerConfig = {
  host: string
  port: number
  method: string
  password: string
  city?: string
  serverId?: string
}

export interface NativeVpn {
  connect(cfg: ServerConfig): Promise<void>
  disconnect(): Promise<void>
  onStatus(cb: (s: VpnStatus, detail?: string) => void): () => void
}

/** Parse an ss:// access key (SIP002 or legacy base64) into a ServerConfig. */
export function parseAccessKey(accessKey: string, meta?: { city?: string; serverId?: string }): ServerConfig {
  const raw = accessKey.replace(/^ss:\/\//, "").split("#")[0]
  const atob = (b64: string) => {
    const s = b64.replace(/-/g, "+").replace(/_/g, "/")
    // Buffer exists in RN's runtime; fall back to global if polyfilled.
    return typeof Buffer !== "undefined"
      ? Buffer.from(s, "base64").toString("utf8")
      : globalThis.atob(s)
  }
  let userinfo: string
  let hostport: string
  if (raw.includes("@")) {
    const [u, hp] = raw.split("@")
    // userinfo may itself be base64 (SIP002) or plain "method:password"
    userinfo = u.includes(":") ? u : atob(u)
    hostport = hp
  } else {
    // fully base64-encoded "method:password@host:port"
    const decoded = atob(raw)
    const [u, hp] = decoded.split("@")
    userinfo = u
    hostport = hp
  }
  const [method, password] = userinfo.split(/:(.+)/)
  const [host, portStr] = hostport.split(":")
  return { host, port: Number(portStr), method, password, city: meta?.city, serverId: meta?.serverId }
}

// ---- Stub implementation (Phase 1) ----------------------------------------
class StubVpn implements NativeVpn {
  private listeners = new Set<(s: VpnStatus, d?: string) => void>()
  private emit(s: VpnStatus, d?: string) {
    for (const cb of this.listeners) cb(s, d)
  }
  async connect(cfg: ServerConfig): Promise<void> {
    this.emit("connecting", "Starting tunnel…")
    await new Promise((r) => setTimeout(r, 900))
    this.emit("connected", `All traffic via ${cfg.city || cfg.host} (simulated)`)
  }
  async disconnect(): Promise<void> {
    this.emit("disconnected", "Disconnected")
  }
  onStatus(cb: (s: VpnStatus, d?: string) => void): () => void {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }
}

// Use the real native module when it's present (Phase 2), else the stub.
// The native side will register as NativeModules.OqusVpn.
export const nativeVpn: NativeVpn = (NativeModules as any).OqusVpn
  ? ((NativeModules as any).OqusVpn as NativeVpn)
  : new StubVpn()

export const usingRealTunnel = !!(NativeModules as any).OqusVpn
