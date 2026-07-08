import type { Response, NextFunction } from "express"
import { UserModel } from "../models/user"
import type { AuthedRequest } from "./auth"

/** Requires an authenticated admin. Chain after requireAuth. */
export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await UserModel.findById(req.userId)
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" })
  }
  next()
}
