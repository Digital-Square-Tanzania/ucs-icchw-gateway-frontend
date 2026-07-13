<template>
  <div class="relative h-64 w-full sm:h-72">
    <Line v-if="hasData" :data="chartData" :options="chartOptions" />
    <p
      v-else
      class="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      {{ emptyLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export interface HrhisBucket {
  day: string
  incoming: number
  created: number
  updated: number
}

const props = withDefaults(
  defineProps<{
    buckets: HrhisBucket[]
    emptyLabel?: string
  }>(),
  {
    emptyLabel: 'No HRHIS registration data for this period.',
  },
)

const hasData = computed(() => props.buckets.length > 0)

const chartData = computed(() => ({
  labels: props.buckets.map((b) => {
    const d = new Date(`${b.day}T00:00:00`)
    return Number.isNaN(d.getTime())
      ? b.day
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }),
  datasets: [
    {
      label: 'Incoming requests',
      data: props.buckets.map((b) => b.incoming),
      borderColor: '#218cc5',
      backgroundColor: 'rgba(33, 140, 197, 0.12)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2,
    },
    {
      label: 'Successfully registered',
      data: props.buckets.map((b) => b.created),
      borderColor: '#16a34a',
      backgroundColor: 'rgba(22, 163, 74, 0.08)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2,
    },
    {
      label: 'Updated existing',
      data: props.buckets.map((b) => b.updated),
      borderColor: '#d97706',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 2,
      borderWidth: 2,
      borderDash: [4, 3],
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: { color: '#6b7280', boxWidth: 12, usePointStyle: true },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
          `${ctx.dataset.label || ''}: ${ctx.parsed.y ?? 0}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: '#6b7280',
        precision: 0,
      },
      grid: { color: 'rgba(107, 114, 128, 0.15)' },
    },
  },
}
</script>
