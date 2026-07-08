import { Router } from "express"
import { z } from "zod"
import { UserModel } from "../models/user"
import { hashPassword, verifyPassword } from "../auth/password"
import { signToken } from "../auth/jwt"
import { requireAuth, type AuthedRequest } from "../middleware/auth"
import { config } from "../config"

const credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const verifySchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(120),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(32),
})

/** Shape returned to the client — never includes the password hash. */
function publicUser(u: {
  _id: unknown
  email: string
  role?: string
  verified?: boolean
  fullName?: string | null
  phone?: string | null
  usageCount?: number
}) {
  return {
    id: String(u._id),
    email: u.email,
    role: u.role ?? "user",
    verified: !!u.verified,
    fullName: u.fullName ?? null,
    phone: u.phone ?? null,
    usageCount: u.usageCount ?? 0,
  }
}

export const authRouter = Router()

// POST /api/auth/signup — minimal onboarding: email + password only.
authRouter.post("/signup", async (req, res) => {
  const parsed = credentials.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" })
  }
  const email = parsed.data.email.toLowerCase()

  const existing = await UserModel.findOne({ email })
  if (existing) return res.status(409).json({ error: "Email already registered" })

  const user = await UserModel.create({
    email,
    passwordHash: await hashPassword(parsed.data.password),
    role: config.adminEmail && email === config.adminEmail ? "admin" : "user",
  })
  return res.status(201).json({ token: signToken({ sub: String(user._id), email }), user: publicUser(user) })
})

// POST /api/auth/login — verify credentials, return a JWT.
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: "Invalid credentials" })
  const email = parsed.data.email.toLowerCase()

  const user = await UserModel.findOne({ email })
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" })
  }
  return res.json({ token: signToken({ sub: String(user._id), email }), user: publicUser(user) })
})

// POST /api/auth/verify — collect name + phone to lift the free cap.
authRouter.post("/verify", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = verifySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" })
  }
  const user = await UserModel.findByIdAndUpdate(
    req.userId,
    { fullName: parsed.data.fullName, phone: parsed.data.phone, verified: true },
    { new: true },
  )
  if (!user) return res.status(404).json({ error: "User not found" })
  res.json({ user: publicUser(user) })
})

// GET /api/auth/me — the current user profile, from the bearer token.
authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await UserModel.findById(req.userId)
  if (!user) return res.status(404).json({ error: "User not found" })
  res.json({ user: publicUser(user) })
})

export { publicUser }
