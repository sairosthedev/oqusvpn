// Metro config for OqusVPN mobile.
// lucide-react-native ships an ESM `.mjs` barrel that re-exports ~3,500 icon
// modules; Metro's dev resolver fails on those `.mjs` sub-imports. Turning off
// package-exports resolution makes Metro use each package's CommonJS `main`
// (lucide's `dist/cjs/*.js`), which resolves cleanly in both dev and export.
const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)
config.resolver.unstable_enablePackageExports = false

module.exports = config
