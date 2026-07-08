# OqusVPN backend (control plane)

Node + TypeScript + Express + MongoDB. Handles **accounts, auth, and Shadowsocks
access-key issuance** — the API your Electron client talks to after login. It does
**not** carry VPN traffic; that's the data plane (`outline-ss-server` per region).

```
Electron client ──JWT──▶ THIS API ──issues ss:// keys──▶ outline-ss-server (data plane)
```

## Run it

Needs a MongoDB. Either:

```bash
# local via Docker
docker run -d -p 27017:27017 --name oqus-mongo mongo:7
# …or a free MongoDB Atlas cluster (put its SRV URI in MONGO_URI)
```

Then:

```bash
cd server
npm install
cp .env.example .env      # set JWT_SECRET; adjust MONGO_URI / OQUS_ACCESS_KEY
npm run dev               # http://localhost:8080
```

Verify without any external Mongo (uses an in-memory one):

```bash
npm run smoke             # 13 end-to-end checks: signup/login/me/access-key
```

## API

| Method | Path                       | Auth   | Body / query                | Returns |
|--------|----------------------------|--------|-----------------------------|---------|
| GET    | `/health`                  | –      | –                           | `{ ok }` |
| POST   | `/api/auth/signup`         | –      | `{ email, password≥8 }`     | `{ token, user }` (201) |
| POST   | `/api/auth/login`          | –      | `{ email, password }`       | `{ token, user }` |
| GET    | `/api/auth/me`             | Bearer | –                           | `{ user }` |
| GET    | `/api/servers`             | –      | –                           | `{ servers[] }` |
| GET    | `/api/access-key`          | Bearer | `?serverId=` (optional)     | `{ accessKey: "ss://…", server }` |

Auth is a JWT in `Authorization: Bearer <token>`. Passwords are bcrypt-hashed;
email is unique (DB index) and lower-cased.

## Wiring the client

After login, the client should call `GET /api/access-key`, take the returned
`ss://` string, and feed it into the tunnel (the client already parses `ss://`
in `src/lib/oqus-bridge.ts`). Point the client at this API and drop the
hardcoded `VITE_OQUS_ACCESS_KEY`.

## Next: real per-user provisioning

Today every user gets one shared test key (`StaticKeyProvider` in
`src/keys/provider.ts`). To hand out real, per-user, revocable keys, implement
`KeyProvider` (stubs are sketched in that file):

- **ShadowboxKeyProvider** — call the Outline Server management API
  (`POST /access-keys`) to mint a key per user; store its id to `revoke()` later.
- **SsServerKeyProvider** — write keys into the `outline-ss-server` YAML and
  reload it (SIGHUP).

Routes don't change — only the provider swap in `provider.ts`.

## Before production
- Set a strong `JWT_SECRET`; lock `CORS_ORIGIN` to your app origin.
- Add rate limiting on `/api/auth/*` and refresh-token rotation.
- Consider email verification and password-reset flows.
