import { Power } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Status } from "@/lib/vpn-context"

export function ConnectButton({
  status,
  onClick,
  size = 132,
}: {
  status: Status
  onClick: () => void
  size?: number
}) {
  const connected = status === "connected"
  const connecting = status === "connecting"

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={connected ? "Disconnect" : "Connect"}
      className="group relative grid place-items-center rounded-full outline-none transition-transform active:scale-[0.96]"
      style={{ width: size, height: size }}
    >
      {/* radar sweep halos while connecting */}
      {connecting && (
        <>
          <span className="animate-radar absolute inset-0 rounded-full bg-brand/25" />
          <span
            className="animate-radar absolute inset-0 rounded-full bg-brand/20"
            style={{ animationDelay: "0.6s" }}
          />
          <span
            className="animate-radar absolute inset-0 rounded-full bg-brand/15"
            style={{ animationDelay: "1.2s" }}
          />
        </>
      )}

      {/* outer soft ring */}
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-300",
          connected ? "bg-brand-soft" : "bg-surface-2/70",
        )}
      />

      {/* rotating progress arc while connecting */}
      {connecting && (
        <span className="absolute inset-1 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
      )}

      {/* inner core — floods radially on connect */}
      <span
        className={cn(
          "relative grid place-items-center rounded-full transition-all duration-300",
          connected
            ? "animate-core-fill bg-brand text-white shadow-lg shadow-brand/40"
            : "bg-card text-muted shadow-md group-hover:text-brand",
        )}
        style={{ width: size * 0.62, height: size * 0.62 }}
      >
        <Power
          className={cn("h-1/3 w-1/3 transition-transform duration-300", connecting && "animate-pulse")}
          strokeWidth={2.5}
        />
      </span>
    </button>
  )
}
