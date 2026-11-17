/**
 * A simple builder, for tests: it watches the sliding stone and drops it when it's over the stone
 * below, like a careful player with a little error in timing (`skill` seconds either way, from a
 * fixed sequence so it's the same every time). Faster stones mean bigger misses, as for people.
 */
import { Engine, STEP, createRng, type LevelDef } from '../../../shared/game'

export interface BuildResult { won: boolean, floors: number, stars: number, engine: Engine }

export function autoplay(level: LevelDef, skill = 0.03, limit = 900): BuildResult {
  const e = new Engine(level)
  const rng = createRng(level.n * 31 + 7)
  let timing = rng.range(-skill, skill)
  while (e.state === 'playing' && e.time < limit) {
    e.step(STEP)
    e.drainEvents()
    const along = e.axis
    const delta = e.moving[along] - e.top[along]
    // Drop when the error is about the planned one, whichever way it's sliding.
    if (Math.abs(delta - timing * e.speed) < e.speed * STEP) {
      e.drop()
      timing = rng.range(-skill, skill)
    }
  }
  return { won: e.state === 'won', floors: e.floors, stars: e.stars, engine: e }
}
