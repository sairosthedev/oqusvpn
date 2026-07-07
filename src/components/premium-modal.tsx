import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Check, Crown, X, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

type Plan = {
  id: string
  name: string
  anchor?: string
  price: string
  per: string
  sub: string
  badge?: string
}

// Truthful anchor pricing — strikethrough is the real 1-month × term, never invented.
const plans: Plan[] = [
  {
    id: "12mo",
    name: "12 months",
    anchor: "$35.99",
    price: "$11.99",
    per: "/year",
    sub: "$2.99 / month · billed yearly",
    badge: "Save 67%",
  },
  {
    id: "6mo",
    name: "6 months",
    anchor: "$17.99",
    price: "$8.99",
    per: "/6 mo",
    sub: "$4.49 / month · billed every 6 months",
    badge: "Save 50%",
  },
  {
    id: "1mo",
    name: "1 month",
    price: "$9.99",
    per: "/month",
    sub: "Billed monthly",
  },
]

const perks = ["Ultra-fast servers", "No-logs policy", "Up to 10 devices", "24/7 support"]

export function PremiumModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [selected, setSelected] = useState("12mo") // best value pre-selects, still changeable

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[480px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card p-7 shadow-2xl">
          <Dialog.Close className="absolute right-5 top-5 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white">
            <Crown className="h-6 w-6" />
          </span>
          <Dialog.Title className="mt-4 text-xl font-bold">
            Upgrade to <span className="text-brand">Premium</span>
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Free stays genuinely unlimited. Premium adds speed, reach, and an ad-free experience.
          </Dialog.Description>

          {/* plan cards — radio left / price right */}
          <div className="mt-5 flex flex-col gap-2.5">
            {plans.map((p) => {
              const isSel = selected === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                    isSel
                      ? "border-brand bg-brand-soft shadow-md"
                      : "border-border bg-surface hover:border-brand/40",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                      isSel ? "border-brand bg-brand text-white" : "border-muted-foreground/50",
                    )}
                  >
                    {isSel && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 leading-tight">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {p.name}
                      {p.badge && (
                        <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                          {p.badge}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{p.sub}</span>
                  </span>
                  <span className="text-right leading-tight">
                    {p.anchor && (
                      <span className="block text-xs text-muted-foreground line-through">{p.anchor}</span>
                    )}
                    <span className="text-lg font-bold">{p.price}</span>
                    <span className="text-xs font-medium text-muted-foreground">{p.per}</span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* benefit chips */}
          <ul className="mt-5 grid grid-cols-2 gap-2.5">
            {perks.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-sm">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                  <Check className="h-3 w-3" />
                </span>
                {perk}
              </li>
            ))}
          </ul>

          {/* money-back guarantee sits directly above the CTA */}
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            30-day money-back guarantee. Cancel anytime, risk-free.
          </p>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-3 w-full rounded-full bg-brand py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01]"
          >
            Continue
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Press Esc to dismiss</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
