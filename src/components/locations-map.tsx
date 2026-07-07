import { useState } from "react"
import { MapPin, ShieldAlert, ShieldCheck, Loader2, Power, ArrowLeftRight } from "lucide-react"
import {
  servers,
  userLocation,
  project,
  distanceKm,
  qualityFor,
  type Server,
} from "@/lib/data"
import { useVpn } from "@/lib/vpn-context"
import { cn } from "@/lib/utils"
import { Flag } from "./flag"

const qualityToneCls: Record<string, string> = {
  success: "bg-success-soft text-success",
  brand: "bg-brand-soft text-brand",
  warning: "bg-[#f5a623]/15 text-[#b8790f]",
  danger: "bg-danger-soft text-danger",
}

export function LocationsMap() {
  const { server, status, switching, selectServer, toggleConnection } = useVpn()
  const [focusedId, setFocusedId] = useState<string | null>(server.id)

  const you = project(userLocation.lat, userLocation.lng)
  const target = project(server.lat, server.lng)
  const focused = servers.find((s) => s.id === focusedId) ?? null
  const connected = status === "connected"
  const connecting = status === "connecting"

  const pill = {
    disconnected: { label: "Not protected", cls: "bg-danger-soft text-danger", icon: ShieldAlert },
    connecting: { label: "Securing tunnel…", cls: "bg-brand-soft text-brand", icon: Loader2 },
    connected: { label: "Protected · AES-256", cls: "bg-success-soft text-success", icon: ShieldCheck },
  }[status]
  const PillIcon = pill.icon

  function pickPin(s: Server) {
    setFocusedId(s.id)
    selectServer(s.id) // seamless switch if connected, plain select otherwise
  }

  return (
    <div className="stage-dots relative h-full w-full overflow-hidden bg-surface/40">
      {/* status pill */}
      <div className="pointer-events-none absolute inset-x-0 top-5 z-20 flex flex-col items-center gap-2">
        <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm", pill.cls)}>
          <PillIcon className={cn("h-3.5 w-3.5", (connecting || switching) && "animate-spin")} />
          {switching ? "Switching…" : pill.label}
        </span>
        <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          {distanceKm(userLocation, server).toLocaleString()} km · {server.ping} ms round-trip
        </span>
      </div>

      {/* route line: you → selected server */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line
          x1={you.x}
          y1={you.y}
          x2={target.x}
          y2={target.y}
          stroke="var(--color-brand)"
          strokeWidth={connected ? 0.5 : 0.4}
          strokeDasharray="1.4 1.6"
          vectorEffect="non-scaling-stroke"
          className={cn(connecting ? "animate-draw opacity-70" : connected ? "opacity-90" : "opacity-40")}
          style={{ ["--draw-length" as string]: "200" }}
        />
      </svg>

      {/* You pin */}
      <Anchor x={you.x} y={you.y}>
        <span className="relative flex flex-col items-center">
          <span className="h-3 w-3 rounded-full bg-foreground ring-4 ring-foreground/15" />
          <span className="mt-1.5 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background">
            <MapPin className="mr-0.5 inline h-2.5 w-2.5" />
            You · {userLocation.city}
          </span>
        </span>
      </Anchor>

      {/* server pins */}
      {servers.map((s) => {
        const p = project(s.lat, s.lng)
        const isCurrent = s.id === server.id
        return (
          <Anchor key={s.id} x={p.x} y={p.y} className="z-10">
            <button
              type="button"
              onClick={() => pickPin(s)}
              aria-label={`${s.country} — ${s.city}`}
              className="group relative grid place-items-center"
            >
              {isCurrent && (connected || connecting) && (
                <span className="animate-radar absolute h-6 w-6 rounded-full bg-brand/40" />
              )}
              {isCurrent ? (
                <Flag code={s.code} title={s.country} className="h-6 w-6 ring-2 ring-brand" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-brand/60 ring-2 ring-card transition-transform group-hover:scale-150 group-hover:bg-brand" />
              )}
            </button>
          </Anchor>
        )
      })}

      {/* callout for the focused pin — flips below when the pin sits high */}
      {focused &&
        (() => {
          const fp = project(focused.lat, focused.lng)
          const below = fp.y < 38
          return (
            <Anchor x={fp.x} y={fp.y} className="z-30">
              <div
                className={cn(
                  "w-52 rounded-2xl border border-border/60 bg-card p-3 shadow-xl",
                  below ? "mt-8 translate-y-0" : "mb-8 -translate-y-full",
                )}
              >
            <div className="flex items-center gap-2">
              <Flag code={focused.code} title={focused.country} className="h-7 w-7" />
              <span className="flex-1 leading-tight">
                <span className="block text-sm font-semibold">{focused.city}</span>
                <span className="block text-xs text-muted-foreground">{focused.country}</span>
              </span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                  qualityToneCls[qualityFor(focused.ping).tone],
                )}
              >
                {focused.ping} ms
              </span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {qualityFor(focused.ping).label} · {focused.load}% load
            </p>
                <CalloutAction
                  focused={focused}
                  isCurrent={focused.id === server.id}
                  status={status}
                  switching={switching}
                  onConnect={toggleConnection}
                  onSwitch={() => selectServer(focused.id)}
                />
              </div>
            </Anchor>
          )
        })()}
    </div>
  )
}

function Anchor({
  x,
  y,
  className,
  children,
}: {
  x: number
  y: number
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2", className)}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      {children}
    </div>
  )
}

function CalloutAction({
  focused,
  isCurrent,
  status,
  switching,
  onConnect,
  onSwitch,
}: {
  focused: Server
  isCurrent: boolean
  status: string
  switching: boolean
  onConnect: () => void
  onSwitch: () => void
}) {
  const base =
    "mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors"

  if (status === "connecting") {
    return (
      <button type="button" disabled className={cn(base, "bg-surface-2 text-muted-foreground")}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting…
      </button>
    )
  }

  // Connected to a different server → offer a seamless switch.
  if (status === "connected" && !isCurrent) {
    return (
      <button type="button" onClick={onSwitch} className={cn(base, "bg-brand text-white hover:bg-brand-ink")}>
        <ArrowLeftRight className="h-3.5 w-3.5" /> Switch here
      </button>
    )
  }

  // Connected to this server → disconnect.
  if (status === "connected") {
    return (
      <button type="button" onClick={onConnect} className={cn(base, "bg-danger-soft text-danger hover:brightness-95")}>
        {switching ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Switching…
          </>
        ) : (
          <>
            <Power className="h-3.5 w-3.5" /> Disconnect
          </>
        )}
      </button>
    )
  }

  // Disconnected → connect to the focused server (already selected via pin click).
  return (
    <button type="button" onClick={onConnect} className={cn(base, "bg-brand text-white hover:bg-brand-ink")}>
      <Power className="h-3.5 w-3.5" /> Connect to {focused.city}
    </button>
  )
}
