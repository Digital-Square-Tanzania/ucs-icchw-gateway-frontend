/**
 * Backend origin for SSR admin pages (activation control, etc.).
 * Prefer VITE_BACKEND_URL; otherwise strip /api/v1 from VITE_API_URL.
 */
export function getBackendOrigin(): string {
  const explicit = import.meta.env.VITE_BACKEND_URL
  if (explicit && typeof explicit === 'string') {
    return explicit.replace(/\/+$/, '')
  }
  const apiUrl = import.meta.env.VITE_API_URL || ''
  return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
}

export function activationEmailControlUrl(): string {
  return `${getBackendOrigin()}/api/v1/user/admin/activation-email-control`
}
