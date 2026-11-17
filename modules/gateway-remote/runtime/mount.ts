/**
 * Exposed to the gaming gateway as `./mount` (Module Federation). Boots this game's whole Nuxt app,
 * client-only, inside an element on the gateway's page: it fills in the runtime config the server
 * would normally put in the page, then starts Nuxt's client entry. One mount per page load.
 */
import { gameId, localeCookie, publicConfig, appConfig, rootId, runHeadScripts } from '#build/gateway-remote.mjs'
import { GATEWAY_CONTRACT, type MountOptions } from './contract'
import { setGateway } from './state'

export const contract = GATEWAY_CONTRACT

type NuxtWindow = Window & { __NUXT__?: Record<string, unknown> }

let mounted = false

export async function mount(options: MountOptions): Promise<void> {
  if (mounted) throw new Error(`${gameId} is already mounted on this page`)
  mounted = true

  // This file is served from the game's own site: that's where its assets and API live.
  const origin = new URL(import.meta.url).origin
  const basePath = options.basePath.endsWith('/') ? options.basePath : `${options.basePath}/`

  const win = window as NuxtWindow
  win.__NUXT__ ??= {}
  win.__NUXT__[gameId] = {
    serverRendered: false,
    config: {
      public: publicConfig,
      app: { ...appConfig, baseURL: basePath, cdnURL: `${origin}/` },
    },
  }

  // The game restores its language from this cookie (app/plugins/locale.ts).
  document.cookie = `${localeCookie}=${encodeURIComponent(options.locale)}; path=/; max-age=31536000; samesite=lax`

  setGateway({
    apiBase: (options.apiBase ?? origin).replace(/\/$/, ''),
    assetsBase: origin,
    basePath,
    onExit: options.onExit,
  })

  const root = document.createElement('div')
  root.id = rootId
  options.el.append(root)

  await runHeadScripts()
  // Nuxt's client entry starts the app as soon as it's imported.
  await import('#app/entry')
}
