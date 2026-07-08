import { useState } from "react"
import { Pressable, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Zap, ShieldCheck, MousePointerClick } from "lucide-react-native"
import { Asterisk, PrimaryButton, shadow } from "../components/ui"
import { font, useTheme } from "../context/theme-context"
import { RADIUS_APP } from "../lib/theme"

const steps = [
  { icon: Zap, title: "Fast, free & unlimited", body: "No data caps. No throttling. No credit card. The fast lane stays open for everyone, forever.", cta: "Get started" },
  { icon: ShieldCheck, title: "Your privacy, protected", body: "Every connection is encrypted end-to-end — even on public Wi-Fi. We never log what you do online.", cta: "Continue" },
  { icon: MousePointerClick, title: "Trusted servers with one tap", body: "Tap once and we connect you to the fastest server near you — anywhere in the world.", cta: "Turn on OqusVPN" },
]

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const t = useTheme()
  const [index, setIndex] = useState(0)
  const step = steps[index]
  const Icon = step.icon
  const isLast = index === steps.length - 1

  return (
    <View style={{ flex: 1, backgroundColor: t.background, alignItems: "center", justifyContent: "center", padding: 20 }}>
      <LinearGradient
        colors={[t.card, t.surface]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ width: "100%", maxWidth: 420, borderRadius: RADIUS_APP, borderWidth: 1, borderColor: t.border, paddingHorizontal: 32, paddingVertical: 48, alignItems: "center", ...shadow(10) }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 32 }}>
          <Asterisk size={20} color={t.brand} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.muted }}>
            Oqus<Text style={{ color: t.brand }}>VPN</Text>
          </Text>
        </View>

        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: t.brandSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon size={36} strokeWidth={2} color={t.brand} />
        </View>

        <Text style={{ fontFamily: font.semibold, fontSize: 22, color: t.foreground, marginTop: 32, textAlign: "center" }}>{step.title}</Text>
        <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: t.muted, marginTop: 12, textAlign: "center", maxWidth: 300 }}>{step.body}</Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 32 }}>
          {steps.map((_, i) => (
            <View key={i} style={{ height: 8, width: i === index ? 24 : 8, borderRadius: 4, backgroundColor: i === index ? t.brand : t.border }} />
          ))}
        </View>

        <PrimaryButton label={step.cta} onPress={() => (isLast ? onFinish() : setIndex((i) => i + 1))} t={t} style={{ width: "100%", marginTop: 32 }} />

        {!isLast && (
          <Pressable onPress={onFinish} style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: font.medium, fontSize: 14, color: t.muted }}>Skip</Text>
          </Pressable>
        )}
      </LinearGradient>
    </View>
  )
}
