<template>
  <section>
    <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-2">HRHIS location recovery</h2>
    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
      Scan failed HRHIS registrations and retry location lookup / recovery for your councils.
    </p>
    <HrhisLocationRecoveryPanel />
  </section>
</template>

<script setup lang="ts">
import HrhisLocationRecoveryPanel from '@/components/settings/HrhisLocationRecoveryPanel.vue'
</script>
