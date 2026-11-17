import { describe, expect, it } from 'vitest'
import km from '../../i18n/locales/km.json'
import en from '../../i18n/locales/en.json'

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object'
      ? keys(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  ).sort()
}

describe('locales', () => {
  it('Khmer and English have the same translation keys', () => {
    expect(keys(km)).toEqual(keys(en))
  })

  it('has no empty translations', () => {
    for (const [name, messages] of Object.entries({ km, en })) {
      const empty = keys(messages).filter((key) => {
        const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages)
        return typeof value !== 'string' || value.trim() === ''
      })
      expect(empty, `${name} has empty translations`).toEqual([])
    }
  })
})
