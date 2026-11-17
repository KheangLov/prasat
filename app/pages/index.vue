<script setup lang="ts">
import { motion } from 'motion-v'
import { TOTAL_LEVELS, levelLabel } from '#shared/game'

const { locale, t } = useI18n()
const gateway = useGateway()
const progress = useProgressStore()
const reduced = useReducedMotion()
const settingsOpen = ref(false)

const n = (value: number) => localNumber(value, locale.value)
const playLabel = computed(() => {
  if (!progress.loaded || progress.cleared === 0) return t('home.start')
  return t('home.continue', { level: localDigits(levelLabel(progress.unlocked), locale.value) })
})
</script>

<template>
  <main class="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-6 pb-[calc(1.5rem+var(--safe-bottom))] pe-[calc(1rem+var(--safe-right))] ps-[calc(1rem+var(--safe-left))] pt-[calc(1rem+var(--safe-top))]">
    <header class="flex items-center justify-end gap-2">
      <UButton
        v-if="gateway.inGateway"
        :label="t('home.allGames')"
        icon="i-lucide-layout-grid"
        color="neutral"
        variant="subtle"
        class="me-auto"
        @click="gateway.exit()"
      />
      <PwaInstallButton v-if="!gateway.inGateway" />
      <button
        type="button"
        class="btn-icon"
        :aria-label="t('home.settings')"
        @click="settingsOpen = true"
      >
        <UIcon
          name="i-lucide-settings"
          class="size-5"
        />
      </button>
    </header>

    <section class="flex flex-1 flex-col items-center justify-center gap-6 text-center landscape:max-lg:gap-3">
      <motion.div
        :initial="reduced ? false : { opacity: 0, y: 24, scale: 0.94 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ type: 'spring', stiffness: 160, damping: 16 }"
        class="flex flex-col items-center gap-1"
      >
        <p class="chip text-sun-200">
          <UIcon
            name="i-lucide-map-pin"
            class="size-4"
          />
          {{ t('app.subtitle') }}
        </p>
        <h1 class="text-glow font-display text-6xl leading-[1.15] sm:text-7xl landscape:max-lg:text-5xl">
          {{ t('app.title') }}
        </h1>
        <p class="max-w-md text-balance text-moss-100">
          {{ t('app.tagline') }}
        </p>
      </motion.div>

      <motion.div
        :initial="reduced ? false : { opacity: 0, y: 30 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ type: 'spring', stiffness: 180, damping: 18, delay: 0.3 }"
        class="flex w-full max-w-sm flex-col items-stretch gap-3 landscape:max-lg:max-w-2xl landscape:max-lg:flex-row landscape:max-lg:flex-wrap landscape:max-lg:justify-center"
      >
        <NuxtLink
          :to="`/play/${progress.unlocked}`"
          class="btn-game lg"
        >
          <UIcon
            name="i-lucide-play"
            class="size-7"
          />
          {{ playLabel }}
        </NuxtLink>
        <NuxtLink
          to="/endless"
          class="btn-game sun"
        >
          <UIcon
            name="i-lucide-infinity"
            class="size-6"
          />
          {{ t('home.endless') }}
        </NuxtLink>
        <div class="flex gap-3">
          <NuxtLink
            to="/map"
            class="btn-game ghost flex-1"
          >
            <UIcon
              name="i-lucide-map"
              class="size-5"
            />
            {{ t('home.levels') }}
          </NuxtLink>
        </div>
        <div
          v-if="progress.loaded"
          class="flex flex-wrap justify-center gap-2 text-sm"
        >
          <span class="chip text-sun-200">
            <StarIcon
              on
              class="size-4"
            />
            {{ t('home.stars', { n: n(progress.totalStars), total: n(TOTAL_LEVELS * 3) }) }}
          </span>
          <span
            v-if="progress.best.score"
            class="chip text-leaf-200"
          >
            <UIcon
              name="i-lucide-trophy"
              class="size-4"
            />
            {{ t('home.best', { n: n(progress.best.score) }) }}
          </span>
        </div>
      </motion.div>
    </section>

    <details class="glass group mx-auto w-full max-w-xl px-4 py-3 text-sm landscape:max-lg:hidden">
      <summary class="flex min-h-8 cursor-pointer list-none items-center justify-between font-medium">
        {{ t('home.howTitle') }}
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 transition group-open:rotate-180"
        />
      </summary>
      <ol class="mt-2 list-decimal space-y-1.5 ps-5 leading-relaxed text-muted">
        <li>{{ t('home.how1') }}</li>
        <li>{{ t('home.how2') }}</li>
        <li>{{ t('home.how3') }}</li>
      </ol>
    </details>

    <SettingsModal v-model:open="settingsOpen" />
  </main>
</template>
