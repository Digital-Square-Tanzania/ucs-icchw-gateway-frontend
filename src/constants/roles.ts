export const Role = {
  UCS_DEVELOPER: 'UCS_DEVELOPER',
  MOH_ADMIN: 'MOH_ADMIN',
  COUNCIL_COORDINATOR: 'COUNCIL_COORDINATOR',
  EXTERNAL_SYSTEM: 'EXTERNAL_SYSTEM',
} as const

export type RoleName = (typeof Role)[keyof typeof Role]

export const SETTINGS_ROLES: RoleName[] = [Role.MOH_ADMIN, Role.UCS_DEVELOPER]

export function canAccessSettings(role: string | null | undefined): boolean {
  return !!role && SETTINGS_ROLES.includes(role as RoleName)
}

export function isUcsDeveloper(role: string | null | undefined): boolean {
  return role === Role.UCS_DEVELOPER
}
