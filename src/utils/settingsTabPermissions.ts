export const SETTINGS_TAB_PERMISSIONS = [
  'settings:manage',
  'settings:tab:activations',
  'settings:tab:location-recovery',
  'settings:tab:maintenance',
  'settings:tab:rbac',
  'settings:tab:email-control',
] as const

export type SettingsTabId =
  | 'activations'
  | 'location-recovery'
  | 'maintenance'
  | 'rbac'
  | 'email-control'

export function settingsTabPermission(tab: SettingsTabId): string {
  return `settings:tab:${tab}`
}

export function hasSettingsTabAccess(permissions: string[], tab: SettingsTabId): boolean {
  if (tab === 'email-control') return permissions.includes('settings:tab:email-control')
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
    'activations',
    'location-recovery',
    'maintenance',
    'rbac',
    'email-control',
  ]
  const granted = order.filter((tab) => hasSettingsTabAccess(permissions, tab))
  if (granted.length) return granted
  if (role === 'UCS_DEVELOPER' || role === 'MOH_ADMIN') {
    return order.filter((tab) => tab !== 'email-control')
  }
  if (role === 'COUNCIL_COORDINATOR') return ['activations', 'location-recovery']
  return []
}
