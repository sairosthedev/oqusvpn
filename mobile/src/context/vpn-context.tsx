import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { Alert } from "react-native"
import { api, ApiError, type PublicServer } from "../lib/api"
import { nativeVpn, parseAccessKey, type VpnStatus } from "../lib/vpn"
import { DEMO_TOKEN, LOCAL_SERVERS } from "../lib/demo"
import { pingFor, loadFor } from "../lib/theme"

export type UiServer = PublicServer & { ping: number; load: number }

type Ctx = {
  servers: UiServer[]
  server: UiServer | null
  status: VpnStatus
  elapsed: number
  throughput: { down: number; up: number }
  switching: boolean
  killSwitch: boolean
  serverIp: string | null
  setKillSwitch: (v: boolean) => void
  toggleConnection: () => void
  selectServer: (id: string) => void
  onNeedsVerify: () => void
}
const VpnCtx = createContext<Ctx | null>(null)

const hydrate = (s: PublicServer): UiServer => ({ ...s, ping: pingFor(s.id), load: loadFor(s.id) })

export function VpnProvider({ token, demo, onNeedsVerify, children }: { token: string; demo: boolean; onNeedsVerify: () => void; children: ReactNode }) {
  const [servers, setServers] = useState<UiServer[]>([])
  const [serverId, setServerId] = useState<string | null>(null)
  const [status, setStatus] = useState<VpnStatus>("disconnected")
  const [elapsed, setElapsed] = useState(0)
  const [throughput, setThroughput] = useState({ down: 0, up: 0 })
  const [switching, setSwitching] = useState(false)
  const [killSwitch, setKillSwitch] = useState(true)
  const [serverIp, setServerIp] = useState<string | null>(null)
  const connectedAt = useRef<number | null>(null)
  const wantConnect = useRef(false)

  const server = servers.find((s) => s.id === serverId) ?? servers[0] ?? null

  // Server list — local in demo, live (admin-managed) otherwise.
  useEffect(() => {
    const pick = (list: PublicServer[]) => {
      const hy = list.map(hydrate)
      setServers(hy)
      setServerId((cur) => cur ?? hy.find((s) => s.fastest)?.id ?? hy[0]?.id ?? null)
    }
    if (demo) { pick(LOCAL_SERVERS); return }
    const load = () => api.listServers().then(({ servers }) => pick(servers)).catch(() => {})
    load()
    const iv = setInterval(load, 30_000)
    return () => clearInterval(iv)
  }, [demo])

  // Tunnel status subscription.
  useEffect(() => {
    return nativeVpn.onStatus((s) => {
      setStatus(s)
      if (s === "connected") { connectedAt.current = Date.now(); setElapsed(0); setSwitching(false) }
      if (s === "disconnected") {
        if (connectedAt.current && !demo) {
          const durationSec = Math.round((Date.now() - connectedAt.current) / 1000)
          api.reportUsage(token, { serverId: serverId ?? undefined, bytesDown: 0, bytesUp: 0, durationSec }).catch(() => {})
        }
        connectedAt.current = null
        setThroughput({ down: 0, up: 0 })
      }
    })
  }, [token, serverId, demo])

  // Connection timer + simulated throughput (native tunnel will supply real values).
  const elapsedRef = useRef(0)
  useEffect(() => { elapsedRef.current = elapsed }, [elapsed])
  useEffect(() => {
    if (status !== "connected") return
    const iv = setInterval(() => {
      setElapsed((e) => e + 1)
      setThroughput({ down: 20 + Math.round(Math.random() * 40) / 10 + (elapsedRef.current % 7), up: 2 + Math.round(Math.random() * 20) / 10 })
    }, 1000)
    return () => clearInterval(iv)
  }, [status])

  const openTunnel = useCallback(async (id: string) => {
    const s = servers.find((sv) => sv.id === id) ?? server
    if (!s) return
    setStatus("connecting")
    try {
      if (demo) {
        await nativeVpn.connect({ host: s.city, port: 8388, method: "chacha20-ietf-poly1305", password: "demo", city: s.city, serverId: s.id })
        setServerIp("102.37.129.78")
        return
      }
      const { accessKey } = await api.getAccessKey(token, s.id)
      const cfg = parseAccessKey(accessKey, { city: s.city, serverId: s.id })
      setServerIp(cfg.host)
      await nativeVpn.connect(cfg)
    } catch (e) {
      setStatus("disconnected")
      if (e instanceof ApiError && e.body?.needsVerification) onNeedsVerify()
      else Alert.alert("Couldn't connect", e instanceof ApiError ? e.message : "Something went wrong")
    }
  }, [servers, server, token, demo, onNeedsVerify])

  const toggleConnection = useCallback(() => {
    if (status === "connected" || status === "connecting") { nativeVpn.disconnect() }
    else if (serverId) openTunnel(serverId)
  }, [status, serverId, openTunnel])

  const selectServer = useCallback((id: string) => {
    setServerId(id)
    if (status === "connected") {
      setSwitching(true)
      nativeVpn.disconnect().then(() => openTunnel(id))
    }
  }, [status, openTunnel])

  const value: Ctx = { servers, server, status, elapsed, throughput, switching, killSwitch, serverIp, setKillSwitch, toggleConnection, selectServer, onNeedsVerify }
  return <VpnCtx.Provider value={value}>{children}</VpnCtx.Provider>
}

export function useVpn(): Ctx {
  const c = useContext(VpnCtx)
  if (!c) throw new Error("useVpn outside provider")
  return c
}
