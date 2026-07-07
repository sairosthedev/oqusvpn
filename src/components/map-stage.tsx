import { useState } from "react"
import { Plus, Minus, MapPin, ShieldAlert, ShieldCheck, Loader2, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useVpn } from "@/lib/vpn-context"
import { useUi } from "@/lib/ui-context"
import { project, userLocation, distanceKm } from "@/lib/data"
import { Flag } from "./flag"
import { WorldMap } from "./world-map"

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function MapStage() {
  const { status, server, switching } = useVpn()
  const { focusMode, setFocusMode } = useUi()
  const [zoom, setZoom] = useState(1)

  const showRoute = status !== "disconnected"
  const connecting = status === "connecting"

  // Real geographic positions (percent within the map panel).
  const you = project(userLocation.lat, userLocation.lng)
  const srv = project(server.lat, server.lng)
  const km = distanceKm(userLocation, server)

  const pill = {
    disconnected: { label: "Not protected", cls: "bg-danger-soft text-danger", icon: ShieldAlert },
    connecting: { label: "Securing tunnel…", cls: "bg-brand-soft text-brand", icon: Loader2 },
    connected: { label: "Protected · AES-256", cls: "bg-success-soft text-success", icon: ShieldCheck },
  }[status]
  const PillIcon = pill.icon

  return (
    <div className="relative flex-1 overflow-hidden bg-surface/40">
      {/* geographic layer — map + route + markers scale together on zoom */}
      <div
        className="absolute inset-0 origin-center transition-transform duration-300"
        style={{ transform: `scale(${zoom})` }}
      >
        <WorldMap className="absolute inset-0" />

        {/* route line between You and the server */}
        {showRoute && (
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1={`${you.x}%`}
              y1={`${you.y}%`}
              x2={`${srv.x}%`}
              y2={`${srv.y}%`}
              stroke="var(--color-brand)"
              strokeWidth="2"
              strokeDasharray="5 6"
              className={cn(connecting ? "animate-draw opacity-60" : "opacity-90")}
              style={{ ["--draw-length" as string]: "500" }}
            />
          </svg>
        )}

        {/* You marker */}
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${you.x}%`, top: `${you.y}%` }}
        >
          <span className="relative flex flex-col items-center">
            <span className="h-3 w-3 rounded-full bg-foreground ring-4 ring-foreground/15" />
            <span className="mt-2 flex items-center gap-1 whitespace-nowrap rounded-full bg-foreground px-2.5 py-1 text-xs font-semibold text-background">
              <MapPin className="h-3 w-3" /> You · {userLocation.city}
            </span>
          </span>
        </div>

        {/* Server marker with a pulsing ring */}
        {showRoute && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${srv.x}%`, top: `${srv.y}%` }}
          >
            <span className="relative flex flex-col items-center">
              <span className="animate-radar absolute top-0 h-7 w-7 rounded-full bg-brand/30" />
              <Flag
                code={server.code}
                title={server.country}
                className="relative h-7 w-7 shadow-lg shadow-brand/40 ring-2 ring-brand"
              />
              <span className="mt-1.5 whitespace-nowrap rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold shadow-sm">
                {server.city}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* status pill (fixed chrome, not zoomed) */}
      <div className="pointer-events-none absolute inset-x-0 top-6 z-10 flex flex-col items-center gap-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
            pill.cls,
          )}
        >
          <PillIcon className={cn("h-3.5 w-3.5", (connecting || switching) && "animate-spin")} />
          {switching ? "Switching…" : pill.label}
        </span>
        {status === "disconnected" && (
          <span className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-sm">
            Pick a server to draw your route
          </span>
        )}
        {status === "connected" && !switching && (
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            {km.toLocaleString()} km · {server.ping} ms round-trip
          </span>
        )}
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-6 left-6 z-10 flex flex-col overflow-hidden rounded-xl bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(+(z + 0.5).toFixed(1), 1, 3))}
          className="grid h-9 w-9 place-items-center text-muted hover:text-foreground disabled:opacity-40"
          aria-label="Zoom in"
          disabled={zoom >= 3}
        >
          <Plus className="h-4 w-4" />
        </button>
        <span className="mx-2 h-px bg-border" />
        <button
          type="button"
          onClick={() => setZoom((z) => clamp(+(z - 0.5).toFixed(1), 1, 3))}
          className="grid h-9 w-9 place-items-center text-muted hover:text-foreground disabled:opacity-40"
          aria-label="Zoom out"
          disabled={zoom <= 1}
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* focus mode toggle */}
      <button
        type="button"
        onClick={() => setFocusMode(!focusMode)}
        className="absolute bottom-6 right-6 z-10 flex items-center gap-2 rounded-xl bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-surface"
        aria-pressed={focusMode}
      >
        {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {focusMode ? "Exit focus" : "Focus mode"}
      </button>
    </div>
  )
}
