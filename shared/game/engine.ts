/**
 * The rules of the stacking, with no drawing: a plain TypeScript engine stepped at a fixed rate.
 * A stone slides back and forth over the tower (along x, then z on the next floor); dropping it keeps
 * only the part over the stone below, and the rest falls away. Close enough is perfect and keeps the
 * whole stone; a streak of perfect drops grows it back a little. Miss the tower altogether and it's
 * over. It emits events that drive the effects and sounds.
 */
import { FLOOR, PERFECT, REGROW, SLIDE, STREAK } from './data'
import type { LevelDef } from './levels'

export interface Stone {
  /** Centre and size across x and z, and the floor it's on. */
  x: number
  z: number
  w: number
  d: number
  floor: number
}

export type GameEvent
  = | { type: 'place', floor: number, perfect: boolean, streak: number }
    | { type: 'cut', piece: Stone, dir: 1 | -1, axis: 'x' | 'z' }
    | { type: 'grow' }
    | { type: 'miss', piece: Stone }
    | { type: 'won' }
    | { type: 'lost' }

export class Engine {
  readonly level: LevelDef
  readonly endless: boolean
  state: 'playing' | 'won' | 'lost' = 'playing'
  time = 0
  /** The tower so far, from the ground up. */
  tower: Stone[]
  /** The stone sliding over it, and which way. */
  moving: Stone
  axis: 'x' | 'z' = 'x'
  dir = 1
  perfects = 0
  streak = 0
  private events: GameEvent[] = []
  private phase = 0

  constructor(level: LevelDef) {
    this.level = level
    this.endless = level.n === 0
    this.tower = [{ x: 0, z: 0, w: level.size, d: level.size, floor: 0 }]
    this.moving = this.next()
  }

  /* ------------------------------ Queries ------------------------------ */

  /** Floors built (not counting the base). */
  get floors() {
    return this.tower.length - 1
  }

  get top() {
    return this.tower[this.tower.length - 1]!
  }

  /** How fast stones slide now. */
  get speed() {
    const [a, b] = this.level.speed
    const t = this.endless ? Math.min(1, this.floors / 60) : Math.min(1, this.floors / Math.max(1, this.level.floors))
    const base = a + (b - a) * t
    return this.level.wind ? base * (1 + this.level.wind * Math.sin(this.phase * 2.3)) : base
  }

  /** The top stone's area as a share of the first. */
  get kept() {
    return (this.top.w * this.top.d) / (this.level.size * this.level.size)
  }

  get stars() {
    if (this.state !== 'won') return 0
    return this.kept >= 0.5 ? 3 : this.kept >= 0.22 ? 2 : 1
  }

  /** Endless mode's score: floors, and a bonus for perfect drops. */
  get score() {
    return this.floors * 10 + this.perfects * 5
  }

  drainEvents() {
    const out = this.events
    this.events = []
    return out
  }

  /* ------------------------------ Actions ------------------------------ */

  /** Drops the sliding stone. */
  drop() {
    if (this.state !== 'playing') return false
    const top = this.top
    const m = this.moving
    const along = this.axis
    const size = along === 'x' ? 'w' : 'd'
    const delta = m[along] - top[along]
    let placed: Stone
    if (Math.abs(delta) <= PERFECT) {
      placed = { ...m, x: top.x, z: top.z }
      this.perfects++
      this.streak++
      if (this.streak >= STREAK) {
        // A streak grows the stone back towards the first one's size.
        placed.w = Math.min(this.level.size, placed.w + REGROW)
        placed.d = Math.min(this.level.size, placed.d + REGROW)
        this.emit({ type: 'grow' })
      }
    }
    else {
      const overlap = m[size] - Math.abs(delta)
      if (overlap <= 0) {
        this.state = 'lost'
        this.emit({ type: 'miss', piece: { ...m } })
        this.emit({ type: 'lost' })
        return true
      }
      this.streak = 0
      const s = Math.sign(delta) as 1 | -1
      placed = { ...m, [along]: top[along] + delta / 2, [size]: overlap }
      const piece: Stone = { ...m, [along]: placed[along] + s * (overlap / 2 + Math.abs(delta) / 2), [size]: Math.abs(delta) }
      this.emit({ type: 'cut', piece, dir: s, axis: along })
    }
    this.tower.push(placed)
    this.emit({ type: 'place', floor: placed.floor, perfect: Math.abs(delta) <= PERFECT, streak: this.streak })
    if (!this.endless && this.floors >= this.level.floors) {
      this.state = 'won'
      this.emit({ type: 'won' })
      return true
    }
    this.axis = this.axis === 'x' ? 'z' : 'x'
    this.moving = this.next()
    return true
  }

  /* ------------------------------ Time ------------------------------ */

  step(dt: number) {
    if (this.state !== 'playing') return
    this.time += dt
    this.phase += dt
    const m = this.moving
    m[this.axis] += this.dir * this.speed * dt
    const limit = SLIDE + (this.axis === 'x' ? this.top.x : this.top.z)
    const low = -SLIDE + (this.axis === 'x' ? this.top.x : this.top.z)
    if (m[this.axis] > limit) {
      m[this.axis] = limit
      this.dir = -1
    }
    else if (m[this.axis] < low) {
      m[this.axis] = low
      this.dir = 1
    }
  }

  /** A new stone the size of the top one, starting at the far side of its slide. */
  private next(): Stone {
    const top = this.top
    this.dir = this.tower.length % 2 ? 1 : -1
    const start = this.dir > 0 ? -SLIDE : SLIDE
    return {
      x: this.axis === 'x' ? top.x + start : top.x,
      z: this.axis === 'z' ? top.z + start : top.z,
      w: top.w,
      d: top.d,
      floor: top.floor + 1,
    }
  }

  private emit(event: GameEvent) {
    this.events.push(event)
  }
}

export { FLOOR }
