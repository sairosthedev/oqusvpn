import fs from "node:fs"
import path from "node:path"
import { config } from "../config"
import type { ServerInfo } from "../data/servers"

export type IssuedKey = {
  /** A Shadowsocks access key: ss://base64(method:pass)@host:port */
  accessKey: string
  serverId: string
}

/**
 * Issues Shadowsocks access to a user for a given server — the seam between the
 * control plane (accounts) and the data plane (VPN servers). Swap the
 * implementation without touching the routes.
 */
export interface KeyProvider {
  issue(userId: string, server: ServerInfo): Promise<IssuedKey>
  revoke?(userId: string, server: ServerInfo): Promise<void>
}

/**
 * Per-server keys from `server/keys.json` (gitignored), with the single
 * `OQUS_ACCESS_KEY` as the fallback for any server not listed. This is how you
 * add servers: deploy a VM, get its ss:// key, add "<serverId>": "ss://…" to
 * keys.json, restart. See keys.example.json.
 *
 * NEXT (real multi-user): a ShadowboxKeyProvider that calls each server's
 * Outline management API to mint/revoke a per-user key — same interface.
 */
export class MappedKeyProvider implements KeyProvider {
  private map: Record<string, string> = {}

  constructor() {
    const file = path.resolve(__dirname, "..", "..", "keys.json")
    try {
      if (fs.existsSync(file)) {
        const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, string>
        // ignore comment/meta keys (leading underscore)
        for (const [k, v] of Object.entries(parsed)) {
          if (!k.startsWith("_") && typeof v === "string" && v.startsWith("ss://")) this.map[k] = v
        }
        console.log(`[keys] loaded ${Object.keys(this.map).length} per-server key(s) from keys.json`)
      } else {
        console.log("[keys] no keys.json — using OQUS_ACCESS_KEY for every server")
      }
    } catch (err) {
      console.warn("[keys] failed to read keys.json, falling back to OQUS_ACCESS_KEY:", err)
    }
  }

  async issue(_userId: string, server: ServerInfo): Promise<IssuedKey> {
    return { accessKey: this.map[server.id] ?? config.staticAccessKey, serverId: server.id }
  }

  /** Which servers have a real, dedicated key (vs. the shared fallback). */
  provisioned(): string[] {
    return Object.keys(this.map)
  }
}

export const keyProvider = new MappedKeyProvider()
