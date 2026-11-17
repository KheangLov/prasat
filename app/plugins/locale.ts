import { LOCALE_COOKIE } from '~/utils/locale'

// Restores the player's chosen language (Khmer by default).
export default defineNuxtPlugin(async (nuxtApp) => {
  const saved = useCookie<string | null>(LOCALE_COOKIE)
  const i18n = nuxtApp.$i18n
  if (saved.value && saved.value !== i18n.locale.value && i18n.availableLocales.includes(saved.value as typeof i18n.locale.value)) {
    await i18n.setLocale(saved.value as typeof i18n.locale.value)
  }
})
