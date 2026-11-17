<script setup lang="ts">
/**
 * The menus' background: a tower rising by itself in 3D at one of the temples, the camera turning
 * slowly round it. It uses the game's own engine and view, and stops whenever a level is on, so only
 * one 3D scene ever runs at a time. Without WebGL, the plain backdrop shows.
 */
import { Engine, STEP, endlessLevel } from '#shared/game'
import { TowerView } from '~/game/three/tower'

const props = defineProps<{ world: number }>()
const canvas = ref<HTMLCanvasElement | null>(null)
const overlay = ref<HTMLElement | null>(null)
const progress = useProgressStore()
const ready = ref(false)
let view: TowerView | null = null
let engine: Engine | null = null
let raf = 0
let last = 0
let acc = 0
let planned = 0

function start() {
  stop()
  try {
    engine = new Engine({ ...endlessLevel(props.world), speed: [2, 2] })
    view = new TowerView(canvas.value!, overlay.value!, progress.settings.hd ? 'high' : 'low', engine.level, true)
  }
  catch {
    view = null
    return
  }
  ready.value = true
  fit()
  last = performance.now()
  raf = requestAnimationFrame(frame)
}

function stop() {
  cancelAnimationFrame(raf)
  view?.dispose()
  view = null
  ready.value = false
}

function fit() {
  view?.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1)
}

function frame(now: number) {
  raf = requestAnimationFrame(frame)
  if (!view || !engine || document.hidden) return
  let dt = (now - last) / 1000
  last = now
  if (dt > 0.1) dt = 0.1
  acc += dt
  while (acc >= STEP) {
    engine.step(STEP)
    acc -= STEP
    const delta = engine.moving[engine.axis] - engine.top[engine.axis]
    if (Math.abs(delta - planned) < engine.speed * STEP) {
      engine.drop()
      planned = (Math.random() - 0.5) * 0.12
    }
  }
  view.handle(engine.drainEvents(), engine)
  if (engine.floors >= 26 || engine.state !== 'playing') {
    start()
    return
  }
  view.update(dt)
  view.render(engine)
}

watch(() => props.world, () => {
  if (view) start()
})
onMounted(() => {
  start()
  window.addEventListener('resize', fit)
})
onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', fit)
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-700"
    :class="ready ? 'opacity-100' : 'opacity-0'"
    aria-hidden="true"
  >
    <canvas
      ref="canvas"
      class="block size-full"
    />
    <div
      ref="overlay"
      class="hidden"
    />
    <!-- Darkened towards the middle, where the menus are, so text stays easy to read. -->
    <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(7_20_13/0.7),rgb(7_20_13/0.3)_70%,rgb(7_20_13/0.15))]" />
  </div>
</template>
