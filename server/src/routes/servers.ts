import { Router } from "express"
import { servers } from "../data/servers"

export const serversRouter = Router()

// GET /api/servers — public list of available regions.
serversRouter.get("/", (_req, res) => {
  res.json({ servers })
})
