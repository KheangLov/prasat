<script setup lang="ts">
/** Before a level: the temple, how tall to build, how wide the stone is, and how it slides. */
import { motion } from 'motion-v'
import { WORLDS, levelLabel, type LevelDef } from '#shared/game'

const props = defineProps<{ level: LevelDef }>()
const emit = defineEmits<{ start: [], back: [] }>()
const { locale, t } = useI18n()
const progress = useProgressStore()
const reduced = useReducedMotion()

const n = (value: number) => localNumber(value, locale.value)
const world = computed(() => WORLDS[props.level.world]!)
const label = computed(() => localDigits(levelLabel(props.level.n), locale.value))
const best = computed(() => progress.stars[props.level.n] ?? 0)
const tips = computed(() => {
  const list = ['perfect']
  if (props.level.wind) list.unshift('wind')
  else if (props.level.speed[1] > 4.5) list.unshift('fast')
  if (props.level.index % 5 === 4) list.unshift('tall')
  return list.slice(0, 2)
})

const pop = (delay: number) => reduced.value
  ? {}
  : { initial: { opacity: 0, y: 16, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: 'spring' as const, stiffness: 240, damping: 20, delay } }
</script>

<template>
  <div class="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-3 p-[calc(0.75rem+var(--safe-top))_calc(1rem+var(--safe-right))_calc(1rem+var(--safe-bottom))_calc(1rem+var(--safe-left))]">
    <motion.header
      v-bind="pop(0)"
      class="flex items-center gap-3"
    >
      <button
        type="button"
        class="btn-icon"
        :aria-label="t('map.back')"
        @click="emit('back')"
      >
        <UIcon
          name="i-lucide-arrow-left"
          class="size-5"
        />
      </button>
      <div class="me-auto">
        <p class="text-xs font-semibold text-moss-300">
          {{ t(`worlds.${world.id}.name`) }}
        </p>
        <h1 class="text-glow font-display text-3xl leading-tight">
          {{ t('map.level', { label }) }}
        </h1>
      </div>
      <StarRow
        :count="best"
        size="size-5"
        :label="t('map.stars', { n: n(best) })"
      />
    </motion.header>

    <div class="grid gap-3 sm:grid-cols-2 landscape:grid-cols-2">
      <motion.section
        v-bind="pop(0.05)"
        class="glass flex flex-col gap-3 p-4"
      >
        <h2 class="font-display text-xl text-sun-100">
          {{ t('briefing.mission') }}
        </h2>
        <ul class="flex flex-col gap-2">
          <li class="flex items-center gap-3 rounded-xl bg-[#fff7e0] p-2.5 text-[#4a2e16] shadow-[0_3px_0_#2e1a0a]">
            <ModelIcon
              name="stone"
              class="size-6 shrink-0"
            />
            <span class="font-semibold leading-tight">{{ t('briefing.floors', { n: n(props.level.floors) }) }}</span>
          </li>
          <li
            v-if="props.level.wind"
            class="flex items-center gap-3 rounded-xl bg-[#fff7e0] p-2.5 text-[#4a2e16] shadow-[0_3px_0_#2e1a0a]"
          >
            <UIcon
              name="i-lucide-wind"
              class="size-6 shrink-0 text-sun-700"
            />
            <span class="font-semibold leading-tight">{{ t('briefing.wind') }}</span>
          </li>
        </ul>
        <div class="flex flex-wrap gap-2 text-sm">
          <span class="chip text-moss-200">
            <StarRow
              :count="3"
              size="size-3.5"
            />{{ t('briefing.keep', { n: n(50) }) }}
          </span>
          <span class="chip text-moss-200">
            <StarRow
              :count="2"
              size="size-3.5"
            />{{ t('briefing.keep', { n: n(22) }) }}
          </span>
        </div>
      </motion.section>

      <motion.section
        v-bind="pop(0.1)"
        class="glass flex flex-col gap-3 p-4"
      >
        <h2 class="font-display text-xl text-leaf-200">
          {{ t('briefing.tips') }}
        </h2>
        <p
          v-for="tip in tips"
          :key="tip"
          class="flex items-start gap-2 text-sm leading-relaxed text-moss-100"
        >
          <UIcon
            :name="tip === 'wind' ? 'i-lucide-wind' : tip === 'tall' ? 'i-lucide-arrow-up-to-line' : tip === 'fast' ? 'i-lucide-gauge' : 'i-lucide-sparkles'"
            class="mt-0.5 size-5 shrink-0 text-sun-300"
          />
          {{ t(`tips.${tip}`) }}
        </p>
      </motion.section>
    </div>

    <motion.div
      v-bind="pop(0.15)"
      class="mt-auto flex justify-center pt-2"
    >
      <button
        type="button"
        class="btn-game lg"
        autofocus
        @click="emit('start')"
      >
        <UIcon
          name="i-lucide-play"
          class="size-7"
        />
        {{ t('briefing.start') }}
      </button>
    </motion.div>
  </div>
</template>
