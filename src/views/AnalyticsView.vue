<template>
  <PageTitle heading="Analytics" subtext="HRHIS and FFARS" />

  <nav class="mb-4 flex gap-2 border-b border-gray-200 pb-2 dark:border-ucs-800" aria-label="Analytics source">
    <button v-for="source in sourceTabs" :key="source.id" type="button"
      class="rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors"
      :class="sourceTab === source.id
        ? 'border-ucs-500 bg-ucs-50/80 text-ucs-700 dark:bg-ucs-900/60 dark:text-ucs-100'
        : 'border-transparent text-gray-600 hover:text-ucs-600 dark:text-gray-400'"
      @click="sourceTab = source.id">
      {{ source.label }}
    </button>
  </nav>

  <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
    <CouncilHierarchyHero v-if="councilLocked" :region="selectedRegion" :district="selectedDistrict"
      :council="selectedCouncil" :stats="sourceTab === 'hrhis' ? peerStats : null"
      :subtitle="sourceTab === 'hrhis' ? 'HRHIS registrations for this council.' : 'FFARS eligibility for this council.'" />

    <template v-else>
      <h2 class="text-base font-semibold text-gray-900 dark:text-white">Council scope</h2>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
        Pick Region → District → Council, then run analytics.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Region</label>
          <select v-model="selectedRegion"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm"
            @change="onRegionChange">
            <option value="">Select region</option>
            <option v-for="r in regions" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">District</label>
          <select v-model="selectedDistrict" :disabled="!selectedRegion"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm disabled:opacity-60"
            @change="onDistrictChange">
            <option value="">Select district</option>
            <option v-for="d in districts" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Council</label>
          <select v-model="selectedCouncil" :disabled="!selectedDistrict"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm disabled:opacity-60">
            <option value="">Select council</option>
            <option v-for="c in councils" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
    </template>

    <div class="mt-3 flex flex-wrap items-end gap-3">
      <div>
        <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Lookback</label>
        <select v-model.number="days"
          class="rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm"
          @change="onLookbackChange">
          <option :value="30">Last 30 days</option>
          <option :value="90">Last 90 days</option>
          <option :value="180">Last 180 days</option>
          <option :value="365">Last 365 days</option>
          <option :value="0">Over 365 days</option>
        </select>
      </div>
      <button v-if="sourceTab === 'hrhis'" type="button" :disabled="!selectedCouncil || loading"
        class="rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="runAnalytics()">
        {{ loading ? 'Running…' : 'Run analytics' }}
      </button>
    </div>
    <template v-if="!councilLocked">
      <p v-if="hierarchyLoading" class="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading regions…</p>
      <p v-else-if="hierarchyError" class="mt-3 text-sm text-red-600 dark:text-red-400">{{ hierarchyError }}</p>
      <p v-else-if="!regions.length" class="mt-3 text-sm text-amber-700 dark:text-amber-300">
        No regions loaded. Ask an admin to run Settings → Advanced → Sync Locations (full), then Refresh Location
        Hierarchy View.
      </p>
    </template>
  </article>

  <template v-if="sourceTab === 'hrhis'">
  <HrhisRegistrationsSection v-if="selectedCouncil" class="mt-6" :region="selectedRegion" :district="selectedDistrict"
    :council="selectedCouncil" :days="days" />

  <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

  <template v-if="data">
    <section class="mt-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">Summary</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400" :title="prefixHint">
          {{ data.scope.council }} · {{ lookbackLabel(data.scope.days) }} · prefixes:
          {{ data.scope.councilPrefixes?.join(', ') || '—' }}
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div v-for="card in summaryCards" :key="card.label"
          class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4 shadow-sm">
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ card.value }}</p>
          <p v-if="card.hint" class="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">{{ card.hint }}</p>
        </div>
      </div>
    </section>

    <section class="mt-8">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div class="flex flex-wrap gap-2">
          <button v-for="tab in tabs" :key="tab.id" type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors" :class="activeTab === tab.id
              ? 'bg-ucs-500 text-white'
              : 'border border-gray-300 dark:border-ucs-700 text-gray-700 dark:text-ucs-200 hover:bg-gray-50 dark:hover:bg-ucs-950'
              " @click="activeTab = tab.id">
            {{ tab.label }} ({{ tab.count }})
          </button>
        </div>

        <div ref="facilityFilterRoot" class="relative ml-auto min-w-[16rem]">
          <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Filter</p>
          <button type="button"
            class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-left text-sm text-gray-800 shadow-sm hover:border-ucs-400 dark:border-ucs-700 dark:bg-ucs-900 dark:text-ucs-100"
            :aria-expanded="facilityFilterOpen" @click="facilityFilterOpen = !facilityFilterOpen">
            <span class="truncate">{{ facilityFilterLabel }}</span>
            <span class="text-xs text-gray-400" aria-hidden="true">▾</span>
          </button>
          <div v-if="facilityFilterOpen"
            class="absolute right-0 z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-ucs-700 dark:bg-ucs-900">
            <button type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ucs-50 dark:hover:bg-ucs-950"
              @click="selectAllFacilities">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.7rem]"
                :class="allFacilitiesSelected
                  ? 'border-ucs-500 bg-ucs-500 text-white'
                  : 'border-gray-300 bg-white dark:border-ucs-600 dark:bg-ucs-950'">
                <span v-if="allFacilitiesSelected">✓</span>
              </span>
              <span>All</span>
            </button>
            <button v-for="name in facilityOptions" :key="name" type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-ucs-50 dark:hover:bg-ucs-950"
              @click="toggleFacility(name)">
              <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.7rem]"
                :class="selectedFacilities.includes(name)
                  ? 'border-ucs-500 bg-ucs-500 text-white'
                  : 'border-gray-300 bg-white dark:border-ucs-600 dark:bg-ucs-950'">
                <span v-if="selectedFacilities.includes(name)">✓</span>
              </span>
              <span class="truncate">{{ name }}</span>
            </button>
            <p v-if="!facilityOptions.length" class="px-3 py-2 text-xs text-gray-500">No facilities in this list.</p>
          </div>
        </div>
      </div>

      <div
        class="overflow-x-auto rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 shadow-sm">
        <!-- Accepted -->
        <table v-if="activeTab === 'accepted'" class="w-full table-fixed text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2 w-[12%]">When</th>
              <th class="px-3 py-2 w-[12%]">NIN</th>
              <th class="px-3 py-2 w-[14%]">Name</th>
              <th class="px-3 py-2 w-[7%]">Kind</th>
              <th class="px-3 py-2 w-[12%]">Location</th>
              <th class="px-3 py-2 w-[16%]">Facility</th>
              <th class="px-3 py-2 w-[10%]">HFR</th>
              <th class="px-3 py-2 w-[7%]">HTTP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredAccepted" :key="row.logId" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.nin || '—' }}</td>
              <td class="px-3 py-2">{{ row.name || '—' }}</td>
              <td class="px-3 py-2 capitalize">{{ row.kind }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.locationCode || '—' }}</td>
              <td class="px-3 py-2">{{ row.facilityName || '—' }}</td>
              <td class="px-3 py-2">{{ row.hfrCode || '—' }}</td>
              <td class="px-3 py-2">{{ row.httpStatus ?? '—' }}</td>
            </tr>
            <tr v-if="!filteredAccepted.length">
              <td colspan="8" class="px-3 py-6 text-center text-gray-500">{{ emptyTableMessage('accepted') }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Rejected -->
        <table v-else-if="activeTab === 'rejected'" class="w-full table-fixed text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2 w-[14%]">When</th>
              <th class="px-3 py-2 w-[14%]">NIN</th>
              <th class="px-3 py-2 w-[14%]">Name</th>
              <th class="px-3 py-2 w-[14%]">Location</th>
              <th class="px-3 py-2 w-[8%]">HTTP</th>
              <th class="px-3 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredRejected" :key="row.logId" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
              <td class="px-3 py-2 font-mono text-xs break-all">{{ row.nin || '—' }}</td>
              <td class="px-3 py-2">{{ row.name || '—' }}</td>
              <td class="px-3 py-2 font-mono text-xs break-all">{{ row.locationCode || '—' }}</td>
              <td class="px-3 py-2">{{ row.httpStatus ?? '—' }}</td>
              <td class="px-3 py-2 text-red-700 dark:text-red-300 break-words">{{ row.errorMessage }}</td>
            </tr>
            <tr v-if="!filteredRejected.length">
              <td colspan="6" class="px-3 py-6 text-center text-gray-500">{{ emptyTableMessage('rejected') }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Updates -->
        <template v-else-if="activeTab === 'updates'">
          <table class="w-full table-fixed text-sm">
            <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
              <tr>
                <th class="px-3 py-2 w-[12%]">When</th>
                <th class="px-3 py-2 w-[12%]">NIN</th>
                <th class="px-3 py-2 w-[8%]">Update #</th>
                <th class="px-3 py-2 w-[14%]">Fields changed</th>
                <th class="px-3 py-2">Old → New</th>
                <th class="px-3 py-2 w-[12%]">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filteredUpdates" :key="row.logId"
                class="border-t border-gray-100 dark:border-ucs-800 align-top">
                <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.createdAt) }}</td>
                <td class="px-3 py-2 font-mono text-xs break-all">{{ row.nin || '—' }}</td>
                <td class="px-3 py-2">{{ row.updateNumber }} / {{ row.totalUpdatesForNin }}</td>
                <td class="px-3 py-2">{{ row.updatedFields?.join(', ') || '—' }}</td>
                <td class="px-3 py-2 font-mono text-xs whitespace-pre-wrap break-words">{{
                  formatFieldChanges(row.fieldChanges) }}</td>
                <td class="px-3 py-2 text-xs">{{ row.action }}</td>
              </tr>
              <tr v-if="!filteredUpdates.length">
                <td colspan="6" class="px-3 py-6 text-center text-gray-500">{{ emptyTableMessage('updates') }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="filteredUpdates.length"
            class="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-ucs-800">
            Updates from before this enhancement may show new values only (old values were not stored historically).
          </p>
        </template>

        <!-- Duplicates -->
        <table v-else-if="activeTab === 'duplicates'" class="w-full table-fixed text-sm">
          <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2 w-[28%]">NIN</th>
              <th class="px-3 py-2 w-[10%]">Submissions</th>
              <th class="px-3 py-2 w-[8%]">Open</th>
              <th class="px-3 py-2 w-[8%]">Resolved</th>
              <th class="px-3 py-2 w-[18%]">First</th>
              <th class="px-3 py-2 w-[18%]">Last</th>
              <th class="px-3 py-2 w-[10%]">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredDuplicates" :key="row.nin" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2 font-mono text-xs break-all">{{ row.nin }}</td>
              <td class="px-3 py-2">{{ row.submissionCount }}</td>
              <td class="px-3 py-2">
                <span class="rounded px-1.5 py-0.5 text-xs"
                  :class="row.openCount ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200' : 'text-gray-500'">
                  {{ row.openCount ?? row.submissionCount }}
                </span>
              </td>
              <td class="px-3 py-2">
                <span v-if="row.resolvedCount"
                  class="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-800 dark:text-green-200">
                  {{ row.resolvedCount }}
                </span>
                <span v-else class="text-gray-500">0</span>
              </td>
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.firstAt) }}</td>
              <td class="px-3 py-2 whitespace-nowrap">{{ formatDate(row.lastAt) }}</td>
              <td class="px-3 py-2">
                <button type="button"
                  class="cursor-pointer rounded-lg border border-ucs-500 px-2 py-1 text-xs font-medium text-ucs-700 hover:bg-ucs-500/10 dark:text-ucs-200"
                  @click="openDuplicateDialog(row.nin)">
                  Review
                </button>
              </td>
            </tr>
            <tr v-if="!filteredDuplicates.length">
              <td colspan="7" class="px-3 py-6 text-center text-gray-500">{{ emptyTableMessage('duplicates') }}</td>
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

  <FfarsEligibilitySection v-else-if="selectedCouncil" :region="selectedRegion" :district="selectedDistrict"
    :council="selectedCouncil" :days="days" />

  <DuplicateResolutionDialog v-model="duplicateDialogOpen" :scope="duplicateScope" :nin="duplicateNin"
    @resolved="onDuplicateResolved" />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import PageTitle from '@/components/layout/PageTitle.vue'
import CouncilHierarchyHero from '@/components/layout/CouncilHierarchyHero.vue'
import HrhisRegistrationsSection from '@/components/analytics/HrhisRegistrationsSection.vue'
import FfarsEligibilitySection from '@/components/analytics/FfarsEligibilitySection.vue'
import DuplicateResolutionDialog from '@/components/dialogs/DuplicateResolutionDialog.vue'
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
  facilityName?: string | null
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
  facilityName?: string | null
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
  facilityName?: string | null
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
  openCount?: number
  resolvedCount?: number
  facilityName?: string | null
  facilityNames?: string[]
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
  peersSubmitted?: number
  peersAccepted?: number
  peersRejected?: number
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

const councilLocked = computed(() => auth.isCouncilCoordinator && Boolean(auth.councilScope?.council))

const hierarchy = ref<Hierarchy>({})
const regions = ref<string[]>([])
const districts = ref<string[]>([])
const councils = ref<string[]>([])
const selectedRegion = ref('')
const selectedDistrict = ref('')
const selectedCouncil = ref('')
const days = ref(0)
const loading = ref(false)
const hierarchyLoading = ref(false)
const hierarchyError = ref('')
const error = ref('')
const data = ref<AnalyticsData | null>(null)
const sourceTab = ref<'hrhis' | 'ffars'>('hrhis')
const sourceTabs = [
  { id: 'hrhis' as const, label: 'HRHIS' },
  { id: 'ffars' as const, label: 'FFARS' },
]
const activeTab = ref<'accepted' | 'rejected' | 'updates' | 'duplicates'>('accepted')
const selectedFacilities = ref<string[]>([])
const facilityFilterOpen = ref(false)
const facilityFilterRoot = ref<HTMLElement | null>(null)
const duplicateDialogOpen = ref(false)
const duplicateNin = ref<string | null>(null)

const duplicateScope = computed(() => {
  if (!selectedCouncil.value) return null
  return {
    region: selectedRegion.value,
    district: selectedDistrict.value,
    council: selectedCouncil.value,
    days: days.value,
  }
})

const prefixHint = computed(() => data.value?.scope.councilPrefixes?.join(', ') || '')

const peerStats = computed(() => {
  const summary = data.value?.summary
  if (!summary) return null
  const accepted = summary.peersAccepted ?? 0
  const rejected = summary.peersRejected ?? 0
  return {
    submitted: summary.peersSubmitted ?? accepted + rejected,
    accepted,
    rejected,
  }
})

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

function facilityNamesOf(row: { facilityName?: string | null; facilityNames?: string[] }) {
  if (row.facilityNames?.length) return row.facilityNames.filter(Boolean)
  return row.facilityName ? [row.facilityName] : []
}

function rowMatchesFacility(row: { facilityName?: string | null; facilityNames?: string[] }) {
  if (!selectedFacilities.value.length) return true
  return facilityNamesOf(row).some((name) => selectedFacilities.value.includes(name))
}

const activeRows = computed(() => {
  if (!data.value) return []
  if (activeTab.value === 'rejected') return data.value.rejected
  if (activeTab.value === 'updates') return data.value.updates
  if (activeTab.value === 'duplicates') return data.value.duplicates
  return data.value.accepted
})

const facilityOptions = computed(() => {
  const names = new Set<string>()
  for (const row of activeRows.value) {
    for (const name of facilityNamesOf(row)) names.add(name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
})

const allFacilitiesSelected = computed(() => selectedFacilities.value.length === 0)

const facilityFilterLabel = computed(() => {
  const selected = selectedFacilities.value
  if (!selected.length) return 'All'
  if (selected.length === 1) return selected[0]
  return `${selected.length} facilities`
})

const filteredAccepted = computed(() => (data.value?.accepted ?? []).filter(rowMatchesFacility))
const filteredRejected = computed(() => (data.value?.rejected ?? []).filter(rowMatchesFacility))
const filteredUpdates = computed(() => (data.value?.updates ?? []).filter(rowMatchesFacility))
const filteredDuplicates = computed(() => (data.value?.duplicates ?? []).filter(rowMatchesFacility))

function selectAllFacilities() {
  selectedFacilities.value = []
}

function toggleFacility(name: string) {
  const current = selectedFacilities.value
  selectedFacilities.value = current.includes(name)
    ? current.filter((item) => item !== name)
    : [...current, name]
}

function emptyTableMessage(tab: 'accepted' | 'rejected' | 'updates' | 'duplicates') {
  if (selectedFacilities.value.length) return 'No records for the selected facilities.'
  if (tab === 'accepted') return 'No accepted records in this period.'
  if (tab === 'rejected') return 'No open rejections in this period.'
  if (tab === 'updates') return 'No internal update logs in this period.'
  return 'No duplicate NIN submissions in this period.'
}

function onDocumentPointerDown(event: MouseEvent) {
  const root = facilityFilterRoot.value
  if (!root || root.contains(event.target as Node)) return
  facilityFilterOpen.value = false
}

function eachRegion(fn: (region: Region) => void) {
  for (const country of Object.values(hierarchy.value)) {
    for (const zone of Object.values(country.zones ?? {})) {
      for (const region of Object.values(zone.regions ?? {})) {
        fn(region)
      }
    }
  }
}

function lookbackLabel(days: number) {
  return days === 0 ? 'Over 365 days' : `Last ${days} days`
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

interface ApiEnvelope<T> {
  status?: string
  message?: string
  data?: T
}

async function loadHierarchy() {
  hierarchyLoading.value = true
  hierarchyError.value = ''
  try {
    const response = await auth.apiClient.get<ApiEnvelope<Hierarchy>>('/openmrs/location/hierarchy/grouped')
    hierarchy.value = response.data?.data ?? {}
    const set = new Set<string>()
    eachRegion((region) => {
      const name = region.name?.trim()
      if (name) set.add(name)
    })
    regions.value = [...set].sort()
    if (!regions.value.length) {
      hierarchyError.value =
        'Location hierarchy returned no regions. The location materialized view may be empty or stale.'
    }
  } catch (err: unknown) {
    hierarchy.value = {}
    regions.value = []
    hierarchyError.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (err instanceof Error ? err.message : 'Failed to load location hierarchy.')
  } finally {
    hierarchyLoading.value = false
  }
}

function onLookbackChange() {
  if (!selectedCouncil.value) return
  void runAnalytics()
}

async function runAnalytics(preserveTab = false) {
  if (!selectedCouncil.value) return
  const tab = activeTab.value
  loading.value = true
  error.value = ''
  const previous = data.value
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
    selectedFacilities.value = []
    facilityFilterOpen.value = false
    activeTab.value = preserveTab && tab ? tab : 'accepted'
  } catch (err: unknown) {
    data.value = previous
    error.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (err instanceof Error ? err.message : 'Failed to load analytics.')
  } finally {
    loading.value = false
  }
}

function openDuplicateDialog(nin: string) {
  duplicateDialogOpen.value = false
  duplicateNin.value = nin
  nextTick(() => {
    duplicateDialogOpen.value = true
  })
}

function onDuplicateResolved() {
  duplicateDialogOpen.value = false
  if (selectedCouncil.value) runAnalytics(true)
}

function applyCoordinatorCouncil() {
  const scope = auth.councilScope
  if (!scope?.council) return
  selectedRegion.value = scope.region
  selectedDistrict.value = scope.district
  selectedCouncil.value = scope.council
}

onMounted(async () => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  if (councilLocked.value) {
    applyCoordinatorCouncil()
    await runAnalytics()
    return
  }
  await loadHierarchy()
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>
