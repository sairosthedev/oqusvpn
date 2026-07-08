import { createContext, useContext, useMemo, useState, type ReactNode } from "react"
import { useColorScheme } from "react-native"
import { dark, light, type Theme } from "../lib/theme"

export type Appearance = "auto" | "light" | "dark"

type Ctx = {
  t: Theme
  appearance: Appearance
  setAppearance: (a: Appearance) => void
}
const ThemeCtx = createContext<Ctx | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme()
  const [appearance, setAppearance] = useState<Appearance>("auto")
  const value = useMemo(() => {
    const resolved = appearance === "auto" ? system : appearance
    return { t: resolved === "dark" ? dark : light, appearance, setAppearance }
  }, [appearance, system])
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme(): Theme {
  const c = useContext(ThemeCtx)
  return c ? c.t : light
}
export function useAppearance() {
  const c = useContext(ThemeCtx)
  if (!c) return { appearance: "auto" as Appearance, setAppearance: () => {} }
  return { appearance: c.appearance, setAppearance: c.setAppearance }
}

/** Fonts loaded → font-family names (matches the web's Inter). */
export const font = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
}
