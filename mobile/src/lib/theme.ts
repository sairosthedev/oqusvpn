// OqusVPN design tokens — ported 1:1 from the web app's src/index.css so the
// mobile screens match exactly. Light + dark, Inter typeface.

export type Theme = {
  dark: boolean
  background: string
  foreground: string
  muted: string
  mutedForeground: string
  card: string
  cardStrong: string
  brand: string
  brandInk: string
  brandSoft: string
  surface: string
  surface2: string
  border: string
  success: string
  successSoft: string
  danger: string
  dangerSoft: string
  warning: string
  stageDot: string
}

export const light: Theme = {
  dark: false,
  background: "#c3c9f2",
  foreground: "#1b1f3b",
  muted: "#6b7192",
  mutedForeground: "#8a90b0",
  card: "#ffffff",
  cardStrong: "#ffffff",
  brand: "#3b56f0",
  brandInk: "#2a3fd0",
  brandSoft: "#e6e9fd",
  surface: "#edeffb",
  surface2: "#e2e6f9",
  border: "#d7dbf3",
  success: "#16a34a",
  successSoft: "#dcfce7",
  danger: "#e23a52",
  dangerSoft: "#fbe3e7",
  warning: "#b8790f",
  stageDot: "rgba(90, 100, 180, 0.28)",
}

export const dark: Theme = {
  dark: true,
  background: "#0d1030",
  foreground: "#eef0ff",
  muted: "#a6abcf",
  mutedForeground: "#7c82b4",
  card: "#191d43",
  cardStrong: "#20255a",
  brand: "#6a82ff",
  brandInk: "#91a3ff",
  brandSoft: "#24295e",
  surface: "#161a3d",
  surface2: "#1d2250",
  border: "#2a3068",
  success: "#16a34a",
  successSoft: "#dcfce7",
  danger: "#e23a52",
  dangerSoft: "#fbe3e7",
  warning: "#f5a623",
  stageDot: "rgba(150, 165, 255, 0.16)",
}

export const RADIUS_APP = 20 // 1.25rem

/** ISO alpha-2 code → emoji flag (renders on iOS/Android 7+, no asset needed). */
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return "🏳️"
  const base = 0x1f1e6
  const cc = code.toUpperCase()
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65))
}

/** Stable pseudo latency/load from a server id (backend doesn't track these). */
export function pingFor(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return 18 + (h % 110)
}
export function loadFor(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0
  return 28 + (h % 42)
}
export function barsFor(ping: number): number {
  if (ping < 40) return 4
  if (ping < 90) return 3
  if (ping < 150) return 2
  return 1
}

export type Quality = { label: string; tone: "success" | "brand" | "warning" | "danger" }
export function qualityFor(ping: number): Quality {
  if (ping < 40) return { label: "Excellent", tone: "success" }
  if (ping < 80) return { label: "Good", tone: "brand" }
  if (ping < 140) return { label: "Fair", tone: "warning" }
  return { label: "Poor", tone: "danger" }
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}
export function fmtHM(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
export function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`
  return `${Math.round(n)} B`
}
