/**
 * What the gaming gateway and a game agree on. The same file is in every game and (as
 * app/games/contract.ts) in the gateway; bump GATEWAY_CONTRACT on any breaking change.
 */
export const GATEWAY_CONTRACT = 1

export interface MountOptions {
  /** Empty element owned by the gateway; the game puts its app inside it. */
  el: HTMLElement
  /** Where the game's pages live on the gateway, e.g. '/play/catte/'. */
  basePath: string
  /** The gateway's language; the game keeps its own switcher afterwards. */
  locale: string
  /** Where the game's /api/* lives. Default: the origin the game's code was loaded from. */
  apiBase?: string
  /** The game's "All games" button. */
  onExit: () => void
}

export interface GameRemote {
  contract: number
  mount: (options: MountOptions) => Promise<void>
}
