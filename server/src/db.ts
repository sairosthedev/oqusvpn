import mongoose from "mongoose"
import { config } from "./config"

export async function connectDb(uri: string = config.mongoUri) {
  mongoose.set("strictQuery", true)
  await mongoose.connect(uri)
  console.log("[db] connected to MongoDB")
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
}
