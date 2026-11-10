<template>
  <div
    class="relative overflow-hidden rounded-2xl border border-ucs-200/90 dark:border-ucs-600/50 bg-gradient-to-br from-ucs-50 via-white to-sky-50/90 dark:from-ucs-950 dark:via-ucs-900/90 dark:to-ucs-800/80 px-6 py-8 shadow-md">
    <div
      class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-ucs-400/10 blur-2xl"
      aria-hidden="true" />
    <div
      class="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl"
      aria-hidden="true" />

    <p class="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ucs-600 dark:text-ucs-300">
      Your council scope
    </p>
    <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
      {{ subtitle }}
    </p>

    <div
      v-if="hasScope"
      class="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Region</span>
        <span class="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ region }}
        </span>
      </div>
      <span class="hidden sm:inline text-3xl font-light text-ucs-400 select-none" aria-hidden="true">›</span>
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">District</span>
        <span class="text-2xl sm:text-3xl font-bold tracking-tight text-ucs-800 dark:text-ucs-100">
          {{ district }}
        </span>
      </div>
      <span class="hidden sm:inline text-3xl font-light text-ucs-400 select-none" aria-hidden="true">›</span>
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Council</span>
        <span
          class="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-ucs-600 to-sky-600 bg-clip-text text-transparent dark:from-ucs-300 dark:to-sky-300">
          {{ council }}
        </span>
      </div>
    </div>

    <p v-else class="mt-4 text-sm text-amber-800 dark:text-amber-200 rounded-lg bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
      No council is assigned to your account. Ask an MOH admin to set Region, District, and Council on your manager
      user profile.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    region?: string
    district?: string
    council?: string
    subtitle?: string
  }>(),
  {
    region: '',
    district: '',
    council: '',
    subtitle: 'All metrics and actions on this page apply to this location only.',
  },
)

const hasScope = computed(() => Boolean(props.council?.trim()))
</script>
