import { useEffect, useState } from "react"
import { ShieldCheck, Download, Upload } from "lucide-react"
import { useVpn } from "@/lib/vpn-context"
import { useUi } from "@/lib/ui-context"
import { api, type UsageStats } from "@/lib/api"

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

export function StatisticsTab() {
  const { status } = useVpn()
  const { token } = useUi()
  const [stats, setStats] = useState<UsageStats | null>(null)

  // Load real usage; refresh whenever a session ends (status returns to disconnected).
  useEffect(() => {
    if (!token) return
    api.getStats(token).then((r) => setStats(r.stats)).catch(() => {})
  }, [token, status])

  const down = stats?.bytesDown ?? 0
  const up = stats?.bytesUp ?? 0
  const total = down + up
  const dPct = total > 0 ? Math.round((down / total) * 100) : 0

  // Build a 7-day activity series (hours protected per day) from the daily data.
  const dailyMap = new Map((stats?.daily ?? []).map((d) => [d.day, d.sec]))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const key = d.toISOString().slice(0, 10)
    return { label: d.toLocaleDateString(undefined, { weekday: "short" }), hours: (dailyMap.get(key) ?? 0) / 3600 }
  })
  const maxH = Math.max(0.1, ...days.map((d) => d.hours))
  const w = 560
  const h = 150
  const pts = days.map((d, i) => ({
    x: (i / (days.length - 1)) * w,
    y: h - (d.hours / maxH) * (h - 20) - 10,
  }))
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Statistics</h1>
          <p className="text-sm text-muted-foreground">Your real connection and data usage</p>
        </div>

        {/* time protected + 7-day chart */}
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Time protected</p>
              <p className="mt-1 text-3xl font-bold text-brand tabular-nums">{fmtHM(stats?.durationSec ?? 0)}</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {status === "connected" ? "Connected" : "Idle"}
            </span>
          </div>

          <div className="mt-4">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75, 1].map((t) => (
                <line key={t} x1="0" x2={w} y1={h - t * (h - 20) - 10} y2={h - t * (h - 20) - 10} stroke="var(--color-border)" strokeWidth="1" />
              ))}
              <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#areaFill)" />
              <path d={path} fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--color-card)" stroke="var(--color-brand)" strokeWidth="2" />
              ))}
            </svg>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {days.map((d, i) => (
                <span key={i}>{d.label}</span>
              ))}
            </div>
          </div>
        </div>

        {/* data + connections */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Data transferred</span>
              <span className="text-lg font-bold tabular-nums">{fmtBytes(total)}</span>
            </div>
            <Bar label={`Downloaded ${fmtBytes(down)}`} pct={dPct} />
            <Bar label={`Uploaded ${fmtBytes(up)}`} pct={100 - dPct} />
          </div>

          <div className="rounded-2xl bg-card p-5 shadow-sm">
            <span className="text-sm font-semibold">Sessions</span>
            <p className="mt-1 text-3xl font-bold tabular-nums">{stats?.sessions ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Completed VPN connections on this account</p>
          </div>
        </div>
      </div>

      {/* right rail: real totals */}
      <aside className="flex w-80 shrink-0 flex-col gap-4 border-l border-border/70 bg-surface/50 p-5">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">This account</p>
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <Totals icon={Download} label="Total downloaded" value={fmtBytes(down)} />
          <Totals icon={Upload} label="Total uploaded" value={fmtBytes(up)} />
        </div>

        <div className="mt-auto flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            We record data volume and session time to your account — never the sites you visit.
          </p>
        </div>
      </aside>
    </div>
  )
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Totals({ icon: Icon, label, value }: { icon: typeof Download; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
