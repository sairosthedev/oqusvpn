// End-to-end smoke test: real Express app against an in-memory MongoDB.
// Run: npm run smoke   (downloads a mongod binary on first run)
import { MongoMemoryServer } from "mongodb-memory-server"
import { createApp } from "./app"
import { connectDb, disconnectDb } from "./db"
import type { AddressInfo } from "node:net"

const results: { name: string; pass: boolean; detail?: string }[] = []
const check = (name: string, pass: boolean, detail = "") => {
  results.push({ name, pass, detail })
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? "  (" + detail + ")" : ""}`)
}

async function main() {
  const mongod = await MongoMemoryServer.create()
  await connectDb(mongod.getUri())
  const server = createApp().listen(0)
  const { port } = server.address() as AddressInfo
  const base = `http://127.0.0.1:${port}`
  const json = (r: Response) => r.json() as Promise<any>

  try {
    check("GET /health ok", (await fetch(`${base}/health`)).ok)

    const serversRes = await fetch(`${base}/api/servers`)
    const serversBody = await json(serversRes)
    check("GET /api/servers returns list", Array.isArray(serversBody.servers) && serversBody.servers.length > 0, `${serversBody.servers?.length} servers`)

    const creds = { email: "Ada@Oqus.app", password: "supersecret1" }

    // signup (email + password only)
    const signup = await fetch(`${base}/api/auth/signup`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(creds),
    })
    const signupBody = await json(signup)
    check("signup returns 201 + token", signup.status === 201 && !!signupBody.token, `status ${signup.status}`)
    check("new account starts unverified", signupBody.user?.verified === false, `verified=${signupBody.user?.verified}`)

    // duplicate signup
    const dup = await fetch(`${base}/api/auth/signup`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(creds),
    })
    check("duplicate signup rejected 409", dup.status === 409, `status ${dup.status}`)

    // weak password rejected
    const weak = await fetch(`${base}/api/auth/signup`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "x@y.com", password: "short" }),
    })
    check("weak password rejected 400", weak.status === 400, `status ${weak.status}`)

    // wrong password
    const badLogin = await fetch(`${base}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: creds.email, password: "wrongpass1" }),
    })
    check("wrong password rejected 401", badLogin.status === 401, `status ${badLogin.status}`)

    // correct login
    const login = await fetch(`${base}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(creds),
    })
    const loginBody = await json(login)
    const token = loginBody.token as string
    check("login returns token", login.ok && !!token)

    // /me without token
    check("GET /me without token is 401", (await fetch(`${base}/api/auth/me`)).status === 401)

    // /me with token
    const me = await fetch(`${base}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })
    const meBody = await json(me)
    check("GET /me with token returns user", me.ok && meBody.user?.email === "ada@oqus.app", meBody.user?.email)

    const authHdr = { authorization: `Bearer ${token}` }
    const jsonHdr = { ...authHdr, "content-type": "application/json" }
    const getKey = (extra = "") => fetch(`${base}/api/access-key${extra}`, { headers: authHdr })

    check("GET /access-key without token is 401", (await fetch(`${base}/api/access-key`)).status === 401)

    // Unverified: some connects succeed, then it's blocked with needsVerification.
    let blocked: any = null
    let successes = 0
    for (let i = 0; i < 12; i++) {
      const r = await getKey()
      if (r.status === 200) { successes++; continue }
      if (r.status === 403) { blocked = await json(r); break }
      break
    }
    check("unverified account gets free connects", successes > 0, `${successes} free connects`)
    check("unverified account is blocked after the cap", !!blocked && blocked.needsVerification === true, blocked?.error)

    // Verify with name + phone lifts the cap.
    const badVerify = await fetch(`${base}/api/auth/verify`, {
      method: "POST", headers: jsonHdr, body: JSON.stringify({ fullName: "", phone: "123" }),
    })
    check("verify rejects invalid name/phone 400", badVerify.status === 400, `status ${badVerify.status}`)

    const verify = await fetch(`${base}/api/auth/verify`, {
      method: "POST", headers: jsonHdr, body: JSON.stringify({ fullName: "Ada Okonkwo", phone: "+2348012345678" }),
    })
    const verifyBody = await json(verify)
    check("verify succeeds and marks account verified", verify.ok && verifyBody.user?.verified === true, `verified=${verifyBody.user?.verified}`)
    check("verify stores fullName + phone", verifyBody.user?.fullName === "Ada Okonkwo" && verifyBody.user?.phone === "+2348012345678")

    // Verified: connects again (and server targeting still works).
    const afterKey = await getKey("?serverId=jp-tok")
    const afterBody = await json(afterKey)
    check(
      "verified account can connect again (Tokyo)",
      afterKey.ok && String(afterBody.accessKey).startsWith("ss://") && afterBody.server?.city === "Tokyo",
      `${afterKey.status} ${afterBody.server?.city}`,
    )

    // --- usage metering ---
    const rep = await fetch(`${base}/api/usage`, {
      method: "POST", headers: jsonHdr, body: JSON.stringify({ serverId: "jp-tok", bytesDown: 5_000_000, bytesUp: 1_000_000, durationSec: 120 }),
    })
    check("POST /api/usage records a session", rep.status === 201, `status ${rep.status}`)
    const stats = await json(await fetch(`${base}/api/me/stats`, { headers: authHdr }))
    check(
      "GET /api/me/stats aggregates real usage",
      stats.stats?.bytesDown === 5_000_000 && stats.stats?.sessions === 1 && stats.stats?.durationSec === 120,
      `down=${stats.stats?.bytesDown} sessions=${stats.stats?.sessions}`,
    )

    // --- admin role + server CRUD + monitoring ---
    check("non-admin blocked from /api/admin (403)", (await fetch(`${base}/api/admin/users`, { headers: authHdr })).status === 403)

    // admin account (email matches OQUS_ADMIN_EMAIL set for the smoke run)
    const adminSignup = await fetch(`${base}/api/auth/signup`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@oqus.app", password: "supersecret1" }),
    })
    const adminBody = await json(adminSignup)
    check("admin email gets admin role", adminBody.user?.role === "admin", `role=${adminBody.user?.role}`)
    const adminHdr = { authorization: `Bearer ${adminBody.token}` }
    const adminJson = { ...adminHdr, "content-type": "application/json" }

    const listed = await json(await fetch(`${base}/api/admin/servers`, { headers: adminHdr }))
    check("admin lists seeded servers", Array.isArray(listed.servers) && listed.servers.length >= 10, `${listed.servers?.length} servers`)

    const created = await fetch(`${base}/api/admin/servers`, {
      method: "POST", headers: adminJson,
      body: JSON.stringify({ serverId: "ke-nbo2", country: "Kenya", city: "Nairobi 2", accessKey: "ss://chacha20-ietf-poly1305:testpw@9.9.9.9:8388" }),
    })
    const createdBody = await json(created)
    check("admin creates a server (from ss:// key)", created.status === 201 && createdBody.server?.host === "9.9.9.9", `${created.status} host=${createdBody.server?.host}`)

    const upd = await fetch(`${base}/api/admin/servers/ke-nbo2`, { method: "PUT", headers: adminJson, body: JSON.stringify({ enabled: false }) })
    const updBody = await json(upd)
    check("admin updates a server (disable)", upd.ok && updBody.server?.enabled === false)

    const usersList = await json(await fetch(`${base}/api/admin/users`, { headers: adminHdr }))
    const adaRow = usersList.users?.find((u: any) => u.email === "ada@oqus.app")
    check("admin monitors users with usage", !!adaRow && adaRow.usage?.bytesDown === 5_000_000, `ada down=${adaRow?.usage?.bytesDown}`)

    const del = await fetch(`${base}/api/admin/servers/ke-nbo2`, { method: "DELETE", headers: adminHdr })
    check("admin deletes a server", del.ok)
  } catch (e) {
    check("exception", false, (e as Error).message)
  } finally {
    server.close()
    await disconnectDb()
    await mongod.stop()
  }

  const failed = results.filter((r) => !r.pass).length
  console.log(`\n==== ${results.length - failed} passed, ${failed} failed ====`)
  process.exit(failed === 0 ? 0 : 1)
}

main()
