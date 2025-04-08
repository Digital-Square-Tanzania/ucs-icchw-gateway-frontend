<!-- src/views/AddUserView.vue -->
<template>
  <PageTitle heading="Add New User" :subtext="'Add new ' + system.toUpperCase() + ' user'" />

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

      <div>
        <label for="nin">NIN</label>
        <InputMask id="nin" v-model="form.NIN" class="w-full" required mask="99999999-99999-99999-99"
          placeholder="e.g. 19981027-12345-00001-12" size="large" />
        <Message size="small" severity="secondary" variant="simple">Do not add dashes.
        </Message>
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
        <InputMask id="phone" v-model="form.phoneNumber" class="w-full" required mask="(0999) 999999"
          placeholder="(0755) 437887" size="large" />
        <Message size="small" severity="secondary" variant="simple">Do not add the leading 0.
        </Message>
      </div>

      <div>
        <label for="hfr">Facility (Search by name)</label>
        <AutoComplete v-model="selectedFacility" :suggestions="facilitySuggestions" @complete="searchFacilities"
          placeholder="Search facility by name" class="w-full" optionLabel="name" forceSelection inputClass="w-full"
          size="large">
          <!-- @vue-ignore -->
          <template #item="{ item }: any">
            {{ item.name }}
          </template>
        </AutoComplete>
      </div>

      <div>
        <label for="location">Location Code</label>
        <AutoComplete v-model="selectedLocation" :suggestions="locationSuggestions" @complete="searchLocations"
          placeholder="Search location by name" class="w-full" optionLabel="name" forceSelection inputClass="w-full"
          size="large">
          <!-- @vue-expect-error -->
          <template #item="{ item }: { item: Location }">
            {{ item.name }} - {{ item.locationCode }}
          </template>
        </AutoComplete>
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
import { InputText, Select, Button, InputMask, Message } from 'primevue'
import AutoComplete from 'primevue/autocomplete'
import ApiClient from '@/utilities/ApiClient'
import { useAuthStore } from '@/stores/auth'
import { useToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router'

interface Facility {
  name: string
  hfrCode: string
}

interface Location {
  name: string
  locationCode: string
}

const facilitySuggestions = ref<Facility[]>([])
const locationSuggestions = ref<Location[]>([])
const authStore = useAuthStore()
const accessToken = authStore.accessToken
const apiClient = new ApiClient(accessToken)
const toast = useToast()
const router = useRouter()

// Check if the user is authenticated
onMounted(async () => {
  try {
    await apiClient.get('/auth/me')
  } catch (error) {
    if ((error as any).response && (error as any).response.status === 401) {
      authStore.logout(router, toast)
      router.push({ name: 'Login' })
    } else {
      console.error('Error fetching user:', error)
    }
  }
})

const selectedFacility = ref<Facility | null>(null)
watch(selectedFacility, (val) => {
  if (val?.hfrCode) {
    form.value.hfrCode = val.hfrCode;
  }
})

const searchFacilities = async (event: any) => {
  const query = event.query
  if (query.length < 4) return

  try {
    const { data } = await apiClient.get(`/openmrs/location/facilities/search?q=${query}`)
    const typedData = data as { status: string; data: Array<{ hfrCode?: string; name?: string }> }
    if (typedData.status === 'success' && Array.isArray(typedData.data)) {
      facilitySuggestions.value = typedData.data
        .filter(facility => facility.name && facility.hfrCode)
        .map(facility => ({
          name: facility.name as string,
          hfrCode: facility.hfrCode as string
        }))

    } else {
      facilitySuggestions.value = []
    }
  } catch (error) {
    console.error('Error fetching facilities:', error)
    facilitySuggestions.value = []
  }
}

const selectedLocation = ref<Location | null>(null)
watch(selectedLocation, (val) => {
  if (val?.locationCode) {
    form.value.locationCode = val.locationCode;
  }
})

const searchLocations = async (event: any) => {
  const query = event.query
  if (query.length < 4) return

  try {
    const { data } = await apiClient.get(`/openmrs/location/hamlets/search?q=${query}`)
    const typedData = data as { status: string; data: Array<{ locationCode?: string; name?: string }> }
    if (typedData.status === 'success' && Array.isArray(typedData.data)) {
      locationSuggestions.value = typedData.data
        .filter(location => location.name && location.locationCode)
        .map(location => ({
          name: location.name as string,
          locationCode: location.locationCode as string
        }))

    } else {
      locationSuggestions.value = []
    }
  } catch (error) {
    console.error('Error fetching facilities:', error)
    locationSuggestions.value = []
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
  NIN: '',
  sex: '',
  email: '',
  birthdate: null,
  phoneNumber: '',
  hfrCode: '',
  locationCode: ''
})

const sexOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' }
]

// Format phone number to international format
const formatPhoneNumber = () => {
  if (!form.value.phoneNumber) return

  const raw = form.value.phoneNumber.replace(/\D/g, '') // (0755) 437887 => 0755437887

  if (/^0\d{9}$/.test(raw)) {
    form.value.phoneNumber = '+255' + raw.slice(1)
  } else {
    alert('Please enter a valid phone number like (0755) 437887')
    form.value.phoneNumber = ''
  }
}

// Validate NIN format
const validateNIN = () => {
  const nin = form.value.NIN.replace(/\D/g, ''); // remove non-digits

  if (nin.length < 8) {
    alert("NIN is invalid.");
    return false;
  }

  const year = parseInt(nin.slice(0, 4), 10);
  const month = parseInt(nin.slice(4, 6), 10);
  const day = parseInt(nin.slice(6, 8), 10);

  const currentYear = new Date().getFullYear();

  const isYearValid = year >= 1900 && year <= currentYear;
  const isMonthValid = month >= 1 && month <= 12;
  const isDayValid = day >= 1 && day <= 31;

  if (!isYearValid || !isMonthValid || !isDayValid) {
    toast.add({
      severity: 'error',
      summary: 'Invalid NIN',
      detail: 'Check NIN, birthdate is not valid',
      life: 3000,
    })
    return false;
  }

  return true;
};

// Submit form
const submitForm = async () => {
  authStore.loading = true
  formatPhoneNumber()
  if (!form.value.phoneNumber) {
    authStore.loading = false
    return
  }

  if (!validateNIN()) {
    authStore.loading = false
    return
  }

  try {
    const response = await apiClient.post(`/user/chw`, form.value)
    console.log('✅ User added:', response.data)
    toast.add({
      severity: 'success',
      summary: 'User added',
      detail: 'User successfully added',
      life: 2000,
    })
  } catch (error: any) {
    const errorMessage = typeof error === 'string' ? error : error.message
    console.error('❌ Error adding user:', errorMessage)
    // Show error toast
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
