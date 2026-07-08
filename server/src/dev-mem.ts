// Run the backend with an in-memory MongoDB — no Mongo install needed.
// Perfect for local dev / demos. Data is wiped on restart.
//   npm run dev:mem
import { MongoMemoryServer } from "mongodb-memory-server"
import { createApp } from "./app"
import { connectDb, disconnectDb } from "./db"
import { config } from "./config"

async function main() {
  const mongod = await MongoMemoryServer.create()
  await connectDb(mongod.getUri())
  const server = createApp().listen(config.port, () => {
    console.log(`[dev:mem] OqusVPN backend on http://localhost:${config.port} (in-memory Mongo — data is ephemeral)`)
  })

  const shutdown = async () => {
    server.close()
    await disconnectDb()
    await mongod.stop()
    process.exit(0)
  }
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

main().catch((err) => {
  console.error("[dev:mem] failed to start:", err)
  process.exit(1)
})
