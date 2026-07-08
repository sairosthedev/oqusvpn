import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from "react-native"
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter"
import { Home as HomeIcon, Globe, BarChart3, Settings as SettingsIcon } from "lucide-react-native"
import { api, ApiError, type AuthUser } from "./src/lib/api"
import { DEMO_TOKEN, DEMO_USER } from "./src/lib/demo"
import { storage } from "./src/lib/storage"
import { nativeVpn } from "./src/lib/vpn"
import { ThemeProvider, useTheme, font } from "./src/context/theme-context"
import { AuthProvider } from "./src/context/auth-context"
import { VpnProvider } from "./src/context/vpn-context"
import { Asterisk, PrimaryButton } from "./src/components/ui"
import { Splash } from "./src/screens/splash"
import { Onboarding } from "./src/screens/onboarding"
import { HomeScreen } from "./src/screens/home"
import { LocationsScreen } from "./src/screens/locations"
import { StatisticsScreen } from "./src/screens/statistics"
import { SettingsScreen } from "./src/screens/settings"

type Stage = "splash" | "onboarding" | "app"
type TabKey = "home" | "locations" | "stats" | "settings"

export default function App() {
  const [loaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  })
  return (
    <SafeAreaProvider>
      <ThemeProvider>{loaded ? <Root /> : <BootSplash />}</ThemeProvider>
    </SafeAreaProvider>
  )
}

function BootSplash() {
  const t = useTheme()
  return <View style={{ flex: 1, backgroundColor: t.background }} />
}

function Root() {
  const t = useTheme()
  const [stage, setStage] = useState<Stage>("splash")
  const [booting, setBooting] = useState(true)
  const [onboarded, setOnboarded] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    ;(async () => {
      const [saved, ob] = await Promise.all([storage.getToken(), storage.getOnboarded()])
      setOnboarded(ob)
      if (saved === DEMO_TOKEN) { setToken(saved); setUser(DEMO_USER) }
      else if (saved) {
        try { const { user } = await api.me(saved); setToken(saved); setUser(user) }
        catch { await storage.clearToken() }
      }
      setBooting(false)
    })()
  }, [])

  const onAuthed = useCallback(async (tok: string, u: AuthUser) => {
    await storage.setToken(tok); setToken(tok); setUser(u)
  }, [])
  const logout = useCallback(async () => {
    await nativeVpn.disconnect().catch(() => {})
    await storage.clearToken(); setToken(null); setUser(null)
  }, [])

  if (stage === "splash") return <Splash onDone={() => setStage(onboarded ? "app" : "onboarding")} />
  if (stage === "onboarding") return <Onboarding onFinish={() => { storage.setOnboarded(); setStage("app") }} />

  if (booting) {
    return <View style={{ flex: 1, backgroundColor: t.background, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={t.brand} size="large" /></View>
  }
  if (token && user) return <AuthedApp token={token} user={user} setUser={setUser} onLogout={logout} />
  return <AuthScreen onAuthed={onAuthed} />
}

// --- Auth ------------------------------------------------------------------
function AuthScreen({ onAuthed }: { onAuthed: (t: string, u: AuthUser) => void }) {
  const t = useTheme()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password) return
    setBusy(true)
    try {
      const res = mode === "login" ? await api.login(email.trim(), password) : await api.signup(email.trim(), password)
      onAuthed(res.token, res.user)
    } catch (e) {
      Alert.alert("Sign in failed", e instanceof ApiError ? e.message : "Something went wrong")
    } finally { setBusy(false) }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Asterisk size={56} color={t.brand} />
      <Text style={{ fontFamily: font.extrabold, fontSize: 32, color: t.foreground, marginTop: 16 }}>Oqus<Text style={{ color: t.brand }}>VPN</Text></Text>
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: t.muted, marginTop: 8, textAlign: "center" }}>100% free VPN. Fast. Private. Unlimited.</Text>

      <View style={{ width: "100%", maxWidth: 400, marginTop: 32 }}>
        <TextInput style={inputStyle(t)} placeholder="Email" placeholderTextColor={t.mutedForeground} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={[inputStyle(t), { marginTop: 12 }]} placeholder="Password" placeholderTextColor={t.mutedForeground} secureTextEntry value={password} onChangeText={setPassword} />
        <PrimaryButton label={busy ? "…" : mode === "login" ? "Log in" : "Sign up"} onPress={submit} t={t} style={{ marginTop: 16 }} />
        <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")} style={{ alignItems: "center", marginTop: 16 }}>
          <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.muted }}>{mode === "login" ? "No account? Sign up" : "Have an account? Log in"}</Text>
        </Pressable>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, opacity: 0.6 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: t.muted }} />
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.muted }}>or</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: t.muted }} />
        </View>
        <Pressable onPress={() => onAuthed(DEMO_TOKEN, DEMO_USER)} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 15, color: t.foreground }}>Skip for now — explore the app</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
const inputStyle = (t: any) => ({ borderWidth: 1, borderColor: t.border, backgroundColor: t.card, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontFamily: font.regular, fontSize: 15, color: t.foreground })

// --- Authed app (providers + tabs) -----------------------------------------
function AuthedApp({ token, user, setUser, onLogout }: { token: string; user: AuthUser; setUser: (u: AuthUser) => void; onLogout: () => void }) {
  const demo = token === DEMO_TOKEN
  const onNeedsVerify = useCallback(() => promptVerify(token, setUser), [token, setUser])
  return (
    <AuthProvider value={{ token, user, demo, setUser, logout: onLogout }}>
      <VpnProvider token={token} demo={demo} onNeedsVerify={onNeedsVerify}>
        <Shell />
      </VpnProvider>
    </AuthProvider>
  )
}

function Shell() {
  const t = useTheme()
  const [tab, setTab] = useState<TabKey>("home")
  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "locations", label: "Locations", icon: Globe },
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "settings", label: "Settings", icon: SettingsIcon },
  ]
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }} edges={["top", "left", "right"]}>
      <StatusBar style={t.dark ? "light" : "dark"} />
      <View style={{ flex: 1 }}>
        {tab === "home" && <HomeScreen onChangeLocation={() => setTab("locations")} />}
        {tab === "locations" && <LocationsScreen />}
        {tab === "stats" && <StatisticsScreen />}
        {tab === "settings" && <SettingsScreen />}
      </View>
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: t.card }}>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: t.border, paddingTop: 8, paddingBottom: 4 }}>
          {tabs.map(({ key, label, icon: Icon }) => {
            const on = key === tab
            return (
              <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 }}>
                <Icon size={22} color={on ? t.brand : t.mutedForeground} strokeWidth={on ? 2.4 : 2} />
                <Text style={{ fontFamily: on ? font.semibold : font.medium, fontSize: 11, color: on ? t.brand : t.mutedForeground }}>{label}</Text>
              </Pressable>
            )
          })}
        </View>
      </SafeAreaView>
    </SafeAreaView>
  )
}

function promptVerify(token: string, setUser: (u: AuthUser) => void) {
  if (Platform.OS !== "ios" || typeof Alert.prompt !== "function") {
    Alert.alert("Verify your account", "You've reached the free limit. Verification (full name + phone) is coming to mobile — verify on the web app for now.")
    return
  }
  Alert.prompt("Verify your account", "Enter your full name to keep connecting.", (fullName?: string) => {
    if (!fullName) return
    Alert.prompt("Phone number", "Enter your phone number.", async (phone?: string) => {
      if (!phone) return
      try { const { user } = await api.verify(token, { fullName, phone }); setUser(user); Alert.alert("Verified", "You can connect again now.") }
      catch (e) { Alert.alert("Verification failed", e instanceof ApiError ? e.message : "Try again") }
    })
  })
}
