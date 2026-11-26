export type AnalyticsTab = 'hrhis' | 'ffars'

export const ANALYTICS_TABS: AnalyticsTab[] = ['hrhis', 'ffars']

export function analyticsTabPermission(tab: AnalyticsTab): string {
  return `analytics:tab:${tab}`
}

export function hasGranularAnalyticsTabs(permissions: string[]): boolean {
  return permissions.some((code) => code.startsWith('analytics:tab:'))
}

/** Mirrors backend hasAnalyticsTabAccess. */
export function canAccessAnalyticsTab(permissions: string[], tab: AnalyticsTab): boolean {
  if (permissions.includes(analyticsTabPermission(tab))) return true
  if (!hasGranularAnalyticsTabs(permissions) && permissions.includes('menu:analytics')) return true
  return false
}
