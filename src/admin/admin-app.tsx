import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Trash2, RefreshCw, Server, Users as UsersIcon, LogOut, ShieldCheck } from "lucide-react"
import { api, type AdminServer, type AdminUser } from "@/lib/api"
import { cn } from "@/lib/utils"

const TOKEN_KEY = "oqus.admin.token"
const EMAIL_KEY = "oqus.admin.email"

function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${Math.round(n)} B`
}
function fmtHM(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function AdminApp() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [email, setEmail] = useState<string>(() => localStorage.getItem(EMAIL_KEY) ?? "")

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EMAIL_KEY)
    setToken(null)
  }
  const onLogin = (t: string, e: string) => {
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(EMAIL_KEY, e)
    setEmail(e)
    setToken(t)
  }

  if (!token) return <Login onLogin={onLogin} />
  return <Console token={token} email={email} onLogout={logout} onExpired={logout} />
}

function Login({ onLogin }: { onLogin: (token: string, email: string) => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await api.login(email, password)
      if (res.user.role !== "admin") {
        setError("This account isn't an admin.")
        return
      }
      onLogin(res.token, res.user.email)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen w-screen place-items-center bg-surface/60 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-foreground text-background">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">OqusVPN</p>
            <p className="text-xs text-muted-foreground">Admin console</p>
          </div>
        </div>
        <label className="mb-3 block text-left">
          <span className="text-sm font-medium">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@…" className="mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand" />
        </label>
        <label className="mb-4 block text-left">
          <span className="text-sm font-medium">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand" />
        </label>
        {error && <p className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 font-semibold text-background transition hover:opacity-90 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
        </button>
      </form>
    </div>
  )
}

function Console({
  token,
  email,
  onLogout,
  onExpired,
}: {
  token: string
  email: string
  onLogout: () => void
  onExpired: () => void
}) {
  const [view, setView] = useState<"servers" | "users">("servers")
  const [servers, setServers] = useState<AdminServer[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [form, setForm] = useState({ serverId: "", country: "", city: "", accessKey: "" })
  const [busy, setBusy] = useState(false)

  const flash = (m: string) => {
    setNotice(m)
    window.setTimeout(() => setNotice(null), 2500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, u] = await Promise.all([api.adminListServers(token), api.adminListUsers(token)])
      setServers(s.servers)
      setUsers(u.users)
    } catch (err) {
      const msg = (err as Error).message
      if (/401|token/i.test(msg)) onExpired()
      else flash(msg)
    } finally {
      setLoading(false)
    }
  }, [token, onExpired])

  useEffect(() => {
    load()
  }, [load])

  async function addServer(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api.adminCreateServer(token, form)
      setForm({ serverId: "", country: "", city: "", accessKey: "" })
      flash("Server added")
      await load()
    } catch (err) {
      flash((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  const toggle = async (s: AdminServer) => {
    try {
      await api.adminUpdateServer(token, s.serverId, { enabled: !s.enabled })
      await load()
    } catch (err) {
      flash((err as Error).message)
    }
  }
  const remove = async (s: AdminServer) => {
    try {
      await api.adminDeleteServer(token, s.serverId)
      flash(`Removed ${s.city}`)
      await load()
    } catch (err) {
      flash((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen w-screen bg-surface/40">
      {/* top bar — distinct dark console header */}
      <header className="flex items-center justify-between bg-foreground px-6 py-3 text-background">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-bold">OqusVPN</span>
          <span className="rounded-md bg-background/15 px-1.5 py-0.5 text-[11px] font-semibold">Admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-background/70">{email}</span>
          <button onClick={onLogout} className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-background/15">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        {/* view switch + refresh */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex gap-1 rounded-xl bg-card p-1 shadow-sm">
            {([["servers", "Servers", Server], ["users", "Users", UsersIcon]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  view === id ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <button onClick={load} className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-surface-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </button>
        </div>

        {notice && <div className="mb-4 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand">{notice}</div>}

        {view === "servers" ? (
          <>
            <form onSubmit={addServer} className="mb-4 rounded-2xl bg-card p-4 shadow-sm">
              <p className="mb-3 text-sm font-semibold">Add a server</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <input required value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value })} placeholder="serverId (za-cpt)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
                <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
                <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
                <input required value={form.accessKey} onChange={(e) => setForm({ ...form, accessKey: e.target.value })} placeholder="ss://… key" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              </div>
              <button type="submit" disabled={busy} className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add server
              </button>
            </form>

            <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
              <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">Servers ({servers.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-medium">Server</th>
                      <th className="px-4 py-2 font-medium">Host</th>
                      <th className="px-4 py-2 font-medium">Enabled</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {servers.map((s) => (
                      <tr key={s.serverId} className="border-t border-border/40">
                        <td className="px-4 py-2">
                          <span className="font-medium">{s.city}, {s.country}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{s.serverId}{s.fastest ? " · fastest" : ""}</span>
                        </td>
                        <td className="px-4 py-2 tabular-nums text-muted-foreground">{s.host}:{s.port}</td>
                        <td className="px-4 py-2">
                          <button onClick={() => toggle(s)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.enabled ? "bg-success-soft text-success" : "bg-surface-2 text-muted-foreground")}>
                            {s.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => remove(s)} aria-label="Delete" className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
            <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">Users ({users.length})</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Email</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Sessions</th>
                    <th className="px-4 py-2 font-medium">Data</th>
                    <th className="px-4 py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-border/40">
                      <td className="px-4 py-2">
                        <span className="font-medium">{u.email}</span>
                        {u.role === "admin" && <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">admin</span>}
                        {u.fullName && <span className="block text-xs text-muted-foreground">{u.fullName} · {u.phone}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", u.verified ? "bg-success-soft text-success" : "bg-surface-2 text-muted-foreground")}>
                          {u.verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums">{u.usage.sessions} <span className="text-xs text-muted-foreground">({u.connects} connects)</span></td>
                      <td className="px-4 py-2 tabular-nums">{fmtBytes(u.usage.bytesDown + u.usage.bytesUp)}</td>
                      <td className="px-4 py-2 tabular-nums">{fmtHM(u.usage.durationSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
