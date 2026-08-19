import { defineStore } from 'pinia'
import { AxiosError } from 'axios'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import ApiClient from '@/utilities/ApiClient'
import { canAccessSettings, canAccessAnalytics, isUcsDeveloper } from '@/constants/roles'
import { getRoleFromToken } from '@/utilities/jwt'

const API_URL = import.meta.env.VITE_API_URL

export interface AuthUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  joinDate?: string
  lastLogin?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: localStorage.getItem('accessToken') || '',
    refreshToken: localStorage.getItem('refreshToken') || '',
    user: null as AuthUser | null,
    loading: false,
    error: '' as string | null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    // Prefer the fetched profile role; fall back to the role claim in the JWT
    // so UI gating works without depending on the /auth/me round-trip.
    userRole: (state) => state.user?.role ?? getRoleFromToken(state.accessToken),
    canAccessSettings: (state) =>
      canAccessSettings(state.user?.role ?? getRoleFromToken(state.accessToken)),
    canAccessAnalytics: (state) =>
      canAccessAnalytics(state.user?.role ?? getRoleFromToken(state.accessToken)),
    isUcsDeveloper: (state) =>
      isUcsDeveloper(state.user?.role ?? getRoleFromToken(state.accessToken)),
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

        await this.fetchProfile()

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

    async fetchProfile() {
      if (!this.accessToken) {
        this.user = null
        return
      }
      try {
        interface ProfileResponse {
          status: string
          data: AuthUser
        }
        const response = await this.apiClient.get<ProfileResponse>(`${API_URL}/auth/me`)
        if (response.data.status === 'success' && response.data.data) {
          this.user = response.data.data
        }
      } catch {
        this.user = null
      }
    },

    clearTokens() {
      this.accessToken = ''
      this.refreshToken = ''
      this.user = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    },
  },
})
