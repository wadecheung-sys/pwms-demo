import type { AssetCategory, InOutPageAction, InventoryPageAction, SubModule } from '@/types'

export interface RouteMeta {
  title: string
  icon?: string
  hidden?: boolean
  category?: AssetCategory
  subModule?: SubModule
  aggregateAssets?: boolean
  inoutAction?: InOutPageAction
  inventoryAction?: InventoryPageAction
  quotaAction?: 'rules' | 'params' | 'results' | 'catalog'
}

function leaf(
  path: string,
  name: string,
  title: string,
  component: () => Promise<unknown>,
  meta: Partial<RouteMeta> = {},
) {
  return {
    path,
    name,
    component,
    meta: { title, ...meta } satisfies RouteMeta,
  }
}

function assetInOutChildren(prefix: string, category: AssetCategory) {
  const pages: { path: string; title: string; action: InOutPageAction }[] = [
    { path: 'in-apply', title: '入库申请单', action: 'in-apply' },
    { path: 'in-approve', title: '入库审批', action: 'in-approve' },
    { path: 'in-confirm', title: '入库确认', action: 'in-confirm' },
    { path: 'out-apply', title: '出库申请单', action: 'out-apply' },
    { path: 'out-approve', title: '出库审批', action: 'out-approve' },
    { path: 'out-confirm', title: '出库确认', action: 'out-confirm' },
    { path: 'stock-status', title: '在库状态', action: 'stock-status' },
    { path: 'shortage', title: '缺额视图', action: 'shortage' },
    { path: 'log', title: '出入库记录', action: 'inout-log' },
  ]
  return {
    path: 'inout',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '出入库管理', icon: 'Sort' },
    redirect: `/${prefix}/inout/in-apply`,
    children: pages.map((p) =>
      leaf(p.path, `${prefix}-inout-${p.path}`, p.title, () => import('@/views/inout/StockBillView.vue'), {
        category,
        inoutAction: p.action,
      }),
    ),
  }
}

function assetInventoryChildren(prefix: string, category: AssetCategory) {
  const pages: { path: string; title: string; action: InventoryPageAction }[] = [
    { path: 'plan', title: '计划下达', action: 'plan' },
    { path: 'execute', title: '执行盘点', action: 'execute' },
    { path: 'progress', title: '进度管控', action: 'progress' },
  ]
  return {
    path: 'inventory',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '盘点管理', icon: 'DocumentChecked' },
    redirect: `/${prefix}/inventory/plan`,
    children: pages.map((p) =>
      leaf(p.path, `${prefix}-inv-${p.path}`, p.title, () => import('@/views/inventory/InventoryManageView.vue'), {
        category,
        inventoryAction: p.action,
      }),
    ),
  }
}

function assetCategoryRoutes(prefix: string, category: AssetCategory, title: string) {
  return {
    path: `/${prefix}`,
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title, icon: 'Box' },
    redirect: `/${prefix}/ledger`,
    children: [
      leaf('ledger', `${prefix}-ledger`, '台账管理', () => import('@/views/asset/LedgerManageView.vue'), {
        category,
        subModule: 'ledger',
      }),
      assetInOutChildren(prefix, category),
      leaf('fault', `${prefix}-fault`, '故障记录', () => import('@/views/asset/AssetModuleView.vue'), {
        category,
        subModule: 'fault',
      }),
      leaf(
        'maintenance',
        `${prefix}-maintenance`,
        '维修记录',
        () => import('@/views/asset/AssetModuleView.vue'),
        { category, subModule: 'maintenance' },
      ),
      assetInventoryChildren(prefix, category),
    ],
  }
}

function warehouseRoutes() {
  return {
    path: '/warehouse',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '生产仓管理', icon: 'House' },
    redirect: '/warehouse/overview',
    children: [
      leaf('overview', 'warehouse-overview', '生产仓概览', () => import('@/views/warehouse/WarehouseOverviewView.vue')),
      leaf('ledger', 'warehouse-ledger', '生产仓台账', () => import('@/views/warehouse/WarehouseLedgerView.vue')),
      {
        path: 'inout',
        component: () => import('@/layouts/RouteView.vue'),
        meta: { title: '出入库管理', icon: 'Sort' },
        redirect: '/warehouse/inout/in-apply',
        children: (
          [
            { path: 'in-apply', title: '入库申请单', action: 'in-apply' as const },
            { path: 'in-approve', title: '入库审批', action: 'in-approve' as const },
            { path: 'in-confirm', title: '入库确认', action: 'in-confirm' as const },
            { path: 'out-apply', title: '出库申请单', action: 'out-apply' as const },
            { path: 'out-approve', title: '出库审批', action: 'out-approve' as const },
            { path: 'out-confirm', title: '出库确认', action: 'out-confirm' as const },
            { path: 'stock-status', title: '在库状态', action: 'stock-status' as const },
            { path: 'shortage', title: '缺额视图', action: 'shortage' as const },
            { path: 'log', title: '出入库记录', action: 'inout-log' as const },
          ] as const
        ).map((p) =>
          leaf(p.path, `warehouse-inout-${p.path}`, p.title, () => import('@/views/inout/StockBillView.vue'), {
            aggregateAssets: true,
            inoutAction: p.action,
          }),
        ),
      },
      leaf('fault', 'warehouse-fault', '故障记录', () => import('@/views/asset/AssetModuleView.vue'), {
        aggregateAssets: true,
        subModule: 'fault',
      }),
      leaf(
        'maintenance',
        'warehouse-maintenance',
        '维修记录',
        () => import('@/views/asset/AssetModuleView.vue'),
        { aggregateAssets: true, subModule: 'maintenance' },
      ),
      {
        path: 'inventory',
        component: () => import('@/layouts/RouteView.vue'),
        meta: { title: '盘点管理', icon: 'DocumentChecked' },
        redirect: '/warehouse/inventory/plan',
        children: (
          [
            { path: 'plan', title: '计划下达', action: 'plan' as const },
            { path: 'execute', title: '执行盘点', action: 'execute' as const },
            { path: 'progress', title: '进度管控', action: 'progress' as const },
          ] as const
        ).map((p) =>
          leaf(
            p.path,
            `warehouse-inv-${p.path}`,
            p.title,
            () => import('@/views/inventory/InventoryManageView.vue'),
            { aggregateAssets: true, inventoryAction: p.action },
          ),
        ),
      },
    ],
  }
}

export const menuRoutes = [
  {
    path: '/dashboard',
    meta: { title: '经营分析', icon: 'DataAnalysis' },
    component: () => import('@/views/dashboard/AnalyticsHomeView.vue'),
  },
  warehouseRoutes(),
  assetCategoryRoutes('spare', 'spare', '备品备件管理'),
  assetCategoryRoutes('instrument', 'instrument', '仪器仪表管理'),
  assetCategoryRoutes('tool', 'tool', '工器具管理'),
  {
    path: '/quota',
    component: () => import('@/layouts/RouteView.vue'),
    meta: { title: '定额管理', icon: 'Calculator' },
    redirect: '/quota/rules',
    children: [
      leaf('rules', 'quota-rules', '定额规则', () => import('@/views/quota/QuotaManageView.vue'), {
        quotaAction: 'rules',
      }),
      leaf('params', 'quota-params', '单位参数填报', () => import('@/views/quota/QuotaManageView.vue'), {
        quotaAction: 'params',
      }),
      leaf('results', 'quota-results', '定额测算结果', () => import('@/views/quota/QuotaManageView.vue'), {
        quotaAction: 'results',
      }),
      leaf('catalog', 'quota-catalog', '一仓一策目录', () => import('@/views/quota/QuotaManageView.vue'), {
        quotaAction: 'catalog',
      }),
    ],
  },
  {
    path: '/alerts',
    meta: { title: '告警中心', icon: 'Bell' },
    component: () => import('@/views/alert/AlertCenterView.vue'),
  },
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
    meta: { title: '物资类型管理', icon: 'Collection' },
    redirect: '/device-type/spare',
    children: [
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
