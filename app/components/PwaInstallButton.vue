<script setup lang="ts">
/**
 * "Install app": the browser's install prompt where available (Android, desktop Chrome/Edge),
 * or Add to Home Screen steps on iPhone and iPad, where there's no prompt.
 */
const { $pwa } = useNuxtApp()
const { t } = useI18n()

const iosHelpOpen = ref(false)
const isIos = ref(false)
const standalone = ref(true)

onMounted(() => {
  isIos.value = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  standalone.value = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
})

const canPrompt = computed(() => !!$pwa?.showInstallPrompt && !$pwa?.isPWAInstalled)
const showIosHelp = computed(() => isIos.value && !standalone.value)

async function install() {
  if (canPrompt.value) await $pwa?.install()
  else iosHelpOpen.value = true
}
</script>

<template>
  <UButton
    v-if="canPrompt || showIosHelp"
    :label="t('pwa.install')"
    icon="i-lucide-download"
    size="sm"
    variant="soft"
    @click="install"
  />
  <UModal
    v-model:open="iosHelpOpen"
    :title="t('pwa.iosTitle')"
  >
    <template #body>
      <ol class="list-decimal space-y-2 ps-5">
        <li>
          {{ t('pwa.iosStep1') }}
          <UIcon
            name="i-lucide-share"
            class="inline size-4 align-middle"
          />
        </li>
        <li>{{ t('pwa.iosStep2') }}</li>
      </ol>
    </template>
  </UModal>
</template>
