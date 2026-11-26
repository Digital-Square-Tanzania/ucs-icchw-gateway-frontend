<template>
  <section class="mt-6 space-y-6">
    <div>
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">FFARS eligibility</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Payment eligibility calls for the selected council.
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      <HrhisRegisterChart v-else :buckets="buckets" :include-recovered="false" empty-label="No FFARS eligibility calls for this period."
        incoming-label="Incoming requests" succeeded-label="Succeeded" failed-label="Failed" />
    </article>

    <article class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-ucs-800 dark:bg-ucs-900/40">
      <div class="flex items-center justify-between px-4 py-3">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Latest calls</h3>
        <p class="text-xs text-gray-500">{{ recent.length }} shown</p>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-ucs-950/60">
          <tr>
            <th class="px-3 py-2">When</th>
            <th class="px-3 py-2">Facility</th>
            <th class="px-3 py-2">HFR</th>
            <th class="px-3 py-2">Period</th>
            <th class="px-3 py-2">CHWs</th>
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
            <td class="px-3 py-2">{{ row.outcome === 'succeeded' ? row.chwCount : '—' }}</td>
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
            <td colspan="7" class="px-3 py-6 text-center text-gray-500">No eligibility calls in this period.</td>
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
  locationCode: string
  month: string
  year: string
  chwCount: number
  httpStatus: number
  outcome: 'succeeded' | 'failed'
  errorMessage: string
}

const props = defineProps<{
  region: string
  district: string
  council: string
  days: number
}>()

const auth = useAuthStore()
const buckets = ref<HrhisBucket[]>([])
const recent = ref<FfarsRow[]>([])
const totals = ref({ incoming: 0, succeeded: 0, failed: 0, facilities: 0, chwCount: 0 })
const loading = ref(false)
const error = ref('')

const successRate = computed(() => {
  if (!totals.value.incoming) return '—'
  return `${Math.round((totals.value.succeeded / totals.value.incoming) * 100)}%`
})

const cards = computed(() => [
  { label: 'Incoming', value: totals.value.incoming, hint: 'Signed eligibility responses' },
  { label: 'Succeeded', value: totals.value.succeeded, hint: successRate.value === '—' ? '' : `${successRate.value} success` },
  { label: 'Failed', value: totals.value.failed, hint: 'HTTP or FFARS error' },
  { label: 'Facilities', value: totals.value.facilities, hint: `${totals.value.chwCount} CHW rows returned` },
])

function periodLabel(row: FfarsRow) {
  if (!row.month && !row.year) return '—'
  return [row.month, row.year].filter(Boolean).join(' / ')
}

function formatWhen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  if (!props.council?.trim()) {
    buckets.value = []
    recent.value = []
    totals.value = { incoming: 0, succeeded: 0, failed: 0, facilities: 0, chwCount: 0 }
    return
  }
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({
      days: String(props.days),
      region: props.region,
      district: props.district,
      council: props.council,
    })
    const response = await auth.apiClient.get<{
      data?: {
        buckets?: HrhisBucket[]
        recent?: FfarsRow[]
        totals?: { incoming?: number; succeeded?: number; failed?: number; facilities?: number; chwCount?: number }
      }
    }>(`/gateway/admin/ffars-eligibility-timeseries?${params}`)
    const data = response.data?.data
    buckets.value = data?.buckets ?? []
    recent.value = data?.recent ?? []
    totals.value = {
      incoming: data?.totals?.incoming ?? 0,
      succeeded: data?.totals?.succeeded ?? 0,
      failed: data?.totals?.failed ?? 0,
      facilities: data?.totals?.facilities ?? 0,
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

watch(
  () => [props.region, props.district, props.council, props.days] as const,
  () => void load(),
  { immediate: true },
)
</script>
