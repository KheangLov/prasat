<script setup lang="ts">
/**
 * A tower, from start to finish: the temple's story (first time), the briefing, a countdown, the
 * building itself with its top bar, and the result. `n` is the level number, or 0 for endless mode.
 */
import { AnimatePresence, motion } from 'motion-v'
import {
  Engine, TOTAL_LEVELS, WORLD_COUNT, WORLDS, endlessLevel, getLevel, levelLabel,
  type GameEvent, type LevelDef,
} from '#shared/game'
import { buzz } from '~/game/audio'

type Phase = 'storyIntro' | 'briefing' | 'countdown' | 'playing' | 'storyOutro' | 'result'

const props = defineProps<{ n: number }>()
const router = useRouter()
const { locale, t } = useI18n()
const progress = useProgressStore()
const reduced = useReducedMotion()
const audio = useGameAudio()

const endless = computed(() => props.n === 0)
const phase = ref<Phase>('briefing')
const level = shallowRef<LevelDef>(props.n ? getLevel(props.n) : endlessLevel(0))
const engine = shallowRef<Engine | null>(null)
const paused = ref(false)
const settingsOpen = ref(false)
const count = ref(3)
const record = ref(false)
/** Whether the tower is on screen (the menus' 3D backdrop rests meanwhile). */
const playing = useState('playing', () => false)
watch(phase, p => (playing.value = p === 'countdown' || p === 'playing' || p === 'result' || p === 'storyOutro'), { immediate: true })

const hud = reactive({ floors: 0, bump: 0, streak: 0, kept: 1 })
const num = (value: number) => localNumber(value, locale.value)
const world = computed(() => WORLDS[level.value.world]!)
const label = computed(() => endless.value ? t('home.endless') : localDigits(levelLabel(level.value.n), locale.value))

useHead({ title: () => `${t('app.title')} · ${endless.value ? t('home.endless') : levelLabel(level.value.n)}` })

interface Banner { id: number, text: string, tone: 'sun' | 'berry' | 'leaf' }
const banner = ref<Banner | null>(null)
let bannerTimer: ReturnType<typeof setTimeout> | undefined
let bannerId = 0
function showBanner(text: string, tone: Banner['tone'] = 'sun', ms = 1400) {
  clearTimeout(bannerTimer)
  banner.value = { id: ++bannerId, text, tone }
  bannerTimer = setTimeout(() => (banner.value = null), ms)
}

const hint = ref<string | null>(null)

/* ------------------------------ Flow ------------------------------ */

function init() {
  progress.load()
  if (props.n && (props.n < 1 || props.n > TOTAL_LEVELS || !progress.isUnlocked(props.n))) {
    void router.replace('/map')
    return
  }
  level.value = props.n ? getLevel(props.n) : endlessLevel(Math.floor(Math.random() * WORLD_COUNT))
  engine.value = null
  paused.value = false
  const intro = `${WORLDS[level.value.world]!.id}-intro`
  phase.value = !endless.value && level.value.index === 0 && !progress.seen.includes(intro) ? 'storyIntro' : endless.value ? 'countdown' : 'briefing'
  if (phase.value === 'countdown') start()
}

let countTimer: ReturnType<typeof setInterval> | undefined
function start() {
  if (endless.value) level.value = endlessLevel(Math.floor(Math.random() * WORLD_COUNT))
  const e = new Engine(level.value)
  engine.value = markRaw(e)
  sync(true)
  paused.value = true
  record.value = false
  phase.value = 'countdown'
  count.value = 3
  audio?.unlock()
  audio?.ui('tap')
  clearInterval(countTimer)
  countTimer = setInterval(() => {
    count.value--
    audio?.ui(count.value > 0 ? 'tap' : 'star')
    if (count.value <= 0) {
      clearInterval(countTimer)
      phase.value = 'playing'
      paused.value = false
      audio?.playMusic(level.value.world)
      audio?.duck(false)
      if (level.value.n === 1) hint.value = 'hints.tap'
      if (level.value.n === 2) hint.value = 'hints.cut'
      if (level.value.n === 3) hint.value = 'hints.streak'
      setTimeout(() => (hint.value = null), 5000)
    }
  }, 650)
}

function finish() {
  const e = engine.value
  if (!e) return
  audio?.duck(true)
  if (endless.value) record.value = progress.endless(e.score, e.floors)
  else if (e.state === 'won') {
    progress.complete(level.value.n, e.stars)
    if (level.value.n === TOTAL_LEVELS && !progress.seen.includes('palace-outro')) {
      phase.value = 'storyOutro'
      return
    }
  }
  phase.value = 'result'
}

function retry() {
  start()
}

function next() {
  void router.push(`/play/${level.value.n + 1}`)
}

/* ------------------------------ Playing ------------------------------ */

function haptic(ms: number | number[]) {
  if (progress.settings.haptics) buzz(ms)
}

function onEvents(events: GameEvent[]) {
  audio?.handle(events)
  for (const ev of events) {
    switch (ev.type) {
      case 'place':
        if (ev.floor >= 3) hint.value = null
        haptic(ev.perfect ? 25 : 12)
        if (ev.perfect && ev.streak >= 3) showBanner(t('game.streak', { n: num(ev.streak) }), 'sun', 900)
        break
      case 'won':
        hint.value = null
        haptic([30, 60, 30, 60, 80])
        showBanner(t('game.done'), 'leaf', 1600)
        setTimeout(finish, 2400)
        break
      case 'lost':
        hint.value = null
        haptic(300)
        showBanner(t('game.fell'), 'berry', 1300)
        setTimeout(finish, 1500)
        break
    }
  }
}

function sync(force = false) {
  const e = engine.value
  if (!e) return
  if (e.floors !== hud.floors) {
    if (!force) hud.bump++
    hud.floors = e.floors
    hud.kept = e.kept
  }
  hud.streak = e.streak
}

function togglePause() {
  if (phase.value !== 'playing' || engine.value?.state !== 'playing') return
  paused.value = !paused.value
  audio?.ui('tap')
  audio?.duck(paused.value)
}

function onKey(event: KeyboardEvent) {
  if (settingsOpen.value) return
  if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') togglePause()
}

function onSettingChange(key: string, value: boolean) {
  if (key === 'music') audio?.setMusic(value, level.value.world)
}

function onVisibility() {
  if (document.hidden && phase.value === 'playing' && !paused.value && engine.value?.state === 'playing') {
    paused.value = true
    audio?.duck(true)
  }
}

watch(() => props.n, init)
onMounted(() => {
  init()
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
})
onBeforeUnmount(() => {
  playing.value = false
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
  clearTimeout(bannerTimer)
  clearInterval(countTimer)
  audio?.stopMusic()
})
</script>

<template>
  <div class="fixed inset-0 flex flex-col overflow-hidden">
    <StoryScene
      v-if="phase === 'storyIntro'"
      :world="WORLDS[level.world]!.id"
      part="intro"
      @done="phase = 'briefing'"
    />
    <StoryScene
      v-if="phase === 'storyOutro'"
      world="palace"
      part="outro"
      @done="phase = 'result'"
    />

    <div
      v-if="phase === 'briefing'"
      class="flex-1 overflow-y-auto"
    >
      <GameLevelBriefing
        :level="level"
        @start="start"
        @back="router.push('/map')"
      />
    </div>

    <template v-if="engine && phase !== 'briefing' && phase !== 'storyIntro'">
      <GameStackBoard
        class="absolute inset-0"
        :engine="engine"
        :paused="paused || phase !== 'playing'"
        :on-events="onEvents"
        :on-frame="sync"
      />

      <!-- Top bar: pause, floors built (of the level's), the stone left, and a streak of perfect drops. -->
      <header class="pointer-events-none relative z-10 flex flex-wrap items-start gap-2 px-[calc(0.5rem+var(--safe-left))] pe-[calc(0.5rem+var(--safe-right))] pt-[calc(0.5rem+var(--safe-top))]">
        <button
          type="button"
          class="btn-icon pointer-events-auto shrink-0"
          :aria-label="t('game.pause')"
          @click="togglePause"
        >
          <UIcon
            name="i-lucide-pause"
            class="size-5"
          />
        </button>
        <div
          class="hud-pill"
          :aria-label="endless ? t('game.floors', { n: num(hud.floors) }) : t('game.floorsOf', { n: num(hud.floors), total: num(level.floors) })"
        >
          <ModelIcon
            name="stone"
            class="size-7"
          />
          <motion.span
            :key="hud.bump"
            :initial="reduced ? false : { scale: 1.35 }"
            :animate="{ scale: 1 }"
            :transition="{ type: 'spring', stiffness: 500, damping: 18 }"
            class="font-display text-xl leading-none"
          >
            {{ num(hud.floors) }}
          </motion.span>
          <span
            v-if="!endless"
            class="font-display text-sm leading-none opacity-70"
          >/ {{ num(level.floors) }}</span>
        </div>
        <div
          class="hud-pill"
          :aria-label="t('game.kept', { n: num(Math.round(hud.kept * 100)) })"
        >
          <UIcon
            name="i-lucide-square-dashed"
            class="size-4"
          />
          <span class="font-display text-base leading-none">{{ num(Math.round(hud.kept * 100)) }}%</span>
        </div>
        <div
          v-if="hud.streak >= 2"
          class="hud-pill power ms-auto"
        >
          ✦ ×{{ num(hud.streak) }}
        </div>
      </header>

      <!-- Countdown. -->
      <div
        v-if="phase === 'countdown'"
        class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          <motion.p
            :key="count"
            :initial="reduced ? false : { scale: 2, opacity: 0 }"
            :animate="{ scale: 1, opacity: 1 }"
            :exit="reduced ? undefined : { scale: 0.5, opacity: 0 }"
            class="text-glow font-display text-8xl"
          >
            {{ count > 0 ? num(count) : t('game.go') }}
          </motion.p>
        </AnimatePresence>
      </div>

      <!-- Announcements. -->
      <div
        class="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center"
        aria-live="assertive"
      >
        <AnimatePresence>
          <motion.p
            v-if="banner"
            :key="banner.id"
            :initial="reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0, rotate: -6 }"
            :animate="{ scale: 1, opacity: 1, rotate: 0 }"
            :exit="reduced ? { opacity: 0 } : { scale: 1.3, opacity: 0 }"
            :transition="{ type: 'spring', stiffness: 400, damping: 20 }"
            class="px-4 text-center font-display text-4xl leading-tight sm:text-5xl"
            :class="banner.tone === 'berry' ? 'text-[#ffd1dc] [text-shadow:0_4px_0_#7a1030,0_0_30px_rgb(255_77_109/0.7)]'
              : banner.tone === 'leaf' ? 'text-leaf-100 [text-shadow:0_4px_0_#29491c,0_0_30px_rgb(120_204_69/0.7)]'
                : 'text-sun-100 [text-shadow:0_4px_0_#7a340d,0_0_30px_rgb(255_190_31/0.7)]'"
          >
            {{ banner.text }}
          </motion.p>
        </AnimatePresence>
      </div>

      <!-- Coaching on the first levels. -->
      <AnimatePresence>
        <motion.div
          v-if="hint && phase === 'playing'"
          :key="hint"
          :initial="reduced ? false : { y: 30, opacity: 0 }"
          :animate="{ y: 0, opacity: 1 }"
          :exit="{ y: 30, opacity: 0 }"
          class="pointer-events-none absolute inset-x-0 bottom-[calc(1.5rem+var(--safe-bottom))] z-20 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-2xl bg-sun-300 px-4 py-2 font-semibold text-sun-950 shadow-xl"
          role="status"
        >
          <UIcon
            name="i-lucide-hand"
            class="size-5 shrink-0"
          />
          {{ t(hint) }}
        </motion.div>
      </AnimatePresence>

      <!-- Pause menu. -->
      <AnimatePresence>
        <motion.div
          v-if="paused && phase === 'playing'"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :exit="{ opacity: 0 }"
          class="fixed inset-0 z-40 flex items-center justify-center bg-moss-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          :aria-label="t('pause.title')"
        >
          <div class="glass flex w-full max-w-xs flex-col gap-3 p-6 text-center">
            <h2 class="text-glow font-display text-4xl">
              {{ t('pause.title') }}
            </h2>
            <p class="text-sm text-muted">
              {{ t(`worlds.${world.id}.name`) }} · {{ label }}
            </p>
            <button
              type="button"
              class="btn-game"
              @click="togglePause"
            >
              <UIcon
                name="i-lucide-play"
                class="size-5"
              />
              {{ t('pause.resume') }}
            </button>
            <button
              type="button"
              class="btn-game ghost"
              @click="retry"
            >
              <UIcon
                name="i-lucide-rotate-ccw"
                class="size-5"
              />
              {{ t('pause.restart') }}
            </button>
            <div class="flex gap-3">
              <button
                type="button"
                class="btn-game ghost flex-1"
                @click="router.push(endless ? '/' : '/map')"
              >
                <UIcon
                  :name="endless ? 'i-lucide-house' : 'i-lucide-map'"
                  class="size-5"
                />
                {{ endless ? t('pause.home') : t('pause.quit') }}
              </button>
              <button
                type="button"
                class="btn-game ghost"
                :aria-label="t('settings.title')"
                @click="settingsOpen = true"
              >
                <UIcon
                  name="i-lucide-settings"
                  class="size-5"
                />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <GameResultSheet
        v-if="phase === 'result'"
        :engine="engine"
        :record="record"
        @next="next"
        @retry="retry"
        @levels="router.push(endless ? '/' : '/map')"
      />
    </template>

    <SettingsModal
      v-model:open="settingsOpen"
      @change="onSettingChange"
    />
  </div>
</template>
