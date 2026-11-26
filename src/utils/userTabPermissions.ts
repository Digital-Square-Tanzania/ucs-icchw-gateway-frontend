export const USER_SYSTEMS = ['openmrs', 'dhis2', 'manager'] as const

export type UserSystem = (typeof USER_SYSTEMS)[number]

export function userTabPermission(system: UserSystem, action: 'view' | 'create'): string {
  return `users:tab:${system}:${action}`
}

export function hasGranularUserTabs(permissions: string[]): boolean {
  return permissions.some((code) => code.startsWith('users:tab:'))
}

/** Mirrors backend `hasUserTabAccess`. */
export function canAccessUserTab(
  permissions: string[],
  system: UserSystem,
  action: 'view' | 'create',
): boolean {
  if (permissions.includes(userTabPermission(system, action))) return true
  if (action === 'view' && permissions.includes(userTabPermission(system, 'create'))) return true
  if (action === 'view' && !hasGranularUserTabs(permissions) && permissions.includes('menu:users')) {
    return true
  }
  return false
}
