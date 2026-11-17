// Renders public/icon.svg into the PNG icons the web app manifest and iOS need.
// Needs a Chromium browser via playwright-core:
//   pnpm icons [path-to-chromium]
// The output is committed, so this only needs running after changing the icon.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/icon.svg'), 'utf8')

const icons = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  // iOS fills transparent corners with black and rounds the icon itself: give it a background.
  { file: 'apple-touch-icon.png', size: 180, background: '#ffb36a' },
  // Maskable: the artwork inside the 80% safe zone, on the sky colour.
  { file: 'maskable-512x512.png', size: 512, padding: 0.12, background: '#ffb36a' },
  { file: 'favicon-32x32.png', size: 32 },
]

const browser = await chromium.launch(process.argv[2] ? { executablePath: process.argv[2] } : {})
const page = await browser.newPage()
for (const { file, size, padding = 0, background = 'transparent' } of icons) {
  await page.setViewportSize({ width: size, height: size })
  const inset = Math.round(size * padding)
  await page.setContent(`<html><body style="margin:0;background:${background}">
    <div style="width:${size - 2 * inset}px;height:${size - 2 * inset}px;margin:${inset}px">${svg}</div>
    <style>svg{width:100%;height:100%;display:block}</style></body></html>`)
  writeFileSync(join(root, 'public', file), await page.screenshot({ omitBackground: background === 'transparent' }))
  console.log(`public/${file}`)
}
await browser.close()
