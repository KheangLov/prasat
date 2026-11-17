<script setup lang="ts">
/** Up to three stars; with `animate`, the earned ones pop in one after another. */
import { motion } from 'motion-v'

const props = withDefaults(defineProps<{ count: number, size?: string, animate?: boolean, label?: string }>(), { size: 'size-4', animate: false })
const reduced = useReducedMotion()
</script>

<template>
  <span
    class="inline-flex items-center gap-0.5"
    role="img"
    :aria-label="props.label"
  >
    <template
      v-for="i in 3"
      :key="i"
    >
      <motion.span
        v-if="props.animate && !reduced"
        :initial="{ scale: 0, rotate: -40, opacity: 0 }"
        :animate="{ scale: 1, rotate: 0, opacity: 1 }"
        :transition="{ type: 'spring', stiffness: 380, damping: 14, delay: 0.25 + i * 0.28 }"
        class="inline-flex"
      >
        <StarIcon
          :on="i <= props.count"
          :class="[props.size, i <= props.count ? 'drop-shadow-[0_0_8px_rgb(255_209_72/0.7)]' : '']"
        />
      </motion.span>
      <StarIcon
        v-else
        :on="i <= props.count"
        :class="props.size"
      />
    </template>
  </span>
</template>
