# OqusVPN — Mobile (React Native + Expo)

The phone client. It reuses your existing backend and Shadowsocks servers: it
logs in, fetches the same `ss://` access key from `/api/access-key`, and runs the
tunnel. The UI + backend flow are done (Phase 1); the native Android tunnel is
Phase 2.

## Run it (Phase 1 — UI + backend, simulated tunnel)

```bash
cd mobile
npm install
# point the app at your backend — a phone can't reach "localhost":
#   emulator → PC backend:  http://10.0.2.2:8080  (the default)
#   real phone on your Wi-Fi: http://<your-PC-LAN-IP>:8080  (see ipconfig)
# set it in src/config.ts, or:
set EXPO_PUBLIC_OQUS_API=http://192.168.1.20:8080   # PowerShell: $env:EXPO_PUBLIC_OQUS_API=...
npx expo start
```

Then press **a** for an Android emulator, or scan the QR with **Expo Go** on your
phone. You can sign up, browse the live server list (admin changes appear within
30s), pick a location, and hit connect — the tunnel is **simulated** until Phase 2
(a "Simulated tunnel" badge shows on the home screen).

> Make sure the backend is running (`npm run dev:server` in the repo root) and, if
> using a real phone, that your PC firewall allows inbound `:8080`.

## Structure

```
mobile/
  App.tsx                  # entry: fonts, splash → onboarding → auth → tabs
  metro.config.js          # Metro (routes lucide to its CJS build)
  src/
    lib/                   # data & logic (no UI)
      api.ts               #   control-plane client (login, servers, access key, usage)
      vpn.ts               #   the NativeVpn seam + ss:// parser (stub now, native later)
      theme.ts             #   design tokens (ported 1:1 from web index.css) + helpers
      demo.ts              #   guest-mode data (local servers, demo user)
      config.ts            #   API_BASE
      storage.ts           #   AsyncStorage (token, onboarded flag)
    context/               # React providers
      theme-context.tsx    #   theme + appearance (auto/light/dark), Inter fonts
      auth-context.tsx     #   token / user / demo / logout
      vpn-context.tsx      #   servers, status, connect/disconnect, throughput (mirrors web useVpn)
    components/
      ui.tsx               #   Asterisk, ConnectButton, SignalBars, Card, Toggle, Flag, …
    screens/               # one file per screen
      splash.tsx  onboarding.tsx  home.tsx  locations.tsx  statistics.tsx  settings.tsx
```

The `NativeVpn` seam ([src/lib/vpn.ts](src/lib/vpn.ts)) is the key design point: the UI
only talks to that interface. It uses a `StubVpn` today; Phase 2 registers a native module
as `NativeModules.OqusVpn` and it's used automatically — no UI changes.

## Phase 2 — the real Android tunnel (next)

A native Android module that implements `NativeVpn` by:
1. Starting a `VpnService` (the OS gives us a TUN fd + the VPN permission prompt).
2. Running the Shadowsocks tunnel over that fd via the **Outline SDK** `tun2socks`
   `.aar` (or `sing-box`'s `libbox`) — fed the `host/port/method/password` that
   `parseAccessKey()` already extracts from your `ss://` key.
3. Emitting status back to JS as `NativeModules.OqusVpn` events.

This needs a **development build** (not Expo Go): `npx expo prebuild` then build the
`/android` project, or use **EAS Build** (cloud) for signed APKs/AAB + store submission.

## Deploy (the easy part)

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build -p android            # cloud build → installable .apk / .aab
eas submit -p android           # upload to Google Play
```

Android ships first (free `VpnService`, lenient review, sideloadable APK for testing).
iOS later needs a paid Apple Developer **organization** account + the Network
Extension entitlement (App Store rule 5.4 for VPN apps).
