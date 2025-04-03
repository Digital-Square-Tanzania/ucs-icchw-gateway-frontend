import type { AxiosRequestConfig } from 'axios'
import axios, { type AxiosInstance } from 'axios'
import type { AxiosResponse } from 'axios'
// import { config } from 'dotenv'

// config()

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
