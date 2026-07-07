import { useState } from "react"
import { Zap, ShieldCheck, MousePointerClick } from "lucide-react"
import { Asterisk } from "../components/brand"

const steps = [
  {
    icon: Zap,
    title: "Fast, free & unlimited",
    body: "No data caps. No throttling. No credit card. The fast lane stays open for everyone, forever.",
    cta: "Get started",
  },
  {
    icon: ShieldCheck,
    title: "Your privacy, protected",
    body: "Every connection is encrypted end-to-end — even on public Wi-Fi. We never log what you do online.",
    cta: "Continue",
  },
  {
    icon: MousePointerClick,
    title: "Trusted servers with one tap",
    body: "Tap once and we connect you to the fastest server near you — or press ⌘⇧C from anywhere.",
    cta: "Turn on OqusVPN",
  },
]

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const Icon = step.icon
  const isLast = index === steps.length - 1

  function next() {
    if (isLast) onFinish()
    else setIndex((i) => i + 1)
  }

  return (
    <div className="flex min-h-screen w-screen items-center justify-center p-4 sm:p-8">
      <div className="glass-window flex w-full max-w-md flex-col items-center rounded-[var(--radius-app)] border border-border/60 px-8 py-12 text-center">
        <div className="mb-8 flex items-center gap-2 text-sm font-semibold text-muted">
          <Asterisk className="h-5 w-5 text-brand" />
          Oqus<span className="-ml-1.5 text-brand">VPN</span>
        </div>

        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-soft text-brand">
          <Icon className="h-9 w-9" strokeWidth={2} />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-balance text-foreground">
          {step.title}
        </h1>
        <p className="mt-3 max-w-xs text-pretty leading-relaxed text-muted">{step.body}</p>

        <div className="mt-8 flex items-center gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={
                i === index
                  ? "h-2 w-6 rounded-full bg-brand transition-all"
                  : "h-2 w-2 rounded-full bg-border transition-all"
              }
            />
          ))}
        </div>

        <button
          onClick={next}
          className="mt-8 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-ink"
        >
          {step.cta}
        </button>

        {!isLast && (
          <button
            onClick={onFinish}
            className="mt-3 text-sm font-medium text-muted transition hover:text-foreground"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
