/** What the gateway handed to `mount()`. Null on the game's own site. */
export interface GatewayState {
  /** Where the game's /api/ lives, without a trailing slash, e.g. 'https://catte.example'. */
  apiBase: string
  /** Where the game's own public files (cards, icons) live, without a trailing slash. */
  assetsBase: string
  /** The game's pages on the gateway, e.g. '/play/catte/'. */
  basePath: string
  onExit: () => void
}

let gateway: GatewayState | null = null

export function setGateway(state: GatewayState | null) {
  gateway = state
}

export function getGateway(): GatewayState | null {
  return gateway
}
