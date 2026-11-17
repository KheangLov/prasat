import en from './locales/en.json'
import km from './locales/km.json'

// Messages are bundled into the app (not fetched from the server), so switching
// language also works offline in the installed app.
export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'km',
  fallbackLocale: 'km',
  messages: { km, en },
}))
