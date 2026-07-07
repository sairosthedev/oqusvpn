import { CheckCircle2, ShieldAlert, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUi } from "@/lib/ui-context"

const tones = {
  success: { cls: "bg-success-soft text-success", icon: CheckCircle2 },
  danger: { cls: "bg-danger-soft text-danger", icon: ShieldAlert },
  brand: { cls: "bg-brand-soft text-brand", icon: Info },
} as const

/** Toast pills slide from the top and self-dismiss after ~2.5s. */
export function ToastHost() {
  const { toasts, dismissToast } = useUi()

  return (
    <div className="pointer-events-none fixed inset-x-0 top-5 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => {
        const tone = tones[t.tone]
        const Icon = tone.icon
        return (
          <div
            key={t.id}
            role="status"
            className="animate-toast-in pointer-events-auto flex items-center gap-2.5 rounded-full bg-card py-2 pl-3 pr-2 text-sm font-semibold shadow-lg"
          >
            <span className={cn("grid h-6 w-6 place-items-center rounded-full", tone.cls)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-foreground">{t.message}</span>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
