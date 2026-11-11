<template>
  <div class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Activations by category</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Activations grouped by category.
        </p>
        <p v-if="scopeLabel" class="mt-1 text-xs text-ucs-700 dark:text-ucs-300">
          Filtered to {{ scopeLabel }}.
        </p>
        <p v-else-if="!councilLocked" class="mt-1 text-xs text-gray-400">
          All councils. Choose a council under Resend location to narrow this list.
        </p>
      </div>
      <button type="button" class="rounded-lg border border-gray-300 dark:border-ucs-700 px-3 py-1.5 text-sm"
        :disabled="loading" @click="reload">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <button v-for="cat in categories" :key="cat.id" type="button"
        class="rounded-full px-3 py-1.5 text-xs font-medium border transition-colors" :class="activeCategory === cat.id
            ? 'border-ucs-500 bg-ucs-500 text-white'
            : 'border-gray-300 dark:border-ucs-700 text-gray-700 dark:text-ucs-200 hover:border-ucs-400'
          " @click="openCategory(cat.id)">
        {{ cat.label }}
      </button>
    </div>

    <div v-if="panelOpen" class="rounded-lg border border-ucs-200 dark:border-ucs-700 overflow-hidden">
      <div class="flex items-center justify-between gap-2 bg-ucs-50 dark:bg-ucs-950/40 px-3 py-2">
        <p class="text-sm font-medium text-gray-800 dark:text-ucs-100">{{ activeLabel }}</p>
        <button type="button" class="text-xs text-gray-500 hover:text-gray-800"
          @click="panelOpen = false">Close</button>
      </div>
      <div class="max-h-96 overflow-auto">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-gray-50 dark:bg-ucs-900 text-xs uppercase text-gray-500">
            <tr>
              <th v-for="col in columns" :key="col.key" class="px-3 py-2"
                :class="col.align === 'right' ? 'text-right' : 'text-left'">
                {{ col.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-t border-gray-100 dark:border-ucs-800">
              <td v-for="col in columns" :key="col.key" class="px-3 py-2" :class="cellClass(col)">
                <template v-if="col.key === 'action'">
                  <button v-if="canResendRow(row)" type="button"
                    class="rounded-md bg-ucs-500 px-2 py-1 text-xs text-white hover:bg-ucs-600 disabled:opacity-50"
                    :disabled="resendingId === row.id" @click="resendRow(row)">
                    {{ resendingId === row.id ? '…' : 'Resend' }}
                  </button>
                  <span v-else class="text-xs text-gray-400">—</span>
                </template>
                <template v-else>{{ cellValue(row, col.key) }}</template>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !rows.length" class="p-4 text-sm text-gray-500">No rows in this category.</p>
      </div>
      <div v-if="total > rows.length"
        class="flex justify-between items-center px-3 py-2 border-t text-xs text-gray-500">
        <span>Showing {{ rows.length }} of {{ total }}</span>
        <button v-if="rows.length < total" type="button" class="text-ucs-600 hover:underline" :disabled="loading"
          @click="loadMore">
          Load more
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

export type ActivationCategory = 'open' | 'expired' | 'expired_resent' | 'activated'

const props = defineProps<{
  querySuffix?: string
  scopeLabel?: string
  councilLocked?: boolean
}>()

const emit = defineEmits<{
  activationChanged: []
}>()

const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

interface ActivationRow {
  id: number
  email: string | null
  fullName: string | null
  createdAt: string
  expiryDate: string
  firstSentAt?: string | null
  lastSentAt?: string | null
  firstExpiredAt?: string | null
  usedAt?: string | null
  activatedAt?: string | null
  isUsed: boolean
  isResent: boolean
  resendCount: number
}

type ColumnKey =
  | 'name'
  | 'email'
  | 'sentOn'
  | 'expiresOn'
  | 'expiredOn'
  | 'firstSentOn'
  | 'lastSentOn'
  | 'activatedOn'
  | 'resends'
  | 'action'

const categories: { id: ActivationCategory; label: string }[] = [
  { id: 'open', label: 'Open (valid slug)' },
  { id: 'expired', label: 'Expired' },
  { id: 'expired_resent', label: 'Resent' },
  { id: 'activated', label: 'Activated' },
]

const columnsByCategory: Record<ActivationCategory, { key: ColumnKey; label: string; align?: 'right' }[]> = {
  open: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'sentOn', label: 'Sent on' },
    { key: 'expiresOn', label: 'Expires on' },
    { key: 'resends', label: 'Resends', align: 'right' },
    { key: 'action', label: 'Action', align: 'right' },
  ],
  expired: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'sentOn', label: 'Sent on' },
    { key: 'expiredOn', label: 'Expired on' },
    { key: 'action', label: 'Action', align: 'right' },
  ],
  expired_resent: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'firstSentOn', label: 'First sent on' },
    { key: 'expiredOn', label: 'Expired on' },
    { key: 'lastSentOn', label: 'Last sent on' },
    { key: 'resends', label: 'Resends', align: 'right' },
  ],
  activated: [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'sentOn', label: 'Sent on' },
    { key: 'activatedOn', label: 'Activated on' },
    { key: 'resends', label: 'Resends', align: 'right' },
  ],
}

const activeCategory = ref<ActivationCategory>('open')
const panelOpen = ref(false)
const rows = ref<ActivationRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const resendingId = ref<number | null>(null)
let fetchSerial = 0

const activeLabel = computed(
  () => categories.find((c) => c.id === activeCategory.value)?.label ?? 'Activations',
)

const columns = computed(() => columnsByCategory[activeCategory.value])

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

function cellClass(col: { key: ColumnKey; align?: 'right' }) {
  return [
    col.align === 'right' ? 'text-right' : 'text-left',
    col.key === 'email' ? 'font-mono text-xs' : '',
    col.key === 'resends' ? 'tabular-nums' : '',
    col.key !== 'name' && col.key !== 'action' ? 'text-xs' : '',
  ]
}

function cellValue(row: ActivationRow, key: ColumnKey) {
  switch (key) {
    case 'name':
      return row.fullName || '—'
    case 'email':
      return row.email || '—'
    case 'sentOn':
      return formatDate(row.createdAt)
    case 'expiresOn':
      return formatDate(row.expiryDate)
    case 'expiredOn':
      return formatDate(activeCategory.value === 'expired_resent' ? row.firstExpiredAt : row.expiryDate)
    case 'firstSentOn':
      return formatDate(row.firstSentAt || row.createdAt)
    case 'lastSentOn':
      return formatDate(row.lastSentAt || row.createdAt)
    case 'activatedOn':
      return formatDate(row.activatedAt || row.usedAt)
    case 'resends':
      return String(row.resendCount ?? 0)
    default:
      return ''
  }
}

const PLACEHOLDER_EMAILS = new Set(['unknown@example.com'])

function isPlaceholderEmail(email: string | null | undefined) {
  return PLACEHOLDER_EMAILS.has(String(email || '').trim().toLowerCase())
}

function canResendRow(row: ActivationRow) {
  if (row.isUsed) return false
  if (isPlaceholderEmail(row.email)) return false
  const open = new Date(row.expiryDate) >= new Date()
  if (open) return auth.hasPermission('activations:resend')
  return !row.isResent && auth.hasPermission('activations:resend')
}

async function fetchPage(append = false) {
  const serial = ++fetchSerial
  loading.value = true
  try {
    const qs = new URLSearchParams({
      category: activeCategory.value,
      page: String(page.value),
      limit: '25',
    })
    const suffix = props.querySuffix?.replace(/^\?/, '') ?? ''
    if (suffix) {
      for (const part of suffix.split('&')) {
        const [k, v] = part.split('=')
        if (k && v) qs.set(k, decodeURIComponent(v))
      }
    }
    const res = await auth.apiClient.get<{
      data?: { rows?: ActivationRow[]; total?: number }
    }>(`/user/admin/activation-list?${qs}`)
    if (serial !== fetchSerial) return
    const data = res.data?.data
    const newRows = data?.rows ?? []
    rows.value = append ? [...rows.value, ...newRows] : newRows
    total.value = data?.total ?? newRows.length
  } catch (error) {
    if (serial !== fetchSerial) return
    toast.add({
      severity: 'error',
      summary: 'Could not load activations',
      detail: error instanceof Error ? error.message : String(error),
      life: 4000,
    })
  } finally {
    if (serial === fetchSerial) loading.value = false
  }
}

function loadOpenCategory() {
  activeCategory.value = 'open'
  panelOpen.value = true
  page.value = 1
  void fetchPage(false)
}

function openCategory(id: ActivationCategory) {
  activeCategory.value = id
  panelOpen.value = true
  page.value = 1
  void fetchPage(false)
}

function reload() {
  page.value = 1
  void fetchPage(false)
}

function loadMore() {
  page.value += 1
  void fetchPage(true)
}

watch(
  () => props.querySuffix,
  (suffix) => {
    if (!suffix) {
      if (!panelOpen.value) return
      page.value = 1
      void fetchPage(false)
      return
    }
    if (!panelOpen.value) {
      loadOpenCategory()
      return
    }
    page.value = 1
    void fetchPage(false)
  },
)

onMounted(() => {
  if (props.querySuffix || props.councilLocked) loadOpenCategory()
})

function resendRow(row: ActivationRow) {
  const open = new Date(row.expiryDate) >= new Date()
  const runResend = async (confirmOpen: boolean) => {
    resendingId.value = row.id
    try {
      await auth.apiClient.post(`/user/admin/activation-resend/${row.id}`, { confirmOpen })
      toast.add({ severity: 'success', summary: 'Activation resent', life: 2500 })
      await fetchPage(false)
      emit('activationChanged')
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Resend failed',
        detail: typeof error === 'string' ? error : 'Request failed',
        life: 4500,
      })
    } finally {
      resendingId.value = null
    }
  }

  if (open) {
    confirm.require({
      message:
        'This activation slug is still valid. Resending may confuse the CHW. Continue?',
      header: 'Confirm open-slug resend',
      icon: 'pi pi-exclamation-triangle',
      accept: () => void runResend(true),
    })
  } else {
    void runResend(false)
  }
}
</script>
