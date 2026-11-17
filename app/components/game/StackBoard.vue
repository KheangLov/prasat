<script setup lang="ts">
/**
 * The temple: the 3D tower filling the screen, the game loop, and the control: tap
 * anywhere (or press Space, Enter or the down arrow) to drop the sliding stone.
 */
import { STEP, type Engine, type GameEvent } from '#shared/game'
import { ICON_MODELS, TowerView } from '~/game/three/tower'
import { ensureIcons } from '~/game/three/icons'

const props = defineProps<{
  engine: Engine
  paused: boolean
  /** Things that happened in the game since the last frame. */
  onEvents: (events: GameEvent[]) => void
  /** Every frame, after the game moved on (to update the top bar without Vue). */
  onFrame?: () => void
}>()

const { t } = useI18n()
const progress = useProgressStore()
const wrap = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const overlay = ref<HTMLElement | null>(null)
const reduced = useReducedMotion()
const failed = ref(false)
let view: TowerView | null = null
let raf = 0
let last = 0
let acc = 0

watch(() => props.paused, () => {
  last = performance.now()
})
watch(reduced, (r) => {
  if (view) view.reducedMotion = r
})

function fit() {
  const el = wrap.value
  if (!el || !view) return
  const box = el.getBoundingClientRect()
  view.resize(Math.max(1, Math.floor(box.width)), Math.max(1, Math.floor(box.height)), window.devicePixelRatio || 1)
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  let dt = (now - last) / 1000
  last = now
  if (dt > 0.1) dt = 0.1
  if (!view) return
  const engine = props.engine
  if (!props.paused) {
    acc += dt
    let steps = 0
    while (acc >= STEP && steps < 8) {
      engine.step(STEP)
      acc -= STEP
      steps++
    }
    if (steps === 8) acc = 0
    flush()
    view.update(dt)
  }
  props.onFrame?.()
  view.render(engine)
}

function flush() {
  const events = props.engine.drainEvents()
  if (events.length) {
    view?.handle(events, props.engine)
    props.onEvents(events)
  }
}

function drop() {
  if (props.paused) return
  if (props.engine.drop()) flush()
}

function onKey(e: KeyboardEvent) {
  if (props.paused) return
  if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    e.preventDefault()
    drop()
  }
}

let observer: ResizeObserver | null = null
onMounted(() => {
  try {
    view = new TowerView(canvas.value!, overlay.value!, progress.settings.hd ? 'high' : 'low', props.engine.level)
  }
  catch {
    failed.value = true
    return
  }
  view.reducedMotion = reduced.value
  void ensureIcons(ICON_MODELS)
  observer = new ResizeObserver(fit)
  observer.observe(wrap.value!)
  fit()
  window.addEventListener('keydown', onKey)
  last = performance.now()
  raf = requestAnimationFrame(frame)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
  view?.dispose()
  view = null
})
</script>

<template>
  <div
    ref="wrap"
    class="relative size-full overflow-hidden"
  >
    <canvas
      ref="canvas"
      class="block size-full touch-none"
      role="img"
      :aria-label="t('game.board')"
      @pointerdown="drop"
    />
    <div
      ref="overlay"
      class="sky-overlay pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    />
    <p
      v-if="failed"
      class="absolute inset-0 flex items-center justify-center p-6 text-center text-moss-100"
    >
      {{ t('game.noWebgl') }}
    </p>
  </div>
</template>
