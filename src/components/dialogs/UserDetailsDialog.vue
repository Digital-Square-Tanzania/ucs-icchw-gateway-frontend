<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="ICCHW User Details"
    :style="{ width: 'min(96vw, 900px)' }"
    :closable="!loading">
    <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading user details…</div>

    <div v-else-if="loadError" class="py-8 text-center text-sm text-red-600 dark:text-red-400">
      {{ loadError }}
    </div>

    <div v-else-if="user.uuid" class="flex flex-col gap-6 md:flex-row">
      <aside class="md:w-64 shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 text-center">
        <div
          class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ucs-500/15 text-2xl font-bold text-ucs-700 dark:text-ucs-200">
          {{ initials }}
        </div>
        <h2 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          {{ fullName }}
        </h2>
        <p class="mt-1 text-sm text-gray-500">{{ display(user.username) }}</p>
        <p class="text-sm text-gray-500">{{ display(user.email) }}</p>
        <p class="text-sm text-gray-500">{{ display(user.phoneNumber) }}</p>
        <span
          class="mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium"
          :class="accountStatusClass">
          {{ display(user.accountStatus) }}
        </span>
        <p class="mt-3 text-xs text-gray-400">Last updated {{ formatDate(user.updatedAt) }}</p>
      </aside>

      <div class="min-w-0 flex-1 space-y-4">
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Identity</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <DetailField label="Username" :value="user.username" />
            <DetailField label="Identifier" :value="user.identifier" />
            <DetailField label="NIN" :value="user.NIN" />
            <DetailField label="Sex" :value="user.sex" />
          </div>
        </section>

        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Role &amp; team</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <DetailField label="Role" :value="user.roleName" />
            <DetailField label="Team" :value="user.teamName" />
            <DetailField label="Team identifier" :value="user.teamIdentifier" />
          </div>
        </section>

        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Location</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <DetailField label="Facility" :value="user.facilityName || user.locationName" />
            <DetailField label="HFR code" :value="user.facilityHfrCode" />
            <DetailField label="Facility description" :value="user.locationDescription" field-class="sm:col-span-2" />
            <DetailField label="Assignment" :value="user.assignmentLocationName" />
            <DetailField label="Assignment code" :value="user.assignmentLocationCode" />
            <DetailField label="Assignment type" :value="user.assignmentLocationType" />
          </div>
        </section>

        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Account</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <DetailField label="Activation status" :value="user.accountStatus" />
            <DetailField label="Activated at" :value="formatDate(user.activationUsedAt)" />
            <DetailField label="Registration email" :value="user.activationEmail" />
            <DetailField label="Registration phone" :value="user.activationPhone" />
          </div>
          <p class="mt-2 text-[0.65rem] leading-snug text-gray-500 dark:text-gray-400">
            Contact details are loaded live from OpenMRS when available. Activation links are sent by email only;
            registration email is stored on the activation record from HRHIS registration.
          </p>
        </section>

        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">System IDs</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <DetailField label="OpenMRS UUID" :value="user.openMrsUuid" mono />
            <DetailField label="Person UUID" :value="user.personUuid" mono />
            <DetailField label="User UUID" :value="user.userUuid" mono />
            <DetailField label="Team UUID" :value="user.teamUuid" mono />
            <DetailField label="Facility UUID" :value="user.facilityLocationUuid" mono />
            <DetailField label="Assignment UUID" :value="user.assignmentLocationUuid" mono />
          </div>
        </section>

        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Timestamps</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            <DetailField label="Created at" :value="formatDate(user.createdAt)" />
            <DetailField label="Updated at" :value="formatDate(user.updatedAt)" />
          </div>
        </section>
      </div>
    </div>

    <template #footer>
      <Button label="Close" icon="pi pi-times" class="p-button-text" @click="visible = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { format } from 'date-fns'
import ApiClient from '@/utilities/ApiClient'
import { useAuthStore } from '@/stores/auth'
import DetailField from '@/components/common/DetailField.vue'

interface TeamMemberDetail {
  uuid?: string
  openMrsUuid?: string
  identifier?: string
  username?: string
  firstName?: string
  middleName?: string
  lastName?: string
  NIN?: string
  email?: string
  phoneNumber?: string
  sex?: string
  roleName?: string
  roleUuid?: string
  teamName?: string
  teamUuid?: string
  teamIdentifier?: string
  facilityName?: string
  facilityHfrCode?: string
  facilityLocationUuid?: string
  locationName?: string
  locationDescription?: string
  assignmentLocationUuid?: string
  assignmentLocationName?: string
  assignmentLocationCode?: string
  assignmentLocationType?: string
  personUuid?: string
  userUuid?: string
  accountStatus?: string
  activationEmail?: string
  activationPhone?: string
  activationUsedAt?: string
  dataSource?: string
  createdAt?: string
  updatedAt?: string
}

const authStore = useAuthStore()
const apiClient = new ApiClient(authStore.accessToken)

const props = defineProps<{ modelValue: boolean; userUuid: string | null }>()
const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const loading = ref(false)
const loadError = ref<string | null>(null)
const user = ref<TeamMemberDetail>({})

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
  }
)

watch(visible, (val) => {
  emit('update:modelValue', val)
})

watch(
  () => [props.modelValue, props.userUuid] as const,
  async ([open, uuid]) => {
    if (!open || !uuid) return
    await loadUser(uuid)
  }
)

const fullName = computed(() =>
  [user.value.firstName, user.value.middleName, user.value.lastName].filter(Boolean).join(' ') || '—'
)

const initials = computed(() => {
  const first = user.value.firstName?.charAt(0) || ''
  const last = user.value.lastName?.charAt(0) || ''
  return (first + last).toUpperCase() || 'U'
})

const accountStatusClass = computed(() => {
  switch (user.value.accountStatus) {
    case 'Activated':
      return 'bg-green-500/15 text-green-800 dark:text-green-200'
    case 'Pending activation':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
    case 'Activation expired':
      return 'bg-red-500/15 text-red-800 dark:text-red-200'
    default:
      return 'bg-gray-500/15 text-gray-700 dark:text-gray-300'
  }
})

async function loadUser(uuid: string) {
  loading.value = true
  loadError.value = null
  user.value = {}
  try {
    const response = await apiClient.get<{ data: TeamMemberDetail }>(`/openmrs/teammember/${uuid}`)
    user.value = response.data.data || {}
    if (!user.value.uuid && !user.value.openMrsUuid) {
      loadError.value = 'User details were empty.'
    }
  } catch (error) {
    console.error('Failed to load team member details:', error)
    loadError.value = 'Failed to load user details.'
  } finally {
    loading.value = false
  }
}

function display(value: string | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—'
  const dt = new Date(dateStr)
  if (Number.isNaN(dt.getTime())) return '—'
  return format(dt, 'dd MMM yyyy, HH:mm')
}
</script>
