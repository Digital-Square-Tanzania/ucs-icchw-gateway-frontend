<template>
  <section>
    <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-2">HRHIS location recovery</h2>
    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
      Scan failed HRHIS registrations and retry location lookup / recovery for your councils.
    </p>
    <HrhisLocationRecoveryPanel
      :council-locked="!!councilScope"
      :fixed-council="councilScope"
      :auto-scan-when-locked="true" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HrhisLocationRecoveryPanel from '@/components/settings/HrhisLocationRecoveryPanel.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const councilScope = computed(() => auth.councilScope)
</script>
