/** REST API 路径约定（对接后端时参照此结构） */
export const API = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
  },
  ledgers: '/ledgers',
  ledger: (id: string) => `/ledgers/${id}`,
  ledgerLifecycle: (code: string) => `/ledgers/${code}/lifecycle`,
  inOut: '/in-out-records',
  faults: '/faults',
  faultConvert: (id: string) => `/faults/${id}/convert-maintenance`,
  maintenance: '/maintenance-records',
  inventoryTasks: '/inventory/tasks',
  inventoryDispatch: '/inventory/dispatch',
  inventoryLines: (taskId: string) => `/inventory/tasks/${taskId}/lines`,
  organizations: '/organizations',
  persons: '/persons',
  manufacturers: '/manufacturers',
  deviceTypes: '/device-types',
  roles: '/roles',
  dashboard: '/dashboard/stats',
} as const
