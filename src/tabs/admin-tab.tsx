import { useCallback, useEffect, useState } from "react"
import { Loader2, Plus, Trash2, RefreshCw } from "lucide-react"
import { useUi } from "@/lib/ui-context"
import { api, type AdminServer, type AdminUser } from "@/lib/api"
import { cn } from "@/lib/utils"

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

export function AdminTab() {
  const { token, toast } = useUi()
  const [servers, setServers] = useState<AdminServer[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ serverId: "", country: "", city: "", accessKey: "" })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [s, u] = await Promise.all([api.adminListServers(token), api.adminListUsers(token)])
      setServers(s.servers)
      setUsers(u.users)
    } catch (err) {
      toast((err as Error).message, "danger")
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => {
    load()
  }, [load])

  async function addServer(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    try {
      await api.adminCreateServer(token, form)
      setForm({ serverId: "", country: "", city: "", accessKey: "" })
      toast("Server added", "success")
      await load()
    } catch (err) {
      toast((err as Error).message, "danger")
    } finally {
      setBusy(false)
    }
  }

  async function toggle(s: AdminServer) {
    if (!token) return
    try {
      await api.adminUpdateServer(token, s.serverId, { enabled: !s.enabled })
      await load()
    } catch (err) {
      toast((err as Error).message, "danger")
    }
  }

  async function remove(s: AdminServer) {
    if (!token) return
    try {
      await api.adminDeleteServer(token, s.serverId)
      toast(`Removed ${s.city}`, "brand")
      await load()
    } catch (err) {
      toast((err as Error).message, "danger")
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">Manage servers and monitor users</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-surface-2"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Add server */}
      <form onSubmit={addServer} className="mb-4 rounded-2xl bg-card p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">Add a server</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input required value={form.serverId} onChange={(e) => setForm({ ...form, serverId: e.target.value })} placeholder="serverId (e.g. za-cpt)" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          <input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          <input required value={form.accessKey} onChange={(e) => setForm({ ...form, accessKey: e.target.value })} placeholder="ss://… access key" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
        </div>
        <button type="submit" disabled={busy} className="mt-3 flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-ink disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add server
        </button>
      </form>

      {/* Servers */}
      <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">Servers ({servers.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Server</th>
                <th className="px-4 py-2 font-medium">Host</th>
                <th className="px-4 py-2 font-medium">Enabled</th>
                <th className="px-4 py-2 font-medium"></th>
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
                    <button type="button" onClick={() => toggle(s)} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", s.enabled ? "bg-success-soft text-success" : "bg-surface-2 text-muted-foreground")}>
                      {s.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => remove(s)} aria-label="Delete" className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users */}
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
    </div>
  )
}
