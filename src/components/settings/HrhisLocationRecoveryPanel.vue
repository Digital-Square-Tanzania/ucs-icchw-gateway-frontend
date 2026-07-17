<template>
  <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">HRHIS Location Failure Recovery</h3>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      Scan failed <code class="text-xs">/chw/register</code> requests in
      <code class="text-xs">api_logs</code> for a council where the error was a missing or invalid
      <code class="text-xs">locationCode</code>, then reprocess them after locations are synced.
    </p>

    <div class="mt-4 rounded-lg border border-gray-200 dark:border-ucs-800 bg-gray-50 dark:bg-ucs-950/40 p-4">
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Pick Region → District → Council, then scan. Only location-related failures are listed; NINs that later
        succeeded are excluded.
      </p>
      <div class="grid gap-3 sm:grid-cols-3">
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Region</label>
          <select
            v-model="selectedRegion"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100"
            @change="onRegionChange">
            <option value="">Select region</option>
            <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">District</label>
          <select
            v-model="selectedDistrict"
            :disabled="!selectedRegion"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100 disabled:opacity-60"
            @change="onDistrictChange">
            <option value="">Select district</option>
            <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Council</label>
          <select
            v-model="selectedCouncil"
            :disabled="!selectedDistrict"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100 disabled:opacity-60"
            @change="clearScan">
            <option value="">Select council</option>
            <option v-for="c in councils" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Lookback</label>
          <select
            v-model.number="days"
            class="rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100"
            @change="clearScan">
            <option :value="30">Last 30 days</option>
            <option :value="90">Last 90 days</option>
            <option :value="180">Last 180 days</option>
            <option :value="365">Last 365 days</option>
          </select>
        </div>
        <button
          type="button"
          :disabled="!selectedCouncil || scanning"
          class="rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="runScan">
          {{ scanning ? 'Scanning…' : 'Check failed registrations' }}
        </button>
        <button
          type="button"
          :disabled="!failures.length || recovering"
          class="rounded-lg border border-ucs-500 bg-ucs-50 px-4 py-2 text-sm font-medium text-ucs-800 hover:bg-ucs-100 dark:border-ucs-600 dark:bg-ucs-950/50 dark:text-ucs-100 dark:hover:bg-ucs-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="runRecoverAll">
          {{ recoveringAll ? 'Recovering…' : `Recover all (${failures.length})` }}
        </button>
      </div>
    </div>

    <p v-if="message" class="mt-3 text-xs" :class="messageClass">{{ message }}</p>

    <div
      v-if="batchProgress"
      class="mt-3 rounded-lg border border-ucs-200 dark:border-ucs-800 bg-ucs-50/80 dark:bg-ucs-950/40 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
        <span>
          Recovering
          <strong>{{ batchProgress.completed }}</strong>
          /
          <strong>{{ batchProgress.total }}</strong>
        </span>
        <span>
          OK {{ batchProgress.recovered }} · Failed {{ batchProgress.stillFailed }} · Skipped
          {{ batchProgress.skipped }}
        </span>
      </div>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-ucs-800">
        <div
          class="h-full rounded-full bg-ucs-500 transition-all duration-300"
          :style="{ width: `${batchProgressPercent}%` }" />
      </div>
      <p
        v-if="batchProgress.current"
        class="mt-2 truncate text-[0.7rem] text-gray-500 dark:text-gray-400"
        :title="batchProgress.current.message || ''">
        Last:
        {{ batchProgress.current.NIN || `log #${batchProgress.current.id}` }}
        —
        {{ batchProgress.current.status }}
        <span v-if="batchProgress.current.message"> ({{ batchProgress.current.message }})</span>
      </p>
    </div>

    <div v-if="scanMeta" class="mt-3 flex flex-wrap gap-2 text-xs text-gray-700 dark:text-gray-300">
      <span class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Eligible: <strong>{{ scanMeta.count }}</strong>
      </span>
      <span
        v-if="scanMeta.debug"
        class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5"
        :title="prefixHint">
        Before council filter: <strong>{{ scanMeta.debug.locationFailuresBeforeCouncilFilter }}</strong>
      </span>
      <span v-if="recoverSummary" class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Recovered: <strong>{{ recoverSummary.recovered }}</strong>
      </span>
      <span v-if="recoverSummary" class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Still failed: <strong>{{ recoverSummary.stillFailed }}</strong>
      </span>
      <span v-if="recoverSummary" class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Skipped: <strong>{{ recoverSummary.skipped }}</strong>
      </span>
    </div>
    <p v-if="prefixHint" class="mt-2 text-[0.7rem] text-gray-500 dark:text-gray-400 font-mono break-all">
      {{ prefixHint }}
    </p>

    <div v-if="failures.length" class="mt-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-ucs-800">
      <table class="min-w-full text-left text-xs text-gray-700 dark:text-gray-300">
        <thead class="bg-gray-50 dark:bg-ucs-950/60 text-[0.65rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <tr>
            <th class="px-3 py-2 font-semibold">Date</th>
            <th class="px-3 py-2 font-semibold">NIN</th>
            <th class="px-3 py-2 font-semibold">Name</th>
            <th class="px-3 py-2 font-semibold">Location code</th>
            <th class="px-3 py-2 font-semibold">Error</th>
            <th class="px-3 py-2 font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in failures"
            :key="row.id"
            class="border-t border-gray-100 dark:border-ucs-800/80">
            <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
            <td class="px-3 py-2 font-mono">{{ row.NIN || '—' }}</td>
            <td class="px-3 py-2">{{ row.name || '—' }}</td>
            <td class="px-3 py-2 font-mono">{{ row.locationCode }}</td>
            <td class="px-3 py-2 max-w-xs truncate" :title="row.errorMessage || ''">
              {{ row.errorMessage || '—' }}
            </td>
            <td class="px-3 py-2 text-right whitespace-nowrap">
              <button
                type="button"
                :disabled="recovering"
                class="rounded-md border border-ucs-500 bg-white px-2.5 py-1 text-xs font-medium text-ucs-800 hover:bg-ucs-50 dark:border-ucs-600 dark:bg-ucs-950/40 dark:text-ucs-100 dark:hover:bg-ucs-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                @click="runRecoverOne(row)">
                {{ recoveringId === row.id ? 'Recovering…' : 'Recover' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore, type HrhisRecoveryProgress } from '@/stores/sync'

interface ApiEnvelope<T> {
  status?: string
  message?: string
  data?: T
}

interface Ward {
  name: string
}
interface Council {
  name: string
  wards?: Record<string, Ward>
}
interface District {
  name: string
  councils?: Record<string, Council>
}
interface Region {
  name: string
  districts?: Record<string, District>
}
interface Zone {
  name: string
  regions?: Record<string, Region>
}
interface Country {
  name: string
  zones?: Record<string, Zone>
}
type Hierarchy = Record<string, Country>

interface FailureRow {
  id: number
  uuid?: string
  createdAt?: string
  locationCode?: string
  NIN?: string | null
  name?: string | null
  errorMessage?: string | null
}

interface ScanResult {
  count: number
  failures: FailureRow[]
  councilPrefixes?: string[]
  days?: number
  debug?: {
    locationFailuresBeforeCouncilFilter?: number
    afterCouncilPrefixFilter?: number
    afterNinDedupe?: number
  }
}

interface RecoverResult {
  recovered: number
  stillFailed: number
  skipped: number
  attempted: number
  checked: number
  started?: boolean
  jobId?: string
}

const auth = useAuthStore()
const syncStore = useSyncStore()
const toast = useToast()

const hierarchy = ref<Hierarchy>({})
const regions = ref<string[]>([])
const districts = ref<string[]>([])
const councils = ref<string[]>([])
const selectedRegion = ref('')
const selectedDistrict = ref('')
const selectedCouncil = ref('')
const days = ref(90)

const scanning = ref(false)
const recoveringAll = ref(false)
const recoveringId = ref<number | null>(null)
const message = ref('')
const messageTone = ref<'idle' | 'success' | 'error'>('idle')
const failures = ref<FailureRow[]>([])
const scanMeta = ref<ScanResult | null>(null)
const recoverSummary = ref<RecoverResult | null>(null)
const batchProgress = ref<HrhisRecoveryProgress | null>(null)
const activeJobId = ref<string | null>(null)

let unsubscribeRecovery: (() => void) | null = null

const recovering = computed(() => recoveringAll.value || recoveringId.value != null)

const batchProgressPercent = computed(() => {
  const p = batchProgress.value
  if (!p?.total) return 0
  return Math.min(100, Math.round((p.completed / p.total) * 100))
})

const messageClass = computed(() => {
  if (messageTone.value === 'success') return 'text-green-700 dark:text-green-300'
  if (messageTone.value === 'error') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

const prefixHint = computed(() => {
  const prefixes = scanMeta.value?.councilPrefixes
  if (!prefixes?.length) return ''
  return `Matching locationCode prefixes: ${prefixes.join(', ')}`
})

function eachRegion(fn: (region: Region) => void) {
  for (const country of Object.values(hierarchy.value)) {
    for (const zone of Object.values(country.zones ?? {})) {
      for (const region of Object.values(zone.regions ?? {})) {
        fn(region)
      }
    }
  }
}

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function clearScan() {
  failures.value = []
  scanMeta.value = null
  recoverSummary.value = null
  recoveringId.value = null
  recoveringAll.value = false
  batchProgress.value = null
  activeJobId.value = null
  message.value = ''
  messageTone.value = 'idle'
}

function onRegionChange() {
  selectedDistrict.value = ''
  selectedCouncil.value = ''
  districts.value = []
  councils.value = []
  clearScan()
  const set = new Set<string>()
  eachRegion((region) => {
    if (region.name !== selectedRegion.value) return
    for (const d of Object.values(region.districts ?? {})) {
      if (d.name) set.add(d.name)
    }
  })
  districts.value = [...set].sort()
}

function onDistrictChange() {
  selectedCouncil.value = ''
  councils.value = []
  clearScan()
  const set = new Set<string>()
  eachRegion((region) => {
    if (region.name !== selectedRegion.value) return
    for (const d of Object.values(region.districts ?? {})) {
      if (d.name !== selectedDistrict.value) continue
      for (const c of Object.values(d.councils ?? {})) {
        if (c.name) set.add(c.name)
      }
    }
  })
  councils.value = [...set].sort()
}

async function loadHierarchy() {
  try {
    const res = await auth.apiClient.get<ApiEnvelope<Hierarchy>>('/openmrs/location/hierarchy/grouped')
    hierarchy.value = res.data?.data ?? {}
    const set = new Set<string>()
    eachRegion((r) => r.name && set.add(r.name))
    regions.value = [...set].sort()
  } catch (error: unknown) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error instanceof Error ? error.message : 'Failed to load location hierarchy.')
    message.value = msg
    messageTone.value = 'error'
  }
}

async function runScan() {
  if (!selectedCouncil.value) return
  scanning.value = true
  recoverSummary.value = null
  message.value = ''
  messageTone.value = 'idle'
  try {
    const params = new URLSearchParams({
      region: selectedRegion.value,
      district: selectedDistrict.value,
      council: selectedCouncil.value,
      days: String(days.value),
    })
    const res = await auth.apiClient.get<ApiEnvelope<ScanResult>>(
      `/gateway/admin/hrhis-location-failures?${params.toString()}`,
    )
    const data = res.data?.data
    failures.value = data?.failures ?? []
    scanMeta.value = data ?? { count: 0, failures: [] }
    message.value =
      res.data?.message ||
      (failures.value.length
        ? `Found ${failures.value.length} recoverable location failure(s).`
        : 'No recoverable location failures for this council.')
    messageTone.value = 'success'
  } catch (error: unknown) {
    failures.value = []
    scanMeta.value = null
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (typeof error === 'string' ? error : error instanceof Error ? error.message : 'Scan failed.')
    message.value = msg
    messageTone.value = 'error'
    toast.add({ severity: 'error', summary: 'Scan failed', detail: msg, life: 6000 })
  } finally {
    scanning.value = false
  }
}

async function runRecoverSync(logIds: number[], label = 'HRHIS recovery') {
  const res = await auth.apiClient.post<ApiEnvelope<RecoverResult>>(
    '/gateway/admin/hrhis-location-failures/recover',
    {
      region: selectedRegion.value,
      district: selectedDistrict.value,
      council: selectedCouncil.value,
      days: days.value,
      logIds,
      async: false,
    },
  )
  const data = res.data?.data
  recoverSummary.value = data ?? null
  message.value =
    res.data?.message ||
    `Recovery finished: ${data?.recovered ?? 0} recovered, ${data?.stillFailed ?? 0} still failed.`
  messageTone.value = (data?.stillFailed ?? 0) > 0 ? 'error' : 'success'
  toast.add({
    severity: (data?.stillFailed ?? 0) > 0 ? 'warn' : 'success',
    summary: label,
    detail: message.value,
    life: 6000,
  })

  const preserved = recoverSummary.value
  const preservedMessage = message.value
  const preservedTone = messageTone.value
  await runScan()
  recoverSummary.value = preserved
  message.value = preservedMessage
  messageTone.value = preservedTone
}

function waitForRecoveryJob(jobIdRef: { current: string | null }): Promise<HrhisRecoveryProgress> {
  return new Promise((resolve, reject) => {
    let unsubscribe: (() => boolean) | null = null
    const timeoutMs = 30 * 60 * 1000
    const timer = window.setTimeout(() => {
      unsubscribe?.()
      reject(new Error('Recovery job timed out waiting for WebSocket completion.'))
    }, timeoutMs)

    unsubscribe = syncStore.onHrhisRecoveryEvent((event) => {
      if (jobIdRef.current && event.jobId && event.jobId !== jobIdRef.current) return
      batchProgress.value = event
      if (event.type === 'hrhis-recovery-complete') {
        if (jobIdRef.current && event.jobId && event.jobId !== jobIdRef.current) return
        window.clearTimeout(timer)
        unsubscribe?.()
        if (event.status === 'error') {
          reject(new Error(event.message || 'Recovery job failed.'))
        } else {
          resolve(event)
        }
      }
    })
  })
}

async function runRecoverAll() {
  if (!failures.value.length || recovering.value || !selectedCouncil.value) return
  recoveringAll.value = true
  batchProgress.value = {
    status: 'running',
    total: failures.value.length,
    completed: 0,
    recovered: 0,
    skipped: 0,
    stillFailed: 0,
  }
  message.value = 'Recovery started in the background…'
  messageTone.value = 'idle'
  const jobIdRef: { current: string | null } = { current: null }
  try {
    syncStore.initWebSocket()
    const completion = waitForRecoveryJob(jobIdRef)
    const res = await auth.apiClient.post<ApiEnvelope<{ started?: boolean; jobId?: string }>>(
      '/gateway/admin/hrhis-location-failures/recover',
      {
        region: selectedRegion.value,
        district: selectedDistrict.value,
        council: selectedCouncil.value,
        days: days.value,
        logIds: failures.value.map((f) => f.id),
        async: true,
      },
    )
    const jobId = res.data?.data?.jobId
    if (!jobId) {
      throw new Error(res.data?.message || 'Recovery job did not return a jobId.')
    }
    jobIdRef.current = jobId
    activeJobId.value = jobId
    const finalProgress = await completion
    recoverSummary.value = {
      recovered: finalProgress.recovered,
      stillFailed: finalProgress.stillFailed,
      skipped: finalProgress.skipped,
      attempted: finalProgress.completed,
      checked: scanMeta.value?.count ?? 0,
    }
    message.value = `Recovery finished: ${finalProgress.recovered} recovered, ${finalProgress.stillFailed} still failed, ${finalProgress.skipped} skipped.`
    messageTone.value = finalProgress.stillFailed > 0 ? 'error' : 'success'
    toast.add({
      severity: finalProgress.stillFailed > 0 ? 'warn' : 'success',
      summary: 'Recover all',
      detail: message.value,
      life: 6000,
    })
    const preserved = recoverSummary.value
    const preservedMessage = message.value
    const preservedTone = messageTone.value
    await runScan()
    recoverSummary.value = preserved
    message.value = preservedMessage
    messageTone.value = preservedTone
  } catch (error: unknown) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (typeof error === 'string' ? error : error instanceof Error ? error.message : 'Recovery failed.')
    message.value = msg
    messageTone.value = 'error'
    toast.add({ severity: 'error', summary: 'Recover all', detail: msg, life: 6000 })
  } finally {
    recoveringAll.value = false
    activeJobId.value = null
  }
}

async function runRecoverOne(row: FailureRow) {
  if (!row?.id || recovering.value || !selectedCouncil.value) return
  recoveringId.value = row.id
  message.value = ''
  messageTone.value = 'idle'
  try {
    await runRecoverSync([row.id], `Recover ${row.NIN || `log #${row.id}`}`)
  } catch (error: unknown) {
    const msg =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (typeof error === 'string' ? error : error instanceof Error ? error.message : 'Recovery failed.')
    message.value = msg
    messageTone.value = 'error'
    toast.add({
      severity: 'error',
      summary: `Recover ${row.NIN || `log #${row.id}`}`,
      detail: msg,
      life: 6000,
    })
  } finally {
    recoveringId.value = null
  }
}

onMounted(() => {
  loadHierarchy()
  syncStore.initWebSocket()
  unsubscribeRecovery = syncStore.onHrhisRecoveryEvent((event) => {
    if (activeJobId.value && event.jobId && event.jobId !== activeJobId.value) return
    if (recoveringAll.value) batchProgress.value = event
  })
})

onUnmounted(() => {
  unsubscribeRecovery?.()
  unsubscribeRecovery = null
})
</script>
