import { useState } from "react"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { ChevronDown, ShieldCheck, TrendingUp, Check } from "lucide-react"
import { topLocations, statsByPeriod, periods, type Period } from "@/lib/data"
import { useVpn } from "@/lib/vpn-context"
import { cn } from "@/lib/utils"
import { Flag } from "@/components/flag"

export function StatisticsTab() {
  const { status } = useVpn()
  const [period, setPeriod] = useState<Period>("week")
  const stats = statsByPeriod[period]
  const periodLabel = periods.find((p) => p.id === period)?.label ?? "This week"

  const max = Math.max(...stats.chart.map((d) => d.hours))

  // build polyline points
  const w = 560
  const h = 150
  const pts = stats.chart.map((d, i) => {
    const x = (i / (stats.chart.length - 1)) * w
    const y = h - (d.hours / max) * (h - 20) - 10
    return { x, y }
  })
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Statistics</h1>
            <p className="text-sm text-muted-foreground">Track your connection and data usage</p>
          </div>

          {/* period selector */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className="flex items-center gap-2 rounded-xl bg-card px-4 py-2 text-sm font-medium shadow-sm outline-none transition hover:bg-surface-2">
              {periodLabel} <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={6}
                className="z-50 min-w-[160px] overflow-hidden rounded-xl border border-border/60 bg-card p-1 shadow-lg"
              >
                {periods.map((p) => (
                  <DropdownMenu.Item
                    key={p.id}
                    onSelect={() => setPeriod(p.id)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-surface-2",
                      p.id === period ? "font-semibold text-brand" : "text-foreground",
                    )}
                  >
                    {p.label}
                    {p.id === period && <Check className="h-4 w-4" />}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* everything below re-animates when the period key changes */}
        <div key={period} className="animate-toast-in">
          {/* time protected card */}
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Time protected</p>
                <p className="mt-1 text-3xl font-bold text-brand tabular-nums">{stats.timeProtected}</p>
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
                  <line
                    key={t}
                    x1="0"
                    x2={w}
                    y1={h - t * (h - 20) - 10}
                    y2={h - t * (h - 20) - 10}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                  />
                ))}
                {/* soft area fill */}
                <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#areaFill)" />
                {/* stroke draws in */}
                <path
                  d={path}
                  fill="none"
                  stroke="var(--color-brand)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-draw"
                  style={{ ["--draw-length" as string]: "1400", strokeDasharray: 1400 }}
                />
                {pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill="var(--color-card)" stroke="var(--color-brand)" strokeWidth="2" />
                ))}
              </svg>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                {stats.chart.map((d, i) => (
                  <span key={i}>{d.day}</span>
                ))}
              </div>
            </div>
          </div>

          {/* two stat cards */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Data transferred</span>
                <span className="text-lg font-bold tabular-nums">{stats.dataTotal}</span>
              </div>
              <Bar label={stats.download.label} pct={stats.download.pct} />
              <Bar label={stats.upload.label} pct={stats.upload.pct} />
            </div>

            <div className="rounded-2xl bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Connections</span>
                <span className="text-lg font-bold tabular-nums">{stats.connections}</span>
                <span className="flex items-center gap-0.5 rounded-md bg-success-soft px-1.5 py-0.5 text-[10px] font-bold text-success">
                  <TrendingUp className="h-3 w-3" /> {stats.connectionsTrend}%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stats.saved} saved by compression
              </p>
              <div className="mt-4 flex h-[52px] items-end gap-1.5">
                {stats.sparkline.map((v, i) => (
                  <span
                    key={i}
                    className="flex-1 origin-bottom rounded-sm bg-brand/70 transition-transform"
                    style={{ height: `${v * 0.5}px` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* right rail: top locations */}
      <aside className="flex w-80 shrink-0 flex-col gap-4 border-l border-border/70 bg-surface/50 p-5">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Top locations
        </p>
        <div className="rounded-2xl bg-card p-4 shadow-sm">
          {topLocations.map((l, i) => (
            <div key={l.country} className={i !== 0 ? "mt-4" : ""}>
              <div className="flex items-center gap-2">
                <Flag code={l.code} className="h-6 w-6" title={l.country} />
                <span className="flex-1 text-sm font-semibold">{l.country}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{l.time}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-brand" style={{ width: `${l.pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-start gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand" />
          <div>
            <p className="text-sm font-semibold tabular-nums">
              {stats.trackers.toLocaleString()} trackers blocked
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              All stats computed on-device. We never log traffic.
            </p>
          </div>
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
