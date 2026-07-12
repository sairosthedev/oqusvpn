import { useEffect, useRef } from "react"
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native"
import { BlurView } from "expo-blur"
import * as Haptics from "expo-haptics"
import Svg, { Rect } from "react-native-svg"
import { Power } from "lucide-react-native"
import { RADIUS_APP, type Theme, barsFor } from "../lib/theme"
import { font, useTheme } from "../context/theme-context"
export { useTheme }

/** Fire-and-forget haptics — a no-op on web, where the module throws. */
export const haptic = {
  tap: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  press: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  select: () => run(() => Haptics.selectionAsync()),
}
function run(fn: () => Promise<void>) {
  if (Platform.OS === "web") return
  fn().catch(() => {})
}

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
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={{ width: 4, height: bar * 3 + 3, borderRadius: 2, backgroundColor: bar <= strength ? t.brand : t.border }}
        />
      ))}
    </View>
  )
}

export function Flag({ emoji, size = 32, t }: { emoji: string; size?: number; t?: Theme }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: t?.dark ? t.surface2 : "rgba(0,0,0,0.04)" }}
    >
      <Text style={{ fontSize: size * 0.72 }}>{emoji}</Text>
    </View>
  )
}

export function Card({ t, style, children }: { t: Theme; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  // Dark mode trades the (invisible) drop shadow for a hairline border.
  const edge: ViewStyle = t.dark ? { borderWidth: StyleSheet.hairlineWidth, borderColor: t.border } : shadow(3, t)
  return <View style={[styles.card, { backgroundColor: t.card }, edge, style]}>{children}</View>
}

export function IconBubble({ icon: Icon, t }: { icon: any; t: Theme }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
      <Icon size={16} color={t.muted} />
    </View>
  )
}

export function Toggle({ value, onValueChange, t, label }: { value: boolean; onValueChange: (v: boolean) => void; t: Theme; label?: string }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 8 }).start()
  }, [value])
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [2, 22] })
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      onPress={() => {
        haptic.select()
        onValueChange(!value)
      }}
      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: value ? t.brand : t.border, justifyContent: "center" }}
    >
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

  // Confirm the tunnel landing, not the tap. Skip the initial mount so a
  // relaunch into an already-connected session doesn't buzz.
  const wasConnected = useRef(connected)
  useEffect(() => {
    if (connected && !wasConnected.current) haptic.success()
    wasConnected.current = connected
  }, [connected])

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] })
  const core = size * 0.62

  // Announce the action, not the state — VoiceOver reads "<label>, button".
  const label = connected ? "Disconnect VPN" : connecting ? "Connecting, tap to cancel" : "Connect VPN"
  const hint = connected ? "Currently connected and protected" : connecting ? "Establishing a secure tunnel" : "Your traffic is not protected"

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ busy: connecting }}
      onPressIn={() => Animated.spring(press, { toValue: 0.96, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(press, { toValue: 1, useNativeDriver: true }).start()}
      onPress={() => {
        haptic.press()
        onPress()
      }}
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
        <View style={{ width: core, height: core, borderRadius: core / 2, alignItems: "center", justifyContent: "center", backgroundColor: connected ? t.brand : t.card, ...shadow(connected ? 8 : 4, t) }}>
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
export function PrimaryButton({ label, onPress, t, style, disabled }: { label: string; onPress: () => void; t: Theme; style?: StyleProp<ViewStyle>; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.tap()
        onPress()
      }}
      style={({ pressed }) => [{ backgroundColor: pressed ? t.brandInk : t.brand, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: disabled ? 0.5 : 1 }, style]}
    >
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

// iOS-style frosted dock — icon + label stacked, with a rounded highlight
// capsule behind the active tab (icon + label in the brand color).
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
  const highlight = t.dark ? "rgba(255,255,255,0.13)" : "rgba(20,24,60,0.06)"
  return (
    <View style={[styles.tabWrap, shadow(12, t)]} accessibilityRole="tablist">
      <BlurView intensity={t.dark ? 40 : 55} tint={t.dark ? "dark" : "light"} style={[styles.tabbar, { borderColor: edge }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
        {tabs.map(({ key, label, icon: Icon }) => (
          <TabItem
            key={key}
            on={key === active}
            Icon={Icon}
            label={label}
            brand={t.brand}
            fg={t.foreground}
            muted={t.mutedForeground}
            highlight={highlight}
            onPress={() => {
              if (key !== active) haptic.select()
              onChange(key)
            }}
          />
        ))}
      </BlurView>
    </View>
  )
}

function TabItem({ on, Icon, label, brand, fg, muted, highlight, onPress }: { on: boolean; Icon: any; label: string; brand: string; fg: string; muted: string; highlight: string; onPress: () => void }) {
  const s = useRef(new Animated.Value(on ? 1 : 0)).current
  useEffect(() => {
    Animated.spring(s, { toValue: on ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 8 }).start()
  }, [on])
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] })
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, alignItems: "center", opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 7, paddingHorizontal: 10, borderRadius: 18, overflow: "hidden" }}>
        <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 18, backgroundColor: highlight, opacity: s, transform: [{ scale }] }]} />
        <Icon size={23} color={on ? brand : fg} strokeWidth={2} />
        <Text numberOfLines={1} style={{ marginTop: 4, fontFamily: on ? font.semibold : font.medium, fontSize: 11, color: on ? brand : muted }}>{label}</Text>
      </View>
    </Pressable>
  )
}

/**
 * Elevation shadow. Dark mode renders a navy shadow against a navy background,
 * which costs a render pass to draw nothing — so we drop it there and let the
 * card's own surface color carry the separation instead.
 */
export function shadow(elevation: number, t?: Theme): ViewStyle {
  if (t?.dark) return { elevation: 0 }
  return {
    shadowColor: "#1e265a",
    shadowOffset: { width: 0, height: elevation },
    shadowOpacity: 0.16,
    shadowRadius: elevation * 1.6,
    elevation,
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: 16 },
  tabWrap: {
    marginHorizontal: 12,
    marginBottom: 6,
    marginTop: 6,
    borderRadius: 32,
  },
  tabbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 32,
    borderWidth: 1,
    overflow: "hidden",
  },
})
