<script setup lang="ts">
/** Sound, music, vibration, auto-collect, language, and erasing progress. */
import type { Settings } from '~/stores/progress'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ change: [key: keyof Settings, value: boolean] }>()
const { t } = useI18n()
const progress = useProgressStore()
const confirmReset = ref(false)

const toggles = computed(() => ([
  { key: 'sound', icon: 'i-lucide-volume-2', label: t('settings.sound') },
  { key: 'music', icon: 'i-lucide-music', label: t('settings.music') },
  { key: 'haptics', icon: 'i-lucide-vibrate', label: t('settings.haptics') },
  { key: 'hd', icon: 'i-lucide-sparkles', label: t('settings.hd') },
] as const))

function set(key: keyof Settings, value: boolean) {
  progress.setSetting(key, value)
  emit('change', key, value)
}

function reset() {
  progress.reset()
  confirmReset.value = false
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="t('settings.title')"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <label
            v-for="toggle in toggles"
            :key="toggle.key"
            class="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-moss-800/60"
          >
            <UIcon
              :name="toggle.icon"
              class="size-5 text-leaf-300"
            />
            <span class="flex-1 font-medium">{{ toggle.label }}</span>
            <USwitch
              :model-value="progress.settings[toggle.key]"
              size="lg"
              @update:model-value="(v: boolean) => set(toggle.key, v)"
            />
          </label>
        </div>
        <div class="flex items-center justify-between gap-3 px-3">
          <span class="flex items-center gap-3 font-medium">
            <UIcon
              name="i-lucide-languages"
              class="size-5 text-leaf-300"
            />
            {{ t('settings.language') }}
          </span>
          <LanguageSwitcher />
        </div>
        <p class="px-3 text-sm text-muted">
          {{ t('settings.privacy') }}
        </p>
        <div class="border-t border-moss-700 px-3 pt-4">
          <UButton
            v-if="!confirmReset"
            :label="t('settings.reset')"
            icon="i-lucide-trash-2"
            color="error"
            variant="soft"
            @click="confirmReset = true"
          />
          <div
            v-else
            class="flex flex-col gap-3"
          >
            <p class="text-sm">
              {{ t('settings.resetConfirm') }}
            </p>
            <div class="flex gap-2">
              <UButton
                :label="t('settings.resetDo')"
                color="error"
                @click="reset"
              />
              <UButton
                :label="t('settings.cancel')"
                color="neutral"
                variant="subtle"
                @click="confirmReset = false"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
