import { useEffect, useRef } from "react"
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { BlurView } from "expo-blur"
import Svg, { Rect } from "react-native-svg"
import { Power } from "lucide-react-native"
import { RADIUS_APP, type Theme, barsFor } from "../lib/theme"
import { font, useTheme } from "../context/theme-context"
export { useTheme }

/** Six-point asterisk mark — three rounded bars at 0/60/120°, exactly like brand.tsx. */
export function Asterisk({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      {[0, 60, 120].map((deg) => (
        <Rect key={deg} x={21} y={4} width={6} height={40} rx={3} fill={color} origin="24, 24" rotation={deg} />
      ))}
    </Svg>
  )
}

export function Wordmark({ size = 20, t }: { size?: number; t: Theme }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Asterisk size={size} color={t.brand} />
      <Text style={{ fontSize: size, fontFamily: font.bold, color: t.foreground }}>
        Oqus<Text style={{ color: t.brand }}>VPN</Text>
      </Text>
    </View>
  )
}

export function SignalBars({ strength = 4, t }: { strength?: number; t: Theme }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={{ width: 4, height: bar * 3 + 3, borderRadius: 2, backgroundColor: bar <= strength ? t.brand : t.border }}
        />
      ))}
    </View>
  )
}

export function Flag({ emoji, size = 32 }: { emoji: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.04)" }}>
      <Text style={{ fontSize: size * 0.72 }}>{emoji}</Text>
    </View>
  )
}

export function Card({ t, style, children }: { t: Theme; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  return <View style={[styles.card, { backgroundColor: t.card }, style]}>{children}</View>
}

export function IconBubble({ icon: Icon, t }: { icon: any; t: Theme }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
      <Icon size={16} color={t.muted} />
    </View>
  )
}

export function Toggle({ value, onValueChange, t }: { value: boolean; onValueChange: (v: boolean) => void; t: Theme }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 8 }).start()
  }, [value])
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [2, 22] })
  return (
    <Pressable onPress={() => onValueChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: value ? t.brand : t.border, justifyContent: "center" }}>
      <Animated.View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", transform: [{ translateX }], ...shadow(2) }} />
    </Pressable>
  )
}

// --- Connect button (radar halos + rotating arc + radial core) --------------
export function ConnectButton({ status, onPress, size = 132, t }: { status: "connected" | "connecting" | "disconnected"; onPress: () => void; size?: number; t: Theme }) {
  const connected = status === "connected"
  const connecting = status === "connecting"
  const spin = useRef(new Animated.Value(0)).current
  const press = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!connecting) return
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [connecting])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
  const core = size * 0.62

  return (
    <Pressable
      onPressIn={() => Animated.spring(press, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true }).start()}
      onPress={onPress}
    >
      <Animated.View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", transform: [{ scale: press }] }}>
        {connecting && <Radar size={size} color={t.brand} />}
        {/* outer soft ring */}
        <View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: connected ? t.brandSoft : t.surface2 }} />
        {/* rotating progress arc */}
        {connecting && (
          <Animated.View
            style={{
              position: "absolute", width: size - 8, height: size - 8, borderRadius: (size - 8) / 2,
              borderWidth: 4, borderColor: t.brand + "33", borderTopColor: t.brand, transform: [{ rotate }],
            }}
          />
        )}
        {/* inner core */}
        <View style={{ width: core, height: core, borderRadius: core / 2, alignItems: "center", justifyContent: "center", backgroundColor: connected ? t.brand : t.card, ...shadow(connected ? 8 : 4) }}>
          <Power size={core * 0.33} strokeWidth={2.5} color={connected ? "#fff" : t.muted} />
        </View>
      </Animated.View>
    </Pressable>
  )
}

function Radar({ size, color }: { size: number; color: string }) {
  return (
    <>
      {[0, 600, 1200].map((delay) => (
        <RadarRing key={delay} size={size} color={color} delay={delay} />
      ))}
    </>
  )
}
function RadarRing({ size, color, delay }: { size: number; color: string; delay: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }))
    loop.start()
    return () => loop.stop()
  }, [])
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.9] })
  const opacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] })
  return <Animated.View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ scale }] }} />
}

// --- Buttons ---------------------------------------------------------------
export function PrimaryButton({ label, onPress, t, style }: { label: string; onPress: () => void; t: Theme; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ backgroundColor: pressed ? t.brandInk : t.brand, borderRadius: 12, paddingVertical: 14, alignItems: "center" }, style]}>
      <Text style={{ color: "#fff", fontFamily: font.semibold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  )
}

export function txt(t: Theme, kind: "h1" | "h2" | "body" | "muted" | "cap" = "body"): TextStyle {
  switch (kind) {
    case "h1": return { fontFamily: font.bold, fontSize: 24, color: t.foreground }
    case "h2": return { fontFamily: font.semibold, fontSize: 18, color: t.foreground }
    case "muted": return { fontFamily: font.regular, fontSize: 13, color: t.mutedForeground }
    case "cap": return { fontFamily: font.medium, fontSize: 12, color: t.mutedForeground }
    default: return { fontFamily: font.regular, fontSize: 14, color: t.foreground }
  }
}

// Frosted glass dock — an icon-only floating bar with a small brand dot marking
// the active tab. Real backdrop blur (expo-blur) over a translucent tint.
export function TabBar<K extends string>({
  tabs,
  active,
  onChange,
  t,
}: {
  tabs: { key: K; label: string; icon: any }[]
  active: K
  onChange: (k: K) => void
  t: Theme
}) {
  const tint = t.dark ? "rgba(20,24,60,0.55)" : "rgba(255,255,255,0.5)"
  const edge = t.dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.65)"
  return (
    <View style={[styles.tabWrap, shadow(12)]}>
      <BlurView intensity={t.dark ? 40 : 55} tint={t.dark ? "dark" : "light"} style={[styles.tabbar, { borderColor: edge }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        {tabs.map(({ key, icon: Icon }) => {
          const on = key === active
          return (
            <TabItem key={key} on={on} Icon={Icon} brand={t.brand} muted={t.mutedForeground} onPress={() => onChange(key)} />
          )
        })}
      </BlurView>
    </View>
  )
}

function TabItem({ on, Icon, brand, muted, onPress }: { on: boolean; Icon: any; brand: string; muted: string; onPress: () => void }) {
  const s = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(s, { toValue: on ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 10 }).start()
  }, [on])
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] })
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 18 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Icon size={23} color={on ? brand : muted} strokeWidth={on ? 2.5 : 2} />
      </Animated.View>
      <Animated.View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 6, backgroundColor: brand, opacity: s, transform: [{ scale: s }] }} />
    </Pressable>
  )
}

export function shadow(elevation: number): ViewStyle {
  return {
    shadowColor: "#1e265a",
    shadowOffset: { width: 0, height: elevation },
    shadowOpacity: 0.16,
    shadowRadius: elevation * 1.6,
    elevation,
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, ...shadow(3) },
  tabWrap: {
    marginHorizontal: 32,
    marginBottom: 6,
    marginTop: 6,
    borderRadius: 30,
  },
  tabbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
})
