#!/usr/bin/env node
// After the federation build (`build:federation`): copies its /mf/ folder into the site's own build
// output (.output/public/mf, or .vercel/output/static/mf for a Vercel build), so one deploy serves
// both the game and its gateway remote, and reports how much the gateway downloads to start the game
// (gzip).
//
//   node modules/gateway-remote/finish-build.mjs [--no-copy]
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const source = '.federation/public/mf'
/** The site's static files: Vercel's Build Output API folder on Vercel, Nitro's .output elsewhere. */
const publicDir = process.env.VERCEL ? '.vercel/output/static' : '.output/public'
const target = join(publicDir, 'mf')
if (!existsSync(join(source, 'remoteEntry.js'))) {
  console.error(`No federation build in ${source}: run the federation build first.`)
  process.exit(1)
}
// Build statistics for tooling, not for browsers (with their precompressed copies).
for (const file of ['mf-stats.json', 'mf-stats.json.gz', 'mf-stats.json.br']) rmSync(join(source, file), { force: true })

const gz = file => gzipSync(readFileSync(join(source, file))).length
const kb = bytes => Math.round(bytes / 102.4) / 10
const assets = readdirSync(join(source, '_nuxt')).filter(name => !/\.(gz|br)$/.test(name)).map(name => `_nuxt/${name}`)
const sum = files => kb(files.reduce((total, file) => total + gz(file), 0))
const report = {
  remoteEntryKB: sum(['remoteEntry.js']),
  jsKB: sum(assets.filter(file => file.endsWith('.js'))),
  cssKB: sum(assets.filter(file => file.endsWith('.css'))),
  fontsKB: kb(assets.filter(file => /\.woff2$/.test(file)).reduce((total, file) => total + statSync(join(source, file)).size, 0)),
}
console.log(`Gateway remote (gzip, all chunks): ${JSON.stringify(report)}`)

if (process.argv.includes('--no-copy')) process.exit(0)
if (!existsSync(publicDir)) {
  // Fine for local use: `node .federation/server/index.mjs` serves the remote, the API and the cards.
  console.log(`No site build in ${publicDir}, so nothing to copy into (run \`pnpm build\` first to deploy).`)
  process.exit(0)
}
rmSync(target, { recursive: true, force: true })
// The host compresses on its own (Cloudflare and Vercel do), so the precompressed copies stay behind.
cpSync(source, target, { recursive: true, filter: file => !/\.(gz|br)$/.test(file) })
console.log(`Copied ${source} → ${target}`)
