# OqusVPN — real tunnel setup (Windows)

The app now runs as an Electron desktop client. Connecting is wired end-to-end:

```
React UI  ──IPC──▶  Electron main  ──▶  TunnelManager  ──▶  tun2socks + routes
(connect btn)       (main.cjs)          (tunnel.cjs)        (all device traffic)
```

There are two modes:

| Mode | How | What happens |
|------|-----|--------------|
| **Mock** (default) | `npm run electron:dev` | Connect simulates the handshake. No driver, no admin. Good for UI work. |
| **Real** | set `OQUS_REAL=1`, run elevated | Real full-device VPN: a TUN adapter + tun2socks (Shadowsocks) + split-default routing. |

---

## Run the app (mock mode)

```bash
npm install
npm run electron:dev      # vite dev server + Electron window
```

You'll get the full UI in a desktop window. Connect works as a simulation.

Web build still works too: `npm run dev` (browser) is unchanged.

---

## Turn on the REAL full-device tunnel

Real mode needs three things on **your** machine, and the app must run **as Administrator** (it edits the routing table).

### 1. Install a TUN/TAP adapter

Install the OpenVPN **tap-windows** driver (same one Outline uses):

- Download `tap-windows` from the OpenVPN site and install, **or** run `tapctl create` from an OpenVPN install.
- Rename the new adapter's connection to **`OqusVPN-TAP`** (Control Panel → Network Connections → rename). This name must match `TAP_NAME` in `electron/tunnel.cjs`.

### 2. Get the `tun2socks.exe` binary

Build it from Jigsaw's [`outline-go-tun2socks`](https://github.com/Jigsaw-Code/outline-go-tun2socks) (needs Go):

```bash
git clone https://github.com/Jigsaw-Code/outline-go-tun2socks
cd outline-go-tun2socks
# build the Windows CLI (see its README / Makefile), producing tun2socks.exe
```

Place the result at:

```
resources/bin/tun2socks.exe
```

> The flag names in `tunnel.cjs` (`-tunName`, `-proxyHost`, `-proxyCipher`, …) match
> outline-go-tun2socks. If you build a different tun2socks, adjust the args in
> `_connectReal()`.

### 3. Start a Shadowsocks server + set the access key

For a quick test server:

```bash
npm run ss:server            # runs ssserver, prints an ss:// key
```

> ⚠️ A **local** server proves the plumbing but will *loop* under full-device
> routing (the server's own upstream traffic gets recaptured). For a clean
> full-device test, run the server on a **separate host** (a cheap VPS, another
> machine, or a Docker box) and pass its IP: `npm run ss:server -- <public-ip>`.

Put the printed key in `.env.local` at the repo root:

```
VITE_OQUS_ACCESS_KEY=ss://...your-key...
```

### 4. Launch elevated in real mode

Open an **Administrator** terminal:

```powershell
$env:OQUS_REAL = "1"
$env:OQUS_DEV  = "1"
npm run electron:dev
```

Click **Connect**. The manager will:

1. resolve the server IP and read your current default gateway,
2. set the TAP adapter address + DNS,
3. launch `tun2socks.exe`,
4. add a bypass route to the server, then split the default route into the TAP.

Verify: browse to an IP-check site — your public IP should be the server's
(only when the server is remote). Disconnecting reverses every route/DNS change,
and quitting the app tears the tunnel down automatically.

---

## What's still TODO for production

- **Kill switch:** `tunnel.cjs` has the routing hooks; a real kill switch needs
  WFP/Windows-Firewall rules blocking non-TUN egress. (Currently a no-op.)
- **Elevation UX:** ship the routing changes via a small helper service (like
  Outline's `OutlineService`) so users don't run the whole app as admin.
- **Per-server credentials:** today every server row uses the one test key. Wire
  real `ss://` keys per server (or fetch them from your backend after login).
- **Reconnect/health:** detect tun2socks drops and auto-reconnect.
- **macOS/Linux:** `_connectReal()` is Windows-only; add NetworkExtension (macOS)
  and a `tun`/`ip route` path (Linux).
