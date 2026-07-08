// Server registry — the VPN regions the backend advertises to clients.
// Mirrors the client's list; each entry maps to a data-plane server that a
// KeyProvider issues access keys for.
export type ServerRegion = "Recommended" | "Africa" | "Europe" | "Americas" | "Asia"

export type ServerInfo = {
  id: string
  country: string
  city: string
  code: string
  region: ServerRegion
  lat: number
  lng: number
  fastest?: boolean
}

export const servers: ServerInfo[] = [
  { id: "ca-tor", country: "Canada", city: "Toronto", code: "CA", region: "Recommended", lat: 43.65, lng: -79.38, fastest: true },
  { id: "us-ny", country: "United States", city: "New York", code: "US", region: "Recommended", lat: 40.71, lng: -74.01 },
  { id: "de-fra", country: "Germany", city: "Frankfurt", code: "DE", region: "Recommended", lat: 50.11, lng: 8.68 },
  { id: "ng-lag", country: "Nigeria", city: "Lagos", code: "NG", region: "Africa", lat: 6.52, lng: 3.38 },
  { id: "za-jnb", country: "South Africa", city: "Johannesburg", code: "ZA", region: "Africa", lat: -26.2, lng: 28.05 },
  { id: "ke-nbo", country: "Kenya", city: "Nairobi", code: "KE", region: "Africa", lat: -1.29, lng: 36.82 },
  { id: "zw-hre", country: "Zimbabwe", city: "Harare", code: "ZW", region: "Africa", lat: -17.83, lng: 31.05 },
  { id: "gb-lon", country: "United Kingdom", city: "London", code: "GB", region: "Europe", lat: 51.51, lng: -0.13 },
  { id: "nl-ams", country: "Netherlands", city: "Amsterdam", code: "NL", region: "Europe", lat: 52.37, lng: 4.9 },
  { id: "fr-par", country: "France", city: "Paris", code: "FR", region: "Europe", lat: 48.86, lng: 2.35 },
  { id: "br-sao", country: "Brazil", city: "São Paulo", code: "BR", region: "Americas", lat: -23.55, lng: -46.63 },
  { id: "us-lax", country: "United States", city: "Los Angeles", code: "US", region: "Americas", lat: 34.05, lng: -118.24 },
  { id: "in-mum", country: "India", city: "Mumbai", code: "IN", region: "Asia", lat: 19.08, lng: 72.88 },
  { id: "pk-khi", country: "Pakistan", city: "Karachi", code: "PK", region: "Asia", lat: 24.86, lng: 67.01 },
  { id: "jp-tok", country: "Japan", city: "Tokyo", code: "JP", region: "Asia", lat: 35.68, lng: 139.65 },
  { id: "sg-sin", country: "Singapore", city: "Singapore", code: "SG", region: "Asia", lat: 1.35, lng: 103.82 },
]

export function findServer(id: string): ServerInfo | undefined {
  return servers.find((s) => s.id === id)
}
