import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Loader2, ShieldCheck } from "lucide-react"
import { useUi } from "@/lib/ui-context"

export function VerifyModal({
  open,
  onOpenChange,
  onVerified,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onVerified: () => void
}) {
  const { verify, user } = useUi()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await verify(fullName, phone)
      onOpenChange(false)
      onVerified() // resume the connection the user was trying to make
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border/60 bg-card p-8 shadow-2xl focus:outline-none">
          <Dialog.Close className="absolute right-4 top-4 rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-foreground">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
              <ShieldCheck className="h-7 w-7 text-brand" />
            </div>
            <Dialog.Title className="mt-5 text-xl font-semibold text-foreground">Verify to keep going</Dialog.Title>
            <Dialog.Description className="mt-1.5 text-sm text-muted">
              You've hit the free limit. Add your name and phone to keep connecting — no extra steps after this.
            </Dialog.Description>
          </div>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            {user?.email && (
              <label className="flex flex-col gap-1.5 text-left">
                <span className="text-sm font-medium text-foreground">Email</span>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-muted-foreground outline-none"
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-sm font-medium text-foreground">Full name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-sm font-medium text-foreground">Phone number</span>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234 801 234 5678"
                className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-ink disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify &amp; connect
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            We use this only to secure your account. See our privacy policy.
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
