export type AssetCategory = 'spare' | 'instrument' | 'tool'

/** 设备台账类别（不含生产仓地点本身） */
export type AssetLedgerCategory = AssetCategory

/** 组织机构类型：东北分部 → 省公司 → 地市公司 → 县公司 → 班组 */
export type OrgType = 'division' | 'province' | 'city' | 'county' | 'team'

export interface Organization {
  id: string
  name: string
  code: string
  type: OrgType
  parentId: string | null
  level: number
  shortName?: string
  leader?: string
  phone?: string
}

export interface Role {
  id: string
  name: string
  code: string
  description: string
  permissions: string[]
}

/** 用户数据可见范围 */
export type DataScope = 'all' | 'org_and_children' | 'org_only'

/** 登录用户上下文 */
export interface UserContext {
  token: string
  username: string
  displayName: string
  personId: string
  orgId: string
  orgName: string
  orgType: OrgType
  roleId: string
  roleName: string
  permissions: string[]
  dataScope: DataScope
}

export interface Person {
  id: string
  name: string
  employeeNo: string
  orgId: string
  orgName: string
  roleId: string
  roleName: string
  phone: string
  status: '在职' | '离职'
}

/** 生产仓地点 / 仓室主数据 */
export type WarehouseUseStatus = '在用' | '停用' | '改造中' | '待建'

export type WarehouseAssetNature = '自有' | '租赁' | '借用'

export type WarehouseSiteType = '备品仓' | '仪器室' | '工器具室' | '综合仓'

export interface WarehouseSite {
  id: string
  code: string
  name: string
  location: string
  orgId: string
  orgName: string
  assetNature: WarehouseAssetNature
  useStatus: WarehouseUseStatus
  area: number
  keeperId: string
  keeperName: string
  contactPhone?: string
  warehouseType?: WarehouseSiteType
  isSmart?: boolean
  /** 经度（地图） */
  lng?: number
  /** 纬度（地图） */
  lat?: number
  storageLayoutNote?: string
  remark?: string
  createdAt: string
}

export const warehouseUseStatusOptions: WarehouseUseStatus[] = ['在用', '停用', '改造中', '待建']

export const warehouseAssetNatureOptions: WarehouseAssetNature[] = ['自有', '租赁', '借用']

export const warehouseSiteTypeOptions: WarehouseSiteType[] = ['备品仓', '仪器室', '工器具室', '综合仓']

export interface Manufacturer {
  id: string
  name: string
  category: 'spare' | 'instrument' | 'tool'
  contact: string
  phone: string
  address: string
  qualification: string
}

export interface DeviceType {
  id: string
  name: string
  category: AssetCategory
  code: string
  unit: string
  description: string
}

export type SpecialtyType = '输电' | '变电' | '配电' | '直流' | '通信' | '综合'

export type CheckDueStatus = '正常' | '临期' | '超期' | '未校验'

export type DisposeStatus = '在库' | '可用' | '占用' | '待报废' | '已报废'

export type DeviceRunStatus = '在运' | '备用' | '检修' | '停用'

export interface AssetLedger {
  id: string
  category: AssetCategory
  assetCode: string
  name: string
  typeId: string
  typeName: string
  orgId: string
  orgName: string
  warehouseId: string
  warehouseName: string
  manufacturer: string
  model: string
  quantity: number
  unit: string
  status: '在库' | '在用' | '维修中' | '报废'
  purchaseDate: string
  warrantyDate: string
  remark?: string
  /** 实物 ID */
  physicalId?: string
  /** 资产编号 */
  assetNo?: string
  /** 专业分类 */
  specialty?: SpecialtyType
  keeperName?: string
  assetNature?: WarehouseAssetNature
  disposeStatus?: DisposeStatus
  deviceStatus?: DeviceRunStatus
  originalValue?: number
  voltageLevel?: string
  /** 库区 */
  storageArea?: string
  /** 货架 */
  shelfNo?: string
  /** 仓位 */
  binNo?: string
  lastCheckDate?: string
  checkDueStatus?: CheckDueStatus
  spareSource?: string
  trialDueStatus?: CheckDueStatus
  warehouseAgeDays?: number
}

/** 历史流水（确认单据后生成） */
export interface InOutRecord {
  id: string
  category: AssetCategory
  assetCode: string
  assetName: string
  type: '入库' | '出库'
  quantity: number
  operator: string
  orgName: string
  reason: string
  operateTime: string
  billId?: string
  scene?: string
  workOrderNo?: string
  physicalId?: string
}

export type StockBillType = '入库' | '出库'

export type InboundScene = '采购' | '归还' | '调拨' | '检修回收' | '物资库转入' | '盘盈'

export type OutboundScene = '日常领用' | '抢修领用' | '调拨' | '送检' | '盘亏' | '报废'

export type StockBillStatus = '草稿' | '待审批' | '已通过' | '已驳回' | '待确认' | '已确认'

export interface StockBill {
  id: string
  billNo: string
  category: AssetCategory
  billType: StockBillType
  scene: InboundScene | OutboundScene
  status: StockBillStatus
  assetCode: string
  assetName: string
  quantity: number
  applicant: string
  orgId: string
  orgName: string
  warehouseId?: string
  warehouseName?: string
  workOrderNo?: string
  reason: string
  physicalId?: string
  approver?: string
  approveTime?: string
  approveRemark?: string
  confirmer?: string
  confirmTime?: string
  createTime: string
  rejectReason?: string
}

export const inboundSceneOptions: InboundScene[] = ['采购', '归还', '调拨', '检修回收', '物资库转入', '盘盈']
export const outboundSceneOptions: OutboundScene[] = ['日常领用', '抢修领用', '调拨', '送检', '盘亏', '报废']

export interface FaultRecord {
  id: string
  category: AssetCategory
  assetCode: string
  assetName: string
  faultDesc: string
  faultLevel: '一般' | '严重' | '紧急'
  reporter: string
  orgName: string
  reportTime: string
  status: '待处理' | '处理中' | '已关闭'
  maintenanceId?: string | null
}

export interface MaintenanceRecord {
  id: string
  category: AssetCategory
  assetCode: string
  assetName: string
  projectName: string
  fundingSource: string
  amount: number
  vendor: string
  startDate: string
  endDate: string
  operator: string
  status: '进行中' | '已完成'
  remark?: string
  faultId?: string | null
}

export interface AssetLifecycleEvent {
  id: string
  type: 'ledger' | 'inout' | 'fault' | 'maintenance' | 'inventory'
  title: string
  time: string
  description: string
  tag?: string
  tagType?: '' | 'success' | 'warning' | 'danger' | 'info'
}

export type InventoryPlanLevel = 'province' | 'city' | 'county' | 'team' | 'center' | 'warehouse'

export interface InventoryTask {
  id: string
  category: AssetCategory
  taskName: string
  orgId: string
  orgName: string
  assignee: string
  totalCount: number
  checkedCount: number
  status: '待盘点' | '盘点中' | '已完成'
  deadline: string
  createTime: string
  parentId: string | null
  level: InventoryPlanLevel
}

export type InventoryCheckMethod = 'manual' | 'scan' | 'photo'

export interface InventoryLineItem {
  id: string
  taskId: string
  assetCode: string
  assetName: string
  typeName: string
  warehouseName: string
  bookQuantity: number
  actualQuantity: number | null
  status: '待盘' | '已盘' | '有差异'
  checkMethod?: InventoryCheckMethod
  scanCode?: string
  photoDataUrl?: string
  physicalId?: string
  /** 差异是否已过账至台账 */
  adjusted?: boolean
  adjustedAt?: string
  adjustedBy?: string
}

/** 定额公式类型 */
export type QuotaFormulaType = 'production' | 'standard'

export interface QuotaRule {
  id: string
  name: string
  category: AssetCategory
  typeName: string
  formulaType: QuotaFormulaType
  /** 百台障碍率 / 故障率等 */
  k: number
  a: number
  t?: number
  p?: number
  unit: string
  remark?: string
}

export interface OrgDeviceParam {
  id: string
  orgId: string
  orgName: string
  warehouseId?: string
  warehouseName?: string
  ruleId: string
  /** 同类设备件数 A */
  deviceCount: number
  updatedAt: string
}

export interface QuotaResult {
  id: string
  ruleId: string
  ruleName: string
  orgId: string
  orgName: string
  warehouseId?: string
  warehouseName?: string
  category: AssetCategory
  typeName: string
  formulaType: QuotaFormulaType
  deviceCount: number
  standardQty: number
  upperLimit: number
  lowerLimit: number
  actualQty: number
  shortage: number
  overage: number
  calculatedAt: string
}

export type AlertCategory = '库存' | '校验' | '环境' | '合规' | '定额'

export type AlertLevel = '提示' | '警告' | '严重'

export interface AlertItem {
  id: string
  category: AlertCategory
  level: AlertLevel
  title: string
  content: string
  status: '未处理' | '已处理' | '已忽略'
  targetType?: 'ledger' | 'warehouse' | 'bill' | 'inventory' | 'quota' | 'org'
  targetId?: string
  routePath?: string
  orgName?: string
  createTime: string
  handleTime?: string
  handleRemark?: string
}

export interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
}

export const categoryLabels: Record<AssetCategory, string> = {
  spare: '备品备件',
  instrument: '仪器仪表',
  tool: '工器具',
}

export const specialtyOptions: SpecialtyType[] = ['输电', '变电', '配电', '直流', '通信', '综合']

export const subModuleLabels = {
  ledger: '台账录入',
  inout: '出入库记录',
  fault: '故障记录',
  maintenance: '维修记录',
  inventory: '盘点记录',
} as const

export type SubModule = keyof typeof subModuleLabels

/** 出入库三级页动作 */
export type InOutPageAction =
  | 'in-apply'
  | 'in-approve'
  | 'in-confirm'
  | 'out-apply'
  | 'out-approve'
  | 'out-confirm'
  | 'stock-status'
  | 'shortage'
  | 'inout-log'

/** 盘点三级页动作 */
export type InventoryPageAction = 'plan' | 'execute' | 'progress'
