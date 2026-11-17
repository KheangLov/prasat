/**
 * Lets the gaming gateway host this game as a micro-frontend (Module Federation).
 *
 * On the game's own site this only adds `useGateway()`, the URL helpers in runtime/urls.ts (which
 * then give the same URLs as before), CORS headers on /api/ and headers for /mf/. With `enabled`
 * (the `federation` build target) it turns the build into a client-only remote: its own Nuxt app
 * id, no PWA, assets under /mf/_nuxt/, and a Module Federation entry at /mf/remoteEntry.js that
 * exposes `./mount` (runtime/mount.ts). finish-build.mjs then copies /mf/ into the site's output.
 *
 * This folder is the same in every game; a game only sets the options in its nuxt.config.
 */
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve as resolvePath } from 'node:path'
import { federation } from '@module-federation/vite'
import { addImports, addServerHandler, addTemplate, addTypeTemplate, addVitePlugin, createResolver, defineNuxtModule } from 'nuxt/kit'

export interface GatewayRemoteOptions {
  /** The game's id on the gateway (URL slug), e.g. 'catte'. */
  id: string
  /** The cookie the game restores its language from. */
  localeCookie: string
  /** Build the federation remote instead of the normal app. */
  enabled: boolean
}

/** Where the federation build is written (finish-build.mjs copies its mf/ folder into .output/public). */
const FEDERATION_OUTPUT_DIR = '.federation'
const ASSETS_DIR = '/mf/_nuxt/'
/** Public files the game doesn't need inside the gateway: its own app icons, service worker and so on. */
const NOT_FOR_OFFLINE = /(^|\/)(\.|_headers$|_redirects$|robots\.txt$|favicon|apple-touch-icon|pwa-|maskable-|manifest\.webmanifest$|sw\.js$|workbox-)|\.map$/

/** Every file under a folder, as paths relative to it (none if it doesn't exist). */
function listFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? listFiles(join(dir, entry.name), `${prefix}${entry.name}/`)
    : [`${prefix}${entry.name}`]).sort()
}

export default defineNuxtModule<GatewayRemoteOptions>({
  meta: { name: 'gateway-remote', configKey: 'gatewayRemote' },
  defaults: { id: '', localeCookie: '', enabled: false },
  setup(options, nuxt) {
    const { resolve } = createResolver(import.meta.url)

    addImports([
      { name: 'useGateway', from: resolve('./runtime/useGateway') },
      ...['apiUrl', 'socketUrl', 'assetUrl', 'appUrl'].map(name => ({ name, from: resolve('./runtime/urls') })),
    ])
    // CORS for the gateway, on every build: the game's own site serves its /api/ to it.
    addServerHandler({ middleware: true, handler: resolve('./runtime/server/cors') })

    // Headers for /mf/ on every build: the game's own site serves the federation build (copied into
    // its output by `build:federation`). Hashed chunks never change; the entry and manifest are the
    // version pointer, so they're cached briefly. Rules don't overlap (Cloudflare joins repeated headers).
    nuxt.options.routeRules ||= {}
    const cors = { 'access-control-allow-origin': '*' }
    nuxt.options.routeRules['/mf/_nuxt/**'] = { headers: { ...cors, 'cache-control': 'public, max-age=31536000, immutable' } }
    for (const file of ['remoteEntry.js', 'mf-manifest.json', 'preload.json', 'offline.json']) {
      nuxt.options.routeRules[`/mf/${file}`] = { headers: { ...cors, 'cache-control': 'public, max-age=60, stale-while-revalidate=600' } }
    }

    // Typed on every build: runtime/mount.ts is type-checked with the app.
    addTypeTemplate({
      filename: 'types/gateway-remote.d.ts',
      getContents: () => `declare module '#build/gateway-remote.mjs' {
  export const gameId: string
  export const rootId: string
  export const localeCookie: string
  export const publicConfig: Record<string, unknown>
  export function runHeadScripts(): Promise<void>
  export const appConfig: { baseURL: string, buildAssetsDir: string, cdnURL: string, buildId: string }
}
`,
    })

    if (!options.enabled) return
    if (!/^[a-z][a-z0-9-]*$/.test(options.id) || !options.localeCookie) {
      throw new Error('gateway-remote: set gatewayRemote.id (a lowercase slug) and gatewayRemote.localeCookie')
    }

    const rootId = `${options.id}-app`
    // Nuxt UI's colour mode reads a global that its inline <head> script sets on the server-rendered page.
    const hasColorMode = () => nuxt.options._installedModules.some(m => m.meta?.name === '@nuxtjs/color-mode')
    nuxt.options.ssr = false
    nuxt.options.appId = options.id
    nuxt.options.future.multiApp = true
    nuxt.options.app.rootAttrs = { ...nuxt.options.app.rootAttrs, id: rootId }
    nuxt.options.app.buildAssetsDir = ASSETS_DIR
    // The gateway owns the page's icons, manifest and meta tags.
    nuxt.options.app.head = { ...nuxt.options.app.head, link: [], meta: [] }
    // No polling for new builds from the gateway's page: a failed chunk load reloads instead.
    nuxt.options.experimental.appManifest = false
    nuxt.options.nitro.preset = 'node-server'
    nuxt.options.nitro.output = { ...nuxt.options.nitro.output, dir: FEDERATION_OUTPUT_DIR }
    // Its own server (local use, the gateway's checks) sends compressed files, as a real host does.
    nuxt.options.nitro.compressPublicAssets = { gzip: true, brotli: true }

    addTemplate({
      filename: 'gateway-remote.mjs',
      getContents: () => [
        `export const gameId = ${JSON.stringify(options.id)}`,
        `export const rootId = ${JSON.stringify(rootId)}`,
        `export const localeCookie = ${JSON.stringify(options.localeCookie)}`,
        `export const publicConfig = ${JSON.stringify(nuxt.options.runtimeConfig.public)}`,
        // Scripts other modules normally inline into the server-rendered page, run before the app starts.
        hasColorMode()
          ? `export async function runHeadScripts() {\n  const { script } = await import('#build/color-mode-options.mjs')\n  new Function(script)()\n}`
          : 'export async function runHeadScripts() {}',
        `export const appConfig = ${JSON.stringify({
          baseURL: '/',
          buildAssetsDir: ASSETS_DIR,
          cdnURL: '',
          buildId: nuxt.options.buildId,
        })}`,
      ].join('\n'),
    })

    // Serve the remote entry and manifest, which are written next to the client build's mf/_nuxt/
    // folder (Nitro only serves the build assets folder by default).
    // mf/preload.json: every file the game needs to boot (remote entry, mount module, Nuxt's entry and
    // its static imports, their CSS), so the gateway can fetch them all at once instead of one after another.
    nuxt.hook('build:manifest', (manifest) => {
      const dir = join(nuxt.options.buildDir, 'dist/client/mf')
      const assets = ASSETS_DIR.replace(/^\/mf\//, '')
      const js = new Set<string>(['remoteEntry.js'])
      const css = new Set<string>()
      const visit = (key: string) => {
        const chunk = manifest[key]
        if (!chunk || js.has(assets + chunk.file)) return
        js.add(assets + chunk.file)
        for (const file of chunk.css ?? []) css.add(assets + file)
        for (const imported of chunk.imports ?? []) visit(imported)
      }
      // Federation wraps the entries (Nuxt's and mount) in a dynamic import of the real module: follow
      // those one level, then static imports only (lazy pages and components stay lazy).
      for (const [key, chunk] of Object.entries(manifest)) {
        if (!chunk.isEntry) continue
        visit(key)
        for (const imported of chunk.dynamicImports ?? []) visit(imported)
      }
      // The home page too: Play opens the game there.
      for (const key of Object.keys(manifest)) if (/(^|\/)pages\/index\.vue$/.test(key)) visit(key)
      const federation = JSON.parse(readFileSync(join(dir, 'mf-manifest.json'), 'utf8'))
      for (const expose of federation.exposes ?? []) {
        for (const file of expose.assets?.js?.sync ?? []) js.add(file.replace(/^mf\//, ''))
      }
      writeFileSync(join(dir, 'preload.json'), JSON.stringify({ js: [...js], css: [...css] }))

      // mf/offline.json: every file the game can ask for (all of the build, and the site's own public
      // files such as card images), so the gateway can keep the whole game for offline play. The
      // version changes with the files, so the gateway knows when its copy is out of date.
      const files = [
        ...['remoteEntry.js', 'mf-manifest.json', 'preload.json'].map(file => `/mf/${file}`),
        ...listFiles(join(dir, assets)).filter(file => !/\.(gz|br|map)$/.test(file)).map(file => `${ASSETS_DIR}${file}`),
        ...listFiles(resolvePath(nuxt.options.rootDir, nuxt.options.dir.public)).filter(file => !NOT_FOR_OFFLINE.test(file)).map(file => `/${file}`),
      ]
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 12)
      writeFileSync(join(dir, 'offline.json'), JSON.stringify({ version, files }))
    })

    nuxt.hook('nitro:config', (config) => {
      config.publicAssets ||= []
      config.publicAssets.push({ dir: join(nuxt.options.buildDir, 'dist/client/mf'), baseURL: '/mf', maxAge: 0 })
    })

    addVitePlugin(() => federation({
      name: options.id.replace(/-/g, '_'),
      filename: 'mf/remoteEntry.js',
      manifest: { filePath: 'mf' },
      dts: false,
      exposes: { './mount': resolve('./runtime/mount.ts') },
      shared: {},
    }), { server: false })
  },
})
