<template>
  <div
    class="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40"
    :class="fieldClass">
    <h3 class="text-[0.65rem] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ label }}</h3>
    <p class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100" :class="mono ? 'font-mono break-all text-xs' : ''">
      {{ displayValue }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  value?: string | null
  mono?: boolean
  fieldClass?: string
}>()

const fieldClass = computed(() => props.fieldClass || '')
const displayValue = computed(() => {
  const value = props.value
  if (value === null || value === undefined || value === '') return '—'
  return value
})
</script>
