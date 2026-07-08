// Map projection + geo helpers — ported from the web app's data.ts.

/** The user's own (mock) location — the route origin on the map. */
export const userLocation = { city: "Lagos", country: "Nigeria", lat: 6.52, lng: 3.38 }

// Frame a sub-region of the globe so plotted cities spread across the panel.
export const FRAME = { west: -130, east: 150, north: 62, south: -38 }
// Aspect-correct virtual canvas: 1 unit = 1 degree, so continents aren't squashed.
export const MAP_W = FRAME.east - FRAME.west // 280
export const MAP_H = FRAME.north - FRAME.south // 100

/** Project lat/lng to the aspect-correct canvas (0..MAP_W × 0..MAP_H). */
export function project(lat: number, lng: number) {
  return { x: lng - FRAME.west, y: FRAME.north - lat }
}

/** Rough great-circle distance in km between two lat/lng points (Haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(s)))
}
