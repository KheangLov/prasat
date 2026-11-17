<script setup lang="ts">
/** The end of a tower: a finished level's stars, a fallen stone, or endless mode's score. */
import { motion } from 'motion-v'
import { LEVELS_PER_WORLD, TOTAL_LEVELS, type Engine } from '#shared/game'

const props = defineProps<{ engine: Engine, record: boolean }>()
const emit = defineEmits<{ next: [], retry: [], levels: [] }>()
const { locale, t } = useI18n()
const reduced = useReducedMotion()
const mainButton = ref<HTMLButtonElement | null>(null)
const n = (value: number) => localNumber(value, locale.value)

const endless = computed(() => props.engine.endless)
const won = computed(() => props.engine.state === 'won')
const level = computed(() => props.engine.level)
const hasNext = computed(() => !endless.value && level.value.n < TOTAL_LEVELS)
const worldDone = computed(() => won.value && level.value.index === LEVELS_PER_WORLD - 1)
const title = computed(() => endless.value ? (props.record ? t('result.record') : t('result.endless')) : won.value ? t('result.won') : t('result.lost'))

onMounted(() => setTimeout(() => mainButton.value?.focus(), 400))
</script>

<template>
  <motion.div
    :initial="reduced ? false : { opacity: 0 }"
    :animate="{ opacity: 1 }"
    class="fixed inset-0 z-40 flex items-center justify-center bg-moss-950/70 p-4 backdrop-blur-sm"
    role="alertdialog"
    aria-modal="true"
    :aria-label="title"
  >
    <motion.div
      :initial="reduced ? false : { scale: 0.7, y: 40, opacity: 0 }"
      :animate="{ scale: 1, y: 0, opacity: 1 }"
      :transition="{ type: 'spring', stiffness: 260, damping: 18 }"
      class="glass flex w-full max-w-md flex-col items-center gap-3 p-6 text-center landscape:max-lg:max-w-2xl landscape:max-lg:flex-row landscape:max-lg:flex-wrap landscape:max-lg:justify-center landscape:max-lg:gap-x-6 landscape:max-lg:p-4"
    >
      <div class="flex flex-col items-center gap-2">
        <p
          v-if="worldDone"
          class="chip text-sun-200"
        >
          <UIcon
            name="i-lucide-trophy"
            class="size-4"
          />
          {{ level.n === TOTAL_LEVELS ? t('result.theEnd') : t('result.worldDone', { n: n(Math.ceil(level.n / LEVELS_PER_WORLD)) }) }}
        </p>
        <h2
          class="font-display text-4xl leading-tight"
          :class="won || endless ? 'text-glow' : 'text-berry'"
        >
          {{ title }}
        </h2>
        <StarRow
          v-if="won"
          :count="props.engine.stars"
          size="size-12"
          animate
          :label="t('map.stars', { n: n(props.engine.stars) })"
        />

        <p
          v-if="endless"
          class="font-display text-5xl text-sun-100"
        >
          {{ n(props.engine.score) }}
        </p>
      </div>

      <div class="flex flex-col items-center gap-3">
        <ul class="flex flex-wrap justify-center gap-2 text-sm">
          <li class="chip text-sun-200">
            <ModelIcon
              name="stone"
              class="size-5"
            />{{ endless ? n(props.engine.floors) : `${n(props.engine.floors)}/${n(level.floors)}` }}
          </li>
          <li class="chip text-moss-100">
            ✦ {{ t('result.perfects', { n: n(props.engine.perfects) }) }}
          </li>
          <li
            v-if="won"
            class="chip text-moss-100"
          >
            <UIcon
              name="i-lucide-square-dashed"
              class="size-4"
            />{{ n(Math.round(props.engine.kept * 100)) }}%
          </li>
        </ul>
        <p
          v-if="won && !endless && props.engine.stars < 3"
          class="text-xs text-muted"
        >
          {{ t('result.starsHint') }}
        </p>

        <div class="flex flex-wrap justify-center gap-2">
          <button
            v-if="won && hasNext"
            ref="mainButton"
            type="button"
            class="btn-game"
            @click="emit('next')"
          >
            {{ t('result.next') }}
            <UIcon
              name="i-lucide-chevron-right"
              class="size-5"
            />
          </button>
          <button
            :ref="(el) => { if (!(won && hasNext)) mainButton = el as HTMLButtonElement }"
            type="button"
            class="btn-game"
            :class="won && hasNext ? 'ghost' : 'sun'"
            @click="emit('retry')"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="size-5"
            />
            {{ won ? t('result.replay') : t('result.retry') }}
          </button>
          <button
            type="button"
            class="btn-game ghost"
            @click="emit('levels')"
          >
            <UIcon
              :name="endless ? 'i-lucide-house' : 'i-lucide-map'"
              class="size-5"
            />
            {{ endless ? t('pause.home') : t('result.levels') }}
          </button>
        </div>
      </div>
    </motion.div>
  </motion.div>
</template>
