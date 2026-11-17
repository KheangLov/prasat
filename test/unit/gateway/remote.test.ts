import { afterEach, describe, expect, it } from 'vitest'
import { GATEWAY_CONTRACT } from '../../../modules/gateway-remote/runtime/contract'
import { corsPreflight, withCors } from '../../../modules/gateway-remote/runtime/server/cors-headers'
import { setGateway } from '../../../modules/gateway-remote/runtime/state'
import { apiUrl, appUrl, assetUrl, socketUrl } from '../../../modules/gateway-remote/runtime/urls'

const inGateway = (apiBase = 'https://prasat.example') => setGateway({
  apiBase,
  assetsBase: 'https://prasat.example',
  basePath: '/play/prasat/',
  onExit: () => {},
})

afterEach(() => {
  setGateway(null)
  delete (globalThis as { location?: unknown }).location
})

describe('gateway contract', () => {
  it('is version 1 (the gateway refuses versions it does not know)', () => {
    expect(GATEWAY_CONTRACT).toBe(1)
  })
})

describe('URLs on the game\'s own site', () => {
  it('are the same as before the gateway existed', () => {
    (globalThis as { location?: unknown }).location = new URL('https://prasat.example/online')
    expect(apiUrl('/api/rooms')).toBe('/api/rooms')
    expect(socketUrl('/api/rooms/ABC123/ws')).toBe('wss://prasat.example/api/rooms/ABC123/ws')
    expect(assetUrl('/cards/QH.svg')).toBe('/cards/QH.svg')
    expect(appUrl('https://prasat.example')).toBe('https://prasat.example')
  })

  it('use ws:// on plain http (LAN server, dev)', () => {
    (globalThis as { location?: unknown }).location = new URL('http://192.168.1.20:3000/')
    expect(socketUrl('/api/rooms/ABC123/ws')).toBe('ws://192.168.1.20:3000/api/rooms/ABC123/ws')
  })
})

describe('URLs inside the gateway', () => {
  it('send the API and files to the game\'s site, and pages under the gateway\'s base path', () => {
    inGateway()
    expect(apiUrl('/api/rooms')).toBe('https://prasat.example/api/rooms')
    expect(socketUrl('/api/rooms/ABC123/ws')).toBe('wss://prasat.example/api/rooms/ABC123/ws')
    expect(assetUrl('/cards/QH.svg')).toBe('https://prasat.example/cards/QH.svg')
    expect(appUrl('https://games.example')).toBe('https://games.example/play/prasat')
  })

  it('follow an API base the gateway chose', () => {
    inGateway('http://localhost:8787')
    expect(apiUrl('/api/rooms')).toBe('http://localhost:8787/api/rooms')
    expect(socketUrl('/api/rooms/ABC123/ws')).toBe('ws://localhost:8787/api/rooms/ABC123/ws')
  })
})

describe('CORS for the gateway', () => {
  it('answers a preflight with 204 and the allowed methods', () => {
    const response = corsPreflight()
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-methods')).toContain('POST')
  })

  it('adds the headers to an API response and keeps its status and body', async () => {
    const response = withCors(Response.json({ code: 'ABC123' }, { status: 201 }))
    expect(response.status).toBe(201)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(await response.json()).toEqual({ code: 'ABC123' })
  })

  it('leaves WebSocket upgrades alone', () => {
    const upgrade = { status: 101 } as Response
    expect(withCors(upgrade)).toBe(upgrade)
  })
})
