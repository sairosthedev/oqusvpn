import { cn } from "@/lib/utils"

export function Asterisk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("h-6 w-6", className)} aria-hidden="true">
      <g fill="currentColor">
        {[0, 60, 120].map((deg) => (
          <rect
            key={deg}
            x="21"
            y="4"
            width="6"
            height="40"
            rx="3"
            transform={`rotate(${deg} 24 24)`}
          />
        ))}
      </g>
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 font-semibold", className)}>
      <Asterisk className="text-brand" />
      <span className="text-foreground">
        Oqus<span className="text-brand">VPN</span>
      </span>
    </span>
  )
}

export function SignalBars({
  strength = 4,
  className,
}: {
  strength?: number
  className?: string
}) {
  return (
    <span className={cn("flex items-end gap-0.5", className)} aria-hidden="true">
      {[1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={cn(
            "w-1 rounded-sm",
            bar <= strength ? "bg-brand" : "bg-border",
          )}
          style={{ height: `${bar * 3 + 3}px` }}
        />
      ))}
    </span>
  )
}
