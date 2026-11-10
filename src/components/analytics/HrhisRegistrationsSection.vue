<template>
  <section>
    <div class="mb-3">
      <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">HRHIS registrations</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Daily incoming register traffic, successes, open failures, and recovery retries for the selected council
        (same lookback as Summary).
      </p>
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
      <p v-if="hrhisLoading" class="text-sm text-gray-500">Loading chart…</p>
      <p v-else-if="hrhisError" class="text-sm text-red-600 dark:text-red-400">{{ hrhisError }}</p>
      <HrhisRegisterChart v-else :buckets="hrhisBuckets" />
    </article>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import HrhisRegisterChart, { type HrhisBucket } from '@/components/settings/HrhisRegisterChart.vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  region: string
  district: string
  council: string
  days: number
}>()

const auth = useAuthStore()

const hrhisBuckets = ref<HrhisBucket[]>([])
const hrhisTotals = reactive({ incoming: 0, succeeded: 0, failed: 0, recovered: 0 })
const hrhisLoading = ref(false)
const hrhisError = ref('')

async function loadHrhisTimeseries() {
  if (!props.council?.trim()) {
    hrhisBuckets.value = []
    hrhisTotals.incoming = 0
    hrhisTotals.succeeded = 0
    hrhisTotals.failed = 0
    hrhisTotals.recovered = 0
    return
  }
  hrhisLoading.value = true
  hrhisError.value = ''
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
        totals?: { incoming?: number; succeeded?: number; failed?: number; recovered?: number }
      }
    }>(`/dashboard/hrhis-register-timeseries?${params}`)
    const data = response.data?.data
    hrhisBuckets.value = data?.buckets ?? []
    hrhisTotals.incoming = data?.totals?.incoming ?? 0
    hrhisTotals.succeeded = data?.totals?.succeeded ?? 0
    hrhisTotals.failed = data?.totals?.failed ?? 0
    hrhisTotals.recovered = data?.totals?.recovered ?? 0
  } catch (error) {
    hrhisError.value =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error instanceof Error ? error.message : 'Failed to load HRHIS chart.')
  } finally {
    hrhisLoading.value = false
  }
}

watch(
  () => [props.region, props.district, props.council, props.days] as const,
  () => void loadHrhisTimeseries(),
  { immediate: true },
)

defineExpose({ reload: loadHrhisTimeseries })
</script>
