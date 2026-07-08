# OqusVPN — monorepo

A VPN desktop app and its backend in one repo, managed with **npm workspaces**.

```
.                     # desktop client (React + Vite + Electron)  ← workspace root
├── src/              #   React UI (renderer)
├── electron/         #   Electron main, preload, tunnel manager
├── tools/            #   ss-server helper (throwaway Shadowsocks)
├── server/           # backend workspace (Node + Express + MongoDB)
│   └── src/          #   accounts, auth, access-key issuance, verify/cap
├── VPN-SETUP.md      # how to turn on the real full-device tunnel
└── server/README.md  # backend details + endpoints
```

- **Client** = the desktop app: UI, and the native tunnel (Shadowsocks via `tun2socks`).
- **Server** = the control plane: signup/login (JWT), issues `ss://` keys, enforces the free-usage cap + verification.

## Setup

One install covers both workspaces:

```bash
npm install
```

## Run everything (one command)

```bash
npm run dev
```

Starts all three together: **api** (backend, in-memory Mongo — zero setup) + **web** (Vite) + **app** (Electron window). The tunnel is **real** — to actually connect, run the Electron app **as Administrator** (`npm run build && npm run electron` in an elevated terminal). See [VPN-SETUP.md](VPN-SETUP.md).

## Scripts

| Command | What it runs |
|---|---|
| `npm run dev` | api + web + electron (full desktop stack) |
| `npm run dev:web` | api + web only (browser at `localhost:5173`) |
| `npm run dev:server` | backend only, in-memory Mongo |
| `npm run dev:client` | Vite only (no backend) |
| `npm run build:all` | build server + client |
| `npm run smoke:server` | backend end-to-end tests (in-memory Mongo) |
| `npm run electron:build` | package the desktop app (electron-builder) |
| `npm run ss:server` | throwaway Shadowsocks test server |

Run any backend script directly with `-w server`, e.g. `npm run dev -w server` (uses your real MongoDB from `server/.env` instead of the in-memory one).

### Admin console

The admin console is a **separate web app** (`admin.html`) — not part of the user VPN app.

```bash
npm run admin      # starts the backend + opens http://localhost:5173/admin.html
```

Sign in with the account whose email is `OQUS_ADMIN_EMAIL` (in `server/.env`). It has server CRUD + user monitoring. To point it at your real DB, run `npm run dev -w server` alongside `npm run dev:client`, then open `/admin.html`.

## Config

- Backend config lives in `server/.env` (copy from `server/.env.example`). **Not committed.**
- The client's API base defaults to `http://localhost:8080`; override with `VITE_OQUS_API`.
