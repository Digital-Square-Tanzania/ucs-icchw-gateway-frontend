import { defineStore } from 'pinia'
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import ApiClient from '@/utilities/ApiClient'

const API_URL = import.meta.env.VITE_API_URL

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    loading: false,
    error: '' as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    apiClient: (state) => new ApiClient(state.accessToken),
  },
  actions: {
    hydrate() {
      this.accessToken = localStorage.getItem('accessToken') || ''
      this.refreshToken = localStorage.getItem('refreshToken') || ''
    },

    async login(email: string, password: string, toast: ReturnType<typeof useToast>) {
      this.loading = true
      this.error = null
      try {
        interface LoginResponse {
          status: string
          message?: string
          data: {
            accessToken: string
            refreshToken: string
          }
        }
        const response = await this.apiClient.post<LoginResponse>(`${API_URL}/auth/login`, {
          email,
          password,
        })

        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Login failed')
        }

        this.accessToken = response.data.data.accessToken
        this.refreshToken = response.data.data.refreshToken

        if (this.accessToken) localStorage.setItem('accessToken', this.accessToken)
        if (this.refreshToken) localStorage.setItem('refreshToken', this.refreshToken)

        // Show success toast
        toast.add({
          severity: 'success',
          summary: 'Login Successful',
          detail: 'Welcome back!',
          life: 3000,
        })
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string }>
        this.error = axiosError.response?.data?.message || axiosError.message || 'Login failed'
        this.clearTokens()

        // Show error toast
        toast.add({
          severity: 'error',
          summary: 'Login Failed',
          detail: this.error,
          life: 4000,
        })
      } finally {
        this.loading = false
      }
    },

    async logout(router: ReturnType<typeof useRouter>, toast: ReturnType<typeof useToast>) {
      this.loading = true
      this.error = null
      try {
        await this.apiClient.post(`${API_URL}/auth/logout`, {})
      } catch (error: unknown) {
        const axiosError = error as AxiosError<{ message?: string }>
        this.error = axiosError.response?.data?.message || axiosError.message || 'Logout failed'
      } finally {
        this.clearTokens()
        this.loading = false
        router.push('/login')

        // Show logout success toast
        toast.add({
          severity: 'info',
          summary: 'Logged Out',
          detail: 'You have been logged out successfully.',
          life: 3000,
        })
      }
    },

    clearTokens() {
      this.accessToken = ''
      this.refreshToken = ''
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
  },
})
