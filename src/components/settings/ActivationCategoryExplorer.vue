<template>
  <div class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Activations by category</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Open slugs need confirmation before resend. Resend count is shown per account.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-gray-300 dark:border-ucs-700 px-3 py-1.5 text-sm"
        :disabled="loading"
        @click="reload">
        {{ loading ? 'Loading…' : 'Refresh' }}
      </button>
    </div>

    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-medium border transition-colors"
        :class="
          activeCategory === cat.id
            ? 'border-ucs-500 bg-ucs-500 text-white'
            : 'border-gray-300 dark:border-ucs-700 text-gray-700 dark:text-ucs-200 hover:border-ucs-400'
        "
        @click="openCategory(cat.id)">
        {{ cat.label }}
      </button>
    </div>

    <div v-if="panelOpen" class="rounded-lg border border-ucs-200 dark:border-ucs-700 overflow-hidden">
      <div class="flex items-center justify-between gap-2 bg-ucs-50 dark:bg-ucs-950/40 px-3 py-2">
        <p class="text-sm font-medium text-gray-800 dark:text-ucs-100">{{ activeLabel }}</p>
        <button type="button" class="text-xs text-gray-500 hover:text-gray-800" @click="panelOpen = false">Close</button>
      </div>
      <div class="max-h-96 overflow-auto">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-gray-50 dark:bg-ucs-900 text-xs uppercase text-gray-500">
            <tr>
              <th class="px-3 py-2 text-left">Name</th>
              <th class="px-3 py-2 text-left">Email</th>
              <th class="px-3 py-2 text-left">Expires</th>
              <th class="px-3 py-2 text-right">Resends</th>
              <th class="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-t border-gray-100 dark:border-ucs-800">
              <td class="px-3 py-2">{{ row.fullName || '—' }}</td>
              <td class="px-3 py-2 font-mono text-xs">{{ row.email }}</td>
              <td class="px-3 py-2 text-xs">{{ formatDate(row.expiryDate) }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ row.resendCount ?? 0 }}</td>
              <td class="px-3 py-2 text-right">
                <button
                  v-if="canResendRow(row)"
                  type="button"
                  class="rounded-md bg-ucs-500 px-2 py-1 text-xs text-white hover:bg-ucs-600 disabled:opacity-50"
                  :disabled="resendingId === row.id"
                  @click="resendRow(row)">
                  {{ resendingId === row.id ? '…' : 'Resend' }}
                </button>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!loading && !rows.length" class="p-4 text-sm text-gray-500">No rows in this category.</p>
      </div>
      <div v-if="total > rows.length" class="flex justify-between items-center px-3 py-2 border-t text-xs text-gray-500">
        <span>Showing {{ rows.length }} of {{ total }}</span>
        <button
          v-if="rows.length < total"
          type="button"
          class="text-ucs-600 hover:underline"
          :disabled="loading"
          @click="loadMore">
          Load more
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

export type ActivationCategory = 'open' | 'expired' | 'expired_resent' | 'activated'

const props = defineProps<{
  querySuffix?: string
  councilLocked?: boolean
}>()

const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

interface ActivationRow {
  id: number
  email: string | null
  fullName: string | null
  expiryDate: string
  isUsed: boolean
  isResent: boolean
  resendCount: number
}

const categories: { id: ActivationCategory; label: string }[] = [
  { id: 'open', label: 'Open (valid slug)' },
  { id: 'expired', label: 'Expired' },
  { id: 'expired_resent', label: 'Expired & resent' },
  { id: 'activated', label: 'Activated' },
]

const activeCategory = ref<ActivationCategory>('open')
const panelOpen = ref(false)
const rows = ref<ActivationRow[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const resendingId = ref<number | null>(null)

const activeLabel = computed(
  () => categories.find((c) => c.id === activeCategory.value)?.label ?? 'Activations',
)

function formatDate(value: string) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

function canResendRow(row: ActivationRow) {
  if (row.isUsed) return false
  const open = new Date(row.expiryDate) >= new Date()
  if (open) return auth.hasPermission('activations:resend')
  return !row.isResent && auth.hasPermission('activations:resend')
}

async function fetchPage(append = false) {
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
    const data = res.data?.data
    const newRows = data?.rows ?? []
    rows.value = append ? [...rows.value, ...newRows] : newRows
    total.value = data?.total ?? newRows.length
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Could not load activations',
      detail: error instanceof Error ? error.message : String(error),
      life: 4000,
    })
  } finally {
    loading.value = false
  }
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

function resendRow(row: ActivationRow) {
  const open = new Date(row.expiryDate) >= new Date()
  const runResend = async (confirmOpen: boolean) => {
    resendingId.value = row.id
    try {
      await auth.apiClient.post(`/user/admin/activation-resend/${row.id}`, { confirmOpen })
      toast.add({ severity: 'success', summary: 'Activation resent', life: 2500 })
      await fetchPage(false)
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
