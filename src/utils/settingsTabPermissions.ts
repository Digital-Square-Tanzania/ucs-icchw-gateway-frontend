export const SETTINGS_TAB_PERMISSIONS = [
  'settings:manage',
  'settings:tab:hrhis-reg',
  'settings:tab:activations',
  'settings:tab:location-recovery',
  'settings:tab:maintenance',
  'settings:tab:rbac',
] as const

export type SettingsTabId =
  | 'hrhis-reg'
  | 'activations'
  | 'location-recovery'
  | 'maintenance'
  | 'rbac'

export function settingsTabPermission(tab: SettingsTabId): string {
  return `settings:tab:${tab}`
}

export function hasSettingsTabAccess(permissions: string[], tab: SettingsTabId): boolean {
  if (permissions.includes('settings:manage')) return true
  return permissions.includes(settingsTabPermission(tab))
}

export function hasAnySettingsTabAccess(permissions: string[]): boolean {
  if (permissions.includes('settings:manage')) return true
  return SETTINGS_TAB_PERMISSIONS.some(
    (code) => code.startsWith('settings:tab:') && permissions.includes(code),
  )
}

export function visibleSettingsTabs(
  permissions: string[],
  role?: string | null,
): SettingsTabId[] {
  const order: SettingsTabId[] = [
    'hrhis-reg',
    'activations',
    'location-recovery',
    'maintenance',
    'rbac',
  ]
  if (permissions.includes('settings:manage')) return order
  const fromPerms = order.filter((tab) => hasSettingsTabAccess(permissions, tab))
  if (fromPerms.length) return fromPerms
  if (role === 'UCS_DEVELOPER' || role === 'MOH_ADMIN') return order
  if (role === 'COUNCIL_COORDINATOR') return ['hrhis-reg', 'activations']
  return []
}
