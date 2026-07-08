<template>
  <div class="flex flex-col gap-5">
    <!-- Metrics -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">Activation Metrics</h3>
        <button
          type="button"
          :disabled="loadingStats"
          class="rounded-lg bg-ucs-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60 transition-colors"
          @click="loadStats">
          {{ loadingStats ? 'Refreshing…' : 'Refresh metrics' }}
        </button>
      </div>
      <div class="grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div
          v-for="card in statCards"
          :key="card.key"
          class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
          <p class="text-[0.7rem] uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ card.label }}</p>
          <p class="mt-1 text-2xl font-semibold" :class="card.color">{{ stats ? stats[card.key] : '—' }}</p>
        </div>
      </div>
    </div>

    <!-- Location filter -->
    <div class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-gray-50 dark:bg-ucs-900/30 p-4">
      <h3 class="text-sm font-semibold text-gray-700 dark:text-ucs-200 mb-1">Resend location</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Pick Region → District → Council to scope metrics and enable resends. Batches target that council only.
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
            @change="onCouncilChange">
            <option value="">Select council</option>
            <option v-for="c in councils" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Batch resend -->
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
        <h3 class="text-sm font-semibold text-ucs-700 dark:text-ucs-200">Expired slugs</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Resend for ACTIVATION slugs that expired, are unused, and were never resent.
        </p>
        <label class="mt-3 block text-xs text-gray-600 dark:text-gray-300">Batch size (emails)</label>
        <input
          v-model.number="expiredLimit"
          type="number"
          min="1"
          max="500"
          class="mt-1 w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100" />
        <button
          type="button"
          :disabled="!selectedCouncil || resendingExpired"
          class="mt-3 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="resend('expired')">
          {{ resendingExpired ? 'Sending…' : 'Resend Expired Batch' }}
        </button>
        <p v-if="expiredResult" class="mt-2 text-xs text-gray-600 dark:text-gray-300">{{ expiredResult }}</p>
      </div>

      <div class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
        <h3 class="text-sm font-semibold text-amber-700 dark:text-amber-300">Open slugs</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Resend for ACTIVATION slugs that are still valid (not expired) and unused.
        </p>
        <label class="mt-3 block text-xs text-gray-600 dark:text-gray-300">Batch size (emails)</label>
        <input
          v-model.number="openLimit"
          type="number"
          min="1"
          max="500"
          class="mt-1 w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100" />
        <button
          type="button"
          :disabled="!selectedCouncil || resendingOpen"
          class="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="resend('open')">
          {{ resendingOpen ? 'Sending…' : 'Resend Open Batch' }}
        </button>
        <p v-if="openResult" class="mt-2 text-xs text-gray-600 dark:text-gray-300">{{ openResult }}</p>
      </div>
    </div>

    <!-- Scheduler -->
    <div class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-3">Daily Batch Scheduler</h3>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Enabled</label>
          <select
            v-model="schedule.enabled"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100">
            <option :value="true">Yes</option>
            <option :value="false">No</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Batch size</label>
          <input
            v-model.number="schedule.batchSize"
            type="number"
            min="1"
            max="1000"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100" />
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Iterations</label>
          <input
            v-model.number="schedule.maxIterations"
            type="number"
            min="1"
            max="20"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100" />
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Delay (ms)</label>
          <input
            v-model.number="schedule.delayMsBetweenIterations"
            type="number"
            min="0"
            step="1000"
            class="w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm text-gray-900 dark:text-ucs-100" />
        </div>
      </div>
      <button
        type="button"
        :disabled="savingSchedule"
        class="mt-3 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60 transition-colors"
        @click="saveSchedule">
        {{ savingSchedule ? 'Saving…' : 'Save Schedule' }}
      </button>
    </div>

    <!-- Activity matrix -->
    <div v-if="matrix.length" class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">Recent activation activity</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Activation slugs created per day (last {{ matrixDays }} days).</p>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="cell in matrix"
          :key="cell.date"
          :title="`${cell.date}: ${cell.count}`"
          class="h-4 w-4 rounded-sm"
          :style="{ backgroundColor: cellColor(cell.count) }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const toast = useToast()

interface Stats {
  unsentExpired: number
  activated: number
  expiredResent: number
  openNotUsed: number
  total: number
  resentCount: number
}

interface Schedule {
  enabled: boolean
  batchSize: number
  maxIterations: number
  delayMsBetweenIterations: number
}

interface MatrixCell {
  date: string
  count: number
}

type ApiEnvelope<T> = { status: string; message?: string; data: T }

const statCards: { key: keyof Stats; label: string; color: string }[] = [
  { key: 'unsentExpired', label: 'Expired & Never Resent', color: 'text-red-600 dark:text-red-400' },
  { key: 'activated', label: 'Activated Accounts', color: 'text-green-600 dark:text-green-400' },
  { key: 'expiredResent', label: 'Expired & Resent', color: 'text-amber-600 dark:text-amber-400' },
  { key: 'openNotUsed', label: 'Open & Not Used', color: 'text-sky-600 dark:text-sky-400' },
  { key: 'total', label: 'Total Activation Slugs', color: 'text-gray-900 dark:text-white' },
  { key: 'resentCount', label: 'Ever Resent', color: 'text-orange-700 dark:text-orange-400' },
]

const stats = ref<Stats | null>(null)
const loadingStats = ref(false)

const schedule = reactive<Schedule>({
  enabled: true,
  batchSize: 500,
  maxIterations: 1,
  delayMsBetweenIterations: 0,
})
const savingSchedule = ref(false)

const matrix = ref<MatrixCell[]>([])
const matrixDays = ref(90)

const expiredLimit = ref(100)
const openLimit = ref(100)
const expiredResult = ref('')
const openResult = ref('')
const resendingExpired = ref(false)
const resendingOpen = ref(false)

// Location hierarchy
interface Ward { name: string }
interface Council { name: string; wards?: Record<string, Ward> }
interface District { name: string; councils?: Record<string, Council> }
interface Region { name: string; districts?: Record<string, District> }
interface Zone { name: string; regions?: Record<string, Region> }
interface Country { name: string; zones?: Record<string, Zone> }
type Hierarchy = Record<string, Country>

const hierarchy = ref<Hierarchy>({})
const regions = ref<string[]>([])
const districts = ref<string[]>([])
const councils = ref<string[]>([])
const selectedRegion = ref('')
const selectedDistrict = ref('')
const selectedCouncil = ref('')

function eachRegion(fn: (region: Region) => void) {
  for (const country of Object.values(hierarchy.value)) {
    for (const zone of Object.values(country.zones ?? {})) {
      for (const region of Object.values(zone.regions ?? {})) {
        fn(region)
      }
    }
  }
}

async function apiGet<T>(url: string): Promise<T> {
  const res = await auth.apiClient.get<ApiEnvelope<T>>(url)
  return res.data.data
}

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await auth.apiClient.post<ApiEnvelope<T>>(url, body)
  return res.data.data
}

function locationFilter() {
  if (!selectedCouncil.value) return null
  return {
    region: selectedRegion.value,
    district: selectedDistrict.value,
    council: selectedCouncil.value,
  }
}

async function loadStats() {
  loadingStats.value = true
  try {
    const params = new URLSearchParams()
    if (selectedCouncil.value) {
      params.set('region', selectedRegion.value)
      params.set('district', selectedDistrict.value)
      params.set('council', selectedCouncil.value)
    }
    const qs = params.toString()
    const data = await apiGet<{ stats: Stats; schedule?: Schedule }>(
      `/user/admin/activation-email-stats${qs ? `?${qs}` : ''}`,
    )
    stats.value = data.stats
    if (data.schedule) Object.assign(schedule, data.schedule)
  } catch (error) {
    notifyError('Failed to load metrics', error)
  } finally {
    loadingStats.value = false
  }
}

async function loadMatrix() {
  try {
    const data = await apiGet<{ days: number; matrix: MatrixCell[] }>('/user/admin/activation-matrix?days=90')
    matrix.value = data.matrix ?? []
    matrixDays.value = data.days ?? 90
  } catch {
    matrix.value = []
  }
}

async function loadHierarchy() {
  try {
    hierarchy.value = await apiGet<Hierarchy>('/openmrs/location/hierarchy/grouped')
    const set = new Set<string>()
    eachRegion((r) => r.name && set.add(r.name))
    regions.value = [...set].sort()
  } catch (error) {
    notifyError('Failed to load locations', error)
  }
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
  loadStats()
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
  loadStats()
}

function onCouncilChange() {
  loadStats()
}

async function resend(kind: 'expired' | 'open') {
  const isExpired = kind === 'expired'
  const limit = isExpired ? expiredLimit.value : openLimit.value
  const flag = isExpired ? resendingExpired : resendingOpen
  flag.value = true
  try {
    const filter = locationFilter()
    const body = filter ? { limit, locationFilter: filter } : { limit }
    const summary = await apiPost<{ total: number; success: number; failed: number }>(
      `/user/admin/activation-resend/${kind}`,
      body,
    )
    const text = `Done. Total ${summary.total}, success ${summary.success}, failed ${summary.failed}.`
    if (isExpired) expiredResult.value = text
    else openResult.value = text
    toast.add({
      severity: summary.failed > 0 ? 'warn' : 'success',
      summary: `${isExpired ? 'Expired' : 'Open'} resend`,
      detail: text,
      life: 5000,
    })
    await loadStats()
  } catch (error) {
    notifyError('Resend failed', error)
  } finally {
    flag.value = false
  }
}

async function saveSchedule() {
  savingSchedule.value = true
  try {
    const updated = await apiPost<Schedule>('/user/admin/activation-schedule', {
      enabled: schedule.enabled,
      batchSize: schedule.batchSize,
      maxIterations: schedule.maxIterations,
      delayMsBetweenIterations: schedule.delayMsBetweenIterations,
    })
    Object.assign(schedule, updated)
    toast.add({ severity: 'success', summary: 'Scheduler', detail: 'Schedule saved.', life: 4000 })
  } catch (error) {
    notifyError('Failed to save schedule', error)
  } finally {
    savingSchedule.value = false
  }
}

function cellColor(count: number): string {
  if (count <= 0) return 'rgba(148,163,184,0.25)'
  const max = Math.max(...matrix.value.map((m) => m.count), 1)
  const intensity = Math.min(1, 0.2 + (count / max) * 0.8)
  return `rgba(33,140,197,${intensity.toFixed(2)})`
}

function notifyError(summary: string, error: unknown) {
  const message =
    typeof error === 'string'
      ? error
      : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (error instanceof Error ? error.message : String(error))
  toast.add({ severity: 'error', summary, detail: message, life: 5000 })
}

onMounted(() => {
  loadStats()
  loadMatrix()
  loadHierarchy()
})
</script>
