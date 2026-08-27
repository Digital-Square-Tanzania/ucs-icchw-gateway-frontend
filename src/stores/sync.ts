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

export const useSyncStore = defineStore('syncStore', () => {
  const syncStatus = ref<Record<string, 'unsynced' | 'syncing' | 'synced'>>({})
  const lastSynced = ref<Record<string, string>>({})
  const hrhisRecovery = ref<HrhisRecoveryProgress | null>(null)
  const teammemberSync = ref<TeammemberSyncProgress | null>(null)
  let socket: WebSocket | null = null
  const recoveryListeners = new Set<(event: HrhisRecoveryProgress & { type: string }) => void>()
  const teammemberSyncListeners = new Set<(event: TeammemberSyncProgress & { type: string }) => void>()
  const syncCompleteListeners = new Set<(path: string) => void>()

  const handleSyncComplete = (path: string) => {
    console.log(`Sync complete for ${path}`)
    syncStatus.value[path] = 'synced'
    lastSynced.value[path] = new Date().toLocaleDateString()
    for (const listener of syncCompleteListeners) {
      listener(path)
    }
  }

  const handleSocketMessage = (event: MessageEvent) => {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(event.data as string)
    } catch {
      return
    }

    if (data.type === 'sync-complete' && data.path) {
      handleSyncComplete(String(data.path))
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
  }

  const startSync = async (path: string) => {
    const authStore = useAuthStore()
    const apiClient = new ApiClient(authStore.accessToken)

    syncStatus.value[path] = 'syncing'

    try {
      const response = await apiClient.post<{
        data?: { synced?: boolean; path?: string }
      }>('/dashboard/sync', { path })

      const payload = response.data?.data
      if (payload?.synced) {
        handleSyncComplete(payload.path || path)
      }
      // WebSocket may also broadcast sync-complete for other open tabs.
    } catch (error) {
      console.error(`❌ Sync error for ${path}:`, error)
      syncStatus.value[path] = 'unsynced'
      throw error
    }
  }

  const initWebSocket = () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (socket) {
      socket.close()
      socket = null
    }

    const wsUrl = resolveWebSocketUrl()
    console.log(`Connecting WebSocket: ${wsUrl}`)
    socket = new WebSocket(wsUrl)

    socket.addEventListener('open', () => {
      console.log('WebSocket connected')
    })

    socket.addEventListener('message', handleSocketMessage)

    socket.addEventListener('error', (e) => {
      console.error('WebSocket error:', e)
    })

    socket.addEventListener('close', () => {
      console.log('WebSocket closed')
      socket = null
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
