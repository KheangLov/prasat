<script setup lang="ts">
import { AnimatePresence, motion } from 'motion-v'
import { LEVELS_PER_WORLD, STORY, WORLDS, getLevel, levelLabel } from '#shared/game'

const { locale, t } = useI18n()
const progress = useProgressStore()
const reduced = useReducedMotion()
const router = useRouter()
const audio = useUiSound()

const n = (value: number) => localNumber(value, locale.value)
const label = (level: number) => localDigits(levelLabel(level), locale.value)

/** The world shown: the one you're playing in, until you pick another. */
const picked = ref<number | null>(null)
const world = computed(() => picked.value ?? Math.floor((progress.unlocked - 1) / LEVELS_PER_WORLD))
const worldOpen = (w: number) => progress.isUnlocked(w * LEVELS_PER_WORLD + 1)

const levels = computed(() => Array.from({ length: LEVELS_PER_WORLD }, (_, i) => {
  const num = world.value * LEVELS_PER_WORLD + i + 1
  const def = getLevel(num)
  const unlocked = progress.isUnlocked(num)
  const state = !unlocked ? 'locked' : num === progress.unlocked && !progress.stars[num] ? 'current' : 'open'
  const kind = def.index === LEVELS_PER_WORLD - 1 ? 'festival' : def.index % 5 === 4 ? 'tall' : def.wind ? 'wind' : 'normal'
  return { num, kind, state, stars: progress.stars[num] ?? 0 }
}))

const kindIcon: Record<string, string> = {
  festival: 'i-lucide-crown',
  tall: 'i-lucide-arrow-up-to-line',
  wind: 'i-lucide-wind',
}

function pickWorld(w: number) {
  if (!worldOpen(w)) {
    audio.ui('nope')
    return
  }
  audio.ui('page')
  picked.value = w
}

function open(level: { num: number, state: string }) {
  if (level.state === 'locked') {
    audio.ui('nope')
    return
  }
  audio.ui('tap')
  void router.push(`/play/${level.num}`)
}

const storyFor = computed(() => WORLDS[world.value]!.id)
const storyOpen = ref<'intro' | 'outro' | null>(null)
const outroSeen = computed(() => STORY[storyFor.value].outro.length > 0 && progress.seen.includes(`${storyFor.value}-outro`))
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-4 pb-[calc(1.5rem+var(--safe-bottom))] pe-[calc(1rem+var(--safe-right))] ps-[calc(1rem+var(--safe-left))] pt-[calc(1rem+var(--safe-top))]">
    <header class="flex items-center gap-3">
      <NuxtLink
        to="/"
        class="btn-icon"
        :aria-label="t('map.back')"
      >
        <UIcon
          name="i-lucide-arrow-left"
          class="size-5"
        />
      </NuxtLink>
      <h1 class="text-glow font-display text-4xl leading-tight">
        {{ t('map.title') }}
      </h1>
      <span
        v-if="progress.loaded"
        class="chip ms-auto text-sun-200"
      >
        <StarIcon
          on
          class="size-4"
        />
        {{ n(progress.totalStars) }}
      </span>
    </header>

    <!-- Worlds: a row of cards you can swipe through. -->
    <nav
      class="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]"
      :aria-label="t('map.title')"
    >
      <button
        v-for="(w, i) in WORLDS"
        :key="w.id"
        type="button"
        class="relative flex min-w-44 snap-start flex-col items-start gap-1 overflow-hidden rounded-2xl p-3 text-start transition-transform active:scale-95"
        :class="i === world ? 'ring-3 ring-sun-300' : 'opacity-90'"
        :style="{ background: `linear-gradient(140deg, ${w.accent.from}, ${w.accent.to})` }"
        :aria-pressed="i === world"
        @click="pickWorld(i)"
      >
        <span class="text-xs font-semibold text-white/80">{{ t('map.world', { n: n(i + 1) }) }}</span>
        <span class="font-display text-xl leading-tight text-white drop-shadow">{{ t(`worlds.${w.id}.name`) }}</span>
        <span
          v-if="worldOpen(i)"
          class="flex items-center gap-1 text-sm font-semibold text-white"
        >
          <StarIcon
            on
            class="size-4"
          />
          {{ n(progress.worldStars(i)) }}/{{ n(LEVELS_PER_WORLD * 3) }}
        </span>
        <span
          v-else
          class="flex items-center gap-1 text-sm font-semibold text-white/80"
        >
          <UIcon
            name="i-lucide-lock"
            class="size-4"
          />
          {{ t('map.worldLocked', { n: n(i) }) }}
        </span>
      </button>
    </nav>

    <AnimatePresence mode="wait">
      <motion.section
        :key="world"
        :initial="reduced ? false : { opacity: 0, x: 40 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="reduced ? undefined : { opacity: 0, x: -40 }"
        :transition="{ duration: 0.22 }"
        class="glass flex flex-col gap-4 p-4"
      >
        <div class="flex flex-wrap items-center gap-3">
          <div class="me-auto">
            <h2 class="font-display text-2xl leading-tight text-leaf-100">
              {{ t(`worlds.${WORLDS[world]!.id}.name`) }}
            </h2>
            <p class="text-sm text-muted">
              {{ t(`worlds.${WORLDS[world]!.id}.blurb`) }}
            </p>
          </div>
          <UButton
            v-if="worldOpen(world)"
            :label="t('map.story')"
            icon="i-lucide-book-open"
            color="neutral"
            variant="subtle"
            @click="storyOpen = outroSeen ? 'outro' : 'intro'"
          />
        </div>

        <ol class="grid grid-cols-5 gap-3 sm:gap-4">
          <motion.li
            v-for="(level, i) in levels"
            :key="level.num"
            :initial="reduced ? false : { opacity: 0, scale: 0.5, y: 12 }"
            :animate="{ opacity: 1, scale: 1, y: 0 }"
            :transition="{ type: 'spring', stiffness: 320, damping: 20, delay: i * 0.025 }"
            class="flex flex-col items-center gap-1"
          >
            <button
              type="button"
              class="level-node w-full max-w-20"
              :data-state="level.state"
              :data-kind="level.kind"
              :aria-label="`${t('map.level', { label: label(level.num) })}${level.state === 'locked' ? `, ${t('map.locked')}` : level.stars ? `, ${t('map.stars', { n: n(level.stars) })}` : ''}`"
              @click="open(level)"
            >
              <UIcon
                v-if="level.state === 'locked'"
                name="i-lucide-lock"
                class="size-5"
              />
              <template v-else>
                <span
                  v-if="kindIcon[level.kind]"
                  class="absolute -end-2 -top-2 flex size-7 items-center justify-center rounded-full bg-moss-900 shadow ring-2 ring-moss-700"
                >
                  <UIcon
                    :name="kindIcon[level.kind]!"
                    class="size-4 text-sun-300"
                  />
                </span>
                <span class="text-2xl leading-none sm:text-3xl">{{ n(level.num - world * LEVELS_PER_WORLD) }}</span>
              </template>
            </button>
            <StarRow
              :count="level.stars"
              size="size-3.5 sm:size-4"
            />
          </motion.li>
        </ol>
      </motion.section>
    </AnimatePresence>

    <StoryScene
      v-if="storyOpen"
      :world="storyFor"
      :part="storyOpen"
      @done="storyOpen = null"
    />
  </main>
</template>
