import { defineStore } from 'pinia'
import { ref } from 'vue'
import ApiClient from '@/utilities/ApiClient'
import { useAuthStore } from './auth'

export const useSyncStore = defineStore('syncStore', () => {
  const syncStatus = ref<Record<string, 'unsynced' | 'syncing' | 'synced'>>({})
  const lastSynced = ref<Record<string, string>>({})
  let socket: WebSocket | null = null

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
      const data = JSON.parse(event.data)
      if (data.type === 'sync-complete' && data.path) {
        console.log(`Sync complete for ${data.path}`)
        syncStatus.value[data.path] = 'synced'
        lastSynced.value[data.path] = new Date().toLocaleDateString()
        if (onSyncComplete) onSyncComplete()
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

  const cleanupWebSocket = () => {
    if (socket) {
      socket.close()
      socket = null
    }
  }

  return {
    syncStatus,
    lastSynced,
    startSync,
    initWebSocket,
    cleanupWebSocket,
  }
})
