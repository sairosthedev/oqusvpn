import { useEffect, useState } from "react"
import { ScrollView, Text, View } from "react-native"
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg"
import { Download, Upload, ShieldCheck } from "lucide-react-native"
import { api, type UsageStats } from "../lib/api"
import { useAuth } from "../context/auth-context"
import { useVpn } from "../context/vpn-context"
import { useTheme } from "../context/theme-context"
import { font } from "../context/theme-context"
import { fmtBytes, fmtHM } from "../lib/theme"
import { Card } from "../components/ui"

export function StatisticsScreen() {
  const t = useTheme()
  const { token, demo } = useAuth()
  const { status } = useVpn()
  const [stats, setStats] = useState<UsageStats | null>(null)

  useEffect(() => {
    if (demo || !token) return
    api.getStats(token).then((r) => setStats(r.stats)).catch(() => {})
  }, [token, status, demo])

  const down = stats?.bytesDown ?? 0
  const up = stats?.bytesUp ?? 0
  const total = down + up
  const dPct = total > 0 ? Math.round((down / total) * 100) : 0

  const dailyMap = new Map((stats?.daily ?? []).map((d) => [d.day, d.sec]))
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const key = d.toISOString().slice(0, 10)
    return { label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()], hours: (dailyMap.get(key) ?? 0) / 3600 }
  })
  const maxH = Math.max(0.1, ...days.map((d) => d.hours))
  const W = 320, H = 150
  const pts = days.map((d, i) => ({ x: (i / (days.length - 1)) * W, y: H - (d.hours / maxH) * (H - 20) - 10 }))
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 24, color: t.foreground }}>Statistics</Text>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: t.mutedForeground, marginBottom: 20 }}>Your real connection and data usage</Text>

      {/* time protected + chart */}
      <Card t={t} style={{ padding: 24 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.mutedForeground }}>Time protected</Text>
            <Text style={{ fontFamily: font.bold, fontSize: 30, color: t.brand, marginTop: 4, fontVariant: ["tabular-nums"] }}>{fmtHM(stats?.durationSec ?? 0)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.successSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.success }} />
            <Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.success }}>{status === "connected" ? "Connected" : "Idle"}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={t.brand} stopOpacity={0.22} />
                <Stop offset="1" stopColor={t.brand} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75, 1].map((g) => (
              <Line key={g} x1={0} x2={W} y1={H - g * (H - 20) - 10} y2={H - g * (H - 20) - 10} stroke={t.border} strokeWidth={1} />
            ))}
            <Path d={`${path} L${W},${H} L0,${H} Z`} fill="url(#area)" />
            <Path d={path} fill="none" stroke={t.brand} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={4} fill={t.card} stroke={t.brand} strokeWidth={2} />
            ))}
          </Svg>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            {days.map((d, i) => (
              <Text key={i} style={{ fontFamily: font.regular, fontSize: 11, color: t.mutedForeground }}>{d.label}</Text>
            ))}
          </View>
        </View>
      </Card>

      {/* data + sessions */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
        <Card t={t} style={{ flex: 1, padding: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.foreground }}>Data</Text>
            <Text style={{ fontFamily: font.bold, fontSize: 16, color: t.foreground, fontVariant: ["tabular-nums"] }}>{fmtBytes(total)}</Text>
          </View>
          <Bar t={t} label={`Down ${fmtBytes(down)}`} pct={dPct} />
          <Bar t={t} label={`Up ${fmtBytes(up)}`} pct={100 - dPct} />
        </Card>
        <Card t={t} style={{ flex: 1, padding: 20 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 13, color: t.foreground }}>Sessions</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 30, color: t.foreground, marginTop: 4, fontVariant: ["tabular-nums"] }}>{stats?.sessions ?? 0}</Text>
          <Text style={{ fontFamily: font.regular, fontSize: 11, color: t.mutedForeground, marginTop: 4 }}>Completed connections</Text>
        </Card>
      </View>

      <Card t={t} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, marginTop: 16 }}>
        <ShieldCheck size={20} color={t.brand} />
        <Text style={{ flex: 1, fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: t.mutedForeground }}>
          We record data volume and session time to your account — never the sites you visit.
        </Text>
      </Card>
    </ScrollView>
  )
}

function Bar({ t, label, pct }: { t: any; label: string; pct: number }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontFamily: font.regular, fontSize: 11, color: t.mutedForeground, marginBottom: 4 }}>{label}</Text>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surface2, overflow: "hidden" }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: t.brand, width: `${pct}%` }} />
      </View>
    </View>
  )
}
