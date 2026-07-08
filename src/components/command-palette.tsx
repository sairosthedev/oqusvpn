import { useEffect, useMemo, useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Search, Power, Command } from "lucide-react"
import { barsFor } from "@/lib/data"
import { useVpn } from "@/lib/vpn-context"
import { useUi } from "@/lib/ui-context"
import { cn } from "@/lib/utils"
import { SignalBars } from "./brand"
import { Flag } from "./flag"

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useUi()
  const { servers, server, status, selectServer, toggleConnection } = useVpn()
  const [query, setQuery] = useState("")
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return servers
    return servers.filter((s) => `${s.country} ${s.city}`.toLowerCase().includes(q))
  }, [query, servers])

  // Reset state each time the palette opens.
  useEffect(() => {
    if (paletteOpen) {
      setQuery("")
      setActive(0)
    }
  }, [paletteOpen])

  useEffect(() => {
    setActive(0)
  }, [query])

  function choose(id: string) {
    selectServer(id)
    setPaletteOpen(false)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const pick = results[active]
      if (pick) choose(pick.id)
    }
  }

  return (
    <Dialog.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className="fixed left-1/2 top-[18%] z-[70] w-[560px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Search servers or toggle the connection</Dialog.Description>

          <div className="flex items-center gap-3 border-b border-border/60 px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search a server or type a command…"
              className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden shrink-0 items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:flex">
              esc
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {/* Connection action */}
            <button
              type="button"
              onClick={() => {
                toggleConnection()
                setPaletteOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-soft text-brand">
                <Power className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-medium">
                {status === "connected" ? "Disconnect" : "Connect now"}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <Command className="h-3 w-3" />⇧C
              </span>
            </button>

            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {results.length} {results.length === 1 ? "server" : "servers"}
            </p>

            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">No servers match “{query}”.</p>
            )}

            {results.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  i === active ? "bg-surface-2" : "hover:bg-surface-2",
                )}
              >
                <Flag code={s.code} className="h-7 w-7" title={s.country} />
                <span className="flex-1 leading-tight">
                  <span className="block text-sm font-semibold">
                    {s.country} — {s.city}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {s.ping} ms · {s.load}% load
                  </span>
                </span>
                {s.id === server.id && (
                  <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">
                    Current
                  </span>
                )}
                <SignalBars strength={barsFor(s.ping)} />
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
