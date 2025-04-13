<template>
  <Dialog v-model:visible="visible" modal header="User Details" :style="{ width: '60vw' }" :closable="true">
    <div class="flex flex-col md:flex-row gap-6">
      <!-- Left Profile Card -->
      <div class="flex-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow text-center">
        <div class="w-24 h-24 mx-auto rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold">
          {{ user.firstName?.charAt(0) || 'U' }}{{ user.lastName?.charAt(0) || 'U' }}
        </div>
        <h2 class="mt-4 font-semibold text-xl">
          {{ user.firstName }} {{ user.middleName }} {{ user.lastName }}
        </h2>
        <p class="text-sm text-gray-500">{{ user.email || 'chw@example.com' }}</p>
        <p class="text-sm text-gray-500">{{ user.phoneNumber || '+2557xxxxxxx' }}</p>
        <div class="mt-2 text-xs text-gray-400">
          Last Updated: {{ formatDate(user.updatedAt) }}
        </div>
      </div>

      <!-- Right Detail Cards -->
      <div class="flex-1 flex flex-col gap-3">

        <DetailCard label="Username" :value="user.username" />
        <DetailCard label="Identifier" :value="user.identifier" />
        <DetailCard label="NIN" :value="user.NIN" />
        <DetailCard label="Role" :value="user.roleName" />
        <DetailCard label="Team" :value="user.teamName" />
        <DetailCard label="Facility" :value="user.locationName" />
        <DetailCard label="Facility Description" :value="user.locationDescription" />
        <DetailCard label="Account Status" :value="user.accountActivationId ? 'Activated' : 'Not Activated'" />

        <div class="grid grid-cols-2 gap-2 mt-2">
          <DetailCard label="Created At" :value="formatDate(user.createdAt)" />
          <DetailCard label="Updated At" :value="formatDate(user.updatedAt)" />
        </div>

        <div class="grid grid-cols-2 gap-2 mt-2">
          <DetailCard label="User UUID" :value="user.userUuid" />
          <DetailCard label="OpenMRS UUID" :value="user.openMrsUuid" />
          <DetailCard label="Team UUID" :value="user.teamUuid" />
          <DetailCard label="Location UUID" :value="user.locationUuid" />
        </div>

      </div>
    </div>

    <template #footer>
      <Button label="Close" icon="pi pi-times" @click="visible = false" class="p-button-text" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, watch, type Ref } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { format } from 'date-fns'
import ApiClient from '@/utilities/ApiClient'
import { useAuthStore } from '@/stores/auth'

// Reusable DetailCard Component
const DetailCard = defineComponent({
  props: { label: String, value: String },
  template: `
    <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded shadow">
      <h3 class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ label }}</h3>
      <p class="font-semibold text-sm">{{ value || '-' }}</p>
    </div>
  `
})

const authStore = useAuthStore()
const apiClient = new ApiClient(authStore.accessToken)

const props = defineProps<{ modelValue: boolean; userUuid: string | null }>()
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)

interface User {
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  username?: string
  identifier?: string
  NIN?: string
  roleName?: string
  teamName?: string
  locationName?: string
  locationDescription?: string
  createdAt?: string
  updatedAt?: string
  accountActivationId?: string | null
  userUuid?: string
  openMrsUuid?: string
  teamUuid?: string
  locationUuid?: string
}

const user = ref<User>({}) as Ref<User>

watch(() => props.modelValue, (val) => { visible.value = val })
watch(visible, (val) => { emit('update:modelValue', val) })

watch(() => props.userUuid, async (newUuid) => {
  if (newUuid) {
    const response = await apiClient.get(`/openmrs/teammember/${newUuid}`)
    const responseData = response.data as { data: User }
    user.value = responseData.data
  }
})

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return 'N/A'
  return format(new Date(dateStr), 'dd MMM yyyy, HH:mm')
}
function defineComponent({ props, template }: { props: { label: StringConstructor; value: StringConstructor }; template: string }) {
  return {
    props,
    template
  }
}
</script>