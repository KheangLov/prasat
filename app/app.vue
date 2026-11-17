<script setup lang="ts">
import { LEVELS_PER_WORLD } from '#shared/game'

const { locale, t } = useI18n()
const { $pwa } = useNuxtApp()
const toast = useToast()
const route = useRoute()
// Inside the gaming gateway the page belongs to the gateway: no manifest or service worker.
const { inGateway } = useGateway()
const progress = useProgressStore()
// The 3D temple behind the menus rests while a level is being played (one 3D scene at a time).
const playing = useState('playing', () => false)
const dioramaWorld = computed(() => {
  const n = Number(String(route.params.level ?? '')) || progress.unlocked
  return Math.min(5, Math.floor((n - 1) / LEVELS_PER_WORLD))
})

useHead({
  htmlAttrs: { lang: locale },
  title: () => t('app.title'),
})

onMounted(() => progress.load())

// Once the app has been saved for offline use, say so (first install only).
watch(() => $pwa?.offlineReady, (ready) => {
  if (ready) toast.add({ title: t('pwa.offlineReady'), icon: 'i-lucide-wifi-off', color: 'success' })
})

// A new version is applied on the home or level screens, never in the middle of a level.
watch(() => [$pwa?.needRefresh, route.path] as const, ([needRefresh, path]) => {
  if (needRefresh && !path.startsWith('/play') && path !== '/endless') void $pwa?.updateServiceWorker(true)
}, { immediate: true })
</script>

<template>
  <UApp :toaster="{ position: 'top-center' }">
    <NuxtPwaManifest v-if="!inGateway" />
    <NuxtRouteAnnouncer />
    <AppBackdrop />
    <ClientOnly>
      <TowerDiorama
        v-if="!playing"
        :world="dioramaWorld"
      />
    </ClientOnly>
    <NuxtPage />
  </UApp>
</template>
