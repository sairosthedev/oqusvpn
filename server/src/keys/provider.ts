import { config } from "../config"
import type { ServerInfo } from "../data/servers"

export type IssuedKey = {
  /** A Shadowsocks access key: ss://base64(method:pass)@host:port */
  accessKey: string
  serverId: string
}

/**
 * Issues Shadowsocks access to a user for a given server. This is the seam
 * between the control plane (accounts) and the data plane (VPN servers).
 * Swap the implementation without touching the routes.
 */
export interface KeyProvider {
  issue(userId: string, server: ServerInfo): Promise<IssuedKey>
  revoke?(userId: string, server: ServerInfo): Promise<void>
}

/**
 * MVP provider: hands every user the same shared test key (your throwaway
 * ss-server). No per-user isolation — fine for wiring the app end-to-end.
 */
export class StaticKeyProvider implements KeyProvider {
  async issue(_userId: string, server: ServerInfo): Promise<IssuedKey> {
    return { accessKey: config.staticAccessKey, serverId: server.id }
  }
}

/*
 * NEXT: real per-user provisioning. Two drop-in options —
 *
 * class ShadowboxKeyProvider implements KeyProvider {
 *   // POST {apiUrl}/access-keys to the Outline Server management API,
 *   // return the created key's accessUrl. Store keyId on the user/server
 *   // so revoke() can DELETE it. Needs the server's apiUrl + cert sha256.
 * }
 *
 * class SsServerKeyProvider implements KeyProvider {
 *   // Add the user's key to the outline-ss-server YAML config and SIGHUP
 *   // the process (or via its config service), then build the ss:// URL.
 * }
 */

export const keyProvider: KeyProvider = new StaticKeyProvider()
