import type { AssetCategory, SubModule } from '@/types'

export interface RouteMeta {
  title: string
  icon?: string
  hidden?: boolean
  category?: AssetCategory
  subModule?: SubModule
}

const assetModules: SubModule[] = ['ledger', 'inout', 'fault', 'maintenance', 'inventory']

function assetRoutes(prefix: string, category: AssetCategory, title: string) {
  const base = `/${prefix}`
  const modulePaths: Record<SubModule, string> = {
    ledger: 'ledger',
    inout: 'inout',
    fault: 'fault',
    maintenance: 'maintenance',
    inventory: 'inventory',
  }
  const moduleTitles: Record<SubModule, string> = {
    ledger: '台账录入',
    inout: '出入库记录',
    fault: '故障记录',
    maintenance: '维修记录',
    inventory: '盘点记录',
  }

  return {
    path: base,
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title, icon: 'Box' },
    redirect: `${base}/${modulePaths.ledger}`,
    children: assetModules.map((mod) => ({
      path: modulePaths[mod],
      name: `${prefix}-${mod}`,
      component: () => import('@/views/asset/AssetModuleView.vue'),
      meta: { title: moduleTitles[mod], category, subModule: mod } satisfies RouteMeta,
    })),
  }
}

export const menuRoutes = [
  {
    path: '/dashboard',
    meta: { title: '工作台', icon: 'Odometer' },
    component: () => import('@/views/dashboard/DashboardView.vue'),
  },
  assetRoutes('warehouse', 'warehouse', '生产仓管理'),
  assetRoutes('spare', 'spare', '备品备件管理'),
  assetRoutes('instrument', 'instrument', '仪器仪表管理'),
  assetRoutes('tool', 'tool', '工器具管理'),
  {
    path: '/personnel',
    meta: { title: '人员管理', icon: 'User' },
    component: () => import('@/views/personnel/PersonnelView.vue'),
  },
  {
    path: '/manufacturer',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '生产厂家管理', icon: 'OfficeBuilding' },
    redirect: '/manufacturer/spare',
    children: [
      { path: 'spare', meta: { title: '备品备件厂家' }, component: () => import('@/views/manufacturer/ManufacturerView.vue') },
      { path: 'instrument', meta: { title: '仪器仪表厂家' }, component: () => import('@/views/manufacturer/ManufacturerView.vue') },
      { path: 'tool', meta: { title: '工器具厂家' }, component: () => import('@/views/manufacturer/ManufacturerView.vue') },
    ],
  },
  {
    path: '/device-type',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '设备类型管理', icon: 'Collection' },
    redirect: '/device-type/warehouse',
    children: [
      { path: 'warehouse', meta: { title: '生产仓设备类型' }, component: () => import('@/views/device-type/DeviceTypeView.vue') },
      { path: 'spare', meta: { title: '备品备件类型' }, component: () => import('@/views/device-type/DeviceTypeView.vue') },
      { path: 'instrument', meta: { title: '仪器仪表类型' }, component: () => import('@/views/device-type/DeviceTypeView.vue') },
      { path: 'tool', meta: { title: '工器具类型' }, component: () => import('@/views/device-type/DeviceTypeView.vue') },
    ],
  },
  {
    path: '/system',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '系统功能设置', icon: 'Setting' },
    redirect: '/system/org',
    children: [
      { path: 'org', meta: { title: '组织机构' }, component: () => import('@/views/system/OrganizationView.vue') },
      { path: 'role', meta: { title: '角色权限' }, component: () => import('@/views/system/RoleView.vue') },
    ],
  },
]
