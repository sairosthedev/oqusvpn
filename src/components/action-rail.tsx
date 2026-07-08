import { ChevronRight, Zap, Download, Upload, Lock, ShieldCheck } from "lucide-react"
import * as Switch from "@radix-ui/react-switch"
import { useVpn } from "@/lib/vpn-context"
import { servers, qualityFor, barsFor } from "@/lib/data"
import { formatDuration, cn } from "@/lib/utils"
import { ConnectButton } from "./connect-button"
import { SignalBars } from "./brand"
import { Flag } from "./flag"

const qualityToneCls: Record<string, string> = {
  success: "text-success",
  brand: "text-brand",
  warning: "text-[#b8790f]",
  danger: "text-danger",
}

export function ActionRail() {
  const { status, server, serverIp, elapsed, switching, throughput, killSwitch, setKillSwitch, toggleConnection, selectServer } =
    useVpn()
  const connected = status === "connected"
  const quality = qualityFor(server.ping)

  const quick = servers.filter((s) => ["ng-lag", "us-ny"].includes(s.id))

  return (
    <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border/70 bg-surface/50 p-5">
      {/* connect card */}
      <div className="rounded-2xl bg-card p-6 text-center shadow-sm">
        <div className="flex justify-center">
          <ConnectButton status={status} onClick={toggleConnection} />
        </div>
        {connected ? (
          <>
            <p className="mt-4 text-sm font-medium text-muted">
              {switching ? (
                <span className="text-shimmer font-semibold">Switching server…</span>
              ) : (
                "Connected · AES-256"
              )}
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
              {formatDuration(elapsed)}
            </p>
          </>
        ) : (
          <>
            <p className="mt-4 text-base font-semibold">
              {status === "connecting" ? "Securing your tunnel…" : "Tap to connect"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "connecting"
                ? "Negotiating keys · WireGuard"
                : "Your traffic is visible to this network"}
            </p>
          </>
        )}
      </div>

      {/* current server */}
      <div className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
        <Flag code={server.code} className="h-8 w-8" title={server.country} />
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-semibold">
            {server.city}, {server.country}
          </span>
          <span className="block text-xs text-muted-foreground">
            {connected ? (
              <>
                {serverIp ?? "—"} · IP masked ·{" "}
                <span className={cn("font-semibold", qualityToneCls[quality.tone])}>
                  {quality.label} · {server.ping} ms
                </span>
              </>
            ) : (
              "Fastest server for you"
            )}
          </span>
        </span>
        <SignalBars strength={barsFor(server.ping)} />
      </div>

      {connected ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Download} label="Download" value={throughput.down.toFixed(1)} unit="Mb/s" />
            <Stat icon={Upload} label="Upload" value={throughput.up.toFixed(1)} unit="Mb/s" />
          </div>

          {/* reassurance card — success-tinted glass */}
          <div className="flex items-start gap-3 rounded-2xl bg-success-soft p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
            <p className="text-xs font-medium leading-relaxed text-success">
              Nobody — not even your ISP — can see your traffic.
            </p>
          </div>
        </>
      ) : (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick connect
          </p>
          <div className="flex flex-col gap-1 rounded-2xl bg-card p-2 shadow-sm">
            <button
              type="button"
              onClick={() => selectServer("ca-tor")}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-brand">
                <Zap className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium">Fastest server</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            {quick.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectServer(s.id)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
              >
                <Flag code={s.code} className="h-7 w-7" title={s.country} />
                <span className="flex-1 text-sm font-medium">
                  {s.country} — {s.city}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* kill switch */}
      <label className="mt-auto flex items-center gap-3 rounded-2xl bg-card p-4 shadow-sm">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted">
          <Lock className="h-4 w-4" />
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-sm font-semibold">Kill switch</span>
          <span className="block text-xs text-muted-foreground">Block internet if VPN disconnects</span>
        </span>
        <Switch.Root
          checked={killSwitch}
          onCheckedChange={setKillSwitch}
          className="relative h-6 w-11 rounded-full bg-border transition-colors data-[state=checked]:bg-brand"
        >
          <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
        </Switch.Root>
      </label>
    </aside>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Download
  label: string
  value: string
  unit: string
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <p className="mt-1 text-xl font-bold tabular-nums">
        {value} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}
