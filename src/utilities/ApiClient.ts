import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import axios, { type AxiosInstance } from 'axios'
import { accessTokenExpiresSoon, refreshAccessToken } from '@/utilities/sessionTokens'

function isAuthExempt(url?: string) {
  return !!url && (url.includes('/auth/login') || url.includes('/auth/refresh-token'))
}

function redirectToLogin() {
  if (window.location.pathname.startsWith('/login')) return
  window.location.assign('/login')
}

class ApiClient {
  private client: AxiosInstance

  constructor(authToken: string) {
    const baseURL = import.meta.env.VITE_API_URL || ''
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    this.client.interceptors.request.use(async (config) => {
      if (isAuthExempt(config.url)) return config
      let token = localStorage.getItem('accessToken') || authToken
      if (token && accessTokenExpiresSoon(token)) {
        token = (await refreshAccessToken()) || token
      }
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
        const message = error.response?.data?.message as string | undefined
        const expired = error.response?.status === 401 && /access token expired/i.test(message || '')
        if (!expired || !config || config._retry || isAuthExempt(config.url)) {
          return Promise.reject(error)
        }
        config._retry = true
        const token = await refreshAccessToken()
        if (!token) {
          redirectToLogin()
          return Promise.reject(error)
        }
        config.headers.Authorization = `Bearer ${token}`
        return this.client.request(config)
      },
    )
  }

  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config)
  }

  public async post<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    try {
      return await this.client.post<T>(url, data, config)
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return Promise.reject(error.response?.data?.message ?? error.message)
      }
      return Promise.reject(error)
    }
  }

  public async put<T>(
    url: string,
    data: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config)
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config)
  }
}

export default ApiClient
