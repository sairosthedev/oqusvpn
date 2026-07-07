import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { Asterisk } from "./brand"

export function LoginModal({
  open,
  onOpenChange,
  onLogin,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onLogin: () => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function submit(e: React.FormEvent) {
    e.preventDefault()
    onLogin()
    onOpenChange(false)
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
              <Asterisk className="h-7 w-7 text-brand" />
            </div>
            <Dialog.Title className="mt-5 text-xl font-semibold text-foreground">
              Welcome back
            </Dialog.Title>
            <Dialog.Description className="mt-1.5 text-sm text-muted">
              Log in to connect and sync across your devices
            </Dialog.Description>
          </div>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-sm font-medium text-foreground">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-sm font-medium text-foreground">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>

            <button
              type="button"
              className="-mt-1 self-end text-xs font-medium text-brand transition hover:text-brand-ink"
            >
              Forgot password?
            </button>

            <button
              type="submit"
              className="mt-1 w-full rounded-xl bg-brand py-3 font-semibold text-white transition hover:bg-brand-ink"
            >
              Log in
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <button className="font-semibold text-brand transition hover:text-brand-ink">
              Sign up
            </button>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
