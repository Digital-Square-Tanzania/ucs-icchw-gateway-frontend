<template>
  <section class="flex flex-col gap-6">
    <div v-if="visibleSyncItems.length">
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-3">Data sync</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        DHIS2 users and OpenMRS locations.
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="item in visibleSyncItems"
          :key="item.path"
          class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ item.title }}</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ item.description }}</p>
          <p class="mt-2 text-xs text-gray-500">Last sync: {{ lastSynced[item.path] || 'Never' }}</p>
          <button
            type="button"
            :disabled="isSyncing(item.path)"
            class="mt-4 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60"
            @click="runDashboardSync(item.path)">
            {{ isSyncing(item.path) ? 'Syncing…' : item.actionLabel }}
          </button>
          <p v-if="jobs[item.path]?.message" class="mt-2 text-xs" :class="syncMessageClass(item.path)">
            {{ jobs[item.path].message }}
          </p>
          <div
            v-if="jobs[item.path] && (isSyncing(item.path) || jobs[item.path].logs.length)"
            class="mt-3 rounded-lg border border-ucs-200 dark:border-ucs-800 bg-ucs-50/80 dark:bg-ucs-950/40 p-3">
            <div class="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
              <span>{{ isSyncing(item.path) ? 'In progress' : jobs[item.path].status === 'synced' ? 'Finished' : 'Stopped' }}</span>
              <span>{{ Math.round(jobs[item.path].percent) }}%</span>
            </div>
            <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-ucs-800">
              <div
                class="h-full rounded-full bg-ucs-500 transition-all duration-300"
                :style="{ width: `${Math.min(100, Math.max(0, jobs[item.path].percent))}%` }" />
            </div>
            <pre
              :ref="(el) => setLogBox(item.path, el)"
              class="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.7rem] leading-relaxed text-gray-700 dark:text-gray-300">{{ logText(item.path) }}</pre>
          </div>
        </article>
      </div>
    </div>

    <div>
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-3">iCCHW records</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <TeamMemberSyncPanel />
        <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Remove orphaned local CHW records</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Local CHW rows with no OpenMRS team member.
          </p>
          <button
            type="button"
            :disabled="orphanStatus === 'running'"
            class="mt-4 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60"
            @click="runOrphanPurge">
            {{ orphanStatus === 'running' ? 'Running…' : 'Purge orphans' }}
          </button>
          <p v-if="orphanMessage" class="mt-2 text-xs" :class="orphanMessageClass">{{ orphanMessage }}</p>
        </article>
      </div>
    </div>

    <section v-if="auth.isUcsDeveloper" class="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-white dark:bg-ucs-900/40 p-5">
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">Advanced (developer)</h2>
      <p class="text-sm text-amber-700 dark:text-amber-300 mt-1 mb-4">Developer only.</p>
      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="tool in devTools"
          :key="tool.id"
          class="rounded-xl border border-amber-200/80 dark:border-amber-900/50 p-4">
          <h3 class="text-base font-semibold">{{ tool.title }}</h3>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ tool.description }}</p>
          <button
            type="button"
            :disabled="devStatus[tool.id] === 'running'"
            class="mt-3 rounded-lg border border-amber-600 px-4 py-2 text-sm"
            @click="runDevTool(tool)">
            {{ devStatus[tool.id] === 'running' ? 'Running…' : tool.actionLabel }}
          </button>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import { storeToRefs } from 'pinia'
import TeamMemberSyncPanel from '@/components/settings/TeamMemberSyncPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'

const auth = useAuthStore()
const syncStore = useSyncStore()
const toast = useToast()
const { lastSynced, jobs } = storeToRefs(syncStore)
const logBoxes = ref<Record<string, HTMLElement | null>>({})

const syncItems = [
  {
    path: 'dhis2' as const,
    title: 'DHIS2 user sync',
    description: 'Sync DHIS2 users into the local database.',
    actionLabel: 'Sync DHIS2',
    permission: 'dashboard:sync:dhis2',
  },
  {
    path: 'facilities' as const,
    title: 'OpenMRS location sync',
    description: 'Sync OpenMRS locations from the API.',
    actionLabel: 'Sync locations',
    permission: 'dashboard:sync:openmrs',
  },
]
const visibleSyncItems = computed(() => syncItems.filter((item) => auth.hasPermission(item.permission)))

const devStatus = reactive<Record<string, 'idle' | 'running' | 'success' | 'error'>>({})
const devMessages = reactive<Record<string, string>>({})
const orphanStatus = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const orphanMessage = ref('')

const devTools = [
  { id: 'hierarchy-refresh', title: 'Refresh location hierarchy', description: 'Rebuild materialized view.', actionLabel: 'Refresh', method: 'POST' as const, url: '/openmrs/location/hierarchy/refresh' },
  { id: 'location-sync', title: 'Sync locations (full)', description: 'Pull all locations from OpenMRS.', actionLabel: 'Run sync', method: 'GET' as const, url: '/openmrs/location/sync' },
]

const orphanMessageClass = computed(() =>
  orphanStatus.value === 'success' ? 'text-green-700' : orphanStatus.value === 'error' ? 'text-red-700' : 'text-gray-600',
)

function isSyncing(path: string) {
  return jobs.value[path]?.status === 'syncing'
}

function syncMessageClass(path: string) {
  const status = jobs.value[path]?.status
  if (status === 'synced') return 'text-green-700 dark:text-green-300'
  if (status === 'error') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
}

function logText(path: string) {
  return (jobs.value[path]?.logs ?? []).map((line) => line.message).join('\n')
}

function setLogBox(path: string, el: unknown) {
  logBoxes.value[path] = el instanceof HTMLElement ? el : null
}

async function runDashboardSync(path: 'dhis2' | 'facilities') {
  try {
    syncStore.initWebSocket()
    await syncStore.startSync(path)
    const job = jobs.value[path]
    if (job?.status === 'synced') {
      toast.add({ severity: 'success', summary: 'Sync complete', detail: job.message, life: 4000 })
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    toast.add({ severity: 'error', summary: 'Sync failed', detail: message, life: 5000 })
  }
}

async function runOrphanPurge() {
  orphanStatus.value = 'running'
  try {
    const response = await auth.apiClient.post<{ message?: string }>('/openmrs/teammember/purge-orphans', {})
    orphanStatus.value = 'success'
    orphanMessage.value = response.data?.message || 'Done.'
  } catch (e) {
    orphanStatus.value = 'error'
    orphanMessage.value = e instanceof Error ? e.message : String(e)
  }
}

async function runDevTool(tool: (typeof devTools)[0]) {
  devStatus[tool.id] = 'running'
  try {
    const client = auth.apiClient
    const res =
      tool.method === 'GET'
        ? await client.get<{ message?: string }>(tool.url)
        : await client.post<{ message?: string }>(tool.url, {})
    devStatus[tool.id] = 'success'
    devMessages[tool.id] = res.data?.message || 'OK'
  } catch (e) {
    devStatus[tool.id] = 'error'
    devMessages[tool.id] = e instanceof Error ? e.message : String(e)
  }
}

watch(
  () => visibleSyncItems.value.map((item) => jobs.value[item.path]?.logs.length ?? 0).join(','),
  async () => {
    await nextTick()
    for (const item of visibleSyncItems.value) {
      const box = logBoxes.value[item.path]
      if (box) box.scrollTop = box.scrollHeight
    }
  },
)
</script>
