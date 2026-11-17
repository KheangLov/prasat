/**
 * URLs that differ inside the gaming gateway. On the game's own site they're the same as before:
 * same-origin API and files, pages at the root. Inside the gateway the API and files are on the
 * game's site, and pages live under the gateway's base path.
 */
import { getGateway } from './state'

/** An API path, e.g. apiUrl('/api/rooms'). */
export function apiUrl(path: string): string {
  return `${getGateway()?.apiBase ?? ''}${path}`
}

/** A WebSocket URL for an API path. */
export function socketUrl(path: string): string {
  const base = new URL(getGateway()?.apiBase || location.origin)
  return `${base.protocol === 'https:' ? 'wss' : 'ws'}://${base.host}${path}`
}

/** A file from the game's public folder, e.g. assetUrl('/cards/QH.svg'). */
export function assetUrl(path: string): string {
  return `${getGateway()?.assetsBase ?? ''}${path}`
}

/** Where the game's pages start for this origin, without a trailing slash: append '/room/ABCD' etc. */
export function appUrl(origin: string): string {
  const base = getGateway()?.basePath ?? '/'
  return `${origin}${base.replace(/\/$/, '')}`
}
