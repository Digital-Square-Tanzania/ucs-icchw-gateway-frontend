<template>
  <PageTitle heading="Settings" subtext="Admin tools for activation emails, data sync, and developer operations" />

  <div class="flex flex-col gap-8">
    <!-- HRHIS registration activity -->
    <section>
      <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">HRHIS Registrations</h2>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Incoming HRHIS register requests from <code class="text-xs">api_logs</code>, with succeeded, open
            failed, and Settings recovery retries overlaid.
          </p>
        </div>
        <select
          v-model.number="hrhisDays"
          class="rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-3 py-1.5 text-sm text-gray-700 dark:text-ucs-200"
          @change="loadHrhisTimeseries">
          <option :value="7">Last 7 days</option>
          <option :value="30">Last 30 days</option>
          <option :value="60">Last 60 days</option>
          <option :value="90">Last 90 days</option>
        </select>
      </div>
      <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
        <div class="mb-4 flex flex-wrap gap-3 text-xs text-gray-700 dark:text-gray-300">
          <span class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
            Incoming: <strong>{{ hrhisTotals.incoming }}</strong>
          </span>
          <span class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
            Succeeded: <strong>{{ hrhisTotals.succeeded }}</strong>
          </span>
          <span class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
            Failed (open): <strong>{{ hrhisTotals.failed }}</strong>
          </span>
          <span class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
            Recovered: <strong>{{ hrhisTotals.recovered }}</strong>
          </span>
        </div>
        <p v-if="hrhisLoading" class="text-sm text-gray-500 dark:text-gray-400">Loading chart…</p>
        <p v-else-if="hrhisError" class="text-sm text-red-600 dark:text-red-400">{{ hrhisError }}</p>
        <HrhisRegisterChart v-else :buckets="hrhisBuckets" />
      </article>
    </section>

    <!-- Data Sync (top) -->
    <section>
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-3">Data Sync</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Pull the latest counts used on the dashboard. Sync jobs run in the background; status updates via WebSocket when
        complete.
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="item in syncItems"
          :key="item.path"
          class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ item.title }}</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ item.description }}</p>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Last sync: {{ lastSynced[item.path] || 'Never' }}
          </p>
          <button
            type="button"
            :disabled="syncStatus[item.path] === 'syncing'"
            class="mt-4 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            @click="runDashboardSync(item.path)">
            {{ syncStatus[item.path] === 'syncing' ? 'Syncing…' : item.actionLabel }}
          </button>
          <p v-if="syncMessages[item.path]" class="mt-2 text-xs" :class="syncMessageClass(item.path)">
            {{ syncMessages[item.path] }}
          </p>
        </article>
      </div>
    </section>

    <!-- Email & Activation (below sync, rendered inline) -->
    <section>
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">Email &amp; Activation</h2>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            CHW activation metrics, batch resends, council filters, and the nightly scheduler — all inline below.
          </p>
        </div>
        <a
          :href="activationUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-ucs-700 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-ucs-200 hover:bg-gray-100 dark:hover:bg-ucs-800 transition-colors">
          Legacy page
          <span aria-hidden="true">↗</span>
        </a>
      </div>
      <ActivationEmailPanel />
    </section>

    <!-- Maintenance -->
    <section>
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-1">Maintenance</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Clean up local records left behind when OpenMRS registration was rolled back, and recover HRHIS
        registrations that failed on location lookup.
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <article
          class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            Remove Orphaned Local CHW Records
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Scan <code class="text-xs">openmrs_team_members</code> and delete rows (plus related activations,
            username counters, and person attributes) whose OpenMRS team-member UUID no longer exists. Safe for
            retrying failed HRHIS registrations.
          </p>
          <button
            type="button"
            :disabled="orphanStatus === 'running'"
            class="mt-4 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            @click="runOrphanPurge">
            {{ orphanStatus === 'running' ? 'Scanning &amp; purging…' : 'Purge Orphaned Records' }}
          </button>
          <p v-if="orphanMessage" class="mt-2 text-xs" :class="orphanMessageClass">
            {{ orphanMessage }}
          </p>
          <ul
            v-if="orphanStats"
            class="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300 sm:grid-cols-4">
            <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
              Scanned: <strong>{{ orphanStats.scanned }}</strong>
            </li>
            <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
              Kept: <strong>{{ orphanStats.kept }}</strong>
            </li>
            <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
              Purged: <strong>{{ orphanStats.purged }}</strong>
            </li>
            <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
              Errors: <strong>{{ orphanStats.errors }}</strong>
            </li>
          </ul>
        </article>
      </div>

      <div class="mt-4">
        <HrhisLocationRecoveryPanel />
      </div>
    </section>

    <!-- Advanced (Developer only) -->
    <section v-if="auth.isUcsDeveloper">
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200 mb-1">Advanced</h2>
      <p class="text-sm text-amber-700 dark:text-amber-300 mb-4">
        UCS Developer only — location, team, and recovery maintenance. Use with care in production.
      </p>
      <div class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="tool in devTools"
          :key="tool.id"
          class="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white">{{ tool.title }}</h3>
            <span
              class="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Dev
            </span>
          </div>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{{ tool.description }}</p>
          <button
            type="button"
            :disabled="devStatus[tool.id] === 'running'"
            class="mt-4 rounded-lg border border-amber-600 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-950 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            @click="runDevTool(tool)">
            {{ devStatus[tool.id] === 'running' ? 'Running…' : tool.actionLabel }}
          </button>
          <p v-if="devMessages[tool.id]" class="mt-2 text-xs" :class="devMessageClass(tool.id)">
            {{ devMessages[tool.id] }}
          </p>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import PageTitle from '@/components/layout/PageTitle.vue'
import ActivationEmailPanel from '@/components/settings/ActivationEmailPanel.vue'
import HrhisRegisterChart, { type HrhisBucket } from '@/components/settings/HrhisRegisterChart.vue'
import HrhisLocationRecoveryPanel from '@/components/settings/HrhisLocationRecoveryPanel.vue'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { activationEmailControlUrl } from '@/utilities/backend-url'
import { storeToRefs } from 'pinia'

const auth = useAuthStore()
const syncStore = useSyncStore()
const toast = useToast()
const { syncStatus, lastSynced } = storeToRefs(syncStore)

const activationUrl = activationEmailControlUrl()

const hrhisDays = ref(30)
const hrhisBuckets = ref<HrhisBucket[]>([])
const hrhisTotals = reactive({ incoming: 0, succeeded: 0, failed: 0, recovered: 0 })
const hrhisLoading = ref(false)
const hrhisError = ref('')

async function loadHrhisTimeseries() {
  hrhisLoading.value = true
  hrhisError.value = ''
  try {
    const response = await auth.apiClient.get<{
      data?: {
        buckets?: HrhisBucket[]
        totals?: { incoming?: number; succeeded?: number; failed?: number; recovered?: number }
      }
    }>(`/dashboard/hrhis-register-timeseries?days=${hrhisDays.value}`)

    const data = response.data?.data
    hrhisBuckets.value = data?.buckets ?? []
    hrhisTotals.incoming = data?.totals?.incoming ?? 0
    hrhisTotals.succeeded = data?.totals?.succeeded ?? 0
    hrhisTotals.failed = data?.totals?.failed ?? 0
    hrhisTotals.recovered = data?.totals?.recovered ?? 0
  } catch (error: unknown) {
    hrhisBuckets.value = []
    hrhisTotals.incoming = 0
    hrhisTotals.succeeded = 0
    hrhisTotals.failed = 0
    hrhisTotals.recovered = 0
    hrhisError.value =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error instanceof Error ? error.message : 'Failed to load HRHIS registration chart.')
  } finally {
    hrhisLoading.value = false
  }
}

interface OrphanPurgeStats {
  scanned: number
  kept: number
  purged: number
  errors: number
  purgedSamples?: Array<{ nin?: string | null; openMrsUuid?: string | null; username?: string | null }>
  errorSamples?: Array<{ nin?: string | null; message?: string }>
}

const orphanStatus = ref<'idle' | 'running' | 'success' | 'error'>('idle')
const orphanMessage = ref('')
const orphanStats = ref<OrphanPurgeStats | null>(null)

const orphanMessageClass = computed(() => {
  if (orphanStatus.value === 'success') return 'text-green-700 dark:text-green-300'
  if (orphanStatus.value === 'error') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

const syncItems = [
  {
    path: 'dhis2',
    title: 'DHIS2 Users',
    description: 'Sync DHIS2 user records into the local database for dashboard reporting.',
    actionLabel: 'Sync DHIS2',
  },
  {
    path: 'facilities',
    title: 'OpenMRS Locations',
    description: 'Sync OpenMRS locations (facilities and related location data) from the OpenMRS API.',
    actionLabel: 'Sync OpenMRS Locations',
  },
] as const

type SyncPath = (typeof syncItems)[number]['path']

const syncMessages = reactive<Record<string, string>>({})

interface DevTool {
  id: string
  title: string
  description: string
  actionLabel: string
  method: 'GET' | 'POST'
  url: string
}

const devTools: DevTool[] = [
  {
    id: 'location-sync',
    title: 'Sync Locations (full)',
    description: 'Pull all locations from OpenMRS into Postgres (openmrs_location table).',
    actionLabel: 'Run Location Sync',
    method: 'GET',
    url: '/openmrs/location/sync',
  },
  {
    id: 'location-tags-sync',
    title: 'Sync Location Tags',
    description: 'Refresh OpenMRS location tag definitions in the local database.',
    actionLabel: 'Sync Location Tags',
    method: 'GET',
    url: '/openmrs/location/tags/sync',
  },
  {
    id: 'location-attr-sync',
    title: 'Sync Location Attribute Types',
    description: 'Refresh location attribute type metadata from OpenMRS.',
    actionLabel: 'Sync Attribute Types',
    method: 'GET',
    url: '/openmrs/location/attributetypes/sync',
  },
  {
    id: 'hierarchy-refresh',
    title: 'Refresh Location Hierarchy View',
    description: 'Rebuild the materialized view used for region/district/council filters.',
    actionLabel: 'Refresh Hierarchy',
    method: 'POST',
    url: '/openmrs/location/hierarchy/refresh',
  },
  {
    id: 'team-sync',
    title: 'Sync Teams',
    description: 'Sync OpenMRS team records into the local UCS database.',
    actionLabel: 'Sync Teams',
    method: 'GET',
    url: '/openmrs/team/sync',
  },
  {
    id: 'recovery-people',
    title: 'Recovery: Add People in OpenMRS',
    description: 'Run the OpenMRS person recovery job for missing records.',
    actionLabel: 'Run Person Recovery',
    method: 'POST',
    url: '/openmrs/recovery/person',
  },
  {
    id: 'recovery-accounts',
    title: 'Recovery: Recovered Accounts',
    description: 'Create recovered CHW accounts for members missing local UCS records.',
    actionLabel: 'Run Account Recovery',
    method: 'POST',
    url: '/openmrs/recovery/recovered-accounts',
  },
]

const devStatus = reactive<Record<string, 'idle' | 'running' | 'success' | 'error'>>({})
const devMessages = reactive<Record<string, string>>({})

function syncMessageClass(path: string) {
  return syncStatus.value[path] === 'synced'
    ? 'text-green-700 dark:text-green-300'
    : syncStatus.value[path] === 'unsynced'
      ? 'text-red-700 dark:text-red-300'
      : 'text-gray-600 dark:text-gray-300'
}

function devMessageClass(id: string) {
  if (devStatus[id] === 'success') return 'text-green-700 dark:text-green-300'
  if (devStatus[id] === 'error') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
}

async function runDashboardSync(path: SyncPath) {
  syncMessages[path] = ''
  try {
    await syncStore.startSync(path)
    syncMessages[path] = 'Sync started — waiting for completion…'
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    syncMessages[path] = message
    toast.add({ severity: 'error', summary: 'Sync failed', detail: message, life: 5000 })
  }
}

async function runOrphanPurge() {
  orphanStatus.value = 'running'
  orphanMessage.value = ''
  orphanStats.value = null
  try {
    const response = await auth.apiClient.post<{
      status?: string
      message?: string
      data?: OrphanPurgeStats
    }>('/openmrs/teammember/purge-orphans', {})

    const stats = response.data?.data ?? null
    orphanStats.value = stats
    orphanStatus.value = 'success'
    const msg =
      response.data?.message ||
      (stats
        ? `Completed: scanned ${stats.scanned}, kept ${stats.kept}, purged ${stats.purged}, errors ${stats.errors}.`
        : 'Orphan purge completed.')
    orphanMessage.value = msg
    toast.add({ severity: 'success', summary: 'Orphan purge', detail: msg, life: 6000 })
  } catch (error: unknown) {
    orphanStatus.value = 'error'
    const message =
      typeof error === 'string'
        ? error
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (error instanceof Error ? error.message : String(error))
    orphanMessage.value = message
    toast.add({ severity: 'error', summary: 'Orphan purge failed', detail: message, life: 6000 })
  }
}

async function runDevTool(tool: DevTool) {
  devStatus[tool.id] = 'running'
  devMessages[tool.id] = ''
  try {
    const client = auth.apiClient
    const response =
      tool.method === 'GET'
        ? await client.get<{ status?: string; message?: string }>(tool.url)
        : await client.post<{ status?: string; message?: string }>(tool.url, {})

    devStatus[tool.id] = 'success'
    const msg = response.data?.message || 'Completed successfully.'
    devMessages[tool.id] = msg
    toast.add({ severity: 'success', summary: tool.title, detail: msg, life: 4000 })
  } catch (error: unknown) {
    devStatus[tool.id] = 'error'
    const message =
      typeof error === 'string'
        ? error
        : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (error instanceof Error ? error.message : String(error))
    devMessages[tool.id] = message
    toast.add({ severity: 'error', summary: tool.title, detail: message, life: 5000 })
  }
}

onMounted(() => {
  loadHrhisTimeseries()
})

watch(
  () => ({ ...syncStatus.value }),
  (status) => {
    for (const item of syncItems) {
      if (status[item.path] === 'synced') {
        syncMessages[item.path] = 'Sync completed.'
      }
    }
  },
  { deep: true },
)

</script>
