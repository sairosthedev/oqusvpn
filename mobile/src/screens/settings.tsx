import { useState } from "react"
import { ScrollView, Text, View, Pressable } from "react-native"
import { Wifi, ShieldCheck, Split, Lock, Globe, User, Bell, Sun, Languages, ServerCog, Smartphone, LogOut, Check } from "lucide-react-native"
import { useAuth } from "../context/auth-context"
import { useVpn } from "../context/vpn-context"
import { useTheme, useAppearance, font, type Appearance } from "../context/theme-context"
import { Card, IconBubble, Toggle } from "../components/ui"

const categories = [
  { id: "general", label: "General", icon: Globe },
  { id: "connection", label: "Connection", icon: Wifi },
  { id: "privacy", label: "Privacy", icon: ShieldCheck },
  { id: "account", label: "Account", icon: User },
] as const
const languages = ["English", "Hausa", "Yoruba", "Swahili", "Hindi", "Urdu"]

export function SettingsScreen() {
  const t = useTheme()
  const { user, demo, logout } = useAuth()
  const { killSwitch, setKillSwitch } = useVpn()
  const { appearance, setAppearance } = useAppearance()
  const [active, setActive] = useState<(typeof categories)[number]["id"]>("connection")
  const [autoConnect, setAutoConnect] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [splitTunnel, setSplitTunnel] = useState(false)
  const [privateDns, setPrivateDns] = useState(true)
  const [protocol, setProtocol] = useState("auto")
  const [language, setLanguage] = useState("English")

  const displayName = user.fullName || (demo ? "Guest" : user.email.split("@")[0])
  const initials = displayName.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "G"

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 24, color: t.foreground }}>Settings</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: t.mutedForeground, marginBottom: 16 }}>Manage your preferences and account</Text>

      {/* profile */}
      <Card t={t} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, marginBottom: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.brand, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: "#fff" }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>{displayName}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground }}>{demo ? "Guest mode" : user.phone ?? "Signed in"}</Text>
        </View>
      </Card>

      {/* category selector */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {categories.map(({ id, label, icon: Icon }) => (
          <Pressable key={id} onPress={() => setActive(id)} style={{ flex: 1, alignItems: "center", gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: active === id ? t.brandSoft : t.card }}>
            <Icon size={18} color={active === id ? t.brand : t.muted} />
            <Text style={{ fontFamily: font.medium, fontSize: 11, color: active === id ? t.brand : t.mutedForeground }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* detail */}
      <Card t={t} style={{ padding: 20 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 18, color: t.foreground, textTransform: "capitalize" }}>{active}</Text>

        {active === "general" && (
          <View style={{ marginTop: 4 }}>
            <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <IconBubble icon={Languages} t={t} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>App language</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {languages.map((lang) => (
                      <Pressable key={lang} onPress={() => setLanguage(lang)} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: language === lang ? t.brand : t.surface2 }}>
                        <Text style={{ fontFamily: font.medium, fontSize: 12, color: language === lang ? "#fff" : t.mutedForeground }}>{lang}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
            <Row t={t} icon={Bell} title="Notifications" desc="Rare, factual connection alerts only" control={<Toggle value={notifications} onValueChange={setNotifications} t={t} />} />
            <View style={{ paddingVertical: 16 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <IconBubble icon={Sun} t={t} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>Appearance</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    {(["auto", "light", "dark"] as Appearance[]).map((mode) => (
                      <Pressable key={mode} onPress={() => setAppearance(mode)} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, borderWidth: 1, borderColor: appearance === mode ? t.brand : t.border, backgroundColor: appearance === mode ? t.brandSoft : "transparent", paddingHorizontal: 12, paddingVertical: 8 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: appearance === mode ? t.brand : t.muted, alignItems: "center", justifyContent: "center" }}>
                          {appearance === mode && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.brand }} />}
                        </View>
                        <Text style={{ fontFamily: font.medium, fontSize: 13, color: appearance === mode ? t.brand : t.mutedForeground, textTransform: "capitalize" }}>{mode}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {active === "connection" && (
          <View style={{ marginTop: 4 }}>
            <Row t={t} icon={Wifi} title="Auto-connect" desc="Connect on untrusted Wi-Fi" control={<Toggle value={autoConnect} onValueChange={setAutoConnect} t={t} />} />
            <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: t.border }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <IconBubble icon={ServerCog} t={t} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground, marginBottom: 12 }}>VPN protocol</Text>
                  {[["auto", "Auto", "(recommended)"], ["fastest", "Fastest", "(WireGuard)"], ["compatible", "Most compatible", "(OpenVPN)"]].map(([v, l, h]) => (
                    <Radio key={v} t={t} checked={protocol === v} onPress={() => setProtocol(v)} label={l} hint={h} />
                  ))}
                </View>
              </View>
            </View>
            <Row t={t} icon={Split} title="Split tunneling" desc="Choose apps that bypass the VPN" control={<Toggle value={splitTunnel} onValueChange={setSplitTunnel} t={t} />} />
            <Row t={t} icon={Lock} title="Kill switch" desc="Block internet if VPN disconnects" control={<Toggle value={killSwitch} onValueChange={setKillSwitch} t={t} />} last />
          </View>
        )}

        {active === "privacy" && (
          <View style={{ marginTop: 4 }}>
            <Row t={t} icon={ShieldCheck} title="Private DNS" desc="Encrypt DNS lookups" control={<Toggle value={privateDns} onValueChange={setPrivateDns} t={t} />} />
            <Row t={t} icon={Lock} title="Tracker blocking" desc="1,204 trackers blocked this week" control={<View style={{ backgroundColor: t.successSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}><Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.success }}>Active</Text></View>} />
            <View style={{ flexDirection: "row", gap: 12, paddingVertical: 16 }}>
              <IconBubble icon={ShieldCheck} t={t} />
              <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: t.mutedForeground }}>
                All statistics are computed on-device. OqusVPN keeps no logs of the sites you visit, the apps you use, or your IP address.
              </Text>
            </View>
          </View>
        )}

        {active === "account" && (
          <View style={{ marginTop: 4, gap: 16 }}>
            <View>
              <Row t={t} icon={User} title="Account details" desc={demo ? "Guest mode" : user.email} control={<View style={{ backgroundColor: user.verified ? t.successSoft : t.surface2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ fontFamily: font.semibold, fontSize: 11, color: user.verified ? t.success : t.mutedForeground }}>{user.verified ? "Verified" : "Unverified"}</Text></View>} />
              <Row t={t} icon={Smartphone} title="Connected devices" desc="Manage up to 10 devices" control={<Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>2 / 10</Text>} last />
            </View>
            <Pressable onPress={logout} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingVertical: 12 }}>
              <LogOut size={16} color={t.danger} />
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.danger }}>{demo ? "Exit guest mode" : "Sign out"}</Text>
            </Pressable>
          </View>
        )}
      </Card>
    </ScrollView>
  )
}

function Row({ t, icon: Icon, title, desc, control, last }: { t: any; icon: any; title: string; desc: string; control: React.ReactNode; last?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.border }}>
      <IconBubble icon={Icon} t={t} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>{title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground }}>{desc}</Text>
      </View>
      {control}
    </View>
  )
}

function Radio({ t, checked, onPress, label, hint }: { t: any; checked: boolean; onPress: () => void; label: string; hint: string }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: checked ? t.brand : t.border, backgroundColor: t.card, alignItems: "center", justifyContent: "center" }}>
        {checked && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.brand }} />}
      </View>
      <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.foreground }}>{label}</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 14, color: t.mutedForeground }}>{hint}</Text>
    </Pressable>
  )
}
