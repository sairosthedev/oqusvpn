import { Router } from "express"
import { ServerModel, publicServer } from "../models/server"

export const serversRouter = Router()

// GET /api/servers — public list of enabled regions (no host/secret).
serversRouter.get("/", async (_req, res) => {
  const list = await ServerModel.find({ enabled: true }).sort({ fastest: -1, city: 1 })
  res.json({ servers: list.map(publicServer) })
})
