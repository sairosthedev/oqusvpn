import { Router } from "express"
import { requireAuth, type AuthedRequest } from "../middleware/auth"
import { UserModel } from "../models/user"
import { ServerModel } from "../models/server"
import { buildAccessKey } from "../lib/ss"
import { config } from "../config"

export const accessKeyRouter = Router()

// GET /api/access-key?serverId=xx — issue the caller a Shadowsocks key, built
// from the DB server record. Unverified accounts are capped (see verify flow).
accessKeyRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const requested = typeof req.query.serverId === "string" ? req.query.serverId : undefined
  const server = requested
    ? await ServerModel.findOne({ serverId: requested, enabled: true })
    : (await ServerModel.findOne({ fastest: true, enabled: true })) ?? (await ServerModel.findOne({ enabled: true }))
  if (!server) return res.status(404).json({ error: "Unknown or disabled server" })

  const user = await UserModel.findById(req.userId)
  if (!user) return res.status(404).json({ error: "User not found" })

  const cap = config.freeConnectCap
  if (!user.verified && (user.usageCount ?? 0) >= cap) {
    return res.status(403).json({
      error: "You've reached the free limit. Verify your account to keep connecting.",
      needsVerification: true,
      usage: { count: user.usageCount ?? 0, cap, verified: false },
    })
  }

  await UserModel.updateOne({ _id: user._id }, { $inc: { usageCount: 1 } })
  const accessKey = buildAccessKey({
    host: server.host,
    port: server.port,
    method: server.method,
    secret: server.secret,
  })
  res.json({
    accessKey,
    server: { id: server.serverId, city: server.city, country: server.country, code: server.code },
    usage: { count: (user.usageCount ?? 0) + 1, cap, verified: !!user.verified },
  })
})
