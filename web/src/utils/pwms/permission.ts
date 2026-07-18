import type { UserContext } from '@/types'

/** 校验是否拥有指定权限（兼容 coarse 权限码如 ledger、inout） */
export function hasPermission(user: Pick<UserContext, 'permissions'>, permission: string): boolean {
  if (user.permissions.includes('*')) return true
  if (user.permissions.includes(permission)) return true
  const [module] = permission.split(':')
  return user.permissions.includes(module)
}

export function hasAnyPermission(user: Pick<UserContext, 'permissions'>, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(user, p))
}

/** 顶级菜单路径 → 所需权限（满足其一即可见） */
export const menuPermissionMap: Record<string, string[]> = {
  '/dashboard': [],
  '/warehouse': ['warehouse:view', 'ledger:view'],
  '/spare': ['ledger:view'],
  '/instrument': ['ledger:view'],
  '/tool': ['ledger:view'],
  '/quota': ['quota:view', 'ledger:view'],
  '/alerts': ['alert:view', 'ledger:view'],
  '/personnel': ['ledger:view', 'system:user'],
  '/manufacturer': ['ledger:view'],
  '/device-type': ['ledger:view'],
  '/system': ['system:org', 'system:role', 'system:user'],
}

/** 系统子菜单权限 */
export const systemChildPermissions: Record<string, string> = {
  org: 'system:org',
  role: 'system:role',
}

export function canAccessMenuPath(path: string, user: Pick<UserContext, 'permissions'>): boolean {
  if (path === '/dashboard' || path.startsWith('/dashboard')) return true
  const top = `/${path.split('/').filter(Boolean)[0]}`
  const required = menuPermissionMap[top]
  if (!required?.length) return true
  return hasAnyPermission(user, required)
}

export function canAccessSystemChild(childPath: string, user: Pick<UserContext, 'permissions'>): boolean {
  const perm = systemChildPermissions[childPath]
  if (!perm) return true
  return hasPermission(user, perm)
}
