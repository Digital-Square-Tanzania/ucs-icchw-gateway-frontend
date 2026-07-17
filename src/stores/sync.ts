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

export const useSyncStore = defineStore('syncStore', () => {
  const syncStatus = ref<Record<string, 'unsynced' | 'syncing' | 'synced'>>({})
  const lastSynced = ref<Record<string, string>>({})
  const hrhisRecovery = ref<HrhisRecoveryProgress | null>(null)
  let socket: WebSocket | null = null
  const recoveryListeners = new Set<(event: HrhisRecoveryProgress & { type: string }) => void>()

  const startSync = async (path: string) => {
    const authStore = useAuthStore()
    const apiClient = new ApiClient(authStore.accessToken)

    syncStatus.value[path] = 'syncing'

    try {
      await apiClient.post('/dashboard/sync', { path })
      // wait for WebSocket update
    } catch (error) {
      console.error(`❌ Sync error for ${path}:`, error)
      syncStatus.value[path] = 'unsynced'
    }
  }

  const initWebSocket = (onSyncComplete?: () => void) => {
    if (socket) return

    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsHost = window.location.hostname
    const wsPort = import.meta.env.VITE_WS_PORT || '8189'

    const wsUrl = `${wsProtocol}://${wsHost}:${wsPort}`

    socket = new WebSocket(wsUrl)

    socket.addEventListener('message', (event) => {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (data.type === 'sync-complete' && data.path) {
        const path = String(data.path)
        console.log(`Sync complete for ${path}`)
        syncStatus.value[path] = 'synced'
        lastSynced.value[path] = new Date().toLocaleDateString()
        if (onSyncComplete) onSyncComplete()
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
    })

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
