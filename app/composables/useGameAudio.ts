import { GameAudio } from '~/game/audio'

let shared: GameAudio | null = null

/**
 * The one audio engine for the whole app (sound effects and music), following the player's
 * settings. Created on first use in the browser; browsers only let it play after a tap.
 */
export function useGameAudio(): GameAudio | null {
  if (!import.meta.client) return null
  if (!shared) {
    shared = new GameAudio()
    const progress = useProgressStore()
    watch(() => [progress.settings.sound, progress.settings.music] as const, ([sound, music]) => {
      shared!.soundOn = sound
      shared!.musicOn = music
      if (!music) shared!.stopMusic()
    }, { immediate: true })
  }
  return shared
}

/** Interface sounds (taps, page turns, "can't do that"). Safe to call from any click. */
export function useUiSound() {
  return {
    ui(kind: Parameters<GameAudio['ui']>[0]) {
      const audio = useGameAudio()
      audio?.unlock()
      audio?.ui(kind)
    },
  }
}
