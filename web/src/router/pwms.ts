import type { AssetCategory, InOutPageAction, InventoryPageAction, SubModule } from '@/types'
import { Layout, getParentLayout } from '@/utils/routerHelper'

const V = {
  analytics: () => import('@/views/Pwms/dashboard/AnalyticsHomeView.vue'),
  warehouseOverview: () => import('@/views/Pwms/warehouse/WarehouseOverviewView.vue'),
  warehouseLedger: () => import('@/views/Pwms/warehouse/WarehouseLedgerView.vue'),
  stockBill: () => import('@/views/Pwms/inout/StockBillView.vue'),
  transfer: () => import('@/views/Pwms/warehouse/TransferManageView.vue'),
  ledger: () => import('@/views/Pwms/asset/LedgerManageView.vue'),
  assetModule: () => import('@/views/Pwms/asset/AssetModuleView.vue'),
  checkRecord: () => import('@/views/Pwms/asset/CheckRecordView.vue'),
  retirement: () => import('@/views/Pwms/asset/RetirementView.vue'),
  outboundStats: () => import('@/views/Pwms/asset/OutboundStatsView.vue'),
  inventory: () => import('@/views/Pwms/inventory/InventoryManageView.vue'),
  quota: () => import('@/views/Pwms/quota/QuotaManageView.vue'),
  alerts: () => import('@/views/Pwms/alert/AlertCenterView.vue'),
  personnel: () => import('@/views/Pwms/personnel/PersonnelView.vue'),
  manufacturer: () => import('@/views/Pwms/manufacturer/ManufacturerView.vue'),
  deviceType: () => import('@/views/Pwms/device-type/DeviceTypeView.vue'),
  org: () => import('@/views/Pwms/system/OrganizationView.vue'),
  role: () => import('@/views/Pwms/system/RoleView.vue'),
  checkCycle: () => import('@/views/Pwms/system/CheckCycleView.vue'),
}

const I = {
  dashboard: 'vi-ant-design:dashboard-outlined',
  warehouse: 'vi-ant-design:home-outlined',
  overview: 'vi-ant-design:eye-outlined',
  ledger: 'vi-ant-design:table-outlined',
  inout: 'vi-ant-design:swap-outlined',
  inApply: 'vi-ant-design:login-outlined',
  inApprove: 'vi-ant-design:audit-outlined',
  outApply: 'vi-ant-design:logout-outlined',
  outApprove: 'vi-ant-design:file-done-outlined',
  stock: 'vi-ant-design:database-outlined',
  shortage: 'vi-ant-design:warning-outlined',
  log: 'vi-ant-design:history-outlined',
  fault: 'vi-ant-design:alert-outlined',
  maintenance: 'vi-ant-design:tool-outlined',
  inventory: 'vi-ant-design:schedule-outlined',
  plan: 'vi-ant-design:file-add-outlined',
  execute: 'vi-ant-design:play-circle-outlined',
  progress: 'vi-ant-design:bar-chart-outlined',
  spare: 'vi-ant-design:inbox-outlined',
  instrument: 'vi-ant-design:experiment-outlined',
  tool: 'vi-ant-design:tool-outlined',
  quota: 'vi-ant-design:calculator-outlined',
  rules: 'vi-ant-design:profile-outlined',
  params: 'vi-ant-design:form-outlined',
  results: 'vi-ant-design:fund-outlined',
  catalog: 'vi-ant-design:heat-map-outlined',
  alerts: 'vi-ant-design:bell-outlined',
  personnel: 'vi-ant-design:user-outlined',
  manufacturer: 'vi-ant-design:bank-outlined',
  deviceType: 'vi-ant-design:appstore-outlined',
  system: 'vi-ant-design:setting-outlined',
  org: 'vi-ant-design:apartment-outlined',
  role: 'vi-ant-design:safety-certificate-outlined',
  trial: 'vi-ant-design:safety-outlined',
  calibration: 'vi-ant-design:experiment-outlined',
  retirement: 'vi-ant-design:delete-outlined',
  outboundStats: 'vi-ant-design:bar-chart-outlined',
  transfer: 'vi-ant-design:swap-outlined',
  checkCycle: 'vi-ant-design:field-time-outlined',
} as const

const inoutIcons: Record<string, string> = {
  'in-apply': I.inApply,
  'in-approve': I.inApprove,
  'out-apply': I.outApply,
  'out-approve': I.outApprove,
  'stock-status': I.stock,
  shortage: I.shortage,
  log: I.log,
  transfer: I.transfer,
}

const inventoryIcons: Record<string, string> = {
  plan: I.plan,
  execute: I.execute,
  progress: I.progress,
}

/** 生产仓出入库（审批已合并确认） */
function inoutChildren(prefix: string, category?: AssetCategory, aggregate?: boolean) {
  const pages: { path: string; title: string; action: InOutPageAction }[] = [
    { path: 'in-apply', title: '入库申请单', action: 'in-apply' },
    { path: 'in-approve', title: '入库审批', action: 'in-approve' },
    { path: 'out-apply', title: '出库申请单', action: 'out-apply' },
    { path: 'out-approve', title: '出库审批', action: 'out-approve' },
    { path: 'stock-status', title: '在库状态', action: 'stock-status' },
    { path: 'shortage', title: '缺额视图', action: 'shortage' },
    { path: 'log', title: '出入库记录', action: 'inout-log' },
    { path: 'transfer', title: '转仓调拨', action: 'transfer' },
  ]
  return {
    path: 'inout',
    component: getParentLayout(),
    name: `${prefix}Inout`,
    meta: { title: '出入库管理', icon: I.inout },
    redirect: `/${prefix}/inout/in-apply`,
    children: pages.map((p) => ({
      path: p.path,
      name: `${prefix}-inout-${p.path}`,
      component: p.action === 'transfer' ? V.transfer : V.stockBill,
      meta: {
        title: p.title,
        icon: inoutIcons[p.path] || I.inout,
        category,
        aggregateAssets: aggregate,
        inoutAction: p.action,
      },
    })),
  }
}

function inventoryChildren(prefix: string, category?: AssetCategory, aggregate?: boolean) {
  const pages: { path: string; title: string; action: InventoryPageAction }[] = [
    { path: 'plan', title: '计划下达', action: 'plan' },
    { path: 'execute', title: '执行盘点', action: 'execute' },
    { path: 'progress', title: '进度管控', action: 'progress' },
  ]
  return {
    path: 'inventory',
    component: getParentLayout(),
    name: `${prefix}Inventory`,
    meta: { title: '盘点管理', icon: I.inventory },
    redirect: `/${prefix}/inventory/plan`,
    children: pages.map((p) => ({
      path: p.path,
      name: `${prefix}-inv-${p.path}`,
      component: V.inventory,
      meta: {
        title: p.title,
        icon: inventoryIcons[p.path] || I.inventory,
        category,
        aggregateAssets: aggregate,
        inventoryAction: p.action,
      },
    })),
  }
}

/** 备品/仪器/工器具：无出入库，含试验/检定、退役、出库统计 */
function assetCategoryRoutes(
  prefix: string,
  category: AssetCategory,
  title: string,
  icon: string,
): AppRouteRecordRaw {
  const checkPath = category === 'spare' ? 'trial' : 'calibration'
  const checkTitle = category === 'spare' ? '试验记录' : '检定记录'
  const checkIcon = category === 'spare' ? I.trial : I.calibration
  const checkSub = (category === 'spare' ? 'trial' : 'calibration') as SubModule

  return {
    path: `/${prefix}`,
    component: Layout,
    redirect: `/${prefix}/ledger`,
    name: prefix,
    meta: { title, icon },
    children: [
      {
        path: 'ledger',
        name: `${prefix}-ledger`,
        component: V.ledger,
        meta: { title: '台账管理', icon: I.ledger, category, subModule: 'ledger' as SubModule },
      },
      {
        path: 'fault',
        name: `${prefix}-fault`,
        component: V.assetModule,
        meta: { title: '故障记录', icon: I.fault, category, subModule: 'fault' as SubModule },
      },
      {
        path: 'maintenance',
        name: `${prefix}-maintenance`,
        component: V.assetModule,
        meta: {
          title: '维修记录',
          icon: I.maintenance,
          category,
          subModule: 'maintenance' as SubModule,
        },
      },
      {
        path: checkPath,
        name: `${prefix}-${checkPath}`,
        component: V.checkRecord,
        meta: { title: checkTitle, icon: checkIcon, category, subModule: checkSub },
      },
      inventoryChildren(prefix, category),
      {
        path: 'retirement',
        name: `${prefix}-retirement`,
        component: V.retirement,
        meta: {
          title: '退役报废管理',
          icon: I.retirement,
          category,
          subModule: 'retirement' as SubModule,
        },
      },
      {
        path: 'outbound-stats',
        name: `${prefix}-outbound-stats`,
        component: V.outboundStats,
        meta: {
          title: '出库统计',
          icon: I.outboundStats,
          category,
          subModule: 'outboundStats' as SubModule,
        },
      },
    ],
  } as AppRouteRecordRaw
}

export const pwmsAsyncRoutes: AppRouteRecordRaw[] = [
  {
    path: '/dashboard',
    component: Layout,
    redirect: '/dashboard/analysis',
    name: 'PwmsDashboard',
    meta: { title: '经营分析', icon: I.dashboard },
    children: [
      {
        path: 'analysis',
        name: 'PwmsAnalysis',
        component: V.analytics,
        meta: { title: '经营分析', icon: I.dashboard, affix: true },
      },
    ],
  },
  {
    path: '/warehouse',
    component: Layout,
    redirect: '/warehouse/overview',
    name: 'Warehouse',
    meta: { title: '生产仓管理', icon: I.warehouse },
    children: [
      {
        path: 'overview',
        name: 'warehouse-overview',
        component: V.warehouseOverview,
        meta: { title: '生产仓概览', icon: I.overview },
      },
      {
        path: 'ledger',
        name: 'warehouse-ledger',
        component: V.warehouseLedger,
        meta: { title: '生产仓台账', icon: I.ledger },
      },
      inoutChildren('warehouse', undefined, true),
      {
        path: 'fault',
        name: 'warehouse-fault',
        component: V.assetModule,
        meta: { title: '故障记录', icon: I.fault, aggregateAssets: true, subModule: 'fault' },
      },
      {
        path: 'maintenance',
        name: 'warehouse-maintenance',
        component: V.assetModule,
        meta: {
          title: '维修记录',
          icon: I.maintenance,
          aggregateAssets: true,
          subModule: 'maintenance',
        },
      },
      inventoryChildren('warehouse', undefined, true),
    ],
  } as AppRouteRecordRaw,
  assetCategoryRoutes('spare', 'spare', '备品备件管理', I.spare),
  assetCategoryRoutes('instrument', 'instrument', '仪器仪表管理', I.instrument),
  assetCategoryRoutes('tool', 'tool', '工器具管理', I.tool),
  {
    path: '/quota',
    component: Layout,
    redirect: '/quota/results',
    name: 'Quota',
    meta: { title: '定额管理', icon: I.quota },
    children: [
      {
        path: 'rules',
        name: 'quota-rules',
        component: V.quota,
        meta: { title: '定额规则', icon: I.rules, quotaAction: 'rules' },
      },
      {
        path: 'params',
        name: 'quota-params',
        component: V.quota,
        meta: { title: '单位参数填报', icon: I.params, quotaAction: 'params' },
      },
      {
        path: 'results',
        name: 'quota-results',
        component: V.quota,
        meta: { title: '定额测算结果', icon: I.results, quotaAction: 'results' },
      },
      {
        path: 'catalog',
        name: 'quota-catalog',
        component: V.quota,
        meta: { title: '省市定额分布', icon: I.catalog, quotaAction: 'catalog' },
      },
    ],
  } as AppRouteRecordRaw,
  {
    path: '/alerts',
    component: Layout,
    redirect: '/alerts/index',
    name: 'Alerts',
    meta: { title: '告警中心', icon: I.alerts },
    children: [
      {
        path: 'index',
        name: 'alerts-index',
        component: V.alerts,
        meta: { title: '告警中心', icon: I.alerts },
      },
    ],
  },
  {
    path: '/personnel',
    component: Layout,
    redirect: '/personnel/index',
    name: 'Personnel',
    meta: { title: '人员管理', icon: I.personnel },
    children: [
      {
        path: 'index',
        name: 'personnel-index',
        component: V.personnel,
        meta: { title: '人员管理', icon: I.personnel },
      },
    ],
  },
  {
    path: '/manufacturer',
    component: Layout,
    redirect: '/manufacturer/spare',
    name: 'Manufacturer',
    meta: { title: '生产厂家管理', icon: I.manufacturer },
    children: [
      {
        path: 'spare',
        name: 'mfr-spare',
        component: V.manufacturer,
        meta: { title: '备品备件厂家', icon: I.spare },
      },
      {
        path: 'instrument',
        name: 'mfr-instrument',
        component: V.manufacturer,
        meta: { title: '仪器仪表厂家', icon: I.instrument },
      },
      {
        path: 'tool',
        name: 'mfr-tool',
        component: V.manufacturer,
        meta: { title: '工器具厂家', icon: I.tool },
      },
    ],
  },
  {
    path: '/device-type',
    component: Layout,
    redirect: '/device-type/spare',
    name: 'DeviceType',
    meta: { title: '物资类型管理', icon: I.deviceType },
    children: [
      {
        path: 'spare',
        name: 'dt-spare',
        component: V.deviceType,
        meta: { title: '备品备件类型', icon: I.spare },
      },
      {
        path: 'instrument',
        name: 'dt-instrument',
        component: V.deviceType,
        meta: { title: '仪器仪表类型', icon: I.instrument },
      },
      {
        path: 'tool',
        name: 'dt-tool',
        component: V.deviceType,
        meta: { title: '工器具类型', icon: I.tool },
      },
    ],
  },
  {
    path: '/system',
    component: Layout,
    redirect: '/system/org',
    name: 'System',
    meta: { title: '系统功能设置', icon: I.system },
    children: [
      {
        path: 'org',
        name: 'system-org',
        component: V.org,
        meta: { title: '组织机构', icon: I.org },
      },
      {
        path: 'role',
        name: 'system-role',
        component: V.role,
        meta: { title: '角色权限', icon: I.role },
      },
      {
        path: 'check-cycle',
        name: 'system-check-cycle',
        component: V.checkCycle,
        meta: { title: '检定试验周期', icon: I.checkCycle },
      },
    ],
  },
]
