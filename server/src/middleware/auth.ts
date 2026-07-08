import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "../auth/jwt"

export interface AuthedRequest extends Request {
  userId?: string
  userEmail?: string
}

/** Rejects the request unless it carries a valid `Authorization: Bearer <jwt>`. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" })
  }
  try {
    const payload = verifyToken(header.slice("Bearer ".length))
    req.userId = payload.sub
    req.userEmail = payload.email
    next()
  } catch {
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
