import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3'
import { CORS_HEADERS } from './cors-headers'

/**
 * The gateway's page calls this game's /api/ from another origin; preflight requests get an
 * empty 204. (/mf/ gets its headers from route rules: static files never reach middleware.)
 */
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return
  setResponseHeaders(event, CORS_HEADERS)
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
