# OqusVPN — real tunnel setup (Windows)

The app is an Electron desktop client. Connecting is wired end-to-end:

```
React UI ──IPC──▶ Electron main ──▶ TunnelManager ──▶ sslocal --protocol tun
(Connect)         (main.cjs)        (tunnel.cjs)        + Wintun + routing
                                                        (all device traffic)
```

Two modes:

| Mode | How | What happens |
|------|-----|--------------|
| **Mock** (default) | `npm run dev` | Connect simulates the handshake. No driver/admin. |
| **Real** | `OQUS_REAL=1`, run **elevated** | Full-device VPN: a Wintun adapter + Shadowsocks (TUN mode) + routing. |

The real path uses **shadowsocks-rust `sslocal --protocol tun`** with **Wintun**
(WireGuard's userspace TUN driver) — the current, maintained approach.
`outline-go-tun2socks` was archived in 2024; we don't use it.

## What's already done
- **Binaries fetched** → `resources/bin/sslocal.exe` + `resources/bin/wintun.dll`
  (prebuilt — no Go/C build, no separate TAP driver install).
- **Server deployed** on Azure (`shadowsocks-libev`, chacha20-ietf-poly1305).
- **Proven working:** `sslocal` against the server changes the exit IP
  (`197.x → 102.37.129.78`).
- **Backend** issues the real `ss://` key (in `server/.env`).

## Run it (mock) — any machine, no admin
```bash
npm install
npm run dev          # backend + Vite + Electron; Connect is simulated
```

## Turn on the REAL full-device tunnel
It edits the routing table and creates a network adapter, so it must run **as
Administrator**.

1. Start the backend (serves the real key):
   ```powershell
   npm run dev:server        # or: npm run dev -w server  (uses Atlas)
   ```
2. In an **Administrator** terminal, build the app and launch Electron in real mode:
   ```powershell
   npm run build
   $env:OQUS_REAL = "1"
   npm run electron          # loads dist/, real tunnel enabled
   ```
   (For hot-reload dev as admin: `$env:OQUS_REAL="1"; $env:OQUS_DEV="1"; npm run electron:dev`.)
3. Sign in → **Connect**. The TunnelManager will:
   - launch `sslocal` in TUN mode (Wintun creates the `OqusVPN` adapter),
   - pin the Shadowsocks connection to your physical NIC (no loop),
   - split-route all traffic into the tunnel, set DNS.
4. **Verify:** open an IP-check site — it should read the **server's** IP.
   Disconnect reverses every route/DNS change; quitting tears it down.

> If Connect fails with *"adapter didn't come up — running as Administrator?"*,
> the terminal isn't elevated. Routing is the empirical part on Windows; if all
> traffic doesn't flow, check `route print` for the `10.255.0.x` entries and the
> `OqusVPN` adapter, and tweak the routes in `tunnel.cjs` `_connectReal()`.

## Sanity-check the pieces independently
- **Server:** paste the `ss://` key (from `server/.env`) into the Outline client
  → connect → your IP should be the server's.
- **Client SS path (no admin):** run sslocal as a plain SOCKS5 proxy and curl through it:
  ```powershell
  .\resources\bin\sslocal.exe -b 127.0.0.1:1080 -s <ip>:8388 -m chacha20-ietf-poly1305 -k <password>
  curl.exe -s --socks5-hostname 127.0.0.1:1080 https://ifconfig.me   # → server IP
  ```

## Still TODO for production
- **Kill switch:** WFP/firewall rules blocking non-tunnel egress (currently none).
- **Elevation UX:** ship routing via a small helper service so users don't run
  the whole app as admin.
- **Per-user keys + revocation:** swap `StaticKeyProvider` for real provisioning.
- **Reconnect/health**, IPv6 handling, **macOS/Linux** tunnel paths.
