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
import { servers, type Server } from "./data"
import { useUi } from "./ui-context"

export type Status = "disconnected" | "connecting" | "connected"
export type Appearance = "auto" | "light" | "dark"
export type Theme = "light" | "dark"

type VpnState = {
  status: Status
  server: Server
  elapsed: number
  switching: boolean
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
  const { toast } = useUi()
  const [status, setStatus] = useState<Status>("disconnected")
  const [serverId, setServerId] = useState<string>(servers[0].id)
  const [elapsed, setElapsed] = useState(2757) // 00:45:57 to match spec
  const [switching, setSwitching] = useState(false)
  const [appearance, setAppearance] = useState<Appearance>("light")
  const [systemDark, setSystemDark] = useState<Theme>(() =>
    typeof window !== "undefined" ? systemTheme() : "light",
  )
  const timerRef = useRef<number | null>(null)
  const switchRef = useRef<number | null>(null)
  const statusRef = useRef<Status>(status)
  statusRef.current = status

  const theme: Theme = appearance === "auto" ? systemDark : appearance

  const server = useMemo(
    () => servers.find((s) => s.id === serverId) ?? servers[0],
    [serverId],
  )

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

  const toggleConnection = useCallback(() => {
    const prev = statusRef.current
    if (prev === "connecting") return
    if (prev === "connected") {
      setStatus("disconnected")
      toast("Disconnected · you're exposed", "danger")
      return
    }
    // start connecting sequence
    setStatus("connecting")
    window.setTimeout(() => {
      setStatus("connected")
      setElapsed(0)
      const s = servers.find((sv) => sv.id === serverId) ?? servers[0]
      toast(`Connected · ${s.city}`, "success")
    }, 1800)
  }, [serverId, toast])

  const selectServer = useCallback(
    (id: string) => {
      const target = servers.find((s) => s.id === id)
      setServerId(id)
      // If already connected, hand over the tunnel with a brief "Switching…" shimmer.
      if (statusRef.current === "connected") {
        setSwitching(true)
        if (switchRef.current) window.clearTimeout(switchRef.current)
        switchRef.current = window.setTimeout(() => {
          setSwitching(false)
          if (target) toast(`Switched · ${target.city}`, "success")
        }, 1500)
      } else if (target) {
        toast(`${target.city} selected`, "brand")
      }
    },
    [toast],
  )

  const toggleTheme = useCallback(
    () => setAppearance(theme === "dark" ? "light" : "dark"),
    [theme],
  )

  const value = useMemo(
    () => ({
      status,
      server,
      elapsed,
      switching,
      theme,
      appearance,
      toggleTheme,
      setAppearance,
      selectServer,
      toggleConnection,
    }),
    [status, server, elapsed, switching, theme, appearance, toggleTheme, selectServer, toggleConnection],
  )

  return <VpnContext.Provider value={value}>{children}</VpnContext.Provider>
}

export function useVpn() {
  const ctx = useContext(VpnContext)
  if (!ctx) throw new Error("useVpn must be used within VpnProvider")
  return ctx
}
