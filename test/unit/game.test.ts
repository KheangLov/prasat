import { describe, expect, it } from 'vitest'
import { Engine, LEVELS_PER_WORLD, PERFECT, STEP, TOTAL_LEVELS, WORLDS, endlessLevel, getLevel, levelLabel } from '../../shared/game'
import { autoplay } from './helpers/autoplay'

/** Slides the stone until it's `offset` from the one below, then drops it. */
function dropAt(e: Engine, offset: number) {
  for (let i = 0; i < 2000; i++) {
    const delta = e.moving[e.axis] - e.top[e.axis]
    if (Math.abs(delta - offset) < e.speed * STEP) break
    e.step(STEP)
  }
  e.drop()
}

describe('levels', () => {
  it('has 150 levels in six temples', () => {
    expect(TOTAL_LEVELS).toBe(150)
    expect(WORLDS).toHaveLength(6)
    expect(LEVELS_PER_WORLD).toBe(25)
    expect(levelLabel(26)).toBe('2-1')
    expect(levelLabel(150)).toBe('6-25')
  })

  it('asks for taller towers and faster stones as you go', () => {
    expect(getLevel(150).floors).toBeGreaterThan(getLevel(1).floors)
    expect(getLevel(150).speed[1]).toBeGreaterThan(getLevel(1).speed[1])
  })
})

describe('engine', () => {
  it('a perfect drop keeps the whole stone', () => {
    const e = new Engine(getLevel(1))
    dropAt(e, PERFECT / 2)
    expect(e.floors).toBe(1)
    expect(e.top.w).toBeCloseTo(getLevel(1).size)
    expect(e.perfects).toBe(1)
  })

  it('cuts off what hangs over, and the next stone slides the other way', () => {
    const e = new Engine(getLevel(1))
    dropAt(e, 0.6)
    expect(e.top.w).toBeCloseTo(getLevel(1).size - 0.6, 1)
    expect(e.axis).toBe('z')
    const events = e.drainEvents()
    expect(events.some(ev => ev.type === 'cut')).toBe(true)
  })

  it('a streak of perfect drops grows the stone back', () => {
    const e = new Engine(getLevel(1))
    dropAt(e, 0.5)
    const after = e.top.w
    for (let i = 0; i < 4; i++) dropAt(e, 0)
    expect(e.top.w).toBeGreaterThan(after)
  })

  it('missing the tower ends it', () => {
    const e = new Engine(getLevel(1))
    dropAt(e, getLevel(1).size + 0.2)
    expect(e.state).toBe('lost')
  })

  it('wins at the level\'s height, with stars for how much stone is left', () => {
    const r = autoplay(getLevel(1))
    expect(r.won).toBe(true)
    expect(r.floors).toBe(getLevel(1).floors)
    expect(r.stars).toBe(3)
  })

  it('endless mode goes on until a miss', () => {
    const r = autoplay(endlessLevel(2), 0.09, 300)
    expect(r.engine.state).toBe('lost')
    expect(r.engine.score).toBeGreaterThan(0)
  })
})

describe('the simple builder', () => {
  it('finishes every level', () => {
    for (let n = 1; n <= TOTAL_LEVELS; n++) expect(autoplay(getLevel(n)).won, `level ${n}`).toBe(true)
  }, 300_000)

  it('a careless builder doesn\'t finish them all', () => {
    let fails = 0
    for (let n = 1; n <= TOTAL_LEVELS; n++) if (!autoplay(getLevel(n), 0.09).won) fails++
    expect(fails).toBeGreaterThan(10)
  }, 300_000)
})
