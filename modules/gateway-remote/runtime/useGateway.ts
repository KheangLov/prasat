import { getGateway } from './state'

/**
 * Whether the game is running inside the gaming gateway, and how to go back to it.
 * On the game's own site `inGateway` is false and `exit` does nothing.
 */
export function useGateway() {
  return {
    inGateway: getGateway() !== null,
    exit: () => getGateway()?.onExit(),
  }
}
