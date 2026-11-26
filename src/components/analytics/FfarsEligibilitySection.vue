<template>
  <section class="mt-6 space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">FFARS eligibility</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Payment eligibility calls. {{ rangeLabel }}
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-2">
        <div class="flex flex-wrap gap-1">
          <button v-for="option in presets" :key="option.id" type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            :class="preset === option.id
              ? 'bg-ucs-500 text-white'
              : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-ucs-700 dark:text-ucs-200 dark:hover:bg-ucs-950'"
            @click="preset = option.id">
            {{ option.label }}
          </button>
        </div>
        <div v-if="preset === 'year-month'">
          <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Month</label>
          <select v-model.number="month"
            class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-900">
            <option v-for="item in monthsThisYear" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
        <template v-if="preset === 'year'">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Year</label>
            <select v-model.number="year"
              class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-900">
              <option v-for="item in pastYears" :key="item" :value="item">{{ item }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-300 mb-1">Month</label>
            <select v-model="yearMonth"
              class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-900">
              <option value="">Whole year</option>
              <option v-for="item in allMonths" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </div>
        </template>
      </div>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <article v-for="card in cards" :key="card.label"
        class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-ucs-800 dark:bg-ucs-900/40">
        <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{{ card.value }}</p>
        <p v-if="card.hint" class="mt-1 text-[0.7rem] text-gray-500 dark:text-gray-400">{{ card.hint }}</p>
      </article>
    </div>

    <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-ucs-800 dark:bg-ucs-900/40">
      <p v-if="loading" class="text-sm text-gray-500">Loading chart…</p>
      <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <HrhisRegisterChart v-else :buckets="buckets" :bucket="chartBucket" :include-recovered="false"
        empty-label="No FFARS eligibility calls for this period." incoming-label="Incoming requests"
        succeeded-label="Succeeded" failed-label="Failed" />
    </article>

    <article class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-ucs-800 dark:bg-ucs-900/40">
      <div class="flex items-center justify-between px-4 py-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Requests</h3>
        <p class="text-xs text-gray-500">{{ recent.length }} shown</p>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-ucs-950/60">
          <tr>
            <th class="px-3 py-2">When</th>
            <th class="px-3 py-2">Facility</th>
            <th class="px-3 py-2">HFR</th>
            <th class="px-3 py-2">Period sought</th>
            <th class="px-3 py-2">Eligible</th>
            <th class="px-3 py-2">Ineligible</th>
            <th class="px-3 py-2">Unclassified</th>
            <th class="px-3 py-2">HTTP</th>
            <th class="px-3 py-2">Result</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in recent" :key="row.id" class="border-t border-gray-100 dark:border-ucs-800">
            <td class="px-3 py-2 whitespace-nowrap">{{ formatWhen(row.createdAt) }}</td>
            <td class="px-3 py-2">{{ row.facilityName || '—' }}</td>
            <td class="px-3 py-2 font-mono text-xs">{{ row.facilityCode || '—' }}</td>
            <td class="px-3 py-2 whitespace-nowrap">{{ periodLabel(row) }}</td>
            <td class="px-3 py-2">{{ row.outcome === 'succeeded' ? row.eligibleCount : '—' }}</td>
            <td class="px-3 py-2">{{ row.outcome === 'succeeded' ? row.ineligibleCount : '—' }}</td>
            <td class="px-3 py-2">{{ row.outcome === 'succeeded' ? row.unknownCount : '—' }}</td>
            <td class="px-3 py-2">{{ row.httpStatus || '—' }}</td>
            <td class="px-3 py-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="row.outcome === 'succeeded'
                  ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'"
                :title="row.errorMessage || undefined">
                {{ row.outcome === 'succeeded' ? 'Succeeded' : 'Failed' }}
              </span>
              <span v-if="row.errorMessage" class="mt-1 block max-w-xs text-[0.7rem] text-red-700 dark:text-red-300">
                {{ row.errorMessage }}
              </span>
            </td>
          </tr>
          <tr v-if="!loading && !recent.length">
            <td colspan="9" class="px-3 py-6 text-center text-gray-500">No eligibility calls in this period.</td>
          </tr>
        </tbody>
      </table>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import HrhisRegisterChart, { type HrhisBucket } from '@/components/settings/HrhisRegisterChart.vue'
import { useAuthStore } from '@/stores/auth'

interface FfarsRow {
  id: number
  createdAt: string
  facilityCode: string
  facilityName: string
  month: string
  year: string
  eligibleCount: number
  ineligibleCount: number
  unknownCount: number
  httpStatus: number
  outcome: 'succeeded' | 'failed'
  errorMessage: string
}

interface Totals {
  incoming: number
  succeeded: number
  failed: number
  facilities: number
  eligible: number
  ineligible: number
  unclassified: number
  chwCount: number
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const auth = useAuthStore()
const now = new Date()
const currentYear = now.getFullYear()
const currentMonth = now.getMonth() + 1

const preset = ref<'week' | 'month' | 'year-month' | 'year'>('month')
const month = ref(currentMonth)
const year = ref(currentYear - 1)
const yearMonth = ref<number | ''>('')
const buckets = ref<HrhisBucket[]>([])
const chartBucket = ref<'day' | 'month'>('day')
const recent = ref<FfarsRow[]>([])
const totals = ref<Totals>({
  incoming: 0, succeeded: 0, failed: 0, facilities: 0, eligible: 0, ineligible: 0, unclassified: 0, chwCount: 0,
})
const rangeLabel = ref('This month')
const loading = ref(false)
const error = ref('')

const presets = [
  { id: 'week' as const, label: 'This week' },
  { id: 'month' as const, label: 'This month' },
  { id: 'year-month' as const, label: 'A month this year' },
  { id: 'year' as const, label: 'A past year' },
]

const allMonths = MONTHS.map((label, index) => ({ value: index + 1, label }))
const monthsThisYear = allMonths.filter((item) => item.value <= currentMonth)
const pastYears = Array.from({ length: currentYear - 2020 }, (_, index) => currentYear - 1 - index)

const successRate = computed(() => {
  if (!totals.value.incoming) return ''
  return `${Math.round((totals.value.succeeded / totals.value.incoming) * 100)}% success`
})

const cards = computed(() => {
  const items = [
    { label: 'Requests', value: totals.value.incoming, hint: 'Stored eligibility calls' },
    { label: 'Succeeded', value: totals.value.succeeded, hint: successRate.value },
    { label: 'Failed', value: totals.value.failed, hint: 'HTTP or FFARS error' },
    { label: 'Facilities', value: totals.value.facilities, hint: `${totals.value.chwCount} CHW rows` },
    { label: 'Eligible', value: totals.value.eligible, hint: 'CHWs marked eligible' },
    { label: 'Ineligible', value: totals.value.ineligible, hint: 'CHWs marked ineligible' },
  ]
  if (totals.value.unclassified > 0) {
    items.push({
      label: 'Unclassified',
      value: totals.value.unclassified,
      hint: 'Eligibility flag was not recognized',
    })
  }
  return items
})

function periodLabel(row: FfarsRow) {
  const monthNumber = Number(row.month)
  const monthName = monthNumber >= 1 && monthNumber <= 12 ? MONTHS[monthNumber - 1] : ''
  if (!monthName && !row.year) return '—'
  return [monthName, row.year].filter(Boolean).join(' ')
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ preset: preset.value })
    if (preset.value === 'year-month') {
      params.set('year', String(currentYear))
      params.set('month', String(month.value))
    }
    if (preset.value === 'year') {
      params.set('year', String(year.value))
      if (yearMonth.value) params.set('month', String(yearMonth.value))
    }
    const response = await auth.apiClient.get<{
      data?: {
        label?: string
        bucket?: 'day' | 'month'
        buckets?: HrhisBucket[]
        recent?: FfarsRow[]
        totals?: Partial<Totals>
      }
    }>(`/gateway/admin/ffars-eligibility-timeseries?${params}`)
    const data = response.data?.data
    buckets.value = data?.buckets ?? []
    chartBucket.value = data?.bucket === 'month' ? 'month' : 'day'
    recent.value = data?.recent ?? []
    rangeLabel.value = data?.label || ''
    totals.value = {
      incoming: data?.totals?.incoming ?? 0,
      succeeded: data?.totals?.succeeded ?? 0,
      failed: data?.totals?.failed ?? 0,
      facilities: data?.totals?.facilities ?? 0,
      eligible: data?.totals?.eligible ?? 0,
      ineligible: data?.totals?.ineligible ?? 0,
      unclassified: data?.totals?.unclassified ?? 0,
      chwCount: data?.totals?.chwCount ?? 0,
    }
  } catch (err) {
    error.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (err instanceof Error ? err.message : 'Failed to load FFARS eligibility.')
  } finally {
    loading.value = false
  }
}

watch([preset, month, year, yearMonth], () => void load(), { immediate: true })
</script>
