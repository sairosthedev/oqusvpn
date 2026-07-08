import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"
import { api, type AuthUser } from "./api"

export type ToastTone = "success" | "danger" | "brand"

export type Toast = {
  id: number
  message: string
  tone: ToastTone
}

type UiState = {
  focusMode: boolean
  setFocusMode: (v: boolean) => void
  loginOpen: boolean
  setLoginOpen: (v: boolean) => void
  // auth
  token: string | null
  user: AuthUser | null
  loggedIn: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  verify: (fullName: string, phone: string) => Promise<void>
  logout: () => void
  verifyOpen: boolean
  setVerifyOpen: (v: boolean) => void
  pendingConnect: boolean
  setPendingConnect: (v: boolean) => void
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  toasts: Toast[]
  toast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
}

const UiContext = createContext<UiState | null>(null)

const TOKEN_KEY = "oqus.token"
const USER_KEY = "oqus.user"

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null,
  )
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [pendingConnect, setPendingConnect] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const persist = useCallback((t: string | null, u: AuthUser | null) => {
    try {
      if (t && u) {
        localStorage.setItem(TOKEN_KEY, t)
        localStorage.setItem(USER_KEY, JSON.stringify(u))
      } else {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
      }
    } catch {
      /* storage unavailable — session-only auth */
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password)
      setToken(res.token)
      setUser(res.user)
      persist(res.token, res.user)
    },
    [persist],
  )

  const signup = useCallback(
    async (email: string, password: string) => {
      const res = await api.signup(email, password)
      setToken(res.token)
      setUser(res.user)
      persist(res.token, res.user)
    },
    [persist],
  )

  const verify = useCallback(
    async (fullName: string, phone: string) => {
      if (!token) throw new Error("Not signed in")
      const res = await api.verify(token, { fullName, phone })
      setUser(res.user)
      persist(token, res.user)
    },
    [persist, token],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    persist(null, null)
  }, [persist])

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, tone: ToastTone = "brand") => {
      const id = nextId.current++
      setToasts((list) => [...list, { id, message, tone }])
      window.setTimeout(() => dismissToast(id), 2500)
    },
    [dismissToast],
  )

  const value = useMemo<UiState>(
    () => ({
      focusMode,
      setFocusMode,
      loginOpen,
      setLoginOpen,
      token,
      user,
      loggedIn: !!token,
      login,
      signup,
      verify,
      logout,
      verifyOpen,
      setVerifyOpen,
      pendingConnect,
      setPendingConnect,
      paletteOpen,
      setPaletteOpen,
      toasts,
      toast,
      dismissToast,
    }),
    [focusMode, loginOpen, token, user, login, signup, verify, logout, verifyOpen, pendingConnect, paletteOpen, toasts, toast, dismissToast],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error("useUi must be used within UiProvider")
  return ctx
}
