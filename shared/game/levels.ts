/**
 * The 150 levels: six temples, twenty-five each, and endless mode. A level is a tower to raise: how
 * many floors, how wide the first stone is, how fast the stones slide, and whether the wind makes
 * them speed up and slow down. Made from the level's number, the same every time.
 */
import { LEVELS_PER_WORLD } from './data'

export const WORLD_COUNT = 6
export const TOTAL_LEVELS = WORLD_COUNT * LEVELS_PER_WORLD

export type WorldId = 'angkor' | 'bayon' | 'banteaysrei' | 'kohker' | 'preahvihear' | 'palace'

export interface WorldDef {
  id: WorldId
  night: boolean
  /** Stone, trim and sky colours. */
  palette: { stone: string, trim: string, sky: string, ground: string }
  /** What the stones are carved with. */
  carving: 'lotus' | 'faces' | 'flowers' | 'steps' | 'naga' | 'gold'
  /** Colours of the temple's card on the map. */
  accent: { from: string, to: string }
}

export const WORLDS: WorldDef[] = [
  { id: 'angkor', night: false, carving: 'lotus', accent: { from: '#ffd27a', to: '#8a5a2a' },
    palette: { stone: '#b8a078', trim: '#8a7454', sky: '#ffcf9a', ground: '#6a8a3a' } },
  { id: 'bayon', night: false, carving: 'faces', accent: { from: '#c8c0a8', to: '#5a5a4a' },
    palette: { stone: '#a8a08a', trim: '#6a6a5a', sky: '#bfe0ff', ground: '#5a7a3a' } },
  { id: 'banteaysrei', night: false, carving: 'flowers', accent: { from: '#ff9a8a', to: '#8a2a2a' },
    palette: { stone: '#d0806a', trim: '#9a4a3a', sky: '#ffd8c0', ground: '#6a8a4a' } },
  { id: 'kohker', night: false, carving: 'steps', accent: { from: '#c8b08a', to: '#4a3a2a' },
    palette: { stone: '#9a8a70', trim: '#6a5a44', sky: '#d8e8c8', ground: '#4a6a2a' } },
  { id: 'preahvihear', night: false, carving: 'naga', accent: { from: '#8ac8ff', to: '#2a4a8a' },
    palette: { stone: '#a89a80', trim: '#7a6a50', sky: '#a8d0f8', ground: '#7a8a5a' } },
  { id: 'palace', night: true, carving: 'gold', accent: { from: '#ffe07a', to: '#5a3a8a' },
    palette: { stone: '#f4ecd8', trim: '#ffc21a', sky: '#1a1a3a', ground: '#2a3a2a' } },
]

export interface LevelDef {
  /** 1 to TOTAL_LEVELS; 0 is endless mode. */
  n: number
  world: number
  index: number
  /** Floors to build. */
  floors: number
  /** Width and depth of the first stone. */
  size: number
  /** Sliding speed at the start and at the top (metres a second). */
  speed: [number, number]
  /** Wind: how much the slide speeds up and slows down (0 = steady). */
  wind: number
}

/** "3-12": temple 3, level 12. */
export function levelLabel(n: number) {
  const w = Math.floor((n - 1) / LEVELS_PER_WORLD)
  return `${w + 1}-${n - w * LEVELS_PER_WORLD}`
}

const cache = new Map<number, LevelDef>()

export function getLevel(n: number): LevelDef {
  let level = cache.get(n)
  if (!level) cache.set(n, level = makeLevel(n))
  return level
}

function makeLevel(n: number): LevelDef {
  const world = Math.floor((n - 1) / LEVELS_PER_WORLD)
  const index = n - 1 - world * LEVELS_PER_WORLD
  const d = (n - 1) / (TOTAL_LEVELS - 1)
  const local = index / (LEVELS_PER_WORLD - 1)
  // Every fifth level is a tall one; the rest grow through each temple.
  const tall = index % 5 === 4
  const floors = Math.round(8 + local * 10 + d * 12 + (tall ? 8 : 0))
  const base = 2.2 + d * 1.6
  return {
    n, world, index, floors,
    size: Math.max(2.2, 3 - d * 0.6),
    speed: [base, base + 1.2 + local * 0.8],
    // Wind from the third temple on, now and then.
    wind: world >= 2 && index % 3 === 1 ? 0.25 + d * 0.25 : 0,
  }
}

/** Endless mode: as tall as you can, in a random temple, faster as you go. */
export function endlessLevel(world: number): LevelDef {
  return { n: 0, world, index: 0, floors: Infinity, size: 3, speed: [2.4, 6.5], wind: 0 }
}
