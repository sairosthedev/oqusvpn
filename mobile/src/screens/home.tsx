import { ScrollView, Text, View, Pressable } from "react-native"
import { Download, Upload, Lock, ShieldCheck, Zap, ChevronRight, MapPin } from "lucide-react-native"
import { useVpn } from "../context/vpn-context"
import { useTheme } from "../context/theme-context"
import { font } from "../context/theme-context"
import { barsFor, flagEmoji, formatDuration, qualityFor } from "../lib/theme"
import { Card, ConnectButton, Flag, IconBubble, SignalBars, Toggle } from "../components/ui"

const toneColor = (t: any, tone: string) => (tone === "success" ? t.success : tone === "warning" ? t.warning : tone === "danger" ? t.danger : t.brand)

export function HomeScreen({ onChangeLocation }: { onChangeLocation?: () => void }) {
  const t = useTheme()
  const { server, servers, status, elapsed, throughput, switching, killSwitch, setKillSwitch, serverIp, toggleConnection, selectServer } = useVpn()
  const connected = status === "connected"
  const quality = server ? qualityFor(server.ping) : null
  const quick = servers.filter((s) => ["ng-lag", "us-ny", "us-va"].includes(s.id)).slice(0, 2)

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {/* connect card */}
      <Card t={t} style={{ padding: 24, alignItems: "center" }}>
        <ConnectButton status={status} onPress={toggleConnection} t={t} />
        {connected ? (
          <>
            <Text style={{ fontFamily: font.medium, fontSize: 14, color: switching ? t.brand : t.muted, marginTop: 16 }}>
              {switching ? "Switching server…" : "Connected · AES-256"}
            </Text>
            <Text style={{ fontFamily: font.bold, fontSize: 30, color: t.foreground, marginTop: 4, fontVariant: ["tabular-nums"] }}>{formatDuration(elapsed)}</Text>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: font.semibold, fontSize: 16, color: t.foreground, marginTop: 16 }}>
              {status === "connecting" ? "Securing your tunnel…" : "Tap to connect"}
            </Text>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground, marginTop: 4, textAlign: "center" }}>
              {status === "connecting" ? "Negotiating keys · WireGuard" : "Your traffic is visible to this network"}
            </Text>
          </>
        )}
      </Card>

      {/* current server + change location */}
      {server && (
        <Card t={t} style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Flag emoji={flagEmoji(server.code)} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>{server.city}, {server.country}</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground }}>
                {connected ? (
                  <>
                    {serverIp ?? "—"} · IP masked · <Text style={{ fontFamily: font.semibold, color: toneColor(t, quality!.tone) }}>{quality!.label} · {server.ping} ms</Text>
                  </>
                ) : "Fastest server for you"}
              </Text>
            </View>
            <SignalBars strength={barsFor(server.ping)} t={t} />
          </View>

          <Pressable
            onPress={onChangeLocation}
            style={({ pressed }) => ({
              flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingVertical: 10, paddingHorizontal: 12,
              borderRadius: 999, backgroundColor: pressed ? t.brand + "22" : t.brandSoft,
            })}
          >
            <MapPin size={16} color={t.brand} />
            <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 13, color: t.brand }}>Change location</Text>
            <ChevronRight size={16} color={t.brand} />
          </Pressable>
        </Card>
      )}

      {connected ? (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatTile t={t} icon={Download} label="Download" value={throughput.down.toFixed(1)} unit="Mb/s" />
            <StatTile t={t} icon={Upload} label="Upload" value={throughput.up.toFixed(1)} unit="Mb/s" />
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, backgroundColor: t.successSoft, padding: 16 }}>
            <ShieldCheck size={20} color={t.success} />
            <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 12, lineHeight: 18, color: t.success }}>
              Nobody — not even your ISP — can see your traffic.
            </Text>
          </View>
        </>
      ) : (
        <View>
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.mutedForeground, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 }}>Quick connect</Text>
          <Card t={t} style={{ padding: 8 }}>
            <Pressable onPress={() => selectServer(servers.find((s) => s.fastest)?.id ?? servers[0]?.id ?? "")} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.brandSoft, alignItems: "center", justifyContent: "center" }}>
                <Zap size={16} color={t.brand} />
              </View>
              <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: t.foreground }}>Fastest server</Text>
              <ChevronRight size={16} color={t.mutedForeground} />
            </Pressable>
            {quick.map((s) => (
              <Pressable key={s.id} onPress={() => selectServer(s.id)} style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Flag emoji={flagEmoji(s.code)} size={28} />
                <Text style={{ flex: 1, fontFamily: font.medium, fontSize: 14, color: t.foreground }}>{s.country} — {s.city}</Text>
                <ChevronRight size={16} color={t.mutedForeground} />
              </Pressable>
            ))}
          </Card>
        </View>
      )}

      {/* kill switch */}
      <Card t={t} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
          <Lock size={16} color={t.muted} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>Kill switch</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground }}>Block internet if VPN disconnects</Text>
        </View>
        <Toggle value={killSwitch} onValueChange={setKillSwitch} t={t} />
      </Card>
    </ScrollView>
  )
}

function StatTile({ t, icon: Icon, label, value, unit }: { t: any; icon: any; label: string; value: string; unit: string }) {
  return (
    <Card t={t} style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon size={14} color={t.mutedForeground} />
        <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.mutedForeground }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: font.bold, fontSize: 20, color: t.foreground, marginTop: 4, fontVariant: ["tabular-nums"] }}>
        {value} <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.mutedForeground }}>{unit}</Text>
      </Text>
    </Card>
  )
}
