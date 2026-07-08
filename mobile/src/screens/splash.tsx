import { useEffect, useRef } from "react"
import { Animated, Easing, Text, View } from "react-native"
import { Asterisk, shadow } from "../components/ui"
import { font, useTheme } from "../context/theme-context"

export function Splash({ onDone }: { onDone: () => void }) {
  const t = useTheme()
  const bar = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const timer = setTimeout(onDone, 2400)
    Animated.loop(
      Animated.timing(bar, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ).start()
    return () => clearTimeout(timer)
  }, [onDone])

  const translateX = bar.interpolate({ inputRange: [0, 1], outputRange: [-60, 120] })

  return (
    <View style={{ flex: 1, backgroundColor: t.background, alignItems: "center", justifyContent: "center", gap: 40, padding: 24 }}>
      {/* Mark with breathing concentric halos */}
      <View style={{ width: 208, height: 208, alignItems: "center", justifyContent: "center" }}>
        <Breathe size={208} color={t.brand} opacity={0.1} delay={0} />
        <Breathe size={160} color={t.brand} opacity={0.15} delay={300} />
        <Breathe size={112} color={t.brand} opacity={0.2} delay={600} />
        <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: t.card, alignItems: "center", justifyContent: "center", ...shadow(8) }}>
          <Asterisk size={48} color={t.brand} />
        </View>
      </View>

      <View style={{ alignItems: "center" }}>
        <Text style={{ fontFamily: font.extrabold, fontSize: 30, color: t.foreground }}>
          Oqus<Text style={{ color: t.brand }}>VPN</Text>
        </Text>
        <Text style={{ fontFamily: font.regular, fontSize: 14, color: t.muted, marginTop: 8 }}>
          100% free VPN. Fast. Private. Unlimited.
        </Text>
      </View>

      {/* branded indeterminate progress bar */}
      <View style={{ width: 160, height: 4, borderRadius: 2, backgroundColor: t.surface2, overflow: "hidden" }}>
        <Animated.View style={{ width: 54, height: 4, borderRadius: 2, backgroundColor: t.brand, transform: [{ translateX }] }} />
      </View>
    </View>
  )
}

function Breathe({ size, color, opacity, delay }: { size: number; color: string; opacity: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1200, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start()
  }, [])
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] })
  const op = v.interpolate({ inputRange: [0, 1], outputRange: [0.55 * opacity * 6, opacity * 6] })
  return <Animated.View style={{ position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: op, transform: [{ scale }] }} />
}
