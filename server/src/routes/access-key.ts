import { Router } from "express"
import { requireAuth, type AuthedRequest } from "../middleware/auth"
import { keyProvider } from "../keys/provider"
import { servers, findServer } from "../data/servers"
import { UserModel } from "../models/user"
import { config } from "../config"

export const accessKeyRouter = Router()

// GET /api/access-key?serverId=xx — issue the caller a Shadowsocks key.
// Unverified accounts get `freeConnectCap` connects, then must verify (name +
// phone) via POST /api/auth/verify before they can connect again.
accessKeyRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const requested = typeof req.query.serverId === "string" ? req.query.serverId : undefined
  const server = requested ? findServer(requested) : (servers.find((s) => s.fastest) ?? servers[0])
  if (!server) return res.status(404).json({ error: "Unknown server" })

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
  const issued = await keyProvider.issue(String(user._id), server)
  res.json({
    accessKey: issued.accessKey,
    server: { id: server.id, city: server.city, country: server.country, code: server.code },
    usage: { count: (user.usageCount ?? 0) + 1, cap, verified: !!user.verified },
  })
})
