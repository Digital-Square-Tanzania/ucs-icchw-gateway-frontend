<template>
  <article class="rounded-xl border border-gray-200 dark:border-ucs-800 bg-white dark:bg-ucs-900/40 p-5 shadow-sm">
    <h3 class="text-base font-semibold text-gray-900 dark:text-white">Sync ICCHW Records from OpenMRS</h3>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
      Refresh <code class="text-xs">openmrs_team_members</code> from live OpenMRS data (names, email, phone, team,
      facility), then remove local rows whose OpenMRS team-member UUID no longer exists.
    </p>

    <button
      type="button"
      :disabled="running"
      class="mt-4 rounded-lg bg-ucs-500 px-4 py-2 text-sm font-medium text-white hover:bg-ucs-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      @click="runSync">
      {{ running ? 'Syncing…' : 'Sync from OpenMRS' }}
    </button>

    <p v-if="message" class="mt-3 text-xs" :class="messageClass">{{ message }}</p>

    <div
      v-if="progress && running"
      class="mt-3 rounded-lg border border-ucs-200 dark:border-ucs-800 bg-ucs-50/80 dark:bg-ucs-950/40 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300">
        <span>
          <strong class="capitalize">{{ phaseLabel }}</strong>
          · processed <strong>{{ progress.processed }}</strong>
          <span v-if="progress.total">/ <strong>{{ progress.total }}</strong></span>
        </span>
        <span>
          Upserted {{ progress.upserted }} · Purged {{ progress.purged }} · Kept {{ progress.kept }} · Errors
          {{ progress.errors }}
        </span>
      </div>
      <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-ucs-800">
        <div
          class="h-full rounded-full bg-ucs-500 transition-all duration-300"
          :style="{ width: `${progressPercent}%` }" />
      </div>
      <p
        v-if="progress.current"
        class="mt-2 truncate text-[0.7rem] text-gray-500 dark:text-gray-400"
        :title="progress.current.message || ''">
        Last: {{ progress.current.username || progress.current.name || progress.current.openMrsUuid || '—' }}
        — {{ progress.current.action }}
        <span v-if="progress.current.message"> ({{ progress.current.message }})</span>
      </p>
    </div>

    <ul
      v-if="summary"
      class="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300 sm:grid-cols-3 lg:grid-cols-6">
      <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Fetched: <strong>{{ summary.sync?.fetched ?? 0 }}</strong>
      </li>
      <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Upserted: <strong>{{ summary.sync?.upserted ?? 0 }}</strong>
      </li>
      <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Scanned: <strong>{{ summary.purge?.scanned ?? 0 }}</strong>
      </li>
      <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Kept: <strong>{{ summary.purge?.kept ?? 0 }}</strong>
      </li>
      <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Purged: <strong>{{ summary.purge?.purged ?? 0 }}</strong>
      </li>
      <li class="rounded-md bg-gray-50 dark:bg-ucs-950/60 px-2 py-1.5">
        Errors: <strong>{{ (summary.sync?.errors ?? 0) + (summary.purge?.errors ?? 0) }}</strong>
      </li>
    </ul>
  </article>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useToast } from 'primevue'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore, type TeammemberSyncProgress } from '@/stores/sync'

interface SyncSummary {
  sync?: { fetched?: number; upserted?: number; skipped?: number; errors?: number }
  purge?: { scanned?: number; kept?: number; purged?: number; errors?: number }
}

interface ApiEnvelope<T> {
  status?: string
  message?: string
  data?: T
}

const auth = useAuthStore()
const syncStore = useSyncStore()
const toast = useToast()

const running = ref(false)
const message = ref('')
const messageTone = ref<'idle' | 'success' | 'error'>('idle')
const progress = ref<TeammemberSyncProgress | null>(null)
const summary = ref<SyncSummary | null>(null)

let unsubscribe: (() => void) | null = null

const phaseLabel = computed(() => {
  if (progress.value?.phase === 'purging') return 'purging orphans'
  if (progress.value?.phase === 'syncing') return 'syncing from OpenMRS'
  return 'working'
})

const progressPercent = computed(() => {
  const p = progress.value
  if (!p?.total) return p?.processed ? 8 : 0
  return Math.min(100, Math.round((p.processed / p.total) * 100))
})

const messageClass = computed(() => {
  if (messageTone.value === 'success') return 'text-green-700 dark:text-green-300'
  if (messageTone.value === 'error') return 'text-red-700 dark:text-red-300'
  return 'text-gray-600 dark:text-gray-300'
})

function waitForSyncJob(jobIdRef: { current: string | null }): Promise<TeammemberSyncProgress> {
  return new Promise((resolve, reject) => {
    let off: (() => boolean) | null = null
    const timer = window.setTimeout(() => {
      off?.()
      reject(new Error('Team member sync timed out waiting for WebSocket completion.'))
    }, 30 * 60 * 1000)

    off = syncStore.onTeammemberSyncEvent((event) => {
      if (jobIdRef.current && event.jobId && event.jobId !== jobIdRef.current) return
      progress.value = event
      if (event.type === 'teammember-sync-complete') {
        window.clearTimeout(timer)
        off?.()
        if (event.status === 'error') {
          reject(new Error(event.message || 'Team member sync failed.'))
        } else {
          resolve(event)
        }
      }
    })
  })
}

async function runSync() {
  if (running.value) return
  running.value = true
  message.value = 'Sync started in the background…'
  messageTone.value = 'idle'
  summary.value = null
  progress.value = {
    status: 'running',
    phase: 'syncing',
    total: 0,
    processed: 0,
    upserted: 0,
    purged: 0,
    kept: 0,
    skipped: 0,
    errors: 0,
  }

  const jobIdRef: { current: string | null } = { current: null }

  try {
    syncStore.initWebSocket()
    const completion = waitForSyncJob(jobIdRef)
    const res = await auth.apiClient.post<ApiEnvelope<{ started?: boolean; jobId?: string }>>(
      '/openmrs/teammember/sync-local',
      { pageSize: 500 },
    )
    const jobId = res.data?.data?.jobId
    if (!jobId) {
      throw new Error(res.data?.message || 'Sync job did not return a jobId.')
    }
    jobIdRef.current = jobId

    const finalProgress = await completion
    summary.value = {
      sync: finalProgress.sync,
      purge: finalProgress.purge,
    }
    message.value =
      finalProgress.message ||
      `Sync complete: upserted ${finalProgress.upserted}, purged ${finalProgress.purged} orphan(s).`
    messageTone.value = finalProgress.errors > 0 ? 'error' : 'success'
    toast.add({
      severity: finalProgress.errors > 0 ? 'warn' : 'success',
      summary: 'ICCHW sync',
      detail: message.value,
      life: 6000,
    })
  } catch (error: unknown) {
    const detail =
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
      (error instanceof Error ? error.message : String(error))
    message.value = detail
    messageTone.value = 'error'
    toast.add({ severity: 'error', summary: 'ICCHW sync failed', detail, life: 6000 })
  } finally {
    running.value = false
  }
}

onUnmounted(() => {
  unsubscribe?.()
})
</script>
