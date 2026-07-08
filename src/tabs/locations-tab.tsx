import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Check, List, Map, Loader2 } from "lucide-react"
import { barsFor, qualityFor, type Server } from "@/lib/data"
import { useVpn } from "@/lib/vpn-context"
import { formatDuration, cn } from "@/lib/utils"
import { SignalBars } from "@/components/brand"
import { Flag } from "@/components/flag"
import { ConnectButton } from "@/components/connect-button"
import { LocationsMap } from "@/components/locations-map"
import { ServerListSkeleton } from "@/components/skeleton"

type View = "list" | "map"

const qualityToneCls: Record<string, string> = {
  success: "bg-success-soft text-success",
  brand: "bg-brand-soft text-brand",
  warning: "bg-[#f5a623]/15 text-[#b8790f]",
  danger: "bg-danger-soft text-danger",
}

export function LocationsTab() {
  const { servers, server, selectServer, status, elapsed, toggleConnection, switching } = useVpn()
  const [rawQuery, setRawQuery] = useState("")
  const [query, setQuery] = useState("")
  const [view, setView] = useState<View>("list")
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)

  // 150ms debounce on the search field, with a brief skeleton while results settle.
  useEffect(() => {
    setLoading(true)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      setQuery(rawQuery)
      setLoading(false)
    }, 150)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [rawQuery])

  const grouped = useMemo(() => {
    const filtered = servers.filter((s) =>
      `${s.country} ${s.city}`.toLowerCase().includes(query.toLowerCase()),
    )
    const order = ["Recommended", "Africa", "Europe", "Americas", "Asia"]
    const map: Record<string, Server[]> = {}
    for (const s of filtered) (map[s.region] ??= []).push(s)
    return order.filter((r) => map[r]?.length).map((r) => [r, map[r]] as const)
  }, [query, servers])

  const quality = qualityFor(server.ping)

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            Choose <span className="text-brand">a server</span>
          </h1>
          {/* List / Map segmented control */}
          <div className="flex rounded-xl bg-surface-2 p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors",
                view === "list" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors",
                view === "map" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
              )}
            >
              <Map className="h-4 w-4" /> Map
            </button>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted-foreground">
          {servers.length} locations · sorted by speed for you · press ⌘K to jump
        </p>

        {view === "map" ? (
          <div className="h-[calc(100%-5rem)] min-h-[420px] overflow-hidden rounded-3xl border border-border/60">
            <LocationsMap />
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={rawQuery}
                onChange={(e) => setRawQuery(e.target.value)}
                placeholder="Search country or city"
                className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-brand"
              />
              {loading && (
                <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {loading ? (
              <div className="flex flex-col gap-6">
                <ServerListSkeleton rows={4} />
                <ServerListSkeleton rows={3} />
              </div>
            ) : grouped.length === 0 ? (
              <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
                <p className="text-sm font-semibold">No locations match “{query}”.</p>
                <p className="mt-1 text-xs text-muted-foreground">Try a country or city name.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {grouped.map(([region, list]) => (
                  <section key={region}>
                    <h2 className="mb-2 px-1 text-sm font-semibold">{region}</h2>
                    <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
                      {list.map((s, i) => {
                        const selected = s.id === server.id
                        const rowSwitching = selected && switching
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => selectServer(s.id)}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-3 text-left transition-all hover:bg-surface-2 active:scale-[0.99]",
                              i !== list.length - 1 && "border-b border-border/60",
                              selected && "bg-brand/[0.06]",
                            )}
                          >
                            <Flag code={s.code} className="h-8 w-8" title={s.country} />
                            <span className="flex-1 leading-tight">
                              <span className="flex items-center gap-2 text-sm font-semibold">
                                {s.country} — {s.city}
                                {s.fastest && (
                                  <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                                    Fastest
                                  </span>
                                )}
                              </span>
                              {rowSwitching ? (
                                <span className="text-shimmer block text-xs font-semibold">Switching…</span>
                              ) : (
                                <span className="block text-xs text-muted-foreground">
                                  {s.ping} ms · {s.load}% load
                                </span>
                              )}
                            </span>
                            <SignalBars strength={barsFor(s.ping)} />
                            {selected &&
                              (rowSwitching ? (
                                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                              ) : (
                                <span className="animate-pop-in grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                              ))}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* right rail */}
      <aside className="flex w-80 shrink-0 flex-col gap-4 border-l border-border/70 bg-surface/50 p-5">
        <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
          <div className="flex justify-center">
            <ConnectButton status={status} onClick={toggleConnection} size={120} />
          </div>
          {status === "connected" && (
            <p className="mt-4 text-2xl font-bold tabular-nums">{formatDuration(elapsed)}</p>
          )}
          <span
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              status === "connected"
                ? "bg-success-soft text-success"
                : status === "connecting"
                  ? "bg-brand-soft text-brand"
                  : "bg-danger-soft text-danger",
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status === "connected" ? "Protected" : status === "connecting" ? "Connecting…" : "Not protected"}
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
          <Flag code={server.code} className="h-8 w-8" title={server.country} />
          <span className="flex-1 leading-tight">
            <span className="block text-sm font-semibold">
              {server.city}, {server.country}
            </span>
            <span className="block text-xs text-muted-foreground">Current server</span>
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold",
              qualityToneCls[quality.tone],
            )}
          >
            {quality.label} · {server.ping} ms
          </span>
        </div>

        <div className="mt-auto rounded-2xl bg-card p-4 shadow-sm">
          <p className="text-sm font-semibold">Switching is seamless</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pick any row — we hand over the tunnel without a disconnect gap.
          </p>
        </div>
      </aside>
    </div>
  )
}
