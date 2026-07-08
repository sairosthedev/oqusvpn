import { ServerModel } from "../models/server"
import { UserModel } from "../models/user"
import { servers as staticServers } from "./servers"
import { config } from "../config"
import { parseAccessKey } from "../lib/ss"

// Promote the configured admin email to the admin role on boot — so it works
// whether the account is created now or was signed up earlier.
export async function promoteAdmin() {
  if (!config.adminEmail) return
  const r = await UserModel.updateOne({ email: config.adminEmail }, { $set: { role: "admin" } })
  if (r.matchedCount) console.log(`[admin] ${config.adminEmail} is admin`)
}

// First-run seed: populate the servers collection from the static list, all
// pointing at the configured access key (OQUS_ACCESS_KEY) so everything works
// out of the box. Admins then edit individual servers to real per-region VMs.
export async function seedServers() {
  const count = await ServerModel.estimatedDocumentCount()
  if (count > 0) return
  const creds = parseAccessKey(config.staticAccessKey)
  const docs = staticServers.map((s) => ({
    serverId: s.id,
    country: s.country,
    city: s.city,
    code: s.code,
    region: s.region,
    lat: s.lat,
    lng: s.lng,
    host: creds.host,
    port: creds.port,
    method: creds.method,
    secret: creds.secret,
    fastest: !!s.fastest,
    enabled: true,
  }))
  await ServerModel.insertMany(docs)
  console.log(`[seed] inserted ${docs.length} servers`)
}
