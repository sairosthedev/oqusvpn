export type Server = {
  id: string
  country: string
  city: string
  code: string
  ping: number
  load: number
  region: "Recommended" | "Africa" | "Europe" | "Americas" | "Asia"
  lat: number
  lng: number
  fastest?: boolean
}

export const servers: Server[] = [
  { id: "ca-tor", country: "Canada", city: "Toronto", code: "CA", ping: 24, load: 41, region: "Recommended", lat: 43.65, lng: -79.38, fastest: true },
  { id: "us-ny", country: "United States", city: "New York", code: "US", ping: 38, load: 55, region: "Recommended", lat: 40.71, lng: -74.01 },
  { id: "de-fra", country: "Germany", city: "Frankfurt", code: "DE", ping: 58, load: 48, region: "Recommended", lat: 50.11, lng: 8.68 },
  { id: "ng-lag", country: "Nigeria", city: "Lagos", code: "NG", ping: 12, load: 37, region: "Africa", lat: 6.52, lng: 3.38 },
  { id: "za-jnb", country: "South Africa", city: "Johannesburg", code: "ZA", ping: 74, load: 44, region: "Africa", lat: -26.2, lng: 28.05 },
  { id: "ke-nbo", country: "Kenya", city: "Nairobi", code: "KE", ping: 81, load: 39, region: "Africa", lat: -1.29, lng: 36.82 },
  { id: "zw-hre", country: "Zimbabwe", city: "Harare", code: "ZW", ping: 88, load: 31, region: "Africa", lat: -17.83, lng: 31.05 },
  { id: "gb-lon", country: "United Kingdom", city: "London", code: "GB", ping: 52, load: 61, region: "Europe", lat: 51.51, lng: -0.13 },
  { id: "nl-ams", country: "Netherlands", city: "Amsterdam", code: "NL", ping: 49, load: 33, region: "Europe", lat: 52.37, lng: 4.9 },
  { id: "fr-par", country: "France", city: "Paris", code: "FR", ping: 55, load: 47, region: "Europe", lat: 48.86, lng: 2.35 },
  { id: "br-sao", country: "Brazil", city: "São Paulo", code: "BR", ping: 96, load: 52, region: "Americas", lat: -23.55, lng: -46.63 },
  { id: "us-lax", country: "United States", city: "Los Angeles", code: "US", ping: 64, load: 58, region: "Americas", lat: 34.05, lng: -118.24 },
  { id: "in-mum", country: "India", city: "Mumbai", code: "IN", ping: 92, load: 46, region: "Asia", lat: 19.08, lng: 72.88 },
  { id: "pk-khi", country: "Pakistan", city: "Karachi", code: "PK", ping: 103, load: 40, region: "Asia", lat: 24.86, lng: 67.01 },
  { id: "jp-tok", country: "Japan", city: "Tokyo", code: "JP", ping: 112, load: 29, region: "Asia", lat: 35.68, lng: 139.65 },
  { id: "sg-sin", country: "Singapore", city: "Singapore", code: "SG", ping: 98, load: 42, region: "Asia", lat: 1.35, lng: 103.82 },
]

/** The user's own (mock) location — used as the route origin on the map. */
export const userLocation = { city: "Lagos", country: "Nigeria", lat: 6.52, lng: 3.38 }

/**
 * Turn a backend server (from GET /api/servers) into the client `Server` shape.
 * The backend doesn't track ping/load (they're cosmetic), so we derive stable
 * values: reuse a matching static entry's numbers when the id is known,
 * otherwise hash the id into a fixed pseudo-ping/load so they don't flicker
 * across refetches.
 */
export function hydrateServer(s: {
  id: string
  country: string
  city: string
  code: string
  region: string
  lat: number
  lng: number
  fastest?: boolean
}): Server {
  const known = servers.find((k) => k.id === s.id)
  let hash = 0
  for (let i = 0; i < s.id.length; i++) hash = (hash * 31 + s.id.charCodeAt(i)) >>> 0
  const region = (["Recommended", "Africa", "Europe", "Americas", "Asia"] as const).includes(
    s.region as Server["region"],
  )
    ? (s.region as Server["region"])
    : "Recommended"
  return {
    id: s.id,
    country: s.country,
    city: s.city,
    code: s.code,
    region,
    lat: s.lat,
    lng: s.lng,
    fastest: !!s.fastest,
    ping: known?.ping ?? 20 + (hash % 110),
    load: known?.load ?? 28 + ((hash >> 8) % 42),
  }
}

/**
 * Equirectangular projection of lat/lng to 0–100% coordinates within a map panel.
 * We frame a sub-region of the globe (not the full 360°) so the plotted cities
 * spread across the panel instead of clustering in the middle.
 */
const FRAME = { west: -130, east: 150, north: 62, south: -38 }

export function project(lat: number, lng: number) {
  const x = ((lng - FRAME.west) / (FRAME.east - FRAME.west)) * 100
  const y = ((FRAME.north - lat) / (FRAME.north - FRAME.south)) * 100
  return { x, y }
}

/** Rough great-circle distance in km between two lat/lng points (Haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(s)))
}

export type Quality = { label: string; tone: "success" | "brand" | "warning" | "danger" }

/** Connection quality derived from latency — degrades Excellent → Good → Fair → Poor. */
export function qualityFor(ping: number): Quality {
  if (ping < 40) return { label: "Excellent", tone: "success" }
  if (ping < 80) return { label: "Good", tone: "brand" }
  if (ping < 140) return { label: "Fair", tone: "warning" }
  return { label: "Poor", tone: "danger" }
}

/** Signal-bar strength from latency: 4 bars <40ms, 3 <90ms, 2 <150ms, else 1. */
export function barsFor(ping: number): number {
  if (ping < 40) return 4
  if (ping < 90) return 3
  if (ping < 150) return 2
  return 1
}

export const topLocations = [
  { country: "Canada", code: "CA", time: "5h 20m", pct: 82 },
  { country: "United States", code: "US", time: "3h 15m", pct: 58 },
  { country: "Nigeria", code: "NG", time: "2h 10m", pct: 40 },
  { country: "Germany", code: "DE", time: "1h 05m", pct: 22 },
]

export type Period = "today" | "week" | "month" | "all"

export const periods: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
]

export type PeriodStats = {
  timeProtected: string
  chart: { day: string; hours: number }[]
  download: { label: string; pct: number }
  upload: { label: string; pct: number }
  dataTotal: string
  connections: number
  connectionsTrend: number
  sparkline: number[]
  saved: string
  trackers: number
}

export const statsByPeriod: Record<Period, PeriodStats> = {
  today: {
    timeProtected: "3h 12m",
    chart: [
      { day: "6a", hours: 0.4 },
      { day: "9a", hours: 1.2 },
      { day: "12p", hours: 0.8 },
      { day: "3p", hours: 2.1 },
      { day: "6p", hours: 1.6 },
      { day: "9p", hours: 2.4 },
      { day: "now", hours: 1.1 },
    ],
    download: { label: "Downloaded 3.4 GB", pct: 71 },
    upload: { label: "Uploaded 1.4 GB", pct: 29 },
    dataTotal: "4.8 GB",
    connections: 6,
    connectionsTrend: 8,
    sparkline: [20, 45, 30, 60, 40, 75, 55],
    saved: "0.4 GB",
    trackers: 214,
  },
  week: {
    timeProtected: "12h 45m",
    chart: [
      { day: "Mon", hours: 1.0 },
      { day: "Tue", hours: 1.8 },
      { day: "Wed", hours: 3.0 },
      { day: "Thu", hours: 2.1 },
      { day: "Fri", hours: 2.7 },
      { day: "Sat", hours: 2.4 },
      { day: "Sun", hours: 1.3 },
    ],
    download: { label: "Downloaded 13.2 GB", pct: 68 },
    upload: { label: "Uploaded 6.3 GB", pct: 32 },
    dataTotal: "19.5 GB",
    connections: 28,
    connectionsTrend: 12,
    sparkline: [40, 55, 35, 70, 50, 85, 100],
    saved: "2.1 GB",
    trackers: 1204,
  },
  month: {
    timeProtected: "58h 20m",
    chart: [
      { day: "W1", hours: 2.4 },
      { day: "W2", hours: 3.1 },
      { day: "W3", hours: 2.8 },
      { day: "W4", hours: 3.6 },
      { day: "W5", hours: 2.2 },
      { day: "W6", hours: 3.9 },
      { day: "W7", hours: 3.2 },
    ],
    download: { label: "Downloaded 61.5 GB", pct: 64 },
    upload: { label: "Uploaded 34.6 GB", pct: 36 },
    dataTotal: "96.1 GB",
    connections: 124,
    connectionsTrend: 18,
    sparkline: [55, 70, 60, 85, 65, 95, 80],
    saved: "9.8 GB",
    trackers: 5321,
  },
  all: {
    timeProtected: "412h 05m",
    chart: [
      { day: "Jan", hours: 2.1 },
      { day: "Feb", hours: 2.6 },
      { day: "Mar", hours: 3.0 },
      { day: "Apr", hours: 2.8 },
      { day: "May", hours: 3.4 },
      { day: "Jun", hours: 3.1 },
      { day: "Jul", hours: 3.8 },
    ],
    download: { label: "Downloaded 486 GB", pct: 66 },
    upload: { label: "Uploaded 250 GB", pct: 34 },
    dataTotal: "736 GB",
    connections: 902,
    connectionsTrend: 6,
    sparkline: [60, 72, 66, 88, 74, 96, 90],
    saved: "74 GB",
    trackers: 41208,
  },
}

// Kept for any legacy import; mirrors the weekly chart.
export const weekChart = statsByPeriod.week.chart
