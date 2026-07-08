// Thin client for the OqusVPN backend (control plane).
// Base URL resolves from an injected global (used by the Electron preload /
// tests), then Vite env, then localhost default.

export type AuthUser = {
  id: string
  email: string
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

export const api = {
  signup: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  verify: (token: string, input: { fullName: string; phone: string }) =>
    request<{ user: AuthUser }>("/api/auth/verify", { method: "POST", token, body: JSON.stringify(input) }),
  me: (token: string) => request<{ user: AuthUser }>("/api/auth/me", { token }),
  getAccessKey: (token: string, serverId: string) =>
    request<AccessKeyResponse>(`/api/access-key?serverId=${encodeURIComponent(serverId)}`, { token }),
}
