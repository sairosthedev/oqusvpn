import { Schema, model } from "mongoose"

// A VPN server (data-plane node). CRUD-managed by admins; the `secret` builds
// the ss:// key issued to users. Never expose `secret`/`host` to non-admins.
const serverSchema = new Schema(
  {
    serverId: { type: String, required: true, unique: true, index: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    code: { type: String, default: "" },
    region: { type: String, default: "Recommended" },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    host: { type: String, required: true },
    port: { type: Number, default: 8388 },
    method: { type: String, default: "chacha20-ietf-poly1305" },
    secret: { type: String, required: true },
    fastest: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
)

export const ServerModel = model("Server", serverSchema)

/** Public view — safe for any client (no host/secret). */
export function publicServer(s: {
  serverId: string
  country: string
  city: string
  code: string
  region: string
  lat: number
  lng: number
  fastest?: boolean
  enabled?: boolean
}) {
  return {
    id: s.serverId,
    country: s.country,
    city: s.city,
    code: s.code,
    region: s.region,
    lat: s.lat,
    lng: s.lng,
    fastest: !!s.fastest,
    enabled: s.enabled !== false,
  }
}
