<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="dialogHeader"
    :style="{ width: 'min(96vw, 1200px)' }"
    :closable="!submitting"
    class="duplicate-resolution-dialog">
    <div v-if="loading" class="py-16 text-center text-sm text-gray-500">Loading duplicate submissions…</div>

    <div v-else-if="loadError" class="py-8 text-center text-sm text-red-600 dark:text-red-400">
      {{ loadError }}
    </div>

    <div v-else-if="detail" class="space-y-5">
      <div class="flex flex-wrap gap-2">
        <span class="rounded-full bg-ucs-500/15 px-3 py-1 text-xs font-medium text-ucs-700 dark:text-ucs-200">
          {{ detail.stats.totalSubmissions }} submissions
        </span>
        <span class="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
          {{ detail.stats.openCount }} open
        </span>
        <span class="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-800 dark:text-green-200">
          {{ detail.stats.resolvedCount }} resolved
        </span>
        <span
          v-if="detail.hasRegisteredChw"
          class="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-200">
          ICCHW record live
        </span>
        <span
          v-else
          class="rounded-full bg-gray-500/15 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300">
          No live ICCHW record
        </span>
      </div>

      <div class="grid gap-4 lg:grid-cols-[280px_1fr]">
        <!-- Registered ICCHW snapshot -->
        <aside class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-gray-50 dark:bg-ucs-950/50 p-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">Registered ICCHW</h3>
          <template v-if="detail.registeredChw">
            <p class="mt-2 font-semibold text-gray-900 dark:text-white">
              {{ fullName(detail.registeredChw) }}
            </p>
            <dl class="mt-3 space-y-2 text-xs">
              <div v-for="field in registeredFields" :key="field.key">
                <dt class="text-gray-500">{{ field.label }}</dt>
                <dd class="font-mono text-gray-900 dark:text-ucs-100 break-all">
                  {{ displayValue(detail.registeredChw[field.key as keyof RegisteredChw]) }}
                </dd>
              </div>
            </dl>
          </template>
          <p v-else class="mt-3 text-sm text-gray-500">No local ICCHW row for this NIN.</p>
        </aside>

        <!-- Submissions workspace -->
        <div class="min-w-0">
          <div class="flex gap-2 overflow-x-auto pb-2">
            <button
              v-for="(sub, idx) in detail.submissions"
              :key="sub.logId"
              type="button"
              class="shrink-0 rounded-lg border px-3 py-2 text-left text-xs transition-colors"
              :class="
                activeIndex === idx
                  ? 'border-ucs-500 bg-ucs-500/10 text-ucs-800 dark:text-ucs-100'
                  : 'border-gray-300 dark:border-ucs-700 hover:bg-gray-50 dark:hover:bg-ucs-950'
              "
              @click="activeIndex = idx">
              <div class="font-semibold">#{{ sub.submissionNumber }}</div>
              <div class="text-gray-500">{{ formatDate(sub.createdAt) }}</div>
              <div class="mt-1 flex flex-wrap gap-1">
                <span :class="outcomeBadgeClass(sub)">{{ sub.outcome.kind }}</span>
                <span v-if="sub.isResolved" class="rounded bg-green-600/20 px-1.5 text-green-700 dark:text-green-300">
                  {{ sub.resolution?.action }}
                </span>
              </div>
            </button>
          </div>

          <div
            v-if="activeSubmission"
            class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
                  Submission #{{ activeSubmission.submissionNumber }} · log #{{ activeSubmission.logId }}
                </h3>
                <p class="text-xs text-gray-500 font-mono">{{ activeSubmission.logUuid }}</p>
              </div>
              <div class="text-right text-xs text-gray-500">
                HTTP {{ activeSubmission.outcome.httpStatus || '—' }}
                <div v-if="activeSubmission.outcome.message" class="text-red-600 dark:text-red-300 max-w-md">
                  {{ activeSubmission.outcome.message }}
                </div>
              </div>
            </div>

            <div
              v-if="activeSubmission.isResolved"
              class="mt-3 rounded-lg border border-green-600/30 bg-green-500/10 px-3 py-2 text-xs text-green-800 dark:text-green-200">
              Resolved as <strong>{{ activeSubmission.resolution?.action }}</strong>
              on {{ formatDate(activeSubmission.resolution?.resolvedAt) }}
              <span v-if="activeSubmission.resolution?.resolvedByEmail">
                by {{ activeSubmission.resolution.resolvedByEmail }}
              </span>
              <span v-if="activeSubmission.resolution?.mergedFields?.length">
                · merged: {{ activeSubmission.resolution.mergedFields.join(', ') }}
              </span>
              <span v-if="activeSubmission.resolution?.note"> · {{ activeSubmission.resolution.note }}</span>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <div
                v-for="field in payloadFields"
                :key="field.key"
                class="rounded-lg border border-gray-100 dark:border-ucs-800 p-2">
                <p class="text-[0.65rem] uppercase text-gray-500">{{ field.label }}</p>
                <p class="font-mono text-xs break-all">
                  {{ displayValue(activeSubmission.payload[field.key as keyof SubmissionPayload]) }}
                </p>
              </div>
            </div>

            <div v-if="detail.hasRegisteredChw && activeSubmission.fieldDiffs.length" class="mt-5">
              <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Field diff vs registered ICCHW
              </h4>
              <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-ucs-800">
                <table class="w-full text-xs">
                  <thead class="bg-gray-50 dark:bg-ucs-950/60 text-left uppercase text-gray-500">
                    <tr>
                      <th class="px-2 py-2 w-8"></th>
                      <th class="px-2 py-2">Field</th>
                      <th class="px-2 py-2">Registered</th>
                      <th class="px-2 py-2">Incoming</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="diff in activeSubmission.fieldDiffs"
                      :key="diff.field"
                      class="border-t border-gray-100 dark:border-ucs-800"
                      :class="diff.differs ? 'bg-amber-500/5' : ''">
                      <td class="px-2 py-2">
                        <input
                          v-if="diff.mergeable && diff.differs && activeSubmission.isOpen"
                          v-model="mergeFieldSelection[activeSubmission.logId]"
                          type="checkbox"
                          :value="diff.field"
                          class="rounded border-gray-400" />
                      </td>
                      <td class="px-2 py-2 font-medium">{{ diff.field }}</td>
                      <td class="px-2 py-2 font-mono break-all">{{ displayValue(diff.registered) }}</td>
                      <td class="px-2 py-2 font-mono break-all">{{ displayValue(diff.incoming) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div v-if="activeSubmission.isOpen" class="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 dark:border-ucs-800 pt-4">
              <label class="flex items-center gap-2 text-sm">
                <input v-model="selectedLogIds" type="checkbox" :value="activeSubmission.logId" class="rounded" />
                Include in batch
              </label>
              <select
                v-model="actionByLogId[activeSubmission.logId]"
                class="rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-2 py-1.5 text-sm">
                <option value="ignore">Ignore (audit only)</option>
                <option value="merge" :disabled="!detail.hasRegisteredChw">Merge into ICCHW</option>
                <option value="delete">Dismiss duplicate</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div v-if="openSubmissions.length" class="rounded-xl border border-gray-200 dark:border-ucs-800 p-4">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Batch resolution</h3>
        <p class="mt-1 text-xs text-gray-500">
          Tick <strong>Include in batch</strong> on each submission above, pick an action per submission, then click
          <strong>Apply resolution</strong>. Only checked submissions are processed in one go; merge uses the field
          checkboxes from each submission&apos;s diff table.
        </p>
        <textarea
          v-model="batchNote"
          rows="2"
          placeholder="Optional audit note for this resolution batch…"
          class="mt-3 w-full rounded-lg border border-gray-300 dark:border-ucs-700 bg-white dark:bg-ucs-900 px-3 py-2 text-sm" />
      </div>

      <div v-if="resolveResult" class="rounded-lg border border-gray-200 dark:border-ucs-800 p-3 text-xs">
        <p class="font-semibold mb-2">Last resolution run</p>
        <ul class="space-y-1">
          <li v-for="row in resolveResult.results" :key="`${row.logId}-${row.status}`">
            #{{ row.logId }} · {{ row.status }} · {{ row.message }}
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <Button label="Close" severity="secondary" text :disabled="submitting" @click="visible = false" />
      <Button
        label="Apply resolution"
        icon="pi pi-check"
        :loading="submitting"
        :disabled="!selectedLogIds.length || submitting"
        @click="applyResolution" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Dialog from 'primevue/dialog'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'

interface Scope {
  region: string
  district: string
  council: string
  days: number
}

interface RegisteredChw {
  identifier?: string
  firstName?: string
  middleName?: string
  lastName?: string
  NIN?: string
  email?: string
  phoneNumber?: string
  username?: string
  sex?: string | null
  teamName?: string
  locationName?: string
}

interface FieldDiff {
  field: string
  registered: unknown
  incoming: unknown
  differs: boolean
  mergeable: boolean
}

interface SubmissionPayload {
  firstName?: string | null
  middleName?: string | null
  lastName?: string | null
  NIN?: string
  sex?: string | null
  email?: string | null
  phoneNumber?: string | null
  hfrCode?: string | null
  locationCode?: string | null
  locationType?: string | null
}

interface Submission {
  logId: number
  logUuid: string
  submissionNumber: number
  createdAt: string
  payload: SubmissionPayload
  outcome: { httpStatus: number; kind: string; message?: string | null }
  resolution?: {
    action?: string
    resolvedAt?: string
    resolvedByEmail?: string | null
    mergedFields?: string[]
    note?: string | null
  } | null
  fieldDiffs: FieldDiff[]
  mergeableDiffs: FieldDiff[]
  isResolved: boolean
  isOpen: boolean
}

interface DuplicateDetail {
  nin: string
  registeredChw: RegisteredChw | null
  hasRegisteredChw: boolean
  submissions: Submission[]
  stats: { totalSubmissions: number; openCount: number; resolvedCount: number }
}

interface ResolveResult {
  resolved: number
  failed: number
  skipped: number
  results: Array<{ logId: number; status: string; message?: string; action?: string }>
}

const props = defineProps<{
  modelValue: boolean
  scope: Scope | null
  nin: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  resolved: []
}>()

const auth = useAuthStore()
const toast = useToast()

const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const loadError = ref('')
const detail = ref<DuplicateDetail | null>(null)
const activeIndex = ref(0)
const selectedLogIds = ref<number[]>([])
const actionByLogId = reactive<Record<number, 'ignore' | 'merge' | 'delete'>>({})
const mergeFieldSelection = reactive<Record<number, string[]>>({})
const batchNote = ref('')
const resolveResult = ref<ResolveResult | null>(null)

const registeredFields = [
  { key: 'NIN', label: 'NIN' },
  { key: 'identifier', label: 'Identifier' },
  { key: 'username', label: 'Username' },
  { key: 'sex', label: 'Sex' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'teamName', label: 'Team' },
  { key: 'locationName', label: 'Facility' },
] as const

const payloadFields = [
  { key: 'firstName', label: 'First name' },
  { key: 'middleName', label: 'Middle name' },
  { key: 'lastName', label: 'Last name' },
  { key: 'sex', label: 'Sex' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'hfrCode', label: 'HFR' },
  { key: 'locationCode', label: 'Location' },
  { key: 'locationType', label: 'Location type' },
] as const

const dialogHeader = computed(() =>
  detail.value ? `Duplicate resolution · ${detail.value.nin}` : 'Duplicate resolution',
)

const activeSubmission = computed(() => detail.value?.submissions[activeIndex.value] ?? null)

const openSubmissions = computed(() => detail.value?.submissions.filter((s) => s.isOpen) ?? [])

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val
    if (val) loadDetail()
  },
  { immediate: true },
)

watch(visible, (val) => emit('update:modelValue', val))

watch(
  () => props.nin,
  () => {
    if (visible.value) loadDetail()
  },
)

function fullName(chw: RegisteredChw) {
  return [chw.firstName, chw.middleName, chw.lastName].filter(Boolean).join(' ')
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function outcomeBadgeClass(sub: Submission) {
  if (sub.isResolved) return 'rounded bg-green-600/20 px-1.5 text-green-700 dark:text-green-300'
  if (sub.outcome.kind === 'failure') return 'rounded bg-red-600/20 px-1.5 text-red-700 dark:text-red-300'
  if (sub.outcome.kind === 'create') return 'rounded bg-blue-600/20 px-1.5 text-blue-700 dark:text-blue-300'
  return 'rounded bg-gray-600/20 px-1.5 text-gray-700 dark:text-gray-300'
}

function resetState() {
  activeIndex.value = 0
  selectedLogIds.value = []
  batchNote.value = ''
  resolveResult.value = null
  Object.keys(actionByLogId).forEach((k) => delete actionByLogId[Number(k)])
  Object.keys(mergeFieldSelection).forEach((k) => delete mergeFieldSelection[Number(k)])
}

async function loadDetail() {
  if (!props.scope || !props.nin) return
  loading.value = true
  loadError.value = ''
  detail.value = null
  resetState()

  try {
    const params = new URLSearchParams({
      region: props.scope.region,
      district: props.scope.district,
      council: props.scope.council,
      nin: props.nin,
      days: String(props.scope.days),
    })
    const response = await auth.apiClient.get<{ data?: DuplicateDetail }>(
      `/gateway/admin/hrhis-duplicate-detail?${params.toString()}`,
    )
    detail.value = response.data?.data ?? null
    if (!detail.value) {
      loadError.value = 'No duplicate detail returned.'
      return
    }

    for (const sub of detail.value.submissions) {
      actionByLogId[sub.logId] = 'ignore'
      mergeFieldSelection[sub.logId] = sub.mergeableDiffs.map((d) => d.field)
    }
  } catch (err: unknown) {
    loadError.value =
      (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (err instanceof Error ? err.message : 'Failed to load duplicate detail.')
  } finally {
    loading.value = false
  }
}

async function applyResolution() {
  if (!props.scope || !props.nin || !selectedLogIds.value.length) return

  submitting.value = true
  try {
    const items = selectedLogIds.value.map((logId) => ({
      logId,
      action: actionByLogId[logId] || 'ignore',
      mergeFields: actionByLogId[logId] === 'merge' ? mergeFieldSelection[logId] || [] : undefined,
    }))

    const response = await auth.apiClient.post<{ data?: ResolveResult; message?: string }>(
      '/gateway/admin/hrhis-duplicate-resolve',
      {
        region: props.scope.region,
        district: props.scope.district,
        council: props.scope.council,
        nin: props.nin,
        days: props.scope.days,
        note: batchNote.value || undefined,
        items,
      },
    )

    resolveResult.value = response.data?.data ?? null
    const result = resolveResult.value
    const severity =
      result && result.failed > 0 ? (result.resolved > 0 ? 'warn' : 'error') : 'success'
    toast.add({
      severity,
      summary: 'Duplicate resolution',
      detail: response.data?.message || 'Resolution applied.',
      life: 7000,
    })

    await loadDetail()
    if (result && result.resolved > 0) emit('resolved')
  } catch (err: unknown) {
    toast.add({
      severity: 'error',
      summary: 'Resolution failed',
      detail:
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to apply resolution.'),
      life: 7000,
    })
  } finally {
    submitting.value = false
  }
}
</script>
