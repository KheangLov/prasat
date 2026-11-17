/**
 * The stones and the tower: every number that balances the game is here.
 * Units: metres and seconds. Each new stone slides over the tower, along x on one floor and along z
 * on the next; a tap drops it, and whatever hangs over the edge of the stone below is cut off.
 */

export const STEP = 1 / 60

/** How tall one floor of stone is. */
export const FLOOR = 0.5
/** How far either side of the tower a sliding stone travels. */
export const SLIDE = 3.4
/** A drop this close to the stone below counts as perfect (no cut). */
export const PERFECT = 0.09
/** Perfect drops in a row before the stone starts to grow back, and how much it grows each time. */
export const STREAK = 3
export const REGROW = 0.12

export const LEVELS_PER_WORLD = 25
