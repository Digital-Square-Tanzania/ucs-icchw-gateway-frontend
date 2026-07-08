export interface JwtPayload {
  id?: string
  email?: string
  role?: string
  firstName?: string
  lastName?: string
  exp?: number
  iat?: number
  [key: string]: unknown
}

/**
 * Decode a JWT payload client-side without verifying the signature.
 * Used only to read non-sensitive claims (e.g. role) for UI gating.
 * Real authorization is always enforced by the backend.
 */
export function decodeJwt(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

export function getRoleFromToken(token: string | null | undefined): string | null {
  return decodeJwt(token)?.role ?? null
}
