import { Router } from "express"
import { z } from "zod"
import mongoose from "mongoose"
import { requireAuth, type AuthedRequest } from "../middleware/auth"
import { SessionModel } from "../models/session"

// Mounted at /api — owns POST /api/usage and GET /api/me/stats.
export const usageRouter = Router()

const usageInput = z.object({
  serverId: z.string().optional(),
  bytesDown: z.number().nonnegative().default(0),
  bytesUp: z.number().nonnegative().default(0),
  durationSec: z.number().nonnegative().default(0),
})

// POST /api/usage — the client reports a finished session's usage.
usageRouter.post("/usage", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = usageInput.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: "Invalid usage payload" })
  await SessionModel.create({ userId: req.userId, ...parsed.data })
  res.status(201).json({ ok: true })
})

// GET /api/me/stats — this user's real aggregated usage (for the Statistics tab).
usageRouter.get("/me/stats", requireAuth, async (req: AuthedRequest, res) => {
  const uid = new mongoose.Types.ObjectId(req.userId as string)
  const [totals] = await SessionModel.aggregate([
    { $match: { userId: uid } },
    {
      $group: {
        _id: null,
        down: { $sum: "$bytesDown" },
        up: { $sum: "$bytesUp" },
        sec: { $sum: "$durationSec" },
        sessions: { $sum: 1 },
      },
    },
  ])
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const daily = await SessionModel.aggregate([
    { $match: { userId: uid, endedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$endedAt" } },
        sec: { $sum: "$durationSec" },
      },
    },
    { $sort: { _id: 1 } },
  ])
  res.json({
    stats: {
      bytesDown: totals?.down ?? 0,
      bytesUp: totals?.up ?? 0,
      durationSec: totals?.sec ?? 0,
      sessions: totals?.sessions ?? 0,
      daily: daily.map((d) => ({ day: d._id as string, sec: d.sec as number })),
    },
  })
})
