<template>
  <section class="flex flex-col gap-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ucs-700 dark:text-ucs-200">Email Control</h2>
        <p class="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
          Delivery and provider.
        </p>
      </div>
      <button type="button" :disabled="loading"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-ucs-400 dark:border-ucs-700 dark:text-ucs-200"
        @click="load">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </div>

    <p v-if="settings && settings.persisted === false"
      class="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      Email settings table is missing. Run the latest migration.
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-ucs-800 dark:bg-ucs-900/40">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Sending mode</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              On sends mail. Off records it only.
            </p>
          </div>
          <button type="button" :disabled="loading || saving || !settings"
            class="inline-flex min-w-44 items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-medium disabled:opacity-50"
            :class="settings?.allowSending
              ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200'
              : 'border-gray-300 bg-gray-50 text-gray-700 dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-200'"
            @click="setSending(!settings?.allowSending)">
            <span class="relative inline-flex h-5 w-9 items-center rounded-full border"
              :class="settings?.allowSending ? 'border-green-500 bg-green-100' : 'border-gray-400 bg-gray-100 dark:bg-ucs-900'">
              <span class="inline-block h-4 w-4 rounded-full transition-transform"
                :class="settings?.allowSending ? 'translate-x-4 bg-green-500' : 'translate-x-0.5 bg-gray-400'" />
            </span>
            {{ settings?.allowSending ? 'Sending on' : 'Sending off' }}
          </button>
        </div>
        <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Environment default is {{ settings?.envAllowSending ? 'on' : 'off' }}.
          <span v-if="settings?.updatedAt"> Last saved {{ formatWhen(settings.updatedAt) }}<span v-if="settings.updatedBy"> by {{ settings.updatedBy }}</span>.</span>
        </p>
      </article>

      <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-ucs-800 dark:bg-ucs-900/40">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Provider</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Gmail or eGA. Current: <span class="font-medium text-gray-800 dark:text-ucs-100">{{ providerLabel(settings?.provider) }}</span>.
          Environment: {{ providerLabel(settings?.envProvider) }}.
        </p>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <button v-for="option in providerOptions" :key="option.id" type="button" :disabled="saving || loading"
            class="rounded-xl border px-3 py-3 text-left disabled:opacity-50"
            :class="settings?.provider === option.id
              ? 'border-ucs-500 bg-ucs-50 dark:bg-ucs-950'
              : 'border-gray-200 hover:border-ucs-300 dark:border-ucs-800'"
            @click="setProvider(option.id)">
            <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ option.label }}</span>
            <span class="mt-1 block text-xs" :class="option.ready ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'">
              {{ option.ready ? 'Credentials present' : 'Credentials missing in environment' }}
            </span>
            <span class="mt-1 block text-[0.7rem] text-gray-500">{{ option.detail }}</span>
          </button>
        </div>
      </article>
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <article v-for="card in statCards" :key="card.key" class="rounded-xl border border-gray-200 bg-white p-4 dark:border-ucs-800 dark:bg-ucs-900/40">
        <p class="text-[0.7rem] uppercase tracking-wide text-gray-500">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold" :class="card.color">{{ settings?.stats?.[card.key] ?? '—' }}</p>
      </article>
    </div>

    <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-ucs-800 dark:bg-ucs-900/40">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Send a test</h3>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        One message with the current settings.
      </p>
      <form class="mt-3 flex flex-col gap-2 sm:flex-row" @submit.prevent="sendTest">
        <input v-model="testTo" type="email" required placeholder="recipient@example.com"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-ucs-700 dark:bg-ucs-950 dark:text-ucs-100" />
        <button type="submit" :disabled="testing || !testTo"
          class="rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-50">
          {{ testing ? 'Sending…' : 'Send test' }}
        </button>
      </form>
    </article>

    <article class="rounded-xl border border-gray-200 bg-white p-5 dark:border-ucs-800 dark:bg-ucs-900/40">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Recent deliveries</h3>
      <p v-if="!settings?.activity?.length" class="mt-2 text-xs text-gray-500">No deliveries yet.</p>
      <div v-else class="mt-3 overflow-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="text-gray-500">
            <tr>
              <th class="px-2 py-2 font-medium">When</th>
              <th class="px-2 py-2 font-medium">To</th>
              <th class="px-2 py-2 font-medium">Subject</th>
              <th class="px-2 py-2 font-medium">Provider</th>
              <th class="px-2 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in settings.activity" :key="row.id" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-2 py-2 whitespace-nowrap text-gray-600 dark:text-gray-300">{{ formatWhen(row.createdAt) }}</td>
              <td class="px-2 py-2">{{ row.to }}</td>
              <td class="px-2 py-2">{{ row.subject }}</td>
              <td class="px-2 py-2">{{ providerLabel(row.provider) }}</td>
              <td class="px-2 py-2">
                <span class="rounded-full px-2 py-0.5 font-medium" :class="modeClass(row.mode)">{{ row.mode }}</span>
                <span v-if="row.detail" class="mt-1 block text-[0.7rem] text-gray-500">{{ row.detail }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <p>{{ activityRange }}</p>
          <div v-if="activityMeta.totalPages > 1" class="flex items-center gap-2">
            <button type="button" :disabled="activityMeta.page <= 1 || loading"
              class="rounded-lg border border-gray-300 px-2 py-1 text-gray-700 disabled:opacity-40 dark:border-ucs-700 dark:text-ucs-100"
              @click="goToActivityPage(activityMeta.page - 1)">
              Previous
            </button>
            <span>Page {{ activityMeta.page }} of {{ activityMeta.totalPages }}</span>
            <button type="button" :disabled="activityMeta.page >= activityMeta.totalPages || loading"
              class="rounded-lg border border-gray-300 px-2 py-1 text-gray-700 disabled:opacity-40 dark:border-ucs-700 dark:text-ucs-100"
              @click="goToActivityPage(activityMeta.page + 1)">
              Next
            </button>
          </div>
        </div>
      </div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

interface EmailActivity {
  id: number
  to: string
  subject: string
  provider: string
  mode: string
  detail?: string | null
  createdAt: string
}

interface EmailControlSettings {
  allowSending: boolean
  provider: 'gmail' | 'ega'
  envAllowSending: boolean
  envProvider: 'gmail' | 'ega'
  updatedAt: string | null
  updatedBy: string | null
  persisted: boolean
  health: {
    gmailConfigured: boolean
    egaConfigured: boolean
    gmailFrom: string
    egaFromName: string
    egaHost: string | null
  }
  stats: { open: number; expired: number; resent: number; activated: number }
  activity: EmailActivity[]
  activityPage?: { page: number; pageSize: number; total: number; totalPages: number }
}

const auth = useAuthStore()
const toast = useToast()
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const settings = ref<EmailControlSettings | null>(null)
const testTo = ref(auth.user?.email || '')

const providerOptions = computed(() => [
  {
    id: 'gmail' as const,
    label: 'Gmail',
    ready: Boolean(settings.value?.health.gmailConfigured),
    detail: settings.value?.health.gmailFrom ? `From ${settings.value.health.gmailFrom}` : 'EMAIL_USERNAME and EMAIL_PASSWORD',
  },
  {
    id: 'ega' as const,
    label: 'eGA',
    ready: Boolean(settings.value?.health.egaConfigured),
    detail: settings.value?.health.egaHost
      ? `${settings.value.health.egaFromName} via ${settings.value.health.egaHost}`
      : 'EGA_SMTP_HOST and EGA mailbox',
  },
])

const ACTIVITY_PAGE_SIZE = 20
const activityPage = ref(1)

const activityMeta = computed(() => ({
  page: settings.value?.activityPage?.page ?? activityPage.value,
  pageSize: settings.value?.activityPage?.pageSize ?? ACTIVITY_PAGE_SIZE,
  total: settings.value?.activityPage?.total ?? settings.value?.activity?.length ?? 0,
  totalPages: settings.value?.activityPage?.totalPages ?? 1,
}))

const activityRange = computed(() => {
  const { page, pageSize, total } = activityMeta.value
  if (!total) return ''
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return `${start}–${end} of ${total}`
})

const statCards = [
  { key: 'open' as const, label: 'Open activations', color: 'text-ucs-700 dark:text-ucs-100' },
  { key: 'expired' as const, label: 'Expired, never resent', color: 'text-red-600' },
  { key: 'resent' as const, label: 'Resent, unused', color: 'text-amber-600' },
  { key: 'activated' as const, label: 'Activated', color: 'text-green-600' },
]

function providerLabel(value?: string) {
  if (value === 'ega') return 'eGA'
  if (value === 'gmail') return 'Gmail'
  return '—'
}

function formatWhen(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function modeClass(mode: string) {
  if (mode === 'sent') return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
  if (mode === 'failed') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
  return 'bg-gray-100 text-gray-700 dark:bg-ucs-950 dark:text-ucs-200'
}

function goToActivityPage(page: number) {
  activityPage.value = page
  void load(page)
}

async function load(page = activityPage.value) {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ACTIVITY_PAGE_SIZE),
    })
    const response = await auth.apiClient.get<{ data?: EmailControlSettings }>(`/user/admin/email-control?${params}`)
    settings.value = response.data?.data ?? null
    activityPage.value = settings.value?.activityPage?.page ?? page
    if (!testTo.value && auth.user?.email) testTo.value = auth.user.email
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Email control',
      detail: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not load email control.',
      life: 4000,
    })
  } finally {
    loading.value = false
  }
}

async function save(body: { allowSending?: boolean; provider?: 'gmail' | 'ega' }) {
  saving.value = true
  try {
    await auth.apiClient.put('/user/admin/email-control', body)
    toast.add({ severity: 'success', summary: 'Email control', detail: 'Saved.', life: 2500 })
    await load()
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Email control',
      detail: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not save.',
      life: 4000,
    })
    await load()
  } finally {
    saving.value = false
  }
}

function setSending(allowSending: boolean) {
  void save({ allowSending })
}

function setProvider(provider: 'gmail' | 'ega') {
  if (settings.value?.provider === provider) return
  void save({ provider })
}

async function sendTest() {
  testing.value = true
  try {
    const response = await auth.apiClient.post<{ data?: { simulated?: boolean } }>('/user/admin/email-control/test', {
      to: testTo.value,
    })
    const simulated = response.data?.data?.simulated
    toast.add({
      severity: simulated ? 'info' : 'success',
      summary: 'Test email',
      detail: simulated ? 'Simulated. Sending is off, so nothing was delivered.' : `Sent to ${testTo.value}.`,
      life: 4000,
    })
    activityPage.value = 1
    await load(1)
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Test email',
      detail: (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Test failed.',
      life: 4000,
    })
  } finally {
    testing.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
