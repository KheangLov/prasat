<script setup lang="ts">
/**
 * A story scene: one line at a time, with the speaker's portrait sliding in (Sophal from the left,
 * master Prom from the right). Tap anywhere, or press Enter or Space, for the next line.
 */
import { AnimatePresence, motion } from 'motion-v'
import { STORY, WORLDS, type WorldId } from '#shared/game'

const props = defineProps<{ world: WorldId, part: 'intro' | 'outro' }>()
const emit = defineEmits<{ done: [] }>()
const { locale, t } = useI18n()
const progress = useProgressStore()
const reduced = useReducedMotion()
const audio = useUiSound()

const lines = computed(() => STORY[props.world][props.part])
const index = ref(0)
const speaker = computed(() => lines.value[index.value]!)
const fromRight = computed(() => speaker.value === 'prom')
const last = computed(() => index.value >= lines.value.length - 1)
const worldNumber = computed(() => WORLDS.findIndex(w => w.id === props.world) + 1)
const nextButton = ref<HTMLButtonElement | null>(null)

function next() {
  audio.ui('page')
  if (last.value) finish()
  else index.value++
}
function finish() {
  progress.markSeen(`${props.world}-${props.part}`)
  emit('done')
}
function onKey(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    next()
  }
  else if (event.key === 'Escape') finish()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  nextButton.value?.focus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <motion.div
    :initial="reduced ? false : { opacity: 0 }"
    :animate="{ opacity: 1 }"
    class="fixed inset-0 z-50 flex flex-col bg-moss-950/80 backdrop-blur-md"
    role="dialog"
    aria-modal="true"
    :aria-label="t(`worlds.${props.world}.name`)"
    @click="next"
  >
    <div class="flex items-center justify-between gap-3 px-[calc(1rem+var(--safe-left))] pt-[calc(1rem+var(--safe-top))]">
      <p class="chip text-leaf-200">
        <UIcon
          name="i-lucide-book-open"
          class="size-4"
        />
        {{ t('map.world', { n: localNumber(worldNumber, locale) }) }} · {{ t(`worlds.${props.world}.name`) }}
      </p>
      <UButton
        :label="t('story.skip')"
        trailing-icon="i-lucide-skip-forward"
        color="neutral"
        variant="subtle"
        @click.stop="finish"
      />
    </div>

    <div class="relative mx-auto flex w-full max-w-4xl flex-1 items-end px-4 pb-[calc(1.5rem+var(--safe-bottom))]">
      <AnimatePresence mode="wait">
        <motion.div
          :key="index"
          :initial="reduced ? false : { opacity: 0, x: fromRight ? 80 : -80 }"
          :animate="{ opacity: 1, x: 0 }"
          :exit="reduced ? undefined : { opacity: 0, y: -10 }"
          :transition="{ type: 'spring', stiffness: 260, damping: 24 }"
          class="flex w-full items-end gap-3 sm:gap-5"
          :class="fromRight ? 'flex-row-reverse' : ''"
        >
          <motion.div
            :initial="reduced ? false : { scale: 0.7, rotate: fromRight ? 8 : -8 }"
            :animate="{ scale: 1, rotate: 0 }"
            :transition="{ type: 'spring', stiffness: 300, damping: 12 }"
            class="shrink-0 rounded-3xl p-2 shadow-2xl"
            :class="fromRight ? 'bg-gradient-to-b from-[#7a3a90] to-[#2a1033]' : 'bg-gradient-to-b from-leaf-400 to-leaf-700'"
          >
            <ModelIcon
              :name="speaker"
              class="size-24 sm:size-36 landscape:max-lg:size-24"
            />
          </motion.div>
          <div
            class="glass relative mb-4 flex-1 p-4 sm:p-6"
            :class="fromRight ? 'border-[#ff4d6d]/40' : ''"
          >
            <p
              class="mb-1 font-display text-xl leading-tight"
              :class="fromRight ? 'text-[#ff9db0]' : 'text-sun-300'"
            >
              {{ t(`story.names.${speaker}`) }}
            </p>
            <p class="text-lg leading-relaxed text-moss-50 sm:text-xl">
              {{ t(`story.${props.world}.${props.part}.${index}`) }}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>

    <div class="flex items-center justify-between gap-3 px-[calc(1rem+var(--safe-left))] pb-[calc(1rem+var(--safe-bottom))]">
      <div
        class="flex gap-1.5"
        aria-hidden="true"
      >
        <span
          v-for="(_, i) in lines"
          :key="i"
          class="h-2 rounded-full transition-all"
          :class="i === index ? 'w-6 bg-sun-300' : 'w-2 bg-moss-500'"
        />
      </div>
      <button
        ref="nextButton"
        type="button"
        class="btn-game"
        :class="last ? 'sun' : ''"
        @click.stop="next"
      >
        {{ last ? t('story.done') : t('story.next') }}
        <UIcon
          :name="last ? 'i-lucide-tractor' : 'i-lucide-chevron-right'"
          class="size-5"
        />
      </button>
    </div>
  </motion.div>
</template>
