import express from "express"
import cors from "cors"
import { config } from "./config"
import { authRouter } from "./routes/auth"
import { serversRouter } from "./routes/servers"
import { accessKeyRouter } from "./routes/access-key"
import { usageRouter } from "./routes/usage"
import { adminRouter } from "./routes/admin"

/** Builds the Express app (no DB connection / no listen — those are the caller's job). */
export function createApp() {
  const app = express()

  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json())

  app.get("/health", (_req, res) => res.json({ ok: true, service: "oqusvpn-server" }))

  app.use("/api/auth", authRouter)
  app.use("/api/servers", serversRouter)
  app.use("/api/access-key", accessKeyRouter)
  app.use("/api/admin", adminRouter)
  app.use("/api", usageRouter) // POST /api/usage, GET /api/me/stats

  app.use((_req, res) => res.status(404).json({ error: "Not found" }))

  return app
}
