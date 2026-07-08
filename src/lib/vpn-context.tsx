import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { servers, hydrateServer, type Server } from "./data"
import { useUi } from "./ui-context"
import { hasBridge, parseAccessKey } from "./oqus-bridge"
import { api, ApiError } from "./api"

export type Status = "disconnected" | "connecting" | "connected"
export type Appearance = "auto" | "light" | "dark"
export type Theme = "light" | "dark"

type VpnState = {
  status: Status
  servers: Server[]
  server: Server
  serverIp: string | null
  elapsed: number
  switching: boolean
  throughput: { down: number; up: number }
  killSwitch: boolean
  setKillSwitch: (on: boolean) => void
  theme: Theme
  appearance: Appearance
  toggleTheme: () => void
  setAppearance: (a: Appearance) => void
  selectServer: (id: string) => void
  toggleConnection: () => void
}

const VpnContext = createContext<VpnState | null>(null)

function systemTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function VpnProvider({ children }: { children: ReactNode }) {
  const { toast, loggedIn, token, setLoginOpen, setVerifyOpen, pendingConnect, setPendingConnect } = useUi()
  const [status, setStatus] = useState<Status>("disconnected")
  // Live region list from the backend (admin-managed). Seeded with the static
  // list so the UI has data instantly and still works offline / in a browser.
  const [serverList, setServerList] = useState<Server[]>(servers)
  const serverListRef = useRef<Server[]>(serverList)
  serverListRef.current = serverList
  const [serverId, setServerId] = useState<string>(servers[0].id)
  const [serverIp, setServerIp] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [switching, setSwitching] = useState(false)
  const [throughput, setThroughput] = useState({ down: 0, up: 0 })
  const [killSwitch, setKillSwitchState] = useState(true)
  const [appearance, setAppearance] = useState<Appearance>("light")
  const [systemDark, setSystemDark] = useState<Theme>(() =>
    typeof window !== "undefined" ? systemTheme() : "light",
  )
  const timerRef = useRef<number | null>(null)
  const switchingRef = useRef(false) // true while re-tunnelling to another server
  const killSwitchRef = useRef(killSwitch)
  killSwitchRef.current = killSwitch
  const statusRef = useRef<Status>(status)
  statusRef.current = status

  const theme: Theme = appearance === "auto" ? systemDark : appearance

  const server = useMemo(
    () => serverList.find((s) => s.id === serverId) ?? serverList[0] ?? servers[0],
    [serverId, serverList],
  )

  // Pull the live server list (admin CRUD writes to the DB) and keep it fresh:
  // on mount, whenever the window regains focus, and on a slow interval. This is
  // why admin add/remove now shows up on the user side without a manual reload.
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const { servers: list } = await api.listServers()
        if (alive && list?.length) setServerList(list.map(hydrateServer))
      } catch {
        /* offline / browser without backend — keep the last-known list */
      }
    }
    load()
    const onFocus = () => load()
    window.addEventListener("focus", onFocus)
    const iv = window.setInterval(load, 30_000)
    return () => {
      alive = false
      window.removeEventListener("focus", onFocus)
      window.clearInterval(iv)
    }
  }, [])

  // Track the system preference so "Auto" appearance stays live.
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)")
    if (!mq) return
    const onChange = () => setSystemDark(mq.matches ? "dark" : "light")
    mq.addEventListener?.("change", onChange)
    return () => mq.removeEventListener?.("change", onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    if (status === "connected") {
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [status])

  // In Electron, the real tunnel pushes status to us; mirror it into React
  // state (+ toasts/timer). In a browser this effect is a no-op.
  useEffect(() => {
    if (!hasBridge() || !window.oqus) return
    return window.oqus.onStatus(({ status: s, detail }) => {
      setStatus(s as Status)
      if (s === "connected") {
        setElapsed(0)
        toast(detail || "Connected", "success")
      } else if (s === "disconnected") {
        setThroughput({ down: 0, up: 0 })
        if (!switchingRef.current) {
          // stay quiet during an intentional server switch
          setServerIp(null)
          toast(detail?.startsWith("Failed") ? detail : "Disconnected · you're exposed", "danger")
        }
      }
    })
  }, [toast])

  // Real throughput pushed from the tunnel while connected.
  useEffect(() => {
    if (!hasBridge() || !window.oqus) return
    return window.oqus.onThroughput((p) => setThroughput(p))
  }, [])

  // Report each finished session's usage to the backend (powers stats + monitoring).
  useEffect(() => {
    if (!hasBridge() || !window.oqus) return
    return window.oqus.onSession((s) => {
      if (token) api.reportUsage(token, s).catch(() => {})
    })
  }, [token])

  // Fetch this user's access key for a server and hand it to the native tunnel.
  // Assumes the bridge exists; status/toasts arrive via the onStatus subscription.
  const openTunnel = useCallback(
    async (id: string) => {
      const s = serverListRef.current.find((sv) => sv.id === id) ?? serverListRef.current[0] ?? servers[0]
      if (!token) throw new Error("Not signed in")
      const { accessKey } = await api.getAccessKey(token, id)
      const parsed = parseAccessKey(accessKey)
      const cfg = { ...parsed, id, city: s.city, killSwitch: killSwitchRef.current }
      setServerIp(parsed.host)
      const res = await window.oqus!.connect(cfg)
      if (!res.ok) throw new Error(res.error || "Connection failed")
    },
    [token],
  )

  // Kill-switch preference. Applied live if we're already connected.
  const setKillSwitch = useCallback((on: boolean) => {
    setKillSwitchState(on)
    if (statusRef.current === "connected" && hasBridge() && window.oqus) {
      window.oqus.setKillSwitch(on)
    }
  }, [])

  const reportConnectError = useCallback(
    (err: unknown) => {
      setStatus("disconnected")
      if (err instanceof ApiError && err.body?.needsVerification) {
        setVerifyOpen(true) // free limit hit — prompt for name + phone
        toast(err.message, "danger")
      } else {
        toast((err as Error).message || "Couldn't reach the server", "danger")
      }
    },
    [toast, setVerifyOpen],
  )

  // The connect handshake, shared by the connect button and the post-login resume.
  // The real tunnel only exists in the desktop app (a browser can't create a VPN).
  const beginConnect = useCallback(async () => {
    if (!hasBridge() || !window.oqus) {
      toast("Connecting requires the OqusVPN desktop app.", "danger")
      return
    }
    setStatus("connecting")
    try {
      await openTunnel(serverId)
    } catch (err) {
      reportConnectError(err)
    }
  }, [serverId, openTunnel, reportConnectError, toast])

  const toggleConnection = useCallback(() => {
    const prev = statusRef.current
    if (prev === "connecting") return
    if (prev === "connected") {
      if (hasBridge() && window.oqus) {
        window.oqus.disconnect() // status + toast arrive via the onStatus effect
        return
      }
      setStatus("disconnected")
      toast("Disconnected · you're exposed", "danger")
      return
    }
    // Connecting requires an account — prompt for login and remember the intent.
    if (!loggedIn) {
      setPendingConnect(true)
      setLoginOpen(true)
      toast("Sign in to connect", "brand")
      return
    }
    beginConnect()
  }, [loggedIn, beginConnect, setLoginOpen, setPendingConnect, toast])

  // Once the user logs in with a pending connect intent, resume the handshake.
  useEffect(() => {
    if (loggedIn && pendingConnect) {
      setPendingConnect(false)
      if (statusRef.current === "disconnected") beginConnect()
    }
  }, [loggedIn, pendingConnect, beginConnect, setPendingConnect])

  // Logging out drops any active tunnel — connecting requires an account.
  useEffect(() => {
    if (!loggedIn && statusRef.current !== "disconnected") {
      if (hasBridge() && window.oqus) window.oqus.disconnect()
      else setStatus("disconnected")
    }
  }, [loggedIn])

  const selectServer = useCallback(
    (id: string) => {
      const target = serverListRef.current.find((s) => s.id === id)
      setServerId(id)
      if (statusRef.current !== "connected") {
        if (target) toast(`${target.city} selected`, "brand")
        return
      }
      // Connected → real switch: drop the current tunnel and re-tunnel to the new
      // server. The kill switch keeps traffic contained during the brief gap.
      if (!hasBridge() || !window.oqus) return
      switchingRef.current = true
      setSwitching(true)
      ;(async () => {
        try {
          await window.oqus!.disconnect()
          setStatus("connecting")
          await openTunnel(id)
        } catch (err) {
          reportConnectError(err)
        } finally {
          switchingRef.current = false
          setSwitching(false)
        }
      })()
    },
    [toast, openTunnel, reportConnectError],
  )

  const toggleTheme = useCallback(
    () => setAppearance(theme === "dark" ? "light" : "dark"),
    [theme],
  )

  const value = useMemo(
    () => ({
      status,
      servers: serverList,
      server,
      serverIp,
      elapsed,
      switching,
      throughput,
      killSwitch,
      setKillSwitch,
      theme,
      appearance,
      toggleTheme,
      setAppearance,
      selectServer,
      toggleConnection,
    }),
    [status, serverList, server, serverIp, elapsed, switching, throughput, killSwitch, setKillSwitch, theme, appearance, toggleTheme, selectServer, toggleConnection],
  )

  return <VpnContext.Provider value={value}>{children}</VpnContext.Provider>
}

export function useVpn() {
  const ctx = useContext(VpnContext)
  if (!ctx) throw new Error("useVpn must be used within VpnProvider")
  return ctx
}
