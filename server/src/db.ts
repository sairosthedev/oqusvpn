import mongoose from "mongoose"
import { config } from "./config"
import { seedServers } from "./data/seed"

export async function connectDb(uri: string = config.mongoUri) {
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri)
  console.log("[db] connected to MongoDB")
  await seedServers() // first-run: populate the servers collection
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
