// The native-VPN seam.
//
// The whole app talks to this interface, never to a specific tunnel. Phase 1
// ships a Stub (simulates connecting) so the UI + backend flow work in Expo Go /
// any device today. Phase 2 drops in the real Android VpnService module behind
// the SAME interface — no UI changes needed.
import { NativeEventEmitter, NativeModules } from "react-native"

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

// ---- Native bridge adapter (Phase 2) --------------------------------------
// Wraps the Android OqusVpn module (android/.../OqusVpnModule.kt) in the same
// NativeVpn interface the app already uses. The module's connect()/disconnect()
// return Promises; status arrives as "OqusVpnStatus" DeviceEventEmitter events.
class NativeBridgeVpn implements NativeVpn {
  private mod: any
  private emitter: NativeEventEmitter
  constructor(mod: any) {
    this.mod = mod
    this.emitter = new NativeEventEmitter(mod)
  }
  connect(cfg: ServerConfig): Promise<void> {
    return this.mod.connect(cfg)
  }
  disconnect(): Promise<void> {
    return this.mod.disconnect()
  }
  onStatus(cb: (s: VpnStatus, detail?: string) => void): () => void {
    const sub = this.emitter.addListener(
      "OqusVpnStatus",
      (e: { status: VpnStatus; detail?: string }) => cb(e.status, e.detail),
    )
    return () => sub.remove()
  }
}

// Use the real native module when it's present (Phase 2), else the stub.
// The native side registers as NativeModules.OqusVpn.
const nativeMod = (NativeModules as any).OqusVpn
export const nativeVpn: NativeVpn = nativeMod ? new NativeBridgeVpn(nativeMod) : new StubVpn()

export const usingRealTunnel = !!nativeMod
