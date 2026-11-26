<template>
  <Dialog v-model:visible="visible" modal header="My profile" :style="{ width: 'min(96vw, 520px)' }">
    <form class="space-y-4" @submit.prevent="saveProfile">
      <p class="text-xs text-gray-500">Your role stays {{ auth.user?.role || 'unchanged' }}. An administrator changes roles.</p>
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
          Phone
          <input v-model="form.phoneNumber" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
        </label>
        <label class="block text-xs text-gray-600 dark:text-gray-300 sm:col-span-2">
          Email
          <input v-model="form.email" type="email" required class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
          <span v-if="emailStatus === 'taken'" class="mt-1 block text-[11px] text-red-600">This email is already used for a manager login.</span>
          <span v-else-if="emailStatus === 'invalid'" class="mt-1 block text-[11px] text-amber-700">Enter a valid email address.</span>
          <span v-else-if="emailStatus === 'available' && emailChanged" class="mt-1 block text-[11px] text-green-700">Email is available.</span>
          <span v-else-if="emailStatus === 'checking'" class="mt-1 block text-[11px] text-gray-500">Checking email…</span>
          <span v-if="exampleDomain" class="mt-1 block text-[11px] text-amber-700">example.com is not a valid email domain, so no message will be sent.</span>
        </label>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4 dark:border-ucs-800">
        <Button type="button" label="Change password" icon="pi pi-key" severity="secondary" outlined @click="askPasswordChange" />
        <div class="flex gap-2">
          <Button type="button" label="Close" severity="secondary" text @click="visible = false" />
          <Button type="submit" label="Save profile" icon="pi pi-check" :loading="saving" />
        </div>
      </div>
    </form>
  </Dialog>

  <Dialog v-model:visible="passwordOpen" modal header="Change password" :style="{ width: 'min(96vw, 420px)' }">
    <form class="space-y-3" @submit.prevent="askConfirmPassword">
      <label class="block text-xs text-gray-600 dark:text-gray-300">
        Current password
        <input v-model="passwordForm.currentPassword" type="password" required autocomplete="current-password" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
      </label>
      <label class="block text-xs text-gray-600 dark:text-gray-300">
        New password
        <input v-model="passwordForm.newPassword" type="password" required minlength="8" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
      </label>
      <label class="block text-xs text-gray-600 dark:text-gray-300">
        Confirm new password
        <input v-model="passwordForm.confirmPassword" type="password" required minlength="8" autocomplete="new-password" class="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
      </label>
      <p class="text-[11px] text-gray-500">At least 8 characters, with uppercase, lowercase, a number, and one of !@#$%^&*.</p>
      <div class="flex justify-end gap-2">
        <Button type="button" label="Cancel" severity="secondary" text @click="passwordOpen = false" />
        <Button type="submit" label="Change password" icon="pi pi-check" :loading="changingPassword" />
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { useManagerEmailCheck } from '@/utils/managerEmailAvailability'

const visible = defineModel<boolean>('visible', { default: false })
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const saving = ref(false)
const changingPassword = ref(false)
const passwordOpen = ref(false)
const form = ref({ firstName: '', middleName: '', lastName: '', email: '', phoneNumber: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const profileEmail = computed(() => form.value.email)
const emailChanged = computed(
  () => profileEmail.value.trim().toLowerCase() !== (auth.user?.email || '').trim().toLowerCase(),
)
const exampleDomain = computed(() => profileEmail.value.trim().toLowerCase().endsWith('@example.com'))
const { status: emailStatus } = useManagerEmailCheck(auth.apiClient, profileEmail, undefined, '/user/me/email-available')

function fillForm() {
  const user = auth.user
  form.value = {
    firstName: user?.firstName || '',
    middleName: user?.middleName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
  }
}

watch(visible, async (open) => {
  if (!open) return
  await auth.fetchProfile()
  fillForm()
})

async function saveProfile() {
  if (emailStatus.value === 'taken' || emailStatus.value === 'invalid') {
    toast.add({
      severity: 'error',
      summary: 'Email unavailable',
      detail: emailStatus.value === 'taken' ? 'This email is already used for a manager login.' : 'Enter a valid email address.',
      life: 4000,
    })
    return
  }
  saving.value = true
  try {
    await auth.apiClient.put('/user/me/profile', form.value)
    await auth.fetchProfile()
    toast.add({ severity: 'success', summary: 'Profile', detail: 'Profile updated.', life: 3000 })
    visible.value = false
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Profile',
      detail: typeof error === 'string' ? error : 'Could not update your profile.',
      life: 5000,
    })
  } finally {
    saving.value = false
  }
}

function askPasswordChange() {
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  passwordOpen.value = true
}

function askConfirmPassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toast.add({ severity: 'error', summary: 'Password', detail: 'The two passwords do not match.', life: 4000 })
    return
  }
  confirm.require({
    header: 'Change password',
    message: 'Replace your current password with the new one?',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Change password',
    rejectLabel: 'Cancel',
    accept: () => {
      void changePassword()
    },
  })
}

async function changePassword() {
  changingPassword.value = true
  try {
    await auth.apiClient.put('/user/me/password', passwordForm.value)
    passwordOpen.value = false
    toast.add({ severity: 'success', summary: 'Password', detail: 'Password changed.', life: 3000 })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Password',
      detail: typeof error === 'string' ? error : 'Could not change your password.',
      life: 5000,
    })
  } finally {
    changingPassword.value = false
  }
}
</script>
