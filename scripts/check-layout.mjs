#!/usr/bin/env node
// Opens the game at four screen sizes in both languages (home, levels, a level briefing, and a
// level being played), saves a screenshot of each, and fails if the page scrolls sideways, if a
// button falls off the screen, or if, in landscape on phones, the tower doesn't fit the screen.
//
//   node scripts/check-layout.mjs [base URL] [screenshot folder]
//
// Needs a running server (`pnpm dev`, or `pnpm build` with NITRO_PRESET=node-server and
// `node .output/server/index.mjs`) and Chromium: set CHROMIUM_PATH, or it uses Playwright's own.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.argv[2] ?? 'http://localhost:3000'
const out = process.argv[3] ?? 'layout-screenshots'
const VIEWPORTS = [
  { name: 'phone-small', width: 360, height: 640 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 },
  { name: 'desktop', width: 1280, height: 800 },
]
/** Every level open, the stories seen and no sound, so each screen can be reached directly. */
const SAVE = JSON.stringify({
  stars: [0, ...Array(149).fill(1), 0],
  best: { score: 0, dist: 0 },
  wallet: 2500,
  seen: ['angkor', 'bayon', 'banteaysrei', 'kohker', 'preahvihear', 'palace'].map(w => `${w}-intro`),
  settings: { sound: false, music: false, haptics: false },
})

mkdirSync(out, { recursive: true })
// WebGL without a GPU (CI machines): Chromium's software renderer.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const problems = []
let screens = 0

for (const viewport of VIEWPORTS) {
  for (const locale of ['km', 'en']) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: viewport.width < 900 })
    await context.addCookies([{ name: 'prasat-locale', value: locale, url: base }])
    await context.addInitScript(save => localStorage.setItem('prasat:v1', save), SAVE)
    const page = await context.newPage()
    page.on('pageerror', error => problems.push(`${viewport.name}/${locale}: ${error.message}`))

    const check = async (name) => {
      const file = join(out, `${viewport.name}-${locale}-${name}.png`)
      await page.screenshot({ path: file })
      screens++
      const issues = await page.evaluate(() => {
        const found = []
        if (document.documentElement.scrollWidth > innerWidth + 1) found.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`)
        for (const el of document.querySelectorAll('button, a.btn-game')) {
          const r = el.getBoundingClientRect()
          if (!r.width || getComputedStyle(el).visibility === 'hidden' || el.closest('nav, [role=toolbar]')) continue
          if (r.left < -1 || r.right > innerWidth + 1) found.push(`"${el.textContent.trim() || el.getAttribute('aria-label')}" is off screen`)
        }
        return found
      })
      for (const issue of issues) problems.push(`${viewport.name}/${locale}/${name}: ${issue}`)
    }

    await page.goto(`${base}/`)
    await page.waitForTimeout(900)
    await check('home')
    await page.goto(`${base}/map`)
    await page.waitForTimeout(900)
    await check('map')
    await page.goto(`${base}/play/80`)
    await page.waitForSelector('button.btn-game.lg')
    await page.waitForTimeout(600)
    await check('briefing')
    await page.click('button.btn-game.lg')
    await page.waitForTimeout(2500)
    await page.waitForTimeout(500)
    await check('playing')
    {
      const fits = await page.evaluate(() => {
        const r = document.querySelector('canvas').getBoundingClientRect()
        return r.top >= 0 && r.bottom <= innerHeight + 1 && r.width > innerWidth * 0.5
      })
      const calls = Number(await page.locator('canvas').getAttribute('data-draw-calls'))
      if (!calls) problems.push(`${viewport.name}/${locale}: the 3D temple didn't draw`)
      if (!fits) problems.push(`${viewport.name}/${locale}: the tower doesn't fit the screen`)
    }
    await context.close()
  }
}

await browser.close()
console.log(`${screens} screens checked; screenshots in ${out}/`)
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
