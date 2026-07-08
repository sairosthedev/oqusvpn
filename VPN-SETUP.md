# OqusVPN — real tunnel (Windows) — PROVEN WORKING

Full-device VPN, **no mock**. Verified end-to-end: with the tunnel up, the
machine's exit IP becomes the server's, DNS resolves through it, the kill switch
prevents leaks on drop, and teardown restores everything.

```
React UI ─IPC─▶ Electron main ─▶ TunnelManager ─▶ sslocal (SOCKS5, tcp+udp)
(Connect)       (main.cjs)        (tunnel.cjs)      + tun2socks (tun://, Wintun)
                                                     + on-link routing + kill switch
                                                     = all device traffic
```

**The tunnel is real and always-on** — there is no simulated mode:
- **Desktop app (Electron)** creates the tunnel. It **must run as Administrator**;
  connecting without admin fails clearly ("adapter didn't come up").
- **Browser (`npm run dev:web`)** cannot run a VPN (sandboxed) — Connect there
  tells you to use the desktop app. The browser is the account/UI surface only.

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

## Run the desktop app (real tunnel — needs Administrator)
Creates a network adapter + edits routes, so it **must run as Administrator**.

1. Backend (serves the real key):
   ```powershell
   npm run dev:server        # in-memory Mongo, or: npm run dev -w server (Atlas)
   ```
2. Build once, then launch Electron from an **Administrator** terminal:
   ```powershell
   npm run build
   npm run electron          # always real; add $env:OQUS_KILLSWITCH="0" to disable the kill switch
   ```
3. Sign in → **Connect** → check an IP site: it should show the server's IP.

> Connect **without admin** fails clearly ("adapter didn't come up"). If the app
> quits with *"tun2socks/sslocal exited"*, check the three binaries are in
> `resources/bin/`. Panic-restore the firewall (if a kill-switched app ever
> crashes): `netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound`.

## Working on the UI (no tunnel)
`npm run dev:web` runs the app in a browser for UI/account work. A browser can't
create a VPN, so **Connect there just says "use the desktop app."** To test
connecting, run the elevated desktop app above.

## Still TODO for production
- **Elevation UX:** run the tunnel via a small helper service instead of the whole app as admin.
- **Per-user keys + revocation** (swap `StaticKeyProvider`).
- **Reconnect/health**, IPv6, **macOS/Linux** paths.
