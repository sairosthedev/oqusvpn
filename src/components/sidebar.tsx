import { Home, Globe, BarChart3, Settings, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Asterisk } from "./brand"
import { useVpn } from "@/lib/vpn-context"
import { useUi } from "@/lib/ui-context"

export type Tab = "home" | "locations" | "statistics" | "settings"

const items: { id: Tab; label: string; icon: typeof Home; key: string }[] = [
  { id: "home", label: "Home", icon: Home, key: "⌘1" },
  { id: "locations", label: "Locations", icon: Globe, key: "⌘2" },
  { id: "statistics", label: "Statistics", icon: BarChart3, key: "⌘3" },
  { id: "settings", label: "Settings", icon: Settings, key: "⌘4" },
]

export function Sidebar({
  active,
  onChange,
}: {
  active: Tab
  onChange: (t: Tab) => void
}) {
  const { theme, toggleTheme } = useVpn()
  const { loggedIn, logout, toast } = useUi()

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-6 border-r border-border/70 bg-surface/60 p-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <Asterisk className="text-brand" />
          <span>
            Oqus <span className="text-brand">VPN</span>
          </span>
        </span>
        <button
          type="button"
          onClick={toggleTheme}
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
          aria-label="Toggle theme"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Primary">
        {items.map(({ id, label, icon: Icon, key }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-card text-brand shadow-sm"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  isActive ? "bg-brand-soft text-brand" : "bg-surface-2 text-muted-foreground",
                )}
              >
                {key}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto px-1">
        {loggedIn ? (
          <button
            type="button"
            onClick={() => {
              logout()
              toast("Signed out", "brand")
            }}
            className="text-sm font-medium text-muted transition-colors hover:text-danger"
          >
            Log out
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">Not signed in</p>
        )}
      </div>
    </aside>
  )
}
