import { Buffer } from "node:buffer"

export type SsParts = { host: string; port: number; method: string; secret: string }

const b64decode = (x: string) => Buffer.from(x.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()

/** Parse an ss:// access key into its parts (SIP002 or legacy base64). */
export function parseAccessKey(key: string): SsParts {
  let s = key.trim().replace(/^ss:\/\//i, "")
  const hash = s.indexOf("#")
  if (hash >= 0) s = s.slice(0, hash)
  const q = s.indexOf("?")
  if (q >= 0) s = s.slice(0, q)

  let method = "", secret = "", host = "", port = 0
  if (s.includes("@")) {
    const at = s.lastIndexOf("@")
    let userinfo = s.slice(0, at)
    const hostport = s.slice(at + 1)
    if (!userinfo.includes(":")) userinfo = b64decode(userinfo)
    const i = userinfo.indexOf(":")
    method = userinfo.slice(0, i)
    secret = userinfo.slice(i + 1)
    const c = hostport.lastIndexOf(":")
    host = hostport.slice(0, c)
    port = Number(hostport.slice(c + 1))
  } else {
    const decoded = b64decode(s)
    const at = decoded.lastIndexOf("@")
    const cred = decoded.slice(0, at)
    const hostport = decoded.slice(at + 1)
    const i = cred.indexOf(":")
    method = cred.slice(0, i)
    secret = cred.slice(i + 1)
    const c = hostport.lastIndexOf(":")
    host = hostport.slice(0, c)
    port = Number(hostport.slice(c + 1))
  }
  return { host, port, method, secret }
}

/** Build an ss:// access key (SIP002) from parts. */
export function buildAccessKey(p: SsParts): string {
  return `ss://${Buffer.from(`${p.method}:${p.secret}`).toString("base64")}@${p.host}:${p.port}`
}
