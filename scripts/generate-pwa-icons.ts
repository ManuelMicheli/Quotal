/**
 * Generate the PWA icon PNGs (192, 512, maskable-512) into /public/icons.
 *
 * MVP placeholder design: solid brand-colour background with a centred "Q"
 * glyph rendered as a chunky pixel grid (no font dependency, no canvas).
 * The maskable variant adds extra padding so the safe-zone is preserved
 * across launcher mask shapes.
 *
 * Run with: `npx tsx scripts/generate-pwa-icons.ts`
 *
 * The icons are committed to source control so the build does not depend on
 * this script at runtime — re-run only when refreshing the placeholder art
 * (Phase 10 will swap in real designed icons).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// pngjs is a transitive dep (qrcode → pngjs); no @types/pngjs published.
// Local minimal declaration covers the surface we use here.
// @ts-expect-error -- no published types; matches the runtime API we use
import { PNG } from 'pngjs'

import { brand } from '../design-tokens'

type Rgb = readonly [number, number, number]

function hexToRgb(hex: string): Rgb {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return [r, g, b]
}

const BG: Rgb = hexToRgb(brand.accent) // teal #0F766E
const FG: Rgb = hexToRgb(brand.accentForeground) // white

/**
 * 7×7 stencil for the letter "Q" (1 = foreground pixel).
 *
 * Chosen for legibility at small sizes — easier than rendering a real font
 * here since we have no canvas in pure Node and we don't want the headless
 * Chromium dependency for a placeholder.
 */
const Q_GLYPH: ReadonlyArray<ReadonlyArray<number>> = [
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 0, 0, 1, 1, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [0, 1, 1, 1, 1, 0, 1],
]

function drawIcon(size: number, padding: number): Buffer {
  const png = new PNG({ width: size, height: size })
  // Background fill.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) << 2
      png.data[idx] = BG[0]
      png.data[idx + 1] = BG[1]
      png.data[idx + 2] = BG[2]
      png.data[idx + 3] = 255
    }
  }

  // Glyph: scale the 7x7 stencil to (size - 2*padding) and centre it.
  const inner = size - padding * 2
  const cell = Math.floor(inner / 7)
  const offset = Math.floor((size - cell * 7) / 2)
  for (let gy = 0; gy < 7; gy++) {
    const row = Q_GLYPH[gy]!
    for (let gx = 0; gx < 7; gx++) {
      if (row[gx] !== 1) continue
      // Paint the cell.
      for (let dy = 0; dy < cell; dy++) {
        for (let dx = 0; dx < cell; dx++) {
          const x = offset + gx * cell + dx
          const y = offset + gy * cell + dy
          if (x < 0 || y < 0 || x >= size || y >= size) continue
          const idx = (y * size + x) << 2
          png.data[idx] = FG[0]
          png.data[idx + 1] = FG[1]
          png.data[idx + 2] = FG[2]
          png.data[idx + 3] = 255
        }
      }
    }
  }

  return PNG.sync.write(png)
}

function favicon32(): Buffer {
  return drawIcon(32, 4)
}

function main() {
  const outDir = resolve(__dirname, '../public/icons')
  mkdirSync(outDir, { recursive: true })

  const targets: Array<{ name: string; size: number; padding: number }> = [
    { name: 'icon-192.png', size: 192, padding: 24 },
    { name: 'icon-512.png', size: 512, padding: 64 },
    // Maskable: extra inner padding so the glyph fits inside the launcher
    // safe-zone (a circle inscribed in the icon bounds).
    { name: 'icon-maskable-512.png', size: 512, padding: 128 },
    { name: 'apple-touch-icon.png', size: 180, padding: 22 },
  ]

  for (const t of targets) {
    const buf = drawIcon(t.size, t.padding)
    const path = resolve(outDir, t.name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, buf)
    console.log(`wrote ${t.name} (${buf.length} bytes)`)
  }

  // Bonus: tiny favicon.png for browser tab.
  const faviconPath = resolve(outDir, 'favicon-32.png')
  writeFileSync(faviconPath, favicon32())
  console.log('wrote favicon-32.png')
}

main()
