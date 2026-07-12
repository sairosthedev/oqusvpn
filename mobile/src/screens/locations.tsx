import { useMemo, useState } from "react"
import { ScrollView, Text, TextInput, View, Pressable } from "react-native"
import { Search, Check, List, Map } from "lucide-react-native"
import { useVpn, type UiServer } from "../context/vpn-context"
import { useTheme } from "../context/theme-context"
import { font } from "../context/theme-context"
import { barsFor, flagEmoji } from "../lib/theme"
import { Card, Flag, SignalBars, haptic } from "../components/ui"
import { LocationsMap } from "../components/locations-map"

const ORDER = ["Recommended", "Africa", "Europe", "Americas", "Asia"]

export function LocationsScreen() {
  const t = useTheme()
  const { servers, server, selectServer, switching } = useVpn()
  const [query, setQuery] = useState("")
  const [view, setView] = useState<"list" | "map">("list")

  const grouped = useMemo(() => {
    const filtered = servers.filter((s) => `${s.country} ${s.city}`.toLowerCase().includes(query.toLowerCase()))
    const map: Record<string, UiServer[]> = {}
    for (const s of filtered) (map[s.region] ??= []).push(s)
    return ORDER.filter((r) => map[r]?.length).map((r) => [r, map[r]] as const)
  }, [query, servers])

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 24, color: t.foreground }}>
          Choose <Text style={{ color: t.brand }}>a server</Text>
        </Text>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: t.surface2, borderRadius: 12, padding: 4 }}>
          {(["list", "map"] as const).map((v) => (
            <Pressable
              key={v}
              accessibilityRole="tab"
              accessibilityLabel={`${v} view`}
              accessibilityState={{ selected: view === v }}
              hitSlop={{ top: 10, bottom: 10 }}
              onPress={() => {
                if (view !== v) haptic.select()
                setView(v)
              }}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: view === v ? t.card : "transparent", opacity: pressed ? 0.6 : 1 })}
            >
              {v === "list" ? <List size={14} color={view === v ? t.foreground : t.mutedForeground} /> : <Map size={14} color={view === v ? t.foreground : t.mutedForeground} />}
              <Text style={{ fontFamily: font.medium, fontSize: 13, color: view === v ? t.foreground : t.mutedForeground, textTransform: "capitalize" }}>{v}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Text style={{ fontFamily: font.regular, fontSize: 13, color: t.mutedForeground, marginBottom: 20 }}>
        {servers.length} locations · sorted by speed for you
      </Text>

      {view === "map" ? (
        <View style={{ flex: 1, paddingBottom: 20 }}>
          <LocationsMap />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
          <View style={{ position: "relative", marginBottom: 20 }}>
            <View style={{ position: "absolute", left: 14, top: 0, bottom: 0, justifyContent: "center", zIndex: 1 }}>
              <Search size={16} color={t.mutedForeground} />
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or city"
              placeholderTextColor={t.mutedForeground}
              style={{ borderWidth: 1, borderColor: t.border, backgroundColor: t.card, borderRadius: 12, paddingVertical: 12, paddingLeft: 42, paddingRight: 16, fontFamily: font.regular, fontSize: 14, color: t.foreground }}
            />
          </View>

          {grouped.length === 0 ? (
            <Card t={t} style={{ padding: 40, alignItems: "center" }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>No locations match “{query}”.</Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: t.mutedForeground, marginTop: 4 }}>Try a country or city name.</Text>
            </Card>
          ) : (
            <View style={{ gap: 24 }}>
              {grouped.map(([region, list]) => (
                <View key={region}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground, marginBottom: 8, paddingHorizontal: 4 }}>{region}</Text>
                  <Card t={t} style={{ overflow: "hidden" }}>
                    {list.map((s, i) => {
                      const selected = s.id === server?.id
                      return (
                        <Pressable
                          key={s.id}
                          accessibilityRole="button"
                          accessibilityLabel={`${s.country}, ${s.city}${s.fastest ? ", fastest" : ""}`}
                          accessibilityHint={`${s.ping} milliseconds, ${s.load} percent load`}
                          accessibilityState={{ selected }}
                          onPress={() => {
                            if (!selected) haptic.tap()
                            selectServer(s.id)
                          }}
                          style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: i !== list.length - 1 ? 1 : 0, borderBottomColor: t.border, backgroundColor: selected ? t.brand + "10" : pressed ? t.surface2 : "transparent" })}
                        >
                          <Flag emoji={flagEmoji(s.code)} size={32} t={t} />
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Text style={{ fontFamily: font.semibold, fontSize: 14, color: t.foreground }}>{s.country} — {s.city}</Text>
                              {s.fastest && (
                                <View style={{ backgroundColor: t.brandSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                                  <Text style={{ fontFamily: font.bold, fontSize: 10, color: t.brand }}>Fastest</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontFamily: font.regular, fontSize: 12, color: selected && switching ? t.brand : t.mutedForeground }}>
                              {selected && switching ? "Switching…" : `${s.ping} ms · ${s.load}% load`}
                            </Text>
                          </View>
                          <SignalBars strength={barsFor(s.ping)} t={t} />
                          {selected && (
                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.brand, alignItems: "center", justifyContent: "center" }}>
                              <Check size={14} color="#fff" />
                            </View>
                          )}
                        </Pressable>
                      )
                    })}
                  </Card>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
