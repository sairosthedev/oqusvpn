import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

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
  loggedIn: boolean
  setLoggedIn: (v: boolean) => void
  pendingConnect: boolean
  setPendingConnect: (v: boolean) => void
  paletteOpen: boolean
  setPaletteOpen: (v: boolean) => void
  toasts: Toast[]
  toast: (message: string, tone?: ToastTone) => void
  dismissToast: (id: number) => void
}

const UiContext = createContext<UiState | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [pendingConnect, setPendingConnect] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

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
      loggedIn,
      setLoggedIn,
      pendingConnect,
      setPendingConnect,
      paletteOpen,
      setPaletteOpen,
      toasts,
      toast,
      dismissToast,
    }),
    [focusMode, loginOpen, loggedIn, pendingConnect, paletteOpen, toasts, toast, dismissToast],
  )

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error("useUi must be used within UiProvider")
  return ctx
}
