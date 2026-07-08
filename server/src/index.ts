import { createApp } from "./app"
import { connectDb } from "./db"
import { config } from "./config"

async function main() {
  await connectDb()
  const app = createApp()
  app.listen(config.port, () => {
    console.log(`[oqusvpn-server] listening on http://localhost:${config.port}`)
  })
}

main().catch((err) => {
  console.error("[oqusvpn-server] failed to start:", err)
  process.exit(1)
})
