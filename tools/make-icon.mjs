// Generates build/icon.ico (and a 512px PNG) from the OqusVPN brand mark, so the
// packaged app stops falling back to the default Electron icon.
//
// The mark is the same six-point asterisk as src/components/brand.tsx: three
// 6x40 rounded bars (rx=3) rotated 0/60/120 degrees about the center of a 48x48
// box. Here it is knocked out in white on a rounded brand-blue tile — a bare
// glyph on transparency reads as noise at 16px in the taskbar.
//
//   node tools/make-icon.mjs
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"
import pngToIco from "png-to-ico"

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "build")

const BRAND = "#3b56f0" // --brand, matches src/index.css and mobile/src/lib/theme.ts

// Windows renders the .ico at each of these; shipping all of them avoids the
// blurry downscale you get from a single large bitmap.
const SIZES = [16, 24, 32, 48, 64, 128, 256]

/** The brand mark as a standalone SVG at `size` px. */
function markSvg(size) {
  const bars = [0, 60, 120]
    .map((deg) => `<rect x="21" y="4" width="6" height="40" rx="3" fill="#fff" transform="rotate(${deg} 24 24)"/>`)
    .join("")
  // Scale the 48x48 artboard into a 64x64 tile so the glyph sits inset with
  // padding rather than bleeding to the edges.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${BRAND}"/>
  <g transform="translate(8 8)">${bars}</g>
</svg>`
}

const png = (size) => sharp(Buffer.from(markSvg(size))).png().toBuffer()

await mkdir(OUT, { recursive: true })

// electron-builder wants a .ico for Windows; keep a big PNG around for anything
// else (docs, the web favicon, a future Linux target).
const ico = await pngToIco(await Promise.all(SIZES.map(png)))
await writeFile(path.join(OUT, "icon.ico"), ico)
await writeFile(path.join(OUT, "icon.png"), await png(512))

console.log(`build/icon.ico  (${SIZES.join(", ")} px)`)
console.log("build/icon.png  (512 px)")
