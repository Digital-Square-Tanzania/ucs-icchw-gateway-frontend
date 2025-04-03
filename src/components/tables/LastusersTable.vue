<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 overflow-x-hidden overflow-y-clip w-full">
    <h3 class="text-lg font-bold mb-5 text-gray-500">Last 10 Users</h3>
    <div v-if="users.length === 0" class="text-center text-gray-500 dark:text-gray-200 text-5xl">Loading...</div>
    <table v-else class="min-w-full table-auto text-sm">
      <thead>
        <tr class="bg-gray-100 dark:bg-ucs-900 text-left text-gray-700 dark:text-white">
          <th class="px-4 py-3">SN</th>
          <th class="px-4 py-3">First Name</th>
          <th class="px-4 py-3 hidden lg:flex">Middle Name</th>
          <th class="px-4 py-3">Last Name</th>
          <th class="px-4 py-3 hidden lg:flex">Userame</th>
          <th class="px-4 py-3">Facility</th>
          <th class="px-4 py-3 hidden lg:flex">Council</th>
        </tr>
      </thead>
      <tbody>
        <!-- <tr v-for="(user, index) in users" :key="user.id || index"
          :class="[rowColor(index), 'text-gray-600 dark:text-gray-200']">
          <td class="px-2 py-1 md:py-2">{{ index + 1 }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.firstName }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.middleName }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.lastName }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.username }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.facility }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.council }}</td>
        </tr> -->
        <tr v-for="(user, index) in users" :key="user.id || index"
          :class="index % 2 === 0 ? 'bg-ucs-100 dark:bg-ucs-700' : 'bg-white dark:bg-gray-800'">
          <td class="px-2 py-1 md:py-2">{{ index + 1 }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.firstName }}</td>
          <td class="visible px-2 py-1 md:py-2 hidden lg:flex">{{ user.middleName }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.lastName }}</td>
          <td class="visible px-2 py-1 md:py-2 hidden lg:flex">{{ user.username }}</td>
          <td class="px-2 py-1 md:py-2">{{ user.facility }}</td>
          <td class="visible px-2 py-1 md:py-2 hidden lg:flex">{{ user.council }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface User {
  id: number
  firstName: string
  middleName: string
  lastName: string
  username: string
  facility: string
  council: string
}

function roleColor(role: string) {
  switch (role) {
    case 'MOH':
      return 'bg-blue-500'
    case 'PROVIDER':
      return 'bg-green-500'
    case 'CHW':
      return 'bg-amber-500'
    case 'COUNCIL':
      return 'bg-purple-500'
    case 'SYS_DEV':
      return 'bg-red-500'
    default:
      return 'bg-gray-500'
  }
}

function rowColor(index: number) {
  const colors = [
    'bg-blue-50 dark:bg-blue-950',
    'bg-green-50 dark:bg-green-950',
    'bg-amber-50 dark:bg-amber-950',
    'bg-purple-50 dark:bg-purple-950',
    'bg-red-50 dark:bg-red-950',
    'bg-gray-50 dark:bg-gray-950'
  ]
  return colors[index % colors.length]
}


import { defineProps } from 'vue'

interface LastUser {
  id: string
  firstName: string
  middleName: string | null
  lastName: string
  username: string
  teamName: string
  locationName: string
}

const props = defineProps<{
  last7Users: LastUser[]
}>()


const users = computed(() => {
  return props.last7Users.map(user => ({
    id: Number(user.id),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    middleName: user.middleName,
    facility: user.teamName,
    council: user.locationName
  }))
})
</script>
