import { useEffect, useRef, useState } from "react"
import { ActivityIndicator, Animated, Easing, Pressable, Text, View, type LayoutChangeEvent } from "react-native"
import Svg, { Circle, Defs, Line, Pattern, Rect } from "react-native-svg"
import { MapPin, ShieldAlert, ShieldCheck, Power, ArrowLeftRight } from "lucide-react-native"
import { useVpn, type UiServer } from "../context/vpn-context"
import { useTheme, font } from "../context/theme-context"
import { distanceKm, project, userLocation, MAP_W, MAP_H } from "../lib/geo"
import { flagEmoji, qualityFor } from "../lib/theme"
import { WorldMap } from "./world-map"

const toneBg = (t: any, tone: string) => (tone === "success" ? t.successSoft : tone === "warning" ? t.warning + "26" : tone === "danger" ? t.dangerSoft : t.brandSoft)
const toneFg = (t: any, tone: string) => (tone === "success" ? t.success : tone === "warning" ? t.warning : tone === "danger" ? t.danger : t.brand)

export function LocationsMap() {
  const t = useTheme()
  const { servers, server, status, switching, selectServer, toggleConnection } = useVpn()
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [focusedId, setFocusedId] = useState<string | null>(null) // callout opens only on tap

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })
  // A centered map band that fills the width, capping the aspect at ~1.8 so the
  // continents look large (only a mild vertical stretch, never severely squashed).
  const bandW = size.w
  const bandH = Math.min(size.h, size.w / 1.8)
  const bandTop = (size.h - bandH) / 2
  const px = (lat: number, lng: number) => { const p = project(lat, lng); return { x: (p.x / MAP_W) * bandW, y: bandTop + (p.y / MAP_H) * bandH } }

  const connected = status === "connected"
  const connecting = status === "connecting"
  const you = px(userLocation.lat, userLocation.lng)
  const focused = servers.find((s) => s.id === focusedId) ?? null

  const pill = {
    disconnected: { label: "Not protected", bg: t.dangerSoft, fg: t.danger, Icon: ShieldAlert },
    connecting: { label: "Securing tunnel…", bg: t.brandSoft, fg: t.brand, Icon: null },
    connected: { label: "Protected · AES-256", bg: t.successSoft, fg: t.success, Icon: ShieldCheck },
  }[status]

  return (
    <View onLayout={onLayout} style={{ flex: 1, borderRadius: 24, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, overflow: "hidden" }}>
      {/* dot grid */}
      <Svg width="100%" height="100%" style={{ position: "absolute" }}>
        <Defs>
          <Pattern id="dots" width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={1.4} cy={1.4} r={1.4} fill={t.stageDot} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dots)" />
      </Svg>

      {/* real continent outlines */}
      <WorldMap width={bandW} height={bandH} top={bandTop} />

      {/* route line */}
      {size.w > 0 && server && (
        <Svg width={bandW} height={bandH} viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="none" style={{ position: "absolute", top: bandTop }}>
          <Line
            x1={project(userLocation.lat, userLocation.lng).x} y1={project(userLocation.lat, userLocation.lng).y}
            x2={project(server.lat, server.lng).x} y2={project(server.lat, server.lng).y}
            stroke={t.brand} strokeWidth={connected ? 0.8 : 0.6} strokeDasharray="3 3"
            opacity={connecting ? 0.7 : connected ? 0.9 : 0.4}
          />
        </Svg>
      )}

      {/* status pills */}
      <View pointerEvents="none" style={{ position: "absolute", top: 16, left: 0, right: 0, alignItems: "center", gap: 8, zIndex: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: pill.bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          {connecting || switching ? <ActivityIndicator size="small" color={pill.fg} /> : pill.Icon ? <pill.Icon size={14} color={pill.fg} /> : null}
          <Text style={{ fontFamily: font.semibold, fontSize: 12, color: pill.fg }}>{switching ? "Switching…" : pill.label}</Text>
        </View>
        {server && (
          <View style={{ backgroundColor: t.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 12, color: t.mutedForeground }}>
              {distanceKm(userLocation, server).toLocaleString()} km · {server.ping} ms round-trip
            </Text>
          </View>
        )}
      </View>

      {/* You pin */}
      {size.w > 0 && (
        <View style={{ position: "absolute", left: you.x, top: you.y, marginLeft: -6, marginTop: -6, alignItems: "center" }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.foreground, borderWidth: 4, borderColor: t.foreground + "26" }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 6, backgroundColor: t.foreground, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <MapPin size={10} color={t.background} />
            <Text style={{ fontFamily: font.semibold, fontSize: 10, color: t.background }}>You · {userLocation.city}</Text>
          </View>
        </View>
      )}

      {/* server pins */}
      {size.w > 0 && servers.map((s) => {
        const p = px(s.lat, s.lng)
        const isCurrent = s.id === server?.id
        return (
          <Pressable key={s.id} onPress={() => { setFocusedId(s.id); selectServer(s.id) }} style={{ position: "absolute", left: p.x, top: p.y, marginLeft: -12, marginTop: -12, width: 24, height: 24, alignItems: "center", justifyContent: "center", zIndex: 10 }}>
            {isCurrent && (connected || connecting) && <Radar color={t.brand} />}
            {isCurrent ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: t.brand, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: t.card }}>
                <Text style={{ fontSize: 15 }}>{flagEmoji(s.code)}</Text>
              </View>
            ) : (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.brand + "99", borderWidth: 2, borderColor: t.card }} />
            )}
          </Pressable>
        )
      })}

      {/* focused callout */}
      {size.w > 0 && focused && (() => {
        const p = px(focused.lat, focused.lng)
        const Wc = Math.min(240, size.w - 24)
        const left = Math.max(12, Math.min(p.x - Wc / 2, size.w - Wc - 12))
        const below = p.y < size.h * 0.5
        const top = below ? p.y + 18 : Math.max(8, p.y - 190)
        const q = qualityFor(focused.ping)
        return (
          <View style={{ position: "absolute", left, top, width: Wc, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.card, padding: 12, zIndex: 30, shadowColor: "#1e265a", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 22 }}>{flagEmoji(focused.code)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>{focused.city}</Text>
                <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground }}>{focused.country}</Text>
              </View>
              <View style={{ backgroundColor: toneBg(t, q.tone), borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 10, color: toneFg(t, q.tone) }}>{focused.ping} ms</Text>
              </View>
            </View>
            <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground, marginTop: 6 }}>{q.label} · {focused.load}% load</Text>
            <CalloutAction t={t} focused={focused} isCurrent={focused.id === server?.id} status={status} switching={switching} onConnect={() => { toggleConnection(); setFocusedId(null) }} onSwitch={() => { selectServer(focused.id); setFocusedId(null) }} />
          </View>
        )
      })()}
    </View>
  )
}

function Radar({ color }: { color: string }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [])
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.4] })
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] })
  return <Animated.View style={{ position: "absolute", width: 24, height: 24, borderRadius: 12, backgroundColor: color, opacity, transform: [{ scale }] }} />
}

function CalloutAction({ t, focused, isCurrent, status, switching, onConnect, onSwitch }: { t: any; focused: UiServer; isCurrent: boolean; status: string; switching: boolean; onConnect: () => void; onSwitch: () => void }) {
  const base = { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 6, borderRadius: 999, paddingVertical: 8, marginTop: 10 }
  if (status === "connecting") {
    return <View style={[base, { backgroundColor: t.surface2 }]}><ActivityIndicator size="small" color={t.mutedForeground} /><Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.mutedForeground }}>Connecting…</Text></View>
  }
  if (status === "connected" && !isCurrent) {
    return <Pressable onPress={onSwitch} style={[base, { backgroundColor: t.brand }]}><ArrowLeftRight size={14} color="#fff" /><Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>Switch here</Text></Pressable>
  }
  if (status === "connected") {
    return <Pressable onPress={onConnect} style={[base, { backgroundColor: t.dangerSoft }]}>{switching ? <ActivityIndicator size="small" color={t.danger} /> : <Power size={14} color={t.danger} />}<Text style={{ fontFamily: font.semibold, fontSize: 12, color: t.danger }}>{switching ? "Switching…" : "Disconnect"}</Text></Pressable>
  }
  return <Pressable onPress={onConnect} style={[base, { backgroundColor: t.brand }]}><Power size={14} color="#fff" /><Text style={{ fontFamily: font.semibold, fontSize: 12, color: "#fff" }}>Connect to {focused.city}</Text></Pressable>
}
