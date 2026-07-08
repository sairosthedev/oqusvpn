# OqusVPN — real tunnel (Windows) — PROVEN WORKING

Full-device VPN. Verified end-to-end: with the tunnel up, the machine's exit IP
becomes the server's, DNS resolves through it, and teardown restores everything.

```
React UI ─IPC─▶ Electron main ─▶ TunnelManager ─▶ sslocal (SOCKS5, tcp+udp)
(Connect)       (main.cjs)        (tunnel.cjs)      + tun2socks (tun://, Wintun)
                                                     + on-link routing
                                                     = all device traffic
```

Two modes:

| Mode | How | What happens |
|------|-----|--------------|
| **Mock** (default) | `npm run dev` | Connect is simulated. No driver/admin. |
| **Real** | `OQUS_REAL=1`, run **elevated** | Genuine full-device tunnel. |

## The stack (all binaries are in `resources/bin/`, fetched — no build)
- **`sslocal.exe`** (shadowsocks-rust) — Shadowsocks client, exposes a local
  SOCKS5 with TCP **and** UDP (UDP is needed for DNS).
- **`tun2socks.exe`** (xjasonlyu/tun2socks) — reads the Wintun TUN device and
  forwards to that SOCKS5. (shadowsocks-rust's own `--protocol tun` is
  experimental and didn't forward reliably on Windows — hence tun2socks.)
- **`wintun.dll`** (WireGuard) — the userspace TUN adapter.

`tunnel.cjs` `_connectReal()` wires them exactly as verified:
1. write an sslocal config (`mode: tcp_and_udp`), launch `sslocal -c` → SOCKS5 on `127.0.0.1:10808`,
2. launch `tun2socks -device tun://OqusVPN -proxy socks5://127.0.0.1:10808` (creates the Wintun adapter),
3. address the adapter `10.255.0.2/24`,
4. add a **/32 bypass route** for the server via the physical gateway (so Shadowsocks packets don't loop),
5. add **on-link** `0.0.0.0/1` + `128.0.0.0/1` routes into the tun (Wintun has no ARP → no gateway),
6. point DNS at `9.9.9.9` on the tun.

Disconnect reverses every route and kills both processes (tun2socks removes the adapter).

## Run it (mock) — any machine, no admin
```bash
npm install
npm run dev
```

## Turn on the REAL tunnel
Creates a network adapter + edits routes → must run **as Administrator**.

1. Backend (serves the real key):
   ```powershell
   npm run dev:server        # in-memory Mongo, or: npm run dev -w server (Atlas)
   ```
2. **Administrator** terminal:
   ```powershell
   npm run build
   $env:OQUS_REAL = "1"
   npm run electron
   ```
3. Sign in → **Connect** → check an IP site: it should show the server's IP.

> If Connect fails with *"adapter didn't come up — Administrator?"*, the terminal
> isn't elevated. If the app quits with *"tun2socks/sslocal exited"*, check that
> all three binaries are in `resources/bin/`.

## Still TODO for production
- **Kill switch:** WFP/firewall rules blocking non-tunnel egress.
- **Elevation UX:** run the tunnel via a small helper service instead of the whole app as admin.
- **Per-user keys + revocation** (swap `StaticKeyProvider`).
- **Reconnect/health**, IPv6, **macOS/Linux** paths.
