export const USER_SYSTEMS = ['openmrs', 'dhis2', 'manager'] as const

export type UserSystem = (typeof USER_SYSTEMS)[number]

export type UserTabAction = 'view' | 'create' | 'update'

export function userTabPermission(system: UserSystem, action: UserTabAction): string {
  return `users:tab:${system}:${action}`
}

export function hasGranularUserTabs(permissions: string[]): boolean {
  return permissions.some((code) => code.startsWith('users:tab:'))
}

/** Mirrors backend `hasUserTabAccess`. */
export function canAccessUserTab(
  permissions: string[],
  system: UserSystem,
  action: UserTabAction,
): boolean {
  if (permissions.includes(userTabPermission(system, action))) return true
  if (
    action === 'view' &&
    (permissions.includes(userTabPermission(system, 'create')) ||
      permissions.includes(userTabPermission(system, 'update')))
  ) {
    return true
  }
  if (action === 'view' && !hasGranularUserTabs(permissions) && permissions.includes('menu:users')) {
    return true
  }
  return false
}
