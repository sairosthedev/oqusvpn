import { useEffect, useState } from "react"
import { VpnProvider, useVpn } from "./lib/vpn-context"
import { UiProvider, useUi } from "./lib/ui-context"
import { Sidebar, type Tab } from "./components/sidebar"
import { HomeTab } from "./tabs/home-tab"
import { LocationsTab } from "./tabs/locations-tab"
import { StatisticsTab } from "./tabs/statistics-tab"
import { SettingsTab } from "./tabs/settings-tab"
import { LoginModal } from "./components/login-modal"
import { CommandPalette } from "./components/command-palette"
import { ToastHost } from "./components/toast-host"
import { SplashScreen } from "./screens/splash-screen"
import { OnboardingScreen } from "./screens/onboarding-screen"

type Stage = "splash" | "onboarding" | "app"

const shortcuts: Record<string, Tab> = {
  "1": "home",
  "2": "locations",
  "3": "statistics",
  "4": "settings",
}

function Desktop() {
  const [tab, setTab] = useState<Tab>("home")
  const { focusMode, loginOpen, setLoginOpen, loggedIn, setLoggedIn, setPendingConnect, setPaletteOpen } = useUi()
  const { toggleConnection } = useVpn()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      // ⌘⇧C — connect/disconnect from anywhere
      if (e.shiftKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault()
        toggleConnection()
        return
      }
      // ⌘K — server command palette
      if (e.key === "k" || e.key === "K") {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      // ⌘1–4 — switch panes
      if (shortcuts[e.key]) {
        e.preventDefault()
        setTab(shortcuts[e.key])
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [toggleConnection, setPaletteOpen])

  // If the login prompt closes without a successful login, drop the pending connect intent.
  // Runs after render, so `loggedIn` reflects a just-completed login (which keeps the intent).
  useEffect(() => {
    if (!loginOpen && !loggedIn) setPendingConnect(false)
  }, [loginOpen, loggedIn, setPendingConnect])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {!focusMode && <Sidebar active={tab} onChange={setTab} />}
      <main className="flex flex-1 flex-col overflow-hidden">
        {tab === "home" && <HomeTab />}
        {tab === "locations" && <LocationsTab />}
        {tab === "statistics" && <StatisticsTab />}
        {tab === "settings" && <SettingsTab />}
      </main>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onLogin={() => setLoggedIn(true)} />
      <CommandPalette />
    </div>
  )
}

export default function App() {
  const [stage, setStage] = useState<Stage>("splash")

  return (
    <UiProvider>
      <VpnProvider>
        {stage === "splash" && <SplashScreen onDone={() => setStage("onboarding")} />}
        {stage === "onboarding" && <OnboardingScreen onFinish={() => setStage("app")} />}
        {stage === "app" && <Desktop />}
        <ToastHost />
      </VpnProvider>
    </UiProvider>
  )
}
