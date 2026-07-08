// Client for the OqusVPN backend — the same control plane the web/desktop app
// uses. Ported to React Native (no import.meta; base URL from config.ts).
import { API_BASE } from "./config"

export type AuthUser = {
  id: string
  email: string
  role: string
  verified: boolean
  fullName: string | null
  phone: string | null
  usageCount: number
}
export type AuthResponse = { token: string; user: AuthUser }
export type PublicServer = {
  id: string
  country: string
  city: string
  code: string
  region: string
  lat: number
  lng: number
  fastest: boolean
  enabled: boolean
}
export type AccessKeyResponse = {
  accessKey: string
  server: { id: string; city: string; country: string; code: string }
  usage?: { count: number; cap: number; verified: boolean }
}
export type SessionReport = {
  serverId?: string
  bytesDown: number
  bytesUp: number
  durationSec: number
}
export type UsageStats = {
  bytesDown: number
  bytesUp: number
  durationSec: number
  sessions: number
  daily: { day: string; sec: number }[]
}

/** Error carrying HTTP status + parsed body so callers can branch (needsVerification). */
export class ApiError extends Error {
  status: number
  body: Record<string, unknown>
  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.body = body
  }
}

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (init?.token) headers.authorization = `Bearer ${init.token}`
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string>) },
    })
  } catch {
    throw new ApiError("Can't reach the OqusVPN server. Check API_BASE / that the backend is running.", 0, {})
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError((body.error as string) || `Request failed (${res.status})`, res.status, body)
  return body as T
}

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  verify: (token: string, input: { fullName: string; phone: string }) =>
    request<{ user: AuthUser }>("/api/auth/verify", { method: "POST", token, body: JSON.stringify(input) }),
  me: (token: string) => request<{ user: AuthUser }>("/api/auth/me", { token }),
  listServers: () => request<{ servers: PublicServer[] }>("/api/servers"),
  getAccessKey: (token: string, serverId: string) =>
    request<AccessKeyResponse>(`/api/access-key?serverId=${encodeURIComponent(serverId)}`, { token }),
  reportUsage: (token: string, s: SessionReport) =>
    request<{ ok: boolean }>("/api/usage", { method: "POST", token, body: JSON.stringify(s) }),
  getStats: (token: string) => request<{ stats: UsageStats }>("/api/me/stats", { token }),
}
