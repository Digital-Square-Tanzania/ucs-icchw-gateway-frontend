<template>
  <div
    class="grid grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-700 rounded-lg shadow-md lg:w-[50%] md:w-full sm:w-full sm:gap-y-2">
    <div v-for="(count, index) in userRegistrations" :key="index"
      class="flex flex-col items-center justify-center p-10 w-[24%] lg:w-26 md:w-full sm:w-full h-full lg:h-25 md:h-full sm:h-full rounded-lg text-white font-semibold relative"
      :class="getBoxColor(count)" @mouseover="showTooltip(index, count)" @mouseleave="hideTooltip">
      <span class="text-lg">{{ months[index] }}</span>
      <span class="text-sm mt-1 opacity-60">{{ count }}</span>

      <!-- Tooltip -->
      <div v-if="tooltipIndex === index"
        class="absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
        {{ count }} Registrations
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ userRegistrations: number[] }>()

const months = computed(() => {
  const monthsArray = []
  const date = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1)
    monthsArray.push(d.toLocaleString('default', { month: 'short' }))
  }
  return monthsArray
})

// Tooltip state
const tooltipIndex = ref<number | null>(null)
const showTooltip = (index: number, count: number) => {
  if (count > 0) tooltipIndex.value = index
}
const hideTooltip = () => {
  tooltipIndex.value = null
}

// Compute min and max registrations dynamically
const maxCount = computed(() => Math.max(...props.userRegistrations, 1)) // Avoid division by zero
const minCount = computed(() => Math.min(...props.userRegistrations, 0))

// Function to compute dynamic color shades
const getBoxColor = (count: number) => {
  if (maxCount.value === minCount.value) return 'bg-ucs-400' // If all values are equal, default color

  // Normalize the count between 0 and 1
  const normalized = (count - minCount.value) / (maxCount.value - minCount.value)

  if (normalized >= 0.9) return 'bg-ucs-600 dark:bg-ucs-800'
  if (normalized >= 0.7) return 'bg-ucs-500 dark:bg-ucs-700'
  if (normalized >= 0.5) return 'bg-ucs-400 dark:bg-ucs-600'
  if (normalized >= 0.3) return 'bg-ucs-300 dark:bg-ucs-500'
  if (normalized >= 0.1) return 'bg-ucs-200 dark:bg-ucs-400'
  return 'bg-ucs-100 dark:bg-ucs-200'
}
</script>
<style scoped>
/* Optional styling for smooth transitions */

.grid div {
  transition: transform 0.2s ease-in-out;
}

.grid div:hover {
  transform: scale(1.1);
}
</style>