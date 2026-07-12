# OqusVPN — Android native tunnel (Phase 2)

Real Android VPN, mirroring the Windows desktop tunnel (`electron/tunnel.cjs`):

```
app traffic → TUN fd → tun2socks → SOCKS5 :10808 → Shadowsocks → exit server
```

## Layout

| Path | What |
|---|---|
| `oqustunnel/oqustunnel.go` | gomobile-friendly Go wrapper over tun2socks + go-shadowsocks2 |
| `android-src/*.kt` | Kotlin sources (copied into `android/` on prebuild by the plugin) |
| `build-aar.sh` | compiles the Go into `android/app/libs/oqustunnel.aar` |
| `../plugins/withOqusVpn.js` | Expo config plugin — re-injects everything on `expo prebuild` |

The Kotlin lives here (tracked) rather than in `android/` (gitignored, regenerated
by prebuild). `withOqusVpn.js` copies it back in, registers the service in the
manifest, and adds `OqusVpnPackage()` to `MainApplication.kt`.

## One-time toolchain

```bash
winget install GoLang.Go
go install golang.org/x/mobile/cmd/gomobile@latest
go install golang.org/x/mobile/cmd/gobind@latest
sdkmanager "ndk;27.1.12297006"
```

## Build the .aar

```bash
export ANDROID_HOME="$LOCALAPPDATA/Android/Sdk"
export ANDROID_NDK_HOME="$ANDROID_HOME/ndk/27.1.12297006"
bash mobile/native/build-aar.sh
```

Produces `android/app/libs/oqustunnel.aar` (arm64-v8a + armeabi-v7a), which Gradle
picks up via the existing `fileTree(libs)` dependency.

## Then build the APK

```bash
cd mobile/android && ./gradlew assembleRelease
# → app/build/outputs/apk/release/app-release.apk
```

## Verify (needs a real phone — a VPN can't be tested on an emulator)

1. `adb install -r app-release.apk`
2. Launch, sign in, pick a server, tap Connect
3. Android shows its one-time VPN-consent dialog → Allow
4. Confirm the key/VPN icon in the status bar
5. In the phone browser, check the public IP changed to the exit server

`mobile/src/lib/vpn.ts` auto-detects the native module (`NativeModules.OqusVpn`);
when present, `usingRealTunnel` is `true` and the stub is bypassed. No JS changes.
