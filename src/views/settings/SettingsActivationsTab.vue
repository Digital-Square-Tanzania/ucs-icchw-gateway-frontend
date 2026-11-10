<template>
  <div class="flex flex-col gap-5">
    <div v-if="councilScope" class="rounded-lg border border-ucs-200 dark:border-ucs-700 bg-ucs-50/60 dark:bg-ucs-950/40 px-4 py-3 text-sm">
      Council scope: <strong>{{ councilScope.council }}</strong>
      <span class="text-gray-500 text-xs ml-2">{{ councilScope.region }} · {{ councilScope.district }}</span>
    </div>
    <ActivationEmailPanel
      :council-locked="!!councilScope"
      :fixed-council="councilScope"
      :show-scheduler="auth.hasPermission('activations:schedule')" />
    <ActivationCategoryExplorer :query-suffix="councilQuery" :council-locked="!!councilScope" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ActivationEmailPanel from '@/components/settings/ActivationEmailPanel.vue'
import ActivationCategoryExplorer from '@/components/settings/ActivationCategoryExplorer.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const councilScope = computed(() => auth.councilScope)

const councilQuery = computed(() => {
  const s = councilScope.value
  if (!s) return ''
  return `region=${encodeURIComponent(s.region)}&district=${encodeURIComponent(s.district)}&council=${encodeURIComponent(s.council)}`
})
</script>
