<template>
  <div id="info-card" class="flex flex-col justify-around bg-white dark:bg-gray-700 p-5 rounded-lg h-44 drop-shadow-md">
    <div id="card-top" class="flex flex-col align-middle justify-around w-full">
      <div id="top-top" class="w-full flex flex-row justify-between">
        <div id="top-heading" class="text-md font-bold">
          <slot name="heading"></slot>
        </div>
      </div>
      <div id="top-bottom" class="w-full flex flex-row justify-between items-center">
        <div id="top-big-number" class="font-bold text-4xl">
          <slot name="big-number"></slot>
        </div>

        <i>
          <slot name="icon"></slot>
        </i>
      </div>
    </div>
    <div id="card-bottom" class="flex flex-row items-center justify-between w-full">
      <span id="percent-number" :class="[percentColor, 'font-bold text-lg']">
        <slot name="percent"></slot>
      </span>
      <span id="percent-text" class="text-sm text-gray-400 pl-5">
        <slot name="subtext"></slot>
      </span>
      <span id="sync" class="text-sm text-gray-400 pl-5">
        <slot name="sync"></slot>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  color: 'red' | 'amber' | 'green'
}>()

const colorMap = {
  red: 'text-red-600',
  amber: 'text-amber-600',
  green: 'text-green-600',
}

const percentColor = computed(() => colorMap[props.color] || 'text-gray-500')
</script>