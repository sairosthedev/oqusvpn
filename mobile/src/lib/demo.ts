// Demo / guest mode — lets you explore the whole UI on a device WITHOUT a
// reachable backend. The design spec defers auth ("free tier works without
// login"), so this doubles as that guest entry. Everything is local:
//   • a static server list populates Locations
//   • connect uses the simulated tunnel (no access-key fetch)
//   • stats show zeros
import type { AuthUser, PublicServer } from "./api"

export const DEMO_TOKEN = "__demo__"

export const DEMO_USER: AuthUser = {
  id: "demo",
  email: "guest@oqus.app",
  role: "user",
  verified: false,
  fullName: null,
  phone: null,
  usageCount: 0,
}

export const LOCAL_SERVERS: PublicServer[] = [
  { id: "ca-tor", country: "Canada", city: "Toronto", code: "CA", region: "Recommended", lat: 43.65, lng: -79.38, fastest: true, enabled: true },
  { id: "us-va", country: "United States", city: "Virginia", code: "US", region: "Americas", lat: 37.43, lng: -78.66, fastest: false, enabled: true },
  { id: "us-ny", country: "United States", city: "New York", code: "US", region: "Americas", lat: 40.71, lng: -74.01, fastest: false, enabled: true },
  { id: "de-fra", country: "Germany", city: "Frankfurt", code: "DE", region: "Europe", lat: 50.11, lng: 8.68, fastest: false, enabled: true },
  { id: "gb-lon", country: "United Kingdom", city: "London", code: "GB", region: "Europe", lat: 51.51, lng: -0.13, fastest: false, enabled: true },
  { id: "nl-ams", country: "Netherlands", city: "Amsterdam", code: "NL", region: "Europe", lat: 52.37, lng: 4.9, fastest: false, enabled: true },
  { id: "ng-lag", country: "Nigeria", city: "Lagos", code: "NG", region: "Africa", lat: 6.52, lng: 3.38, fastest: false, enabled: true },
  { id: "za-jnb", country: "South Africa", city: "Johannesburg", code: "ZA", region: "Africa", lat: -26.2, lng: 28.05, fastest: false, enabled: true },
  { id: "ke-nbo", country: "Kenya", city: "Nairobi", code: "KE", region: "Africa", lat: -1.29, lng: 36.82, fastest: false, enabled: true },
  { id: "in-mum", country: "India", city: "Mumbai", code: "IN", region: "Asia", lat: 19.08, lng: 72.88, fastest: false, enabled: true },
  { id: "jp-tok", country: "Japan", city: "Tokyo", code: "JP", region: "Asia", lat: 35.68, lng: 139.65, fastest: false, enabled: true },
  { id: "sg-sin", country: "Singapore", city: "Singapore", code: "SG", region: "Asia", lat: 1.35, lng: 103.82, fastest: false, enabled: true },
]
