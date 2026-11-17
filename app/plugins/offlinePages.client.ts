/**
 * Keeps a copy of the page for offline use, in the player's language. It isn't precached with
 * the app (a copy made at install time would be in the default language and flash Khmer before
 * switching); instead it's fetched here, which the service worker stores, once per app version
 * and language.
 */
const OFFLINE_PAGES = ['/', '/map']
const STORAGE_KEY = 'prasat:offline-pages'

export default defineNuxtPlugin((nuxtApp) => {
  // Inside the gaming gateway these addresses are the gateway's, and there's no service worker.
  if (!('serviceWorker' in navigator) || useGateway().inGateway) return
  const buildId = useRuntimeConfig().app.buildId
  const i18n = nuxtApp.$i18n

  let running = false
  async function refresh() {
    const key = `${buildId}:${i18n.locale.value}`
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY)
    }
    catch {
      // Storage blocked: refresh every time.
    }
    if (saved === key || running || !navigator.onLine) return
    running = true
    try {
      // Only once a service worker is in charge, so the responses get stored.
      await navigator.serviceWorker.ready
      const results = await Promise.all(OFFLINE_PAGES.map(path =>
        fetch(path, { headers: { 'x-offline-page': '1' }, credentials: 'same-origin' }).then(r => r.ok, () => false)))
      if (results.every(Boolean) && key === `${buildId}:${i18n.locale.value}`) localStorage.setItem(STORAGE_KEY, key)
    }
    catch {
      // Try again next time.
    }
    finally {
      running = false
    }
  }

  // After the page has settled; and again when the language changes (once its cookie is set).
  nuxtApp.hook('app:mounted', () => void setTimeout(refresh, 3000))
  watch(i18n.locale, () => void setTimeout(refresh, 1000))
})
