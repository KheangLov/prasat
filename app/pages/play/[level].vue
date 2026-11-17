<script setup lang="ts">
/** One level (see components/game/RunScreen.vue). */
const route = useRoute()
const n = computed(() => Number(route.params.level) || 1)
</script>

<template>
  <GameRunScreen :n="n" />
</template>
