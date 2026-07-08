// Thin client for the OqusVPN backend (control plane).
// Base URL resolves from an injected global (used by the Electron preload /
// tests), then Vite env, then localhost default.

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
export type AccessKeyResponse = {
  accessKey: string
  server: { id: string; city: string; country: string; code: string }
  usage?: { count: number; cap: number; verified: boolean }
}

declare global {
  interface Window {
    __OQUS_API__?: string
  }
}

/** Error carrying the HTTP status + parsed body so callers can branch (e.g. needsVerification). */
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

export function apiBase(): string {
  if (typeof window !== "undefined" && window.__OQUS_API__) return window.__OQUS_API__
  return import.meta.env.VITE_OQUS_API || "http://localhost:8080"
}

async function request<T>(path: string, init?: RequestInit & { token?: string }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (init?.token) headers.authorization = `Bearer ${init.token}`
  let res: Response
  try {
    res = await fetch(`${apiBase()}${path}`, { ...init, headers: { ...headers, ...(init?.headers as Record<string, string>) } })
  } catch {
    throw new ApiError("Can't reach the OqusVPN server. Is the backend running?", 0, {})
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError((body.error as string) || `Request failed (${res.status})`, res.status, body)
  return body as T
}

export type UsageStats = {
  bytesDown: number
  bytesUp: number
  durationSec: number
  sessions: number
  daily: { day: string; sec: number }[]
}
export type SessionReport = { serverId?: string; bytesDown: number; bytesUp: number; durationSec: number }

// Public server view returned by GET /api/servers (no host/secret).
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

export type AdminServer = {
  serverId: string
  country: string
  city: string
  code: string
  region: string
  lat: number
  lng: number
  host: string
  port: number
  method: string
  secret: string
  fastest: boolean
  enabled: boolean
}
export type AdminUser = {
  id: string
  email: string
  role: string
  verified: boolean
  fullName: string | null
  phone: string | null
  connects: number
  createdAt: string
  usage: { bytesDown: number; bytesUp: number; durationSec: number; sessions: number }
}

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  verify: (token: string, input: { fullName: string; phone: string }) =>
    request<{ user: AuthUser }>("/api/auth/verify", { method: "POST", token, body: JSON.stringify(input) }),
  me: (token: string) => request<{ user: AuthUser }>("/api/auth/me", { token }),

  // public list of live regions (admin-managed, read from the DB)
  listServers: () => request<{ servers: PublicServer[] }>("/api/servers"),
  getAccessKey: (token: string, serverId: string) =>
    request<AccessKeyResponse>(`/api/access-key?serverId=${encodeURIComponent(serverId)}`, { token }),

  // usage metering
  reportUsage: (token: string, s: SessionReport) =>
    request<{ ok: boolean }>("/api/usage", { method: "POST", token, body: JSON.stringify(s) }),
  getStats: (token: string) => request<{ stats: UsageStats }>("/api/me/stats", { token }),

  // admin
  adminListServers: (token: string) => request<{ servers: AdminServer[] }>("/api/admin/servers", { token }),
  adminCreateServer: (token: string, body: Record<string, unknown>) =>
    request<{ server: AdminServer }>("/api/admin/servers", { method: "POST", token, body: JSON.stringify(body) }),
  adminUpdateServer: (token: string, id: string, body: Record<string, unknown>) =>
    request<{ server: AdminServer }>(`/api/admin/servers/${encodeURIComponent(id)}`, { method: "PUT", token, body: JSON.stringify(body) }),
  adminDeleteServer: (token: string, id: string) =>
    request<{ ok: boolean }>(`/api/admin/servers/${encodeURIComponent(id)}`, { method: "DELETE", token }),
  adminListUsers: (token: string) => request<{ users: AdminUser[] }>("/api/admin/users", { token }),
}
