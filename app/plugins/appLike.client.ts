/**
 * Makes the site behave like an installed app: no browser context menu, text selection or
 * image dragging outside text fields (see also main.css), no zooming, and, in production, the
 * usual developer-tools and view-source shortcuts do nothing. That only discourages casual use:
 * a browser's own menu can always open its developer tools.
 *
 * No zooming, as in an app: the viewport (nuxt.config.ts) and `touch-action` (main.css) stop
 * pinching and double-tapping where browsers follow them; Safari on iPhone and iPad ignores
 * both for pinching, so its gestures are stopped here, and on a computer, Ctrl or Cmd with the
 * mouse wheel (a trackpad's pinch) or with + − 0.
 */
const EDITABLE = 'input, textarea, select, [contenteditable="true"]'
/** Ctrl/Cmd with these zoom the page (by physical key). */
const ZOOM_KEYS = ['Equal', 'Minus', 'Digit0', 'NumpadAdd', 'NumpadSubtract', 'Numpad0']

/** Shortcuts for developer tools, view source, save and print (by physical key). */
function isBlockedShortcut(event: KeyboardEvent): boolean {
  if (event.key === 'F12') return true
  const mod = event.ctrlKey || event.metaKey
  if (!mod) return false
  // Ctrl+Shift+I/J/C/K (Windows, Linux) and Cmd+Option+I/J/C/U (Mac): developer tools.
  if ((event.shiftKey || event.altKey) && ['KeyI', 'KeyJ', 'KeyC', 'KeyK', 'KeyU'].includes(event.code)) return true
  // Ctrl/Cmd+U, +S, +P: view source, save page, print.
  return !event.shiftKey && !event.altKey && ['KeyU', 'KeyS', 'KeyP'].includes(event.code)
}

export default defineNuxtPlugin(() => {
  const inField = (target: EventTarget | null) => target instanceof Element && !!target.closest(EDITABLE)
  const stop = (event: Event) => event.preventDefault()

  // Long press or right-click: no browser menu, except in fields (to paste).
  document.addEventListener('contextmenu', (event) => {
    if (!inField(event.target)) event.preventDefault()
  })
  document.addEventListener('dragstart', (event) => {
    if (!inField(event.target)) event.preventDefault()
  })
  document.addEventListener('selectstart', (event) => {
    if (!inField(event.target)) event.preventDefault()
  })

  // No zooming: Safari's pinch, two fingers anywhere, and Ctrl/Cmd with the wheel or + − 0.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, stop, { passive: false })
  document.addEventListener('touchmove', (event) => {
    if (event.touches.length > 1) event.preventDefault()
  }, { passive: false })
  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.metaKey) event.preventDefault()
  }, { passive: false })
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && ZOOM_KEYS.includes(event.code)) event.preventDefault()
  }, { capture: true })

  // Kept in development, where developer tools are needed.
  if (import.meta.dev) return
  window.addEventListener('keydown', (event) => {
    // Ctrl+Shift+U types special characters on Linux: leave it alone in fields.
    if (event.code === 'KeyU' && event.shiftKey && inField(event.target)) return
    if (isBlockedShortcut(event)) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, { capture: true })
})
