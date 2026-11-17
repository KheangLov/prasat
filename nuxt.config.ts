// https://nuxt.com/docs/api/configuration/nuxt-config

/** `pnpm build:federation` builds the game as a micro-frontend for the gaming gateway (modules/gateway-remote). */
const federation = process.env.PRASAT_TARGET === 'federation'
/** Built on Vercel: use its preset. Otherwise Cloudflare Workers (see wrangler.jsonc). */
const vercel = !!process.env.VERCEL

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    '@nuxt/test-utils/module',
    // Inside the gateway the page belongs to the gateway: no service worker or install prompt.
    ...(federation ? [] : ['@vite-pwa/nuxt']),
  ],

  devtools: { enabled: true },

  app: {
    head: {
      // viewport-fit=cover: draw under notches; the layout pads with safe-area insets. No zooming,
      // as in an app (see main.css).
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      meta: [
        { name: 'theme-color', content: '#0d2318' },
        { name: 'description', content: 'Prasat: a 3D temple-stacking game from Cambodia. Drop carved stones one on another and raise towers like Angkor Wat, the Bayon and Preah Vihear, across 150 levels and an endless tower. In Khmer and English, and it works offline.' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'Prasat' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // Glassy dark panels over a bright temple: the interface uses the dark theme.
  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  ui: {
    // Fonts are bundled from npm (see main.css) instead of fetched from font providers, so Khmer
    // text also renders offline.
    fonts: false,
  },

  // Moving between pages is a view transition (a quick crossfade; timing in main.css), here and inside
  // the gaming gateway. Off with reduced motion, and when the phone's own back gesture animates.
  experimental: { viewTransition: true },

  compatibilityDate: '2025-07-15',

  nitro: {
    preset: process.env.NITRO_PRESET || (vercel ? 'vercel' : 'cloudflare_module'),
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  gatewayRemote: {
    id: 'prasat',
    localeCookie: 'prasat-locale',
    enabled: federation,
  },

  i18n: {
    defaultLocale: 'km',
    strategy: 'no_prefix',
    locales: [
      { code: 'km', language: 'km-KH', name: 'ខ្មែរ' },
      { code: 'en', language: 'en-US', name: 'English' },
    ],
    // Khmer is always the default; the browser language is not used.
    // The player's choice is remembered by app/plugins/locale.ts.
    detectBrowserLanguage: false,
  },

  icon: {
    // Bundle icons into the server so rendering never calls the Iconify API.
    serverBundle: { collections: ['lucide'] },
    // Ship the icons in the client bundle too, so they show when the app runs offline.
    clientBundle: {
      scan: true,
      // Icons Nuxt UI uses inside its own components.
      icons: [
        'lucide:check', 'lucide:chevron-down', 'lucide:chevron-up', 'lucide:chevron-left', 'lucide:chevron-right',
        'lucide:circle-alert', 'lucide:circle-check', 'lucide:circle-x', 'lucide:info', 'lucide:triangle-alert',
        'lucide:loader-circle', 'lucide:minus', 'lucide:plus', 'lucide:x',
      ],
    },
  },

  // Installable app that works offline: the service worker keeps the app and fonts, and the pages.
  pwa: {
    // A new version waits for the home screen (app.vue): reloading mid-run would end it.
    registerType: 'prompt',
    manifest: {
      name: 'Prasat',
      short_name: 'Prasat',
      description: 'Raise temple towers stone by stone: 150 levels and an endless tower.',
      lang: 'km',
      theme_color: '#0d2318',
      background_color: '#07140d',
      display: 'standalone',
      // The tower fits the screen, so the phone can be held either way.
      orientation: 'any',
      start_url: '/',
      scope: '/',
      categories: ['games', 'entertainment'],
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,svg,png,ico,woff2}'],
      // The page isn't precached: it's rendered in the player's language, so a copy made at
      // install time could be in the wrong one. Online it comes from the network; offline, the
      // last copy (app/plugins/offlinePages.client.ts keeps one in the current language).
      navigateFallback: null,
      runtimeCaching: [
        {
          urlPattern: ({ request, url, sameOrigin }) => sameOrigin && !url.pathname.startsWith('/api/')
            && (request.mode === 'navigate' || request.headers.get('x-offline-page') === '1'),
          handler: 'NetworkFirst',
          options: { cacheName: 'pages', networkTimeoutSeconds: 4, expiration: { maxEntries: 20 } },
        },
        {
          urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_i18n/'),
          handler: 'CacheFirst',
          options: { cacheName: 'i18n', expiration: { maxEntries: 10 } },
        },
      ],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 3600,
    },
    devOptions: { enabled: false },
  },
})
