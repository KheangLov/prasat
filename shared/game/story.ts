/**
 * The story: Sophal, an apprentice stone carver, works with master carver Ta Prom to raise towers in
 * the style of Cambodia's great temples, from Angkor to the Royal Palace. A short scene plays before
 * each temple's first level, and a last one after the final level. The words are in
 * i18n/locales/*.json under `story.<world>.<intro|outro>`, one line per speaker below, in order.
 */
import type { WorldId } from './levels'

export type Speaker = 'sophal' | 'prom'

export const STORY: Record<WorldId, { intro: Speaker[], outro: Speaker[] }> = {
  angkor: { intro: ['prom', 'sophal', 'prom'], outro: [] },
  bayon: { intro: ['sophal', 'prom', 'sophal'], outro: [] },
  banteaysrei: { intro: ['prom', 'sophal', 'prom'], outro: [] },
  kohker: { intro: ['sophal', 'prom', 'sophal'], outro: [] },
  preahvihear: { intro: ['prom', 'sophal', 'prom'], outro: [] },
  palace: { intro: ['sophal', 'prom', 'sophal'], outro: ['prom', 'sophal', 'prom'] },
}
