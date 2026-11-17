<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()
const saved = useCookie(LOCALE_COOKIE, { maxAge: 60 * 60 * 24 * 365 })

const items = computed(() => locales.value.map(l => ({ label: l.name ?? l.code, value: l.code })))

async function onChange(code: typeof locale.value) {
  await setLocale(code)
  saved.value = code
}
</script>

<template>
  <USelect
    :model-value="locale"
    :items="items"
    :aria-label="t('settings.language')"
    icon="i-lucide-languages"
    class="w-32"
    @update:model-value="onChange"
  />
</template>
