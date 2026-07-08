import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose"

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true, // enforces one account per email at the DB level
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    // Signup stays minimal (email + password). Name/phone are collected later,
    // only when an unverified user hits the free usage cap.
    verified: { type: Boolean, default: false },
    fullName: { type: String, trim: true },
    phone: { type: String, trim: true },
    usageCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() },
  },
  { versionKey: false },
)

export type User = InferSchemaType<typeof userSchema>
export type UserDocument = HydratedDocument<User>

export const UserModel = model("User", userSchema)
