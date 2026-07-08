import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../middleware/auth"
import { requireAdmin } from "../middleware/admin"
import { UserModel } from "../models/user"
import { ServerModel } from "../models/server"
import { SessionModel } from "../models/session"
import { parseAccessKey } from "../lib/ss"

export const adminRouter = Router()
adminRouter.use(requireAuth, requireAdmin)

const serverInput = z.object({
  serverId: z.string().trim().min(1),
  country: z.string().trim().min(1),
  city: z.string().trim().min(1),
  code: z.string().trim().optional(),
  region: z.string().trim().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  accessKey: z.string().optional(), // ss://… — derives host/port/method/secret
  host: z.string().optional(),
  port: z.number().optional(),
  method: z.string().optional(),
  secret: z.string().optional(),
  fastest: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

/** Resolve connection creds from an ss:// key or explicit fields. */
function resolveCreds(input: z.infer<typeof serverInput>) {
  if (input.accessKey) return parseAccessKey(input.accessKey)
  return {
    host: input.host ?? "",
    port: input.port ?? 8388,
    method: input.method ?? "chacha20-ietf-poly1305",
    secret: input.secret ?? "",
  }
}

// Full admin view (includes host/secret — admins manage these).
function adminServer(s: any) {
  return {
    serverId: s.serverId, country: s.country, city: s.city, code: s.code, region: s.region,
    lat: s.lat, lng: s.lng, host: s.host, port: s.port, method: s.method, secret: s.secret,
    fastest: !!s.fastest, enabled: s.enabled !== false,
  }
}

// --- Server CRUD -----------------------------------------------------------
adminRouter.get("/servers", async (_req, res) => {
  const list = await ServerModel.find().sort({ city: 1 })
  res.json({ servers: list.map(adminServer) })
})

adminRouter.post("/servers", async (req, res) => {
  const parsed = serverInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" })
  if (await ServerModel.findOne({ serverId: parsed.data.serverId })) {
    return res.status(409).json({ error: "serverId already exists" })
  }
  const creds = resolveCreds(parsed.data)
  if (!creds.host || !creds.secret) return res.status(400).json({ error: "Provide accessKey, or host + secret" })
  const server = await ServerModel.create({ ...parsed.data, ...creds })
  res.status(201).json({ server: adminServer(server) })
})

adminRouter.put("/servers/:serverId", async (req, res) => {
  const parsed = serverInput.partial().safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" })
  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.accessKey) Object.assign(update, parseAccessKey(parsed.data.accessKey))
  delete update.accessKey
  const server = await ServerModel.findOneAndUpdate({ serverId: req.params.serverId }, update, { new: true })
  if (!server) return res.status(404).json({ error: "Server not found" })
  res.json({ server: adminServer(server) })
})

adminRouter.delete("/servers/:serverId", async (req, res) => {
  const r = await ServerModel.deleteOne({ serverId: req.params.serverId })
  if (r.deletedCount === 0) return res.status(404).json({ error: "Server not found" })
  res.json({ ok: true })
})

// --- User monitoring -------------------------------------------------------
adminRouter.get("/users", async (_req, res) => {
  const agg = await SessionModel.aggregate([
    {
      $group: {
        _id: "$userId",
        down: { $sum: "$bytesDown" },
        up: { $sum: "$bytesUp" },
        sec: { $sum: "$durationSec" },
        sessions: { $sum: 1 },
      },
    },
  ])
  const byUser = new Map(agg.map((a) => [String(a._id), a]))
  const users = await UserModel.find().sort({ createdAt: -1 }).limit(500)
  res.json({
    users: users.map((u) => {
      const usage = byUser.get(String(u._id))
      return {
        id: String(u._id),
        email: u.email,
        role: u.role,
        verified: u.verified,
        fullName: u.fullName ?? null,
        phone: u.phone ?? null,
        connects: u.usageCount ?? 0,
        createdAt: u.createdAt,
        usage: {
          bytesDown: usage?.down ?? 0,
          bytesUp: usage?.up ?? 0,
          durationSec: usage?.sec ?? 0,
          sessions: usage?.sessions ?? 0,
        },
      }
    }),
  })
})
