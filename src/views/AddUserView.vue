<template>
  <PageTitle heading="Add New User" :subtext="'Add new ' + system.toUpperCase() + ' user'" />

  <!-- Select member role -->
  <div class="flex flex-col grid-4 items-center justify-between mb-4">
    <!-- <label for="teamRole">Select Team Role</label> -->
    <SelectButton id="teamRole" v-model="form.selectedRole"
      :options="teamRoles.map(role => ({ label: role.name, value: role.uuid }))" optionLabel="label" optionValue="value"
      class="" />
  </div>

  <div id="table-bg" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
    <form @submit.prevent="submitForm" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 gap-y-20">
      <div>
        <label for="firstName">First Name</label>
        <InputText id="firstName" v-model="form.firstName" class="w-full" required size="large" />
      </div>

      <div>
        <label for="middleName">Middle Name</label>
        <InputText id="middleName" v-model="form.middleName" class="w-full" size="large" />
      </div>

      <div>
        <label for="lastName">Last Name</label>
        <InputText id="lastName" v-model="form.lastName" class="w-full" required size="large" />
      </div>

      <div v-if="form.selectedRole === icchwRoleUuid">
        <label for="nin">NIN</label>
        <InputMask id="nin" v-model="form.NIN" class="w-full" required mask="99999999-99999-99999-99"
          placeholder="e.g. 19981027-12345-00001-12" size="large" />
        <Message size="small" severity="secondary" variant="simple">Do not add dashes.</Message>
      </div>

      <div>
        <label for="sex">Sex</label>
        <Select id="sex" v-model="form.sex" :options="sexOptions" optionLabel="label" optionValue="value"
          placeholder="Select" class="w-full" size="large" />
      </div>

      <div>
        <label for="email">Email</label>
        <InputText id="email" v-model="form.email" class="w-full" type="email" required size="large" />
      </div>

      <div>
        <label for="phone">Phone Number</label>
        <InputMask id="phone" v-model="form.rawPhoneNumber" class="w-full" mask="(0999) 999999"
          placeholder="(0755) 437887" size="large" @blur="handlePhoneBlur" />
        <Message v-if="phoneTaken" severity="error" size="small" class="mt-1">
          This phone number is already in use.
        </Message>

        <Message v-else size="small" severity="secondary" variant="simple">Do not add the leading 0. This will be the
          CHW
          username</Message>
      </div>

      <div>
        <label for="hfr">Facility (Search by name)</label>
        <AutoComplete v-model="selectedFacility" :suggestions="facilitySuggestions" @complete="searchFacilities"
          placeholder="Search facility by name" class="w-full" optionLabel="name" forceSelection inputClass="w-full"
          size="large">
          <template #item="{ item }: any">
            {{ item.name }}
          </template>
        </AutoComplete>
      </div>

      <div>
        <label for="location">Location Code</label>
        <Select v-model="form.locationCode" :options="locationOptions" optionLabel="name" optionValue="locationCode"
          placeholder="Select location" class="w-full" size="large" :disabled="locationOptions.length === 0" />
      </div>

      <div class="md:col-span-2 lg:col-span-3 text-right">
        <Button label="Submit" type="submit" class="mt-4" />
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import PageTitle from '@/components/layout/PageTitle.vue'
import { onMounted, ref, watch } from 'vue'
import { InputText, Select, Button, InputMask, Message, SelectButton } from 'primevue'
import AutoComplete from 'primevue/autocomplete'
import ApiClient from '@/utilities/ApiClient'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'

interface Facility {
  name: string
  hfrCode: string
  parent: string
}

interface Location {
  name: string
  locationCode: string
}

const facilitySuggestions = ref<Facility[]>([])
const locationOptions = ref<Array<{ name: string; locationCode: string }>>([])
const authStore = useAuthStore()
const accessToken = authStore.accessToken
const apiClient = new ApiClient(accessToken)
const toast = useToast()
const router = useRouter()

const teamRoles = ref<Array<{ uuid: string; name: string }>>([])
const icchwRoleUuid = import.meta.env.VITE_OPENMRS_ICCHW_TEAM_ROLE_UUID
const phoneTaken = ref(false)

onMounted(async () => {
  try {
    await apiClient.get('/auth/me')

    const teamRolesResponse = await apiClient.get('/openmrs/teamrole')
    teamRoles.value = teamRolesResponse.data.data || []

  } catch (error) {
    if ((error as any).response?.status === 401) {
      authStore.logout(router, toast)
      router.push({ name: 'Login' })
    } else {
      console.error('Error fetching user:', error)
    }
  }
})

const selectedFacility = ref<Facility | null>(null)
watch(selectedFacility, async (val) => {
  if (!val || !val.hfrCode || !val.parent) return

  form.value.hfrCode = val.hfrCode
  form.value.locationCode = '' // Clear previous location selection
  locationOptions.value = []

  try {
    const { data } = await apiClient.get(`/openmrs/location/facilities/hamlets/search?q=${val.parent}`)
    const typedData = data as { status: string; data: Array<{ name: string; locationCode: string }> }

    if (typedData.status === 'success') {
      locationOptions.value = typedData.data.map(loc => ({
        name: `${loc.name} - ${loc.locationCode}`,
        locationCode: loc.locationCode
      }))
    }
  } catch (error) {
    console.error('Error fetching locations:', error)
    locationOptions.value = []
  }
})

const searchFacilities = async (event: any) => {
  const query = event.query
  if (query.length < 4) return

  try {
    const { data } = await apiClient.get(`/openmrs/location/facilities/search?q=${query}`)
    const typedData = data as { status: string; data: Array<{ hfrCode?: string; name?: string; parent?: string }> }

    if (typedData.status === 'success') {
      facilitySuggestions.value = typedData.data
        .filter(f => f.name && f.hfrCode && f.parent)
        .map(f => ({
          name: f.name!,
          hfrCode: f.hfrCode!,
          parent: f.parent!
        }))
    } else {
      facilitySuggestions.value = []
    }
  } catch (error) {
    console.error('Error fetching facilities:', error)
    facilitySuggestions.value = []
  }
}

const props = defineProps({
  system: {
    type: String,
    required: true
  }
})

const form = ref({
  firstName: '',
  middleName: '',
  lastName: '',
  NIN: null,
  sex: '',
  email: '',
  birthdate: null,
  phoneNumber: '',
  rawPhoneNumber: '',
  hfrCode: '',
  locationCode: '',
  selectedRole: '',
  username: null,
})

const sexOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' }
]

const formatPhoneNumber = () => {
  if (!form.value.rawPhoneNumber) return

  const raw = form.value.rawPhoneNumber.replace(/\D/g, '')
  if (/^0\d{9}$/.test(raw)) {
    form.value.phoneNumber = '+255' + raw.slice(1)
  }
}


const validateNIN = () => {
  const nin = form.value.NIN.replace(/\D/g, '')
  if (nin.length < 8) {
    alert("NIN is invalid.")
    return false
  }

  const year = parseInt(nin.slice(0, 4), 10)
  const month = parseInt(nin.slice(4, 6), 10)
  const day = parseInt(nin.slice(6, 8), 10)
  const now = new Date()

  if (year < 1900 || year > now.getFullYear() || month < 1 || month > 12 || day < 1 || day > 31) {
    toast.add({
      severity: 'error',
      summary: 'Invalid NIN',
      detail: 'Check NIN, birthdate is not valid',
      life: 3000,
    })
    return false
  }
  return true
}

// Watch for changes in the phone number to check if it's taken
watch(() => form.value.phoneNumber, async (newPhoneNumber) => {
  if (!newPhoneNumber) return

  const raw = newPhoneNumber.replace(/\D/g, '')
  if (/^0\d{9}$/.test(raw)) {
    const formattedPhone = '+255' + raw.slice(1)
    phoneTaken.value = await checkUsernameAvailability(formattedPhone)
  } else {
    phoneTaken.value = false
  }
})
// Check if the username is available
const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const { data } = await apiClient.get(`/openmrs/teammember/username/search?username=${username}`)
    return data?.data?.isAvailable === true
  } catch (error) {
    console.error('Error checking username:', error)
    return false
  }
}

// Handle phone number blur event
const handlePhoneBlur = async () => {
  if (!form.value.rawPhoneNumber) return

  const raw = form.value.rawPhoneNumber.replace(/\D/g, '') // extract digits

  if (/^0\d{9}$/.test(raw)) {
    form.value.phoneNumber = '+255' + raw.slice(1)
  } else {
    form.value.phoneNumber = ''
    phoneTaken.value = false
    return
  }

  const isAvailable = await checkUsernameAvailability(raw)
  phoneTaken.value = !isAvailable

  if (!isAvailable) {
    toast.add({
      severity: 'warn',
      summary: 'Phone already used',
      detail: 'This phone number is already registered',
      life: 3000
    })
  }
}

// Handle role-based form submission
const submitForm = async () => {
  authStore.loading = true
  formatPhoneNumber()
  if (form.value.selectedRole === icchwRoleUuid && !form.value.phoneNumber) {
    authStore.loading = false
    return
  }

  if (form.value.selectedRole === icchwRoleUuid && !validateNIN()) {
    authStore.loading = false
    return
  }

  if (phoneTaken.value) {
    toast.add({
      severity: 'error',
      summary: 'Cannot Submit',
      detail: 'Phone number already taken. Enter a different one.',
      life: 3000
    })
    authStore.loading = false
    return
  }

  try {
    const response = await apiClient.post(`/user/chw`, form.value)
    form.value.rawPhoneNumber = ''
    form.value.phoneNumber = ''
    form.value = ''

    toast.add({
      severity: 'success',
      summary: 'User added',
      detail: 'User successfully added',
      life: 2000,
    })
  } catch (error: any) {
    const errorMessage = typeof error === 'string' ? error : error.message
    toast.add({
      severity: 'error',
      summary: 'Failed to add user',
      detail: errorMessage,
      life: 4000,
    })
  } finally {
    authStore.loading = false
  }
}
</script>
