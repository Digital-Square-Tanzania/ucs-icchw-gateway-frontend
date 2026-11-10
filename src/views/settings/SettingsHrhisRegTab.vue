<template>
  <section>
    <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div>
        <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">HRHIS registrations</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300">
          Incoming register requests with succeeded, open failed, and recovery retries.
        </p>
        <p v-if="councilLabel" class="mt-1 text-xs text-ucs-600 dark:text-ucs-300">
          Scoped to council: <strong>{{ councilLabel }}</strong>
        </p>
      </div>
      <select
        v-model.number="hrhisDays"
        class="rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-3 py-1.5 text-sm"
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
      <p v-if="hrhisLoading" class="text-sm text-gray-500">Loading chart…</p>
      <p v-else-if="hrhisError" class="text-sm text-red-600">{{ hrhisError }}</p>
      <HrhisRegisterChart v-else :buckets="hrhisBuckets" />
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import HrhisRegisterChart, { type HrhisBucket } from '@/components/settings/HrhisRegisterChart.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const councilLabel = computed(() => auth.councilScope?.council ?? '')

const hrhisDays = ref(30)
const hrhisBuckets = ref<HrhisBucket[]>([])
const hrhisTotals = reactive({ incoming: 0, succeeded: 0, failed: 0, recovered: 0 })
const hrhisLoading = ref(false)
const hrhisError = ref('')

async function loadHrhisTimeseries() {
  hrhisLoading.value = true
  hrhisError.value = ''
  try {
    const params = new URLSearchParams({ days: String(hrhisDays.value) })
    const scope = auth.councilScope
    if (scope?.council) {
      params.set('region', scope.region)
      params.set('district', scope.district)
      params.set('council', scope.council)
    }
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
    hrhisError.value = error instanceof Error ? error.message : 'Failed to load HRHIS chart.'
  } finally {
    hrhisLoading.value = false
  }
}

onMounted(() => loadHrhisTimeseries())
</script>
