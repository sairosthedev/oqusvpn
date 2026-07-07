import { useState } from "react"
import {
  ChevronRight,
  Wifi,
  ShieldCheck,
  Split,
  Lock,
  Globe,
  User,
  Bell,
  Sun,
  Languages,
  ServerCog,
  Crown,
  Smartphone,
  LogOut,
} from "lucide-react"
import * as Switch from "@radix-ui/react-switch"
import * as RadioGroup from "@radix-ui/react-radio-group"
import { cn } from "@/lib/utils"
import { useVpn, type Appearance } from "@/lib/vpn-context"
import { useUi } from "@/lib/ui-context"

const categories = [
  { id: "general", label: "General", icon: Globe },
  { id: "connection", label: "Connection", icon: Wifi },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "account", label: "Account", icon: User },
] as const

const languages = ["English", "Hausa", "Yoruba", "Swahili", "Hindi", "Urdu"]

export function SettingsTab({ onUpgrade }: { onUpgrade: () => void }) {
  const { appearance, setAppearance } = useVpn()
  const { toast, setLoginOpen, loggedIn, setLoggedIn } = useUi()
  const [active, setActive] = useState<(typeof categories)[number]["id"]>("connection")

  const [autoConnect, setAutoConnect] = useState(true)
  const [launchStartup, setLaunchStartup] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [splitTunnel, setSplitTunnel] = useState(false)
  const [killSwitch, setKillSwitch] = useState(true)
  const [privateDns, setPrivateDns] = useState(true)
  const [protocol, setProtocol] = useState("auto")
  const [language, setLanguage] = useState("English")

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-sm text-muted-foreground">Manage your preferences and account</p>

      <div className="flex gap-6">
        {/* master list */}
        <div className="w-64 shrink-0">
          <button
            type="button"
            onClick={() => setActive("account")}
            className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-sm transition hover:bg-surface-2"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
              AO
            </span>
            <span className="flex-1 leading-tight">
              <span className="block text-sm font-semibold">Ada Okonkwo</span>
              <span className="block text-xs text-muted-foreground">{loggedIn ? "Premium · synced" : "Free plan"}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-sm">
            {categories.map(({ id, label, icon: Icon }, i) => (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium transition-colors",
                  i !== categories.length - 1 && "border-b border-border/60",
                  active === id ? "text-brand" : "text-foreground hover:bg-surface-2",
                )}
              >
                <Icon className={cn("h-4 w-4", active === id ? "text-brand" : "text-muted")} />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* detail */}
        <div className="flex-1">
          <div key={active} className="animate-toast-in rounded-2xl bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold capitalize">{active}</h2>

            {active === "general" && (
              <div className="mt-4 flex flex-col divide-y divide-border/60">
                {/* App language */}
                <div className="flex items-start gap-3 py-4">
                  <IconBubble icon={Languages} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">App language</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {languages.map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => {
                            setLanguage(lang)
                            toast(`Language · ${lang}`, "brand")
                          }}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            language === lang
                              ? "bg-brand text-white"
                              : "bg-surface-2 text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Row
                  icon={Bell}
                  title="Notifications"
                  desc="Rare, factual connection alerts only"
                  control={<Toggle checked={notifications} onChange={setNotifications} />}
                />

                {/* Appearance */}
                <div className="flex items-start gap-3 py-4">
                  <IconBubble icon={Sun} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Appearance</p>
                    <p className="text-xs text-muted-foreground">Previewed live behind this panel</p>
                    <RadioGroup.Root
                      value={appearance}
                      onValueChange={(v) => setAppearance(v as Appearance)}
                      className="mt-3 flex gap-2"
                    >
                      {(["auto", "light", "dark"] as Appearance[]).map((mode) => (
                        <label
                          key={mode}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors",
                            appearance === mode
                              ? "border-brand bg-brand-soft text-brand"
                              : "border-border text-muted-foreground hover:border-brand/50",
                          )}
                        >
                          <RadioGroup.Item
                            value={mode}
                            className="grid h-4 w-4 place-items-center rounded-full border border-current"
                          >
                            <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-current" />
                          </RadioGroup.Item>
                          {mode}
                        </label>
                      ))}
                    </RadioGroup.Root>
                  </div>
                </div>

                <Row
                  icon={Wifi}
                  title="Launch at startup"
                  desc="Open OqusVPN when your computer starts"
                  control={<Toggle checked={launchStartup} onChange={setLaunchStartup} />}
                />
              </div>
            )}

            {active === "connection" && (
              <div className="mt-4 flex flex-col divide-y divide-border/60">
                <Row
                  icon={Wifi}
                  title="Auto-connect"
                  desc="Connect on untrusted Wi-Fi"
                  control={<Toggle checked={autoConnect} onChange={setAutoConnect} />}
                />
                <div className="flex items-start gap-3 py-4">
                  <IconBubble icon={ServerCog} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">VPN protocol</p>
                    <RadioGroup.Root
                      value={protocol}
                      onValueChange={setProtocol}
                      className="mt-3 flex flex-col gap-3"
                    >
                      <Radio value="auto" label="Auto" hint="(recommended)" />
                      <Radio value="fastest" label="Fastest" hint="(WireGuard)" />
                      <Radio value="compatible" label="Most compatible" hint="(OpenVPN)" />
                    </RadioGroup.Root>
                  </div>
                </div>
                <Row
                  icon={Split}
                  title="Split tunneling"
                  desc="Choose apps that bypass the VPN"
                  control={<Toggle checked={splitTunnel} onChange={setSplitTunnel} />}
                />
                <Row
                  icon={Lock}
                  title="Kill switch"
                  desc="Block internet if VPN disconnects"
                  control={<Toggle checked={killSwitch} onChange={setKillSwitch} />}
                />
              </div>
            )}

            {active === "privacy" && (
              <div className="mt-4 flex flex-col divide-y divide-border/60">
                <Row
                  icon={ShieldCheck}
                  title="Private DNS"
                  desc="Encrypt DNS lookups"
                  control={<Toggle checked={privateDns} onChange={setPrivateDns} />}
                />
                <div className="flex items-center gap-3 py-4">
                  <IconBubble icon={Lock} />
                  <span className="flex-1 leading-tight">
                    <span className="block text-sm font-semibold">Tracker blocking</span>
                    <span className="block text-xs text-muted-foreground">1,204 trackers blocked this week</span>
                  </span>
                  <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success">
                    Active
                  </span>
                </div>
                <div className="flex items-start gap-3 py-4">
                  <IconBubble icon={ShieldCheck} />
                  <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                    All statistics are computed on-device. OqusVPN keeps no logs of the sites you visit,
                    the apps you use, or your IP address.
                  </p>
                </div>
              </div>
            )}

            {active === "account" && (
              <div className="mt-4 flex flex-col gap-4">
                {/* upgrade banner */}
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="flex items-center gap-3 rounded-2xl bg-brand p-4 text-left text-white shadow-lg shadow-brand/30 transition hover:scale-[1.01]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-white/20">
                    <Crown className="h-5 w-5" />
                  </span>
                  <span className="flex-1 leading-tight">
                    <span className="block text-sm font-semibold">Upgrade to Premium</span>
                    <span className="block text-xs text-white/80">Faster servers · more regions · ad-free</span>
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="flex flex-col divide-y divide-border/60">
                  <Row
                    icon={User}
                    title="Account details"
                    desc={loggedIn ? "ada.okonkwo@oqus.app" : "Not signed in"}
                    control={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  />
                  <Row
                    icon={Smartphone}
                    title="Connected devices"
                    desc="Manage up to 10 devices"
                    control={<span className="text-sm font-semibold tabular-nums">2 / 10</span>}
                  />
                </div>

                {loggedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLoggedIn(false)
                      toast("Signed out", "brand")
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold text-danger transition hover:bg-danger-soft"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="rounded-xl bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-ink"
                  >
                    Log in to sync
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function IconBubble({ icon: Icon }: { icon: typeof Wifi }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
      <Icon className="h-4 w-4" />
    </span>
  )
}

function Row({
  icon: Icon,
  title,
  desc,
  control,
}: {
  icon: typeof Wifi
  title: string
  desc: string
  control: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 py-4">
      <IconBubble icon={Icon} />
      <span className="flex-1 leading-tight">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      {control}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      className="relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors data-[state=checked]:bg-brand"
    >
      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  )
}

function Radio({ value, label, hint }: { value: string; label: string; hint: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <RadioGroup.Item
        value={value}
        className="grid h-5 w-5 place-items-center rounded-full border border-border bg-card data-[state=checked]:border-brand"
      >
        <RadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-brand" />
      </RadioGroup.Item>
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{hint}</span>
    </label>
  )
}
