import express from "express"
import cors from "cors"
import { config } from "./config"
import { authRouter } from "./routes/auth"
import { serversRouter } from "./routes/servers"
import { accessKeyRouter } from "./routes/access-key"
import { usageRouter } from "./routes/usage"
import { adminRouter } from "./routes/admin"

/**
 * CORS policy.
 *
 * The desktop app loads from `file://` and the mobile app isn't a browser at
 * all, so neither sends an `Origin` header. Those requests must be allowed —
 * pinning `origin` to the web URL alone would break every native client with a
 * misleading "can't reach the server" error. Withholding the CORS header from
 * a non-browser client costs nothing: same-origin policy is a browser
 * behaviour, so there is no protection to lose here.
 *
 * Browser origins are still checked against CORS_ORIGIN (comma-separated).
 */
function corsOptions(): cors.CorsOptions {
  const allowed = config.corsOrigin.split(",").map((o) => o.trim()).filter(Boolean)
  const any = allowed.includes("*")
  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true) // desktop (file://) / mobile / curl
      cb(null, any || allowed.includes(origin))
    },
  }
}

/** Builds the Express app (no DB connection / no listen — those are the caller's job). */
export function createApp() {
  const app = express()

  app.use(cors(corsOptions()))
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
