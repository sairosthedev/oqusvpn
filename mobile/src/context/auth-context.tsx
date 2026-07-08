import { createContext, useContext, type ReactNode } from "react"
import type { AuthUser } from "../lib/api"

type Ctx = {
  token: string
  user: AuthUser
  demo: boolean
  setUser: (u: AuthUser) => void
  logout: () => void
}
const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ value, children }: { value: Ctx; children: ReactNode }) {
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
export function useAuth(): Ctx {
  const c = useContext(AuthCtx)
  if (!c) throw new Error("useAuth outside provider")
  return c
}
