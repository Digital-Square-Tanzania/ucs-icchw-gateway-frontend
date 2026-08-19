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
  let socket: WebSocket | null = null
  const recoveryListeners = new Set<(event: HrhisRecoveryProgress & { type: string }) => void>()

  const handleSyncComplete = (path: string, onSyncComplete?: () => void) => {
    console.log(`Sync complete for ${path}`)
    syncStatus.value[path] = 'synced'
    lastSynced.value[path] = new Date().toLocaleDateString()
    if (onSyncComplete) onSyncComplete()
  }

  const handleSocketMessage = (event: MessageEvent, onSyncComplete?: () => void) => {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(event.data as string)
    } catch {
      return
    }

    if (data.type === 'sync-complete' && data.path) {
      handleSyncComplete(String(data.path), onSyncComplete)
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
    }
  }

  const startSync = async (path: string) => {
    const authStore = useAuthStore()
    const apiClient = new ApiClient(authStore.accessToken)

    syncStatus.value[path] = 'syncing'

    try {
      await apiClient.post('/dashboard/sync', { path })
      // Completion is signaled via WebSocket (same origin as VITE_API_URL + /ws).
    } catch (error) {
      console.error(`❌ Sync error for ${path}:`, error)
      syncStatus.value[path] = 'unsynced'
    }
  }

  const initWebSocket = (onSyncComplete?: () => void) => {
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

    socket.addEventListener('message', (event) => handleSocketMessage(event, onSyncComplete))

    socket.addEventListener('error', (e) => {
      console.error('WebSocket error:', e)
    })

    socket.addEventListener('close', () => {
      console.log('WebSocket closed')
      socket = null
    })
  }

  const onHrhisRecoveryEvent = (listener: (event: HrhisRecoveryProgress & { type: string }) => void) => {
    recoveryListeners.add(listener)
    return () => recoveryListeners.delete(listener)
  }

  const clearHrhisRecovery = () => {
    hrhisRecovery.value = null
  }

  const cleanupWebSocket = () => {
    if (socket) {
      socket.close()
    }
    socket = null
    recoveryListeners.clear()
  }

  return {
    syncStatus,
    lastSynced,
    hrhisRecovery,
    startSync,
    initWebSocket,
    onHrhisRecoveryEvent,
    clearHrhisRecovery,
    cleanupWebSocket,
  }
})
