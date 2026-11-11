<template>
  <div class="flex flex-col gap-5">
    <div v-if="councilScope" class="rounded-lg border border-ucs-200 dark:border-ucs-700 bg-ucs-50/60 dark:bg-ucs-950/40 px-4 py-3 text-sm">
      Council scope: <strong>{{ councilScope.council }}</strong>
      <span class="text-gray-500 text-xs ml-2">{{ councilScope.region }} · {{ councilScope.district }}</span>
    </div>
    <ActivationEmailPanel
      ref="activationPanelRef"
      :council-locked="!!councilScope"
      :fixed-council="councilScope"
      :show-scheduler="auth.hasPermission('activations:schedule')"
      @location-change="onResendLocation" />
    <ActivationCategoryExplorer
      :query-suffix="categoryQuery"
      :scope-label="categoryScopeLabel"
      :council-locked="!!councilScope"
      @activation-changed="onActivationChanged" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import ActivationEmailPanel from '@/components/settings/ActivationEmailPanel.vue'
import ActivationCategoryExplorer from '@/components/settings/ActivationCategoryExplorer.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const activationPanelRef = ref<InstanceType<typeof ActivationEmailPanel> | null>(null)
const resendLocation = ref<{ region: string; district: string; council: string } | null>(null)

function onActivationChanged() {
  void activationPanelRef.value?.loadStats()
}

function onResendLocation(filter: { region: string; district: string; council: string } | null) {
  resendLocation.value = filter
}

const councilScope = computed(() => auth.councilScope)

const activeLocation = computed(() => {
  const locked = councilScope.value
  if (locked?.council) return locked
  return resendLocation.value
})

const categoryQuery = computed(() => {
  const s = activeLocation.value
  if (!s?.council) return ''
  return `region=${encodeURIComponent(s.region)}&district=${encodeURIComponent(s.district)}&council=${encodeURIComponent(s.council)}`
})

const categoryScopeLabel = computed(() => activeLocation.value?.council ?? '')
</script>
