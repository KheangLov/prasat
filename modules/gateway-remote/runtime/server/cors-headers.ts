/**
 * CORS for the gaming gateway: its page calls this game's /api/ from another origin. Nothing here
 * uses cookies, so any origin may read the responses. Shared by the Nitro middleware (cors.ts)
 * and a Cloudflare Worker entry that answers /api/ before Nitro does.
 */
export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
}

/** The answer to a CORS preflight request. */
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/** The same response with CORS headers (WebSocket upgrades are left alone). */
export function withCors(response: Response): Response {
  if (response.status === 101) return response
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
