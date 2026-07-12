// Expo config plugin — reapplies the native VPN wiring after `expo prebuild`.
//
// prebuild regenerates android/ from app.json and would erase hand edits to the
// manifest and MainApplication.kt. This plugin re-injects them every prebuild so
// the native tunnel survives:
//   • BIND_VPN_SERVICE service registration + FGS_SPECIAL_USE permission
//   • the OqusVpnPackage() line in MainApplication.kt
//
// The .aar itself is produced by mobile/native/build-aar.sh into
// android/app/libs/ and picked up by the fileTree(libs) dependency Gradle
// already declares — no plugin work needed for that.
//
// Registered in app.json → "plugins": ["./plugins/withOqusVpn"].
const {
  withAndroidManifest,
  withMainApplication,
  withDangerousMod,
} = require("@expo/config-plugins")
const fs = require("fs")
const path = require("path")

const FGS_SPECIAL_USE = "android.permission.FOREGROUND_SERVICE_SPECIAL_USE"

// The Kotlin sources live in native/android-src (tracked in git) and are copied
// into the generated android/ tree on every prebuild — /android is gitignored,
// so without this they'd vanish. Package path matches `package app.oqus.vpn`.
const KOTLIN_FILES = [
  "OqusVpnService.kt",
  "OqusVpnModule.kt",
  "OqusVpnPackage.kt",
  "TunnelEngine.kt",
]

function withVpnKotlinSources(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const src = path.join(cfg.modRequest.projectRoot, "native", "android-src")
      const dest = path.join(
        cfg.modRequest.platformProjectRoot,
        "app/src/main/java/app/oqus/vpn",
      )
      fs.mkdirSync(dest, { recursive: true })
      for (const f of KOTLIN_FILES) {
        fs.copyFileSync(path.join(src, f), path.join(dest, f))
      }
      return cfg
    },
  ])
}

function withVpnManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults
    const app = manifest.manifest.application?.[0]
    if (!app) return cfg

    // Permission (idempotent).
    manifest.manifest["uses-permission"] = manifest.manifest["uses-permission"] || []
    const hasPerm = manifest.manifest["uses-permission"].some(
      (p) => p.$?.["android:name"] === FGS_SPECIAL_USE,
    )
    if (!hasPerm) {
      manifest.manifest["uses-permission"].push({ $: { "android:name": FGS_SPECIAL_USE } })
    }

    // Service (idempotent).
    app.service = app.service || []
    const exists = app.service.some((s) => s.$?.["android:name"] === ".OqusVpnService")
    if (!exists) {
      app.service.push({
        $: {
          "android:name": ".OqusVpnService",
          "android:permission": "android.permission.BIND_VPN_SERVICE",
          "android:foregroundServiceType": "specialUse",
          "android:exported": "false",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.net.VpnService" } }] }],
        property: [
          {
            $: {
              "android:name": "android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE",
              "android:value": "vpn",
            },
          },
        ],
      })
    }
    return cfg
  })
}

function withVpnMainApplication(config) {
  return withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents
    if (!src.includes("OqusVpnPackage()")) {
      // Insert into the packages.apply { } block that prebuild always emits.
      src = src.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        `$1\n              add(OqusVpnPackage())`,
      )
      cfg.modResults.contents = src
    }
    return cfg
  })
}

module.exports = function withOqusVpn(config) {
  config = withVpnKotlinSources(config)
  config = withVpnManifest(config)
  config = withVpnMainApplication(config)
  return config
}
