<template>
  <PageTitle
    heading="Settings"
    subtext="Council operations, activations, recovery, and maintenance — scoped by your permissions" />

  <div v-if="!auth.hasAnySettingsAccess" class="rounded-xl border border-gray-200 dark:border-ucs-800 p-6 bg-white dark:bg-ucs-900/40">
    <p class="text-sm text-gray-600 dark:text-gray-300">You do not have access to any Settings tabs. Contact an administrator.</p>
  </div>

  <template v-else>
    <nav class="mb-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-ucs-800 pb-2">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors"
        :class="
          activeTab === tab.id
            ? 'border-ucs-500 text-ucs-700 dark:text-ucs-100 bg-ucs-50/80 dark:bg-ucs-900/60'
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-ucs-600'
        "
        @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </nav>

    <SettingsActivationsTab v-if="activeTab === 'activations'" />
    <SettingsLocationRecoveryTab v-else-if="activeTab === 'location-recovery'" />
    <SettingsMaintenanceTab v-else-if="activeTab === 'maintenance'" />
    <SettingsRbacTab v-else-if="activeTab === 'rbac'" />
  </template>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageTitle from '@/components/layout/PageTitle.vue'
import { useAuthStore } from '@/stores/auth'
import { visibleSettingsTabs, type SettingsTabId } from '@/utils/settingsTabPermissions'
import SettingsActivationsTab from '@/views/settings/SettingsActivationsTab.vue'
import SettingsLocationRecoveryTab from '@/views/settings/SettingsLocationRecoveryTab.vue'
import SettingsMaintenanceTab from '@/views/settings/SettingsMaintenanceTab.vue'
import SettingsRbacTab from '@/views/settings/SettingsRbacTab.vue'

const TAB_LABELS: Record<SettingsTabId, string> = {
  activations: 'Activations',
  'location-recovery': 'HRHIS Location Recovery',
  maintenance: 'Maintenance',
  rbac: 'Permissions & Menus',
}

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const tabs = computed(() =>
  visibleSettingsTabs(auth.permissions, auth.userRole).map((id) => ({ id, label: TAB_LABELS[id] })),
)

const activeTab = ref<SettingsTabId>('activations')

watch(
  tabs,
  (list) => {
    if (!list.length) return
    const q = String(route.query.tab || '')
    if (list.some((t) => t.id === q)) activeTab.value = q as SettingsTabId
    else if (!list.some((t) => t.id === activeTab.value)) activeTab.value = list[0].id
  },
  { immediate: true },
)

watch(activeTab, (tab) => {
  if (route.query.tab !== tab) router.replace({ query: { ...route.query, tab } })
})
</script>
