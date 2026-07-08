import { Schema, model } from "mongoose"

// One VPN session's usage, reported by the client on disconnect. Aggregated for
// per-user stats and admin monitoring.
const sessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    serverId: { type: String, default: "" },
    bytesDown: { type: Number, default: 0 },
    bytesUp: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    endedAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
)

export const SessionModel = model("Session", sessionSchema)
