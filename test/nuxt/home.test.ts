import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import IndexPage from '~/pages/index.vue'
import MapPage from '~/pages/map.vue'

describe('home page', () => {
  it('renders in Khmer by default, with a way to start playing', async () => {
    const page = await mountSuspended(IndexPage)
    expect(page.text()).toContain('ប្រាសាទ')
    expect(page.text()).toContain('ចាប់ផ្ដើមសាងសង់')
    expect(page.find('a[href="/play/1"]').exists()).toBe(true)
  })
})

describe('levels page', () => {
  it('shows six worlds and twenty-five levels, with only the first open at the start', async () => {
    localStorage.clear()
    const page = await mountSuspended(MapPage)
    await nextTick()
    expect(page.findAll('nav button')).toHaveLength(6)
    const nodes = page.findAll('.level-node')
    expect(nodes).toHaveLength(25)
    expect(nodes[0]!.attributes('data-state')).toBe('current')
    expect(nodes[1]!.attributes('data-state')).toBe('locked')
  })
})
