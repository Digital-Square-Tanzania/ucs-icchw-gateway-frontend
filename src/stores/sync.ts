import { defineStore } from 'pinia'
import { ref } from 'vue'
import ApiClient from '@/utilities/ApiClient'
import { useAuthStore } from './auth'

export interface HrhisRecoveryProgress {
  jobId?: string
  status?: 'running' | 'complete' | 'error'
  total: number
  completed: number
  recovered: number
  skipped: number
  stillFailed: number
  message?: string
  current?: {
    id?: number
    NIN?: string | null
    status?: string
    message?: string
  } | null
}

export interface TeammemberSyncProgress {
  jobId?: string
  status?: 'running' | 'complete' | 'error'
  phase?: 'syncing' | 'purging' | 'complete' | 'error'
  total: number
  processed: number
  upserted: number
  purged: number
  kept: number
  skipped: number
  errors: number
  message?: string
  sync?: Record<string, number>
  purge?: Record<string, number>
  current?: {
    openMrsUuid?: string | null
    username?: string | null
    name?: string | null
    action?: string
    message?: string
  } | null
}

export interface SyncLogLine {
  at: string
  message: string
  level: 'info' | 'success' | 'error'
}

export interface DashboardSyncJob {
  path: string
  status: 'syncing' | 'synced' | 'error'
  message: string
  percent: number
  logs: SyncLogLine[]
  syncedCount?: number
}

function resolveWebSocketUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL
  if (explicit) return explicit

  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    try {
      const parsed = new URL(apiUrl)
      parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
      const basePath = parsed.pathname.replace(/\/+$/, '')
      parsed.pathname = `${basePath}/ws`
      parsed.search = ''
      parsed.hash = ''
      return parsed.toString()
    } catch {
      // fall through to legacy host:port
    }
  }

  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const wsHost = window.location.hostname
  const wsPort = import.meta.env.VITE_WS_PORT || '8189'
  return `${wsProtocol}://${wsHost}:${wsPort}`
}

function logLevel(value: unknown): SyncLogLine['level'] {
  if (value === 'error' || value === 'success') return value
  return 'info'
}

function emptyJob(path: string, message = 'Sync started…'): DashboardSyncJob {
  return {
    path,
    status: 'syncing',
    message,
    percent: 0,
    logs: [{ at: new Date().toISOString(), message, level: 'info' }],
  }
}

async function decodeSocketData(data: unknown): Promise<Record<string, unknown> | null> {
  if (typeof data === 'string') {
    const text = data.replace(/^\uFEFF/, '').trim()
    if (!text || text === 'ping' || text === 'pong') return null
    try {
      const parsed = JSON.parse(text) as unknown
      if (typeof parsed === 'string') return decodeSocketData(parsed)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
      return parsed as Record<string, unknown>
    } catch {
      console.warn('Ignored non-JSON websocket message')
      return null
    }
  }

  if (data instanceof ArrayBuffer) {
    return decodeSocketData(new TextDecoder().decode(data))
  }

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return decodeSocketData(await data.text())
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }

  return null
}

export const useSyncStore = defineStore('syncStore', () => {
  const syncStatus = ref<Record<string, 'unsynced' | 'syncing' | 'synced'>>({})
  const lastSynced = ref<Record<string, string>>({})
  const jobs = ref<Record<string, DashboardSyncJob>>({})
  const hrhisRecovery = ref<HrhisRecoveryProgress | null>(null)
  const teammemberSync = ref<TeammemberSyncProgress | null>(null)
  let socket: WebSocket | null = null
  let manualClose = false
  let reconnectAttempt = 0
  let reconnectTimer: number | null = null
  let nextRunId = 1
  const activeRunIds = new Map<string, number>()
  const recoveryListeners = new Set<(event: HrhisRecoveryProgress & { type: string }) => void>()
  const teammemberSyncListeners = new Set<(event: TeammemberSyncProgress & { type: string }) => void>()
  const syncCompleteListeners = new Set<(path: string) => void>()

  const notifySyncComplete = (path: string) => {
    for (const listener of syncCompleteListeners) {
      try {
        listener(path)
      } catch (error) {
        console.error('sync-complete listener failed', error)
      }
    }
  }

  const completeDashboardSync = (
    path: string,
    details: { message?: string; count?: number } = {},
  ) => {
    const existing = jobs.value[path]
    const already = existing?.status === 'synced'
    if (already) {
      const logs = [...(existing?.logs ?? [])]
      if (details.message && !logs.some((line) => line.message === details.message)) {
        logs.push({ at: new Date().toISOString(), message: details.message, level: 'success' })
      }
      const incoming = details.message
      const keepExisting =
        !!existing?.message &&
        !!incoming &&
        existing.message.includes('location') &&
        !incoming.includes('location')
      const message = keepExisting ? existing.message : incoming || existing?.message || 'Sync completed.'
      jobs.value = {
        ...jobs.value,
        [path]: {
          ...existing,
          message,
          percent: 100,
          logs: logs.slice(-200),
          syncedCount: details.count ?? existing?.syncedCount,
        },
      }
      return
    }

    const message = details.message || existing?.message || 'Sync completed.'
    const logs = [...(existing?.logs ?? [])]
    if (!logs.some((line) => line.message === message)) {
      logs.push({ at: new Date().toISOString(), message, level: 'success' })
    }

    jobs.value = {
      ...jobs.value,
      [path]: {
        path,
        status: 'synced',
        message,
        percent: 100,
        logs: logs.slice(-200),
        syncedCount: details.count ?? existing?.syncedCount,
      },
    }
    syncStatus.value = { ...syncStatus.value, [path]: 'synced' }
    lastSynced.value = { ...lastSynced.value, [path]: new Date().toLocaleDateString() }
    console.info(`Sync complete for ${path}`)
    notifySyncComplete(path)
  }

  const failDashboardSync = (path: string, message: string) => {
    if (jobs.value[path]?.status === 'synced') return
    const existing = jobs.value[path]
    if (existing?.status === 'error' && existing.message === message) return
    const logs = [...(existing?.logs ?? [])]
    logs.push({ at: new Date().toISOString(), message, level: 'error' })
    jobs.value = {
      ...jobs.value,
      [path]: {
        path,
        status: 'error',
        message,
        percent: existing?.percent ?? 0,
        logs: logs.slice(-200),
        syncedCount: existing?.syncedCount,
      },
    }
    syncStatus.value = { ...syncStatus.value, [path]: 'unsynced' }
  }

  const applyDashboardProgress = (path: string, data: Record<string, unknown>) => {
    const finished = jobs.value[path]
    if (finished && (finished.status === 'synced' || finished.status === 'error')) {
      if (data.log === false || !data.message) return
      const message = String(data.message)
      if (finished.logs.some((line) => line.message === message)) return
      const level = logLevel(data.level)
      jobs.value = {
        ...jobs.value,
        [path]: {
          ...finished,
          logs: [...finished.logs, { at: new Date().toISOString(), message, level }].slice(-200),
        },
      }
      return
    }
    const existing = jobs.value[path] ?? emptyJob(path, 'Sync started…')
    const message = data.message ? String(data.message) : existing.message
    const level = logLevel(data.level)
    const logs = [...existing.logs]
    if (data.log !== false && data.message && logs[logs.length - 1]?.message !== message) {
      logs.push({ at: new Date().toISOString(), message, level })
    }
    const percent = Number(data.percent)
    jobs.value = {
      ...jobs.value,
      [path]: {
        ...existing,
        status: 'syncing',
        message,
        percent: Number.isFinite(percent) ? Math.max(existing.percent, Math.min(99, percent)) : existing.percent,
        logs: logs.slice(-200),
      },
    }
    syncStatus.value = { ...syncStatus.value, [path]: 'syncing' }
  }

  const resolveSyncPath = (data: Record<string, unknown>) => {
    if (data.path) return String(data.path)
    const active = Object.values(jobs.value).filter((job) => job.status === 'syncing')
    return active.length === 1 ? active[0].path : ''
  }

  const handleSocketMessage = (event: MessageEvent) => {
    void (async () => {
      const data = await decodeSocketData(event.data)
      if (!data) return
      const type = String(data.type || '').trim()

      if (type === 'ping' || type === 'pong') return

      if (type === 'sync-progress' || type === 'sync-complete' || type === 'sync-error') {
        const path = resolveSyncPath(data)
        if (!path) return
        if (type === 'sync-progress') {
          applyDashboardProgress(path, data)
          return
        }
        if (type === 'sync-error') {
          failDashboardSync(path, data.message ? String(data.message) : 'Sync failed.')
          return
        }
        const count = Number(data.count)
        completeDashboardSync(path, {
          message: data.message ? String(data.message) : undefined,
          count: Number.isFinite(count) ? count : undefined,
        })
        return
      }

    if (data.type === 'hrhis-recovery-progress' || data.type === 'hrhis-recovery-complete') {
      const progress: HrhisRecoveryProgress = {
        jobId: data.jobId ? String(data.jobId) : undefined,
        status:
          data.type === 'hrhis-recovery-complete'
            ? data.status === 'error'
              ? 'error'
              : 'complete'
            : 'running',
        total: Number(data.total) || 0,
        completed: Number(data.completed) || Number(data.attempted) || 0,
        recovered: Number(data.recovered) || 0,
        skipped: Number(data.skipped) || 0,
        stillFailed: Number(data.stillFailed) || 0,
        message: data.message ? String(data.message) : undefined,
        current: (data.current as HrhisRecoveryProgress['current']) ?? null,
      }
      hrhisRecovery.value = progress
      for (const listener of recoveryListeners) {
        listener({ ...progress, type: String(data.type) })
      }
      return
    }

    if (data.type === 'teammember-sync-progress' || data.type === 'teammember-sync-complete') {
      const progress: TeammemberSyncProgress = {
        jobId: data.jobId ? String(data.jobId) : undefined,
        status:
          data.type === 'teammember-sync-complete'
            ? data.status === 'error'
              ? 'error'
              : 'complete'
            : 'running',
        phase: (data.phase as TeammemberSyncProgress['phase']) || undefined,
        total: Number(data.total) || 0,
        processed: Number(data.processed) || 0,
        upserted: Number(data.upserted) || 0,
        purged: Number(data.purged) || 0,
        kept: Number(data.kept) || 0,
        skipped: Number(data.skipped) || 0,
        errors: Number(data.errors) || 0,
        message: data.message ? String(data.message) : undefined,
        sync: (data.sync as Record<string, number>) || undefined,
        purge: (data.purge as Record<string, number>) || undefined,
        current: (data.current as TeammemberSyncProgress['current']) ?? null,
      }
      teammemberSync.value = progress
      for (const listener of teammemberSyncListeners) {
        listener({ ...progress, type: String(data.type) })
      }
    }
    })()
  }

  const startSync = async (path: string) => {
    const authStore = useAuthStore()
    const apiClient = new ApiClient(authStore.accessToken)
    const runId = nextRunId++
    activeRunIds.set(path, runId)

    initWebSocket()
    syncStatus.value = { ...syncStatus.value, [path]: 'syncing' }
    jobs.value = { ...jobs.value, [path]: emptyJob(path) }

    try {
      const response = await apiClient.post<{
        status?: string
        message?: string
        data?: { synced?: boolean; started?: boolean; path?: string; count?: number }
      }>('/dashboard/sync', { path })

      if (activeRunIds.get(path) !== runId) return

      const body = response.data
      const payload = body?.data && typeof body.data === 'object' ? body.data : undefined
      if (payload?.synced === true) {
        const count = Number(payload.count)
        completeDashboardSync(String(payload.path || path), {
          message: body?.message || undefined,
          count: Number.isFinite(count) ? count : undefined,
        })
      }
      // When the socket delivers sync-complete first, the job is already synced.
    } catch (error) {
      if (activeRunIds.get(path) !== runId) return
      console.error(`❌ Sync error for ${path}:`, error)
      if (jobs.value[path]?.status !== 'synced') {
        const message = error instanceof Error ? error.message : String(error)
        failDashboardSync(path, message)
      }
      throw error
    }
  }

  const scheduleReconnect = () => {
    if (manualClose || reconnectTimer != null) return
    const delay = Math.min(15000, 1000 * 2 ** reconnectAttempt)
    reconnectAttempt += 1
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      initWebSocket()
    }, delay)
  }

  const initWebSocket = () => {
    manualClose = false
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (socket) {
      socket.close()
      socket = null
    }

    const wsUrl = resolveWebSocketUrl()
    console.log(`Connecting WebSocket: ${wsUrl}`)
    const active = new WebSocket(wsUrl)
    socket = active

    active.addEventListener('open', () => {
      reconnectAttempt = 0
      console.log('WebSocket connected')
    })

    active.addEventListener('message', handleSocketMessage)

    active.addEventListener('error', (e) => {
      console.error('WebSocket error:', e)
    })

    active.addEventListener('close', () => {
      if (socket === active) socket = null
      console.log('WebSocket closed')
      scheduleReconnect()
    })
  }

  const onSyncCompleteEvent = (listener: (path: string) => void) => {
    syncCompleteListeners.add(listener)
    return () => syncCompleteListeners.delete(listener)
  }

  const onHrhisRecoveryEvent = (listener: (event: HrhisRecoveryProgress & { type: string }) => void) => {
    recoveryListeners.add(listener)
    return () => recoveryListeners.delete(listener)
  }

  const onTeammemberSyncEvent = (listener: (event: TeammemberSyncProgress & { type: string }) => void) => {
    teammemberSyncListeners.add(listener)
    return () => teammemberSyncListeners.delete(listener)
  }

  const clearHrhisRecovery = () => {
    hrhisRecovery.value = null
  }

  const clearTeammemberSync = () => {
    teammemberSync.value = null
  }

  const cleanupWebSocket = () => {
    manualClose = true
    if (reconnectTimer != null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (socket) {
      socket.close()
    }
    socket = null
    recoveryListeners.clear()
    teammemberSyncListeners.clear()
    syncCompleteListeners.clear()
  }

  return {
    syncStatus,
    lastSynced,
    jobs,
    hrhisRecovery,
    teammemberSync,
    startSync,
    initWebSocket,
    onSyncCompleteEvent,
    onHrhisRecoveryEvent,
    onTeammemberSyncEvent,
    clearHrhisRecovery,
    clearTeammemberSync,
    cleanupWebSocket,
  }
})
