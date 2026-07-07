import { useEffect } from "react"
import { Asterisk } from "../components/brand"

export function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-10 px-6">
      {/* Mark with breathing concentric halos */}
      <div className="relative grid h-52 w-52 place-items-center">
        <span className="animate-breathe absolute h-52 w-52 rounded-full bg-brand/10" />
        <span
          className="animate-breathe absolute h-40 w-40 rounded-full bg-brand/15"
          style={{ animationDelay: "0.3s" }}
        />
        <span
          className="animate-breathe absolute h-28 w-28 rounded-full bg-brand/20"
          style={{ animationDelay: "0.6s" }}
        />
        <span className="animate-pop-in relative grid h-24 w-24 place-items-center rounded-[1.75rem] bg-card shadow-lg">
          <Asterisk className="h-12 w-12 text-brand" />
        </span>
      </div>

      {/* Three-tier hierarchy: mark > wordmark > tagline */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Oqus<span className="text-brand">VPN</span>
        </h1>
        <p className="mt-2 text-sm text-muted">100% free VPN. Fast. Private. Unlimited.</p>
      </div>

      {/* Branded indeterminate progress bar (not a bare spinner) */}
      <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-2">
        <span className="animate-loadbar block h-full w-1/3 rounded-full bg-brand" />
      </div>
    </div>
  )
}
