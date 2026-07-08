import jwt, { type SignOptions } from "jsonwebtoken"
import { config } from "../config"

export type JwtPayload = { sub: string; email: string }

export function signToken(payload: JwtPayload): string {
  const opts: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"] }
  return jwt.sign(payload, config.jwtSecret, opts)
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret)
  return decoded as JwtPayload
}
