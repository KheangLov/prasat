<script setup lang="ts">
/**
 * A picture of one of the game's 3D models (rendered once by app/game/three/icons.ts and kept for
 * the visit). Before it's ready, on the server, or without WebGL, the space stays empty.
 */
import { ensureIcons, iconUrl } from '~/game/three/icons'
import type { ModelName } from '~/game/three/models'

const props = defineProps<{ name: ModelName }>()
const src = ref<string | null>(null)

async function load() {
  const name = props.name as ModelName
  src.value = iconUrl(name)
  if (src.value) return
  await ensureIcons([name])
  if (props.name === name) src.value = iconUrl(name)
}
onMounted(load)
watch(() => props.name, load)
</script>

<template>
  <img
    v-if="src"
    :src="src"
    alt=""
    class="inline-block object-contain drop-shadow-[0_3px_3px_rgb(0_0_0/0.25)]"
    draggable="false"
  >
  <span
    v-else
    class="inline-block"
    aria-hidden="true"
  />
</template>
