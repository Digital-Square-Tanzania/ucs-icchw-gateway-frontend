/** Must match backend `nav-menu-permissions.js` and seeded `menus.path` values. */
export const NAV_PATH_PERMISSION: Record<string, string> = {
  '/dashboard': 'menu:dashboard',
  '/users': 'menu:users',
  '/settings': 'menu:settings',
  '/analytics': 'menu:analytics',
}

export function canAccessNavPath(permissions: string[], path: string): boolean {
  if (permissions.includes('settings:manage')) return true
  const code = NAV_PATH_PERMISSION[path]
  if (!code) return false
  return permissions.includes(code)
}
