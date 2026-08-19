<template>
  <PageTitle
    heading="Analytics"
    subtext="Council-scoped HRHIS register payload analysis from api_logs" />

  <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
    <h2 class="text-base font-semibold text-gray-900 dark:text-white">Council scope</h2>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      Pick Region → District → Council, then run analytics. Data covers
      <code class="text-xs">POST /chw/register</code> GatewayResponder rows (one row per HTTP
      attempt) plus internal update action logs.
    </p>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Region</label>
        <select
          v-model="selectedRegion"
          class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm"
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
          class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm disabled:opacity-60"
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
          class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm disabled:opacity-60">
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
          class="rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm">
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
          <option :value="180">Last 180 days</option>
          <option :value="365">Last 365 days</option>
        </select>
      </div>
      <button
        type="button"
        :disabled="!selectedCouncil || loading"
        class="rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="runAnalytics">
        {{ loading ? 'Running…' : 'Run analytics' }}
      </button>
    </div>
  </article>

  <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

  <template v-if="data">
    <section class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">Summary</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400" :title="prefixHint">
          {{ data.scope.council }} · {{ data.scope.days }} days · prefixes:
          {{ data.scope.councilPrefixes?.join(', ') || '—' }}
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="card in summaryCards"
          :key="card.label"
          class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4 shadow-sm">
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ card.value }}</p>
          <p v-if="card.hint" class="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">{{ card.hint }}</p>
        </div>
      </div>
    </section>

    <section class="mt-8">
      <div class="flex flex-wrap gap-2 mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          :class="
            activeTab === tab.id
              ? 'bg-ucs-500 text-white'
              : 'border border-gray-300 dark:border-ucs-700 text-gray-700 dark:text-ucs-200 hover:bg-gray-50 dark:hover:bg-ucs-950'
          "
          @click="activeTab = tab.id">
          {{ tab.label }} ({{ tab.count }})
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 shadow-sm">
        <!-- Accepted -->
        <table v-if="activeTab === 'accepted'" class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2">When</th>
              <th class="px-3 py-2">NIN</th>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">Kind</th>
              <th class="px-3 py-2">Location</th>
              <th class="px-3 py-2">HFR</th>
              <th class="px-3 py-2">HTTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.accepted" :key="row.logId" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.nin || '—' }}</td>
              <td class="px-3 py-2">{{ row.name || '—' }}</td>
              <td class="px-3 py-2 capitalize">{{ row.kind }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.locationCode || '—' }}</td>
              <td class="px-3 py-2">{{ row.hfrCode || '—' }}</td>
              <td class="px-3 py-2">{{ row.httpStatus ?? '—' }}</td>
            </tr>
            <tr v-if="!data.accepted.length">
              <td colspan="7" class="px-3 py-6 text-center text-gray-500">No accepted records in this period.</td>
            </tr>
          </tbody>
        </table>

        <!-- Rejected -->
        <table v-else-if="activeTab === 'rejected'" class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2">When</th>
              <th class="px-3 py-2">NIN</th>
              <th class="px-3 py-2">Name</th>
              <th class="px-3 py-2">Location</th>
              <th class="px-3 py-2">HTTP</th>
              <th class="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.rejected" :key="row.logId" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.nin || '—' }}</td>
              <td class="px-3 py-2">{{ row.name || '—' }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.locationCode || '—' }}</td>
              <td class="px-3 py-2">{{ row.httpStatus ?? '—' }}</td>
              <td class="px-3 py-2 text-red-700 dark:text-red-300">{{ row.errorMessage }}</td>
            </tr>
            <tr v-if="!data.rejected.length">
              <td colspan="6" class="px-3 py-6 text-center text-gray-500">No open rejections in this period.</td>
            </tr>
          </tbody>
        </table>

        <!-- Updates -->
        <table v-else-if="activeTab === 'updates'" class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2">When</th>
              <th class="px-3 py-2">NIN</th>
              <th class="px-3 py-2">Update #</th>
              <th class="px-3 py-2">Fields changed</th>
              <th class="px-3 py-2">Old → New</th>
              <th class="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.updates" :key="row.logId" class="border-t border-gray-100 dark:border-ucs-800 align-top">
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.nin || '—' }}</td>
              <td class="px-3 py-2">{{ row.updateNumber }} / {{ row.totalUpdatesForNin }}</td>
              <td class="px-3 py-2">{{ row.updatedFields?.join(', ') || '—' }}</td>
              <td class="px-3 py-2 font-mono text-xs max-w-md whitespace-pre-wrap">{{ formatFieldChanges(row.fieldChanges) }}</td>
              <td class="px-3 py-2 text-xs">{{ row.action }}</td>
            </tr>
            <tr v-if="!data.updates.length">
              <td colspan="6" class="px-3 py-6 text-center text-gray-500">No internal update logs in this period.</td>
            </tr>
          </tbody>
        </table>
        <p v-if="data.updates.length" class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-ucs-800">
          Updates from before this enhancement may show new values only (old values were not stored historically).
        </p>

        <!-- Duplicates -->
        <table v-else class="min-w-full text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2">NIN</th>
              <th class="px-3 py-2">Submissions</th>
              <th class="px-3 py-2">First</th>
              <th class="px-3 py-2">Last</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.duplicates" :key="row.nin" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2 font-mono text-xs">{{ row.nin }}</td>
              <td class="px-3 py-2">{{ row.submissionCount }}</td>
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.firstAt) }}</td>
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.lastAt) }}</td>
            </tr>
            <tr v-if="!data.duplicates.length">
              <td colspan="4" class="px-3 py-6 text-center text-gray-500">No duplicate NIN submissions in this period.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="data.limits" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Showing up to {{ data.limits.maxTableRows }} rows per table. Scanned
        {{ data.limits.envelopeScanned }} envelope log(s) and
        {{ data.limits.internalScanned }} internal update log(s) for this council.
      </p>
    </section>
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageTitle from '@/components/layout/PageTitle.vue'
import { useAuthStore } from '@/stores/auth'

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
  regions?: Record<string, Region>
}
interface Country {
  zones?: Record<string, Zone>
}
type Hierarchy = Record<string, Country>

interface FieldChange {
  old?: unknown
  new?: unknown
}

interface AcceptedRow {
  logId: number
  logUuid?: string
  createdAt: string
  nin?: string | null
  name?: string | null
  locationCode?: string | null
  hfrCode?: string | null
  httpStatus?: number | null
  kind?: string
  message?: string | null
}

interface RejectedRow {
  logId: number
  logUuid?: string
  createdAt: string
  nin?: string | null
  name?: string | null
  locationCode?: string | null
  hfrCode?: string | null
  httpStatus?: number | null
  errorMessage: string
  recoveredAt?: string | null
}

interface UpdateRow {
  logId: number
  logUuid?: string
  createdAt: string
  nin?: string | null
  name?: string | null
  locationCode?: string | null
  action?: string
  updateNumber: number
  totalUpdatesForNin: number
  updatedFields?: string[]
  fieldChanges?: Record<string, FieldChange>
  newValues?: Record<string, unknown>
  note?: string
}

interface DuplicateRow {
  nin: string
  submissionCount: number
  firstAt?: string | null
  lastAt?: string | null
}

interface AnalyticsSummary {
  incomingRows: number
  uniqueNins: number
  duplicateSubmissions: number
  duplicateNins: number
  succeeded: number
  failed: number
  failedOpen: number
  recovered: number
  created: number
  updated: number
  internalUpdateLogs: number
  recoveryRetries: number
}

interface AnalyticsData {
  scope: {
    region: string
    district: string
    council: string
    days: number
    councilPrefixes: string[]
  }
  summary: AnalyticsSummary
  accepted: AcceptedRow[]
  rejected: RejectedRow[]
  updates: UpdateRow[]
  duplicates: DuplicateRow[]
  limits?: { maxTableRows: number; envelopeScanned: number; internalScanned: number }
}

const auth = useAuthStore()

const hierarchy = ref<Hierarchy>({})
const regions = ref<string[]>([])
const districts = ref<string[]>([])
const councils = ref<string[]>([])
const selectedRegion = ref('')
const selectedDistrict = ref('')
const selectedCouncil = ref('')
const days = ref(90)
const loading = ref(false)
const error = ref('')
const data = ref<AnalyticsData | null>(null)
const activeTab = ref<'accepted' | 'rejected' | 'updates' | 'duplicates'>('accepted')

const prefixHint = computed(() => data.value?.scope.councilPrefixes?.join(', ') || '')

const summaryCards = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  return [
    { label: 'Incoming rows', value: s.incomingRows, hint: 'HRHIS HTTP attempts (excl. recovery retries)' },
    { label: 'Unique NINs', value: s.uniqueNins, hint: `${s.duplicateSubmissions} extra duplicate row(s)` },
    { label: 'Succeeded', value: s.succeeded, hint: `${s.created} created · ${s.updated} updated via register` },
    { label: 'Failed (open)', value: s.failedOpen, hint: `${s.recovered} recovered via Settings` },
    { label: 'Internal updates', value: s.internalUpdateLogs, hint: 'Field-level update action logs' },
    { label: 'Duplicate NINs', value: s.duplicateNins, hint: 'NINs submitted more than once' },
    { label: 'Total failed', value: s.failed, hint: 'Includes later-recovered failures' },
    { label: 'Recovery retries', value: s.recoveryRetries, hint: 'Settings location-recovery successes' },
  ]
})

const tabs = computed(() => [
  { id: 'accepted' as const, label: 'Accepted', count: data.value?.accepted.length ?? 0 },
  { id: 'rejected' as const, label: 'Rejected', count: data.value?.rejected.length ?? 0 },
  { id: 'updates' as const, label: 'Updates', count: data.value?.updates.length ?? 0 },
  { id: 'duplicates' as const, label: 'Duplicates', count: data.value?.duplicates.length ?? 0 },
])

function eachRegion(fn: (region: Region) => void) {
  for (const country of Object.values(hierarchy.value)) {
    for (const zone of Object.values(country.zones ?? {})) {
      for (const region of Object.values(zone.regions ?? {})) {
        fn(region)
      }
    }
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function formatFieldChanges(changes?: Record<string, FieldChange>) {
  if (!changes || !Object.keys(changes).length) return '—'
  return Object.entries(changes)
    .map(([field, change]) => {
      const oldVal = change?.old ?? '—'
      const newVal = change?.new ?? '—'
      return `${field}: ${oldVal} → ${newVal}`
    })
    .join('\n')
}

function onRegionChange() {
  selectedDistrict.value = ''
  selectedCouncil.value = ''
  districts.value = []
  councils.value = []
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
  const response = await auth.apiClient.get<{ data?: Hierarchy }>('/openmrs/location/hierarchy/grouped')
  hierarchy.value = response.data?.data ?? {}
  const set = new Set<string>()
  eachRegion((region) => {
    if (region.name) set.add(region.name)
  })
  regions.value = [...set].sort()
}

async function runAnalytics() {
  if (!selectedCouncil.value) return
  loading.value = true
  error.value = ''
  data.value = null
  try {
    const params = new URLSearchParams({
      region: selectedRegion.value,
      district: selectedDistrict.value,
      council: selectedCouncil.value,
      days: String(days.value),
    })
    const response = await auth.apiClient.get<{ data?: AnalyticsData }>(
      `/gateway/admin/hrhis-council-analytics?${params.toString()}`,
    )
    data.value = response.data?.data ?? null
    activeTab.value = 'accepted'
  } catch (err: unknown) {
    error.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (err instanceof Error ? err.message : 'Failed to load analytics.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHierarchy().catch(() => {
    error.value = 'Failed to load location hierarchy.'
  })
})
</script>
