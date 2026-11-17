<script setup lang="ts">
/**
 * The page background: a farm at dusk, with fireflies blinking and a few leaves drifting up.
 * Pure CSS animation on a handful of elements (cheap; off with reduced motion).
 */
const fireflies = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 41 + 7) % 100}%`,
  top: `${(i * 23 + 11) % 90}%`,
  delay: `${-(i * 0.7) % 3}s`,
  duration: `${2.4 + (i % 4) * 0.6}s`,
}))
const leaves = Array.from({ length: 6 }, (_, i) => ({
  left: `${(i * 29 + 13) % 100}%`,
  delay: `${-i * 4.3}s`,
  duration: `${22 + (i % 3) * 6}s`,
  dx: `${(i % 2 ? 1 : -1) * (30 + i * 8)}px`,
  rot: `${i * 47}deg`,
}))
</script>

<template>
  <div
    class="app-backdrop pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    aria-hidden="true"
  >
    <span
      v-for="(f, i) in fireflies"
      :key="`f${i}`"
      class="firefly absolute"
      :style="{ left: f.left, top: f.top, animationDelay: f.delay, animationDuration: f.duration }"
    />
    <span
      v-for="(l, i) in leaves"
      :key="`l${i}`"
      class="leaf absolute top-0"
      :style="{ 'left': l.left, 'animationDelay': l.delay, 'animationDuration': l.duration, '--dx': l.dx, '--r': l.rot }"
    />
    <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-leaf-950/60 to-transparent" />
  </div>
</template>

<style scoped>
.firefly {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fff3a6;
  box-shadow: 0 0 10px 3px rgb(255 230 120 / 0.6);
  animation: blink ease-in-out infinite;
}
.leaf {
  width: 14px;
  height: 8px;
  border-radius: 100% 0;
  background: linear-gradient(135deg, #97de69, #468d20);
  opacity: 0.35;
  animation: drift-up linear infinite;
  rotate: var(--r);
}
</style>
