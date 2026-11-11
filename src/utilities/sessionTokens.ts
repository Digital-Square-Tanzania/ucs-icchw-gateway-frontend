import axios from 'axios'
import { decodeJwt } from '@/utilities/jwt'

type Listener = (accessToken: string | null) => void

const listeners = new Set<Listener>()
let inflight: Promise<string | null> | null = null

export function onAccessTokenChange(listener: Listener) {
  listeners.add(listener)
}

function notify(accessToken: string | null) {
  for (const listener of listeners) listener(accessToken)
}

export function accessTokenExpiresSoon(token: string | null | undefined, skewMs = 60_000) {
  const exp = decodeJwt(token)?.exp
  if (!exp) return false
  return exp * 1000 <= Date.now() + skewMs
}

export function refreshAccessToken(): Promise<string | null> {
  if (!inflight) {
    inflight = exchangeRefreshToken().finally(() => {
      inflight = null
    })
  }
  return inflight
}

async function exchangeRefreshToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  const baseURL = import.meta.env.VITE_API_URL || ''
  try {
    const response = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken })
    const accessToken = response.data?.data?.accessToken as string | undefined
    if (!accessToken) return null
    localStorage.setItem('accessToken', accessToken)
    notify(accessToken)
    return accessToken
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined
    if (status && status < 500) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      notify(null)
    }
    return null
  }
}
