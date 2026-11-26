<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="mode === 'edit' ? 'Edit manager user' : 'Manager user'"
    :style="{ width: 'min(96vw, 640px)' }">
    <div v-if="mode === 'view'" class="space-y-4 text-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-ucs-500/15 text-lg font-bold text-ucs-700 dark:text-ucs-200">
          {{ initials }}
        </div>
        <div>
          <p class="text-base font-semibold text-gray-900 dark:text-white">{{ fullName }}</p>
          <p class="text-gray-500">{{ display(user?.email) }}</p>
        </div>
      </div>
      <dl class="grid gap-3 sm:grid-cols-2">
        <div v-for="item in viewFields" :key="item.label">
          <dt class="text-[0.7rem] uppercase tracking-wide text-gray-500">{{ item.label }}</dt>
          <dd class="mt-0.5 text-gray-900 dark:text-ucs-100">{{ item.value }}</dd>
        </div>
      </dl>
    </div>

    <form v-else class="space-y-4" @submit.prevent="saveDetails">
      <p v-if="isSelf" class="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        You are editing your own account. A change to your email or role takes effect on the next sign-in.
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          First name
          <input v-model="form.firstName" required minlength="2" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Middle name
          <input v-model="form.middleName" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Last name
          <input v-model="form.lastName" required minlength="2" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Email
          <input v-model="form.email" type="email" required class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
          <span v-if="emailStatus === 'taken'" class="mt-1 block text-[11px] text-red-600">This email is already used for a manager login.</span>
          <span v-else-if="emailStatus === 'invalid'" class="mt-1 block text-[11px] text-amber-700">Enter a valid email address.</span>
          <span v-else-if="emailStatus === 'available' && emailChanged" class="mt-1 block text-[11px] text-green-700">Email is available.</span>
          <span v-else-if="emailStatus === 'checking'" class="mt-1 block text-[11px] text-gray-500">Checking email…</span>
          <span v-if="exampleDomain" class="mt-1 block text-[11px] text-amber-700">example.com is not a valid email domain, so no message will be sent.</span>
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Phone
          <input v-model="form.phoneNumber" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Role
          <select v-model.number="form.roleId" required class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" @change="onRoleChange">
            <option disabled value="">Select role</option>
            <option v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</option>
          </select>
        </label>
      </div>

      <div v-if="showCouncil" class="grid gap-3 sm:grid-cols-3">
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Region
          <select v-model="form.assignedRegion" required class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" @change="onRegionChange">
            <option value="">Select region</option>
            <option v-for="region in regions" :key="region" :value="region">{{ region }}</option>
          </select>
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          District
          <select v-model="form.assignedDistrict" required class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" @change="onDistrictChange">
            <option value="">Select district</option>
            <option v-for="district in districts" :key="district" :value="district">{{ district }}</option>
          </select>
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300">
          Council
          <select v-model="form.assignedCouncil" required class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100">
            <option value="">Select council</option>
            <option v-for="council in councils" :key="council" :value="council">{{ council }}</option>
          </select>
        </label>
      </div>
      <p v-if="hierarchyError" class="text-xs text-amber-700">{{ hierarchyError }}</p>

      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4 dark:border-ucs-800">
        <div class="flex flex-wrap gap-2">
          <Button type="button" label="Password reset" icon="pi pi-key" severity="secondary" outlined :loading="resetting" @click="confirmReset" />
          <Button type="button" label="Deactivate" icon="pi pi-user-minus" severity="danger" :loading="deactivating" @click="confirmDeactivate" />
        </div>
        <div class="flex gap-2">
          <Button type="button" label="Close" severity="secondary" text @click="visible = false" />
          <Button type="submit" label="Update details" icon="pi pi-check" :loading="saving" />
        </div>
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useManagerEmailCheck } from '@/utils/managerEmailAvailability'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

export interface ManagerRow {
  id: string
  email?: string
  firstName?: string
  middleName?: string
  lastName?: string
  phoneNumber?: string
  role?: string
  roleId?: number | null
  roleName?: string
  councilAssignment?: string
  assignedRegion?: string
  assignedDistrict?: string
  assignedCouncil?: string
  status?: string
  lastLogin?: string
  joinDate?: string
}

interface RoleOption {
  id: number
  name: string
}

interface RegionNode {
  name?: string
  districts?: Record<string, { name?: string; councils?: Record<string, { name?: string }> }>
}
interface Hierarchy {
  [country: string]: { zones?: Record<string, { regions?: Record<string, RegionNode> }> }
}

const props = defineProps<{
  mode: 'view' | 'edit'
  user: ManagerRow | null
}>()
const visible = defineModel<boolean>('visible', { default: false })
const emit = defineEmits<{ saved: [] }>()

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()
const saving = ref(false)
const resetting = ref(false)
const deactivating = ref(false)
const roles = ref<RoleOption[]>([])
const hierarchy = ref<Hierarchy>({})
const regions = ref<string[]>([])
const districts = ref<string[]>([])
const councils = ref<string[]>([])
const hierarchyError = ref('')

const form = ref({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  roleId: '' as number | '',
  assignedRegion: '',
  assignedDistrict: '',
  assignedCouncil: '',
})

const isSelf = computed(() => props.user?.id && auth.user?.id === props.user.id)
const selectedRole = computed(() => roles.value.find((role) => role.id === Number(form.value.roleId)))
const showCouncil = computed(() => selectedRole.value?.name === 'COUNCIL_COORDINATOR' || props.user?.roleName === 'COUNCIL_COORDINATOR' && !roles.value.length)
const fullName = computed(() => [props.user?.firstName, props.user?.middleName, props.user?.lastName].filter((part) => part && part !== '—').join(' ') || '—')
const initials = computed(() => fullName.value.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase())

const viewFields = computed(() => [
  { label: 'Role', value: display(props.user?.roleName || props.user?.role) },
  { label: 'Phone', value: display(props.user?.phoneNumber) },
  { label: 'Council', value: display(props.user?.councilAssignment) },
  { label: 'Status', value: display(props.user?.status) },
  { label: 'Joined', value: formatWhen(props.user?.joinDate) },
  { label: 'Last login', value: formatWhen(props.user?.lastLogin) },
])

function display(value: unknown) {
  const text = value == null ? '' : String(value).trim()
  return text && text !== '—' ? text : '—'
}

function formatWhen(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function eachRegion(fn: (region: RegionNode) => void) {
  for (const country of Object.values(hierarchy.value)) {
    for (const zone of Object.values(country.zones ?? {})) {
      for (const region of Object.values(zone.regions ?? {})) fn(region)
    }
  }
}

function fillDistricts() {
  const names = new Set<string>()
  eachRegion((region) => {
    if (region.name !== form.value.assignedRegion) return
    for (const district of Object.values(region.districts ?? {})) {
      if (district.name) names.add(district.name)
    }
  })
  districts.value = [...names].sort()
}

function fillCouncils() {
  const names = new Set<string>()
  eachRegion((region) => {
    if (region.name !== form.value.assignedRegion) return
    for (const district of Object.values(region.districts ?? {})) {
      if (district.name !== form.value.assignedDistrict) continue
      for (const council of Object.values(district.councils ?? {})) {
        if (council.name) names.add(council.name)
      }
    }
  })
  councils.value = [...names].sort()
}

function onRegionChange() {
  form.value.assignedDistrict = ''
  form.value.assignedCouncil = ''
  councils.value = []
  fillDistricts()
}

function onDistrictChange() {
  form.value.assignedCouncil = ''
  fillCouncils()
}

function onRoleChange() {
  if (selectedRole.value?.name === 'COUNCIL_COORDINATOR') {
    void loadHierarchy()
    return
  }
  form.value.assignedRegion = ''
  form.value.assignedDistrict = ''
  form.value.assignedCouncil = ''
}

async function loadRoles() {
  const response = await auth.apiClient.get<{ data?: RoleOption[] }>('/user/roles')
  roles.value = response.data?.data ?? []
}

async function loadHierarchy() {
  hierarchyError.value = ''
  try {
    const response = await auth.apiClient.get<{ data?: Hierarchy }>('/openmrs/location/hierarchy/grouped')
    hierarchy.value = response.data?.data ?? {}
    const names = new Set<string>()
    eachRegion((region) => {
      if (region.name) names.add(region.name)
    })
    regions.value = [...names].sort()
    fillDistricts()
    fillCouncils()
  } catch {
    hierarchyError.value = 'Could not load the council list.'
  }
}

function applyUser(row: ManagerRow | null) {
  form.value = {
    firstName: row?.firstName && row.firstName !== '—' ? row.firstName : '',
    middleName: row?.middleName && row.middleName !== '—' ? row.middleName : '',
    lastName: row?.lastName && row.lastName !== '—' ? row.lastName : '',
    email: row?.email || '',
    phoneNumber: row?.phoneNumber && row.phoneNumber !== '—' ? row.phoneNumber : '',
    roleId: row?.roleId ?? '',
    assignedRegion: row?.assignedRegion || '',
    assignedDistrict: row?.assignedDistrict || '',
    assignedCouncil: row?.assignedCouncil || '',
  }
}

const managerEmail = computed(() => form.value.email)
const emailChanged = computed(
  () => managerEmail.value.trim().toLowerCase() !== (props.user?.email || '').trim().toLowerCase(),
)
const exampleDomain = computed(() => managerEmail.value.trim().toLowerCase().endsWith('@example.com'))
const excludeEmailOwnerId = computed(() => props.user?.id)
const { status: emailStatus } = useManagerEmailCheck(auth.apiClient, managerEmail, excludeEmailOwnerId)

async function saveDetails() {
  if (!props.user?.id) return
  if (emailStatus.value === 'taken' || emailStatus.value === 'invalid') {
    toast.add({
      severity: 'error',
      summary: 'Email unavailable',
      detail: emailStatus.value === 'taken'
        ? 'This email is already used for a manager login.'
        : 'Enter a valid email address.',
      life: 4000,
    })
    return
  }
  saving.value = true
  try {
    const response = await auth.apiClient.put<{ message?: string }>(`/user/admin/manager/${props.user.id}`, {
      ...form.value,
      roleId: Number(form.value.roleId),
    })
    toast.add({ severity: 'success', summary: 'Manager user', detail: response.data?.message || 'Saved.', life: 4000 })
    emit('saved')
    visible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Manager user',
      detail: typeof error === 'string' ? error : 'Could not save the user.',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

function confirmReset() {
  if (!props.user?.id) return
  if ((props.user.email || '').trim().toLowerCase().endsWith('@example.com')) {
    toast.add({
      severity: 'warn',
      summary: 'Password reset',
      detail: 'The email domain is not valid, so the password reset was not sent.',
      life: 5000,
    })
    return
  }
  confirm.require({
    header: 'Send password reset',
    message: `Send a one-time password link to ${props.user.email}? Their current password stays active until they use the link.`,
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Send link',
    rejectLabel: 'Cancel',
    accept: () => {
      void sendReset()
    },
  })
}

function confirmDeactivate() {
  if (!props.user?.id) return
  const name = [props.user.firstName, props.user.lastName].filter(Boolean).join(' ') || props.user.email || 'this account'
  const self = props.user.id === auth.user?.id
  confirm.require({
    header: 'Deactivate account',
    message: self
      ? 'Deactivate your account? You will be signed out. The email can be used for a new account.'
      : `Deactivate ${name}? They cannot sign in. The email can be used for a new account.`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: { label: 'Cancel', severity: 'secondary', outlined: true },
    acceptProps: { label: 'Deactivate', severity: 'danger' },
    accept: () => {
      void deactivateAccount()
    },
  })
}

async function deactivateAccount() {
  if (!props.user?.id) return
  const self = props.user.id === auth.user?.id
  deactivating.value = true
  try {
    await auth.apiClient.post(`/user/admin/manager/${props.user.id}/deactivate`, {})
    visible.value = false
    emit('saved')
    if (self) {
      await auth.logout(router, toast)
      return
    }
    toast.add({ severity: 'success', summary: 'Deactivated', detail: 'The account is closed. The email can be used again.', life: 4000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Deactivate',
      detail: typeof error === 'string' ? error : 'Could not deactivate the account.',
      life: 5000,
    })
  } finally {
    deactivating.value = false
  }
}

async function sendReset() {
  if (!props.user?.id) return
  resetting.value = true
  try {
    const response = await auth.apiClient.post<{ message?: string }>(`/user/admin/manager/${props.user.id}/password-reset`, {})
    toast.add({ severity: 'success', summary: 'Password reset', detail: response.data?.message || 'Reset email sent.', life: 5000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Password reset',
      detail: typeof error === 'string' ? error : (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not send the reset email.',
      life: 5000,
    })
  } finally {
    resetting.value = false
  }
}

watch(
  () => [visible.value, props.mode, props.user?.id] as const,
  async ([open, mode]) => {
    if (!open) return
    applyUser(props.user)
    if (mode !== 'edit') return
    try {
      await loadRoles()
      if (showCouncil.value) await loadHierarchy()
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Manager user',
        detail: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not load roles.',
        life: 4000,
      })
    }
  },
)
</script>
