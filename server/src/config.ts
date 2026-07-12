import dotenv from "dotenv"

dotenv.config()

export const config = {
  port: Number(process.env.PORT ?? 8080),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/oqusvpn",
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30d",
  // MVP: one shared Shadowsocks key for every user (the throwaway test server).
  staticAccessKey:
    process.env.OQUS_ACCESS_KEY ?? "ss://chacha20-ietf-poly1305:oqus-test-pw@127.0.0.1:8388",
  // Comma-separated list of allowed web origins ("*" allows any). Non-browser
  // clients (desktop file://, mobile) send no Origin and are always allowed —
  // see corsOrigin handling in app.ts.
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  // Connections an unverified account gets before it must verify (name + phone).
  freeConnectCap: Number(process.env.OQUS_FREE_CAP ?? 5),
  // Signing up with this email grants the admin role (server CRUD + monitoring).
  adminEmail: (process.env.OQUS_ADMIN_EMAIL ?? "").toLowerCase(),
  // If set, the admin account is created/kept with this exact password on boot
  // (deterministic admin login controlled by .env).
  adminPassword: process.env.OQUS_ADMIN_PASSWORD ?? "",
}

if (config.jwtSecret === "dev-insecure-secret-change-me") {
  console.warn("[config] JWT_SECRET is the insecure default — set a real secret before production.")
}
