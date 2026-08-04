export type AssetCategory = 'spare' | 'instrument' | 'tool'

/** 设备台账类别（不含生产仓地点本身） */
export type AssetLedgerCategory = AssetCategory

/** 组织机构类型：分部 → 省公司 → 地市公司 → 县公司 → 供电所(team) */
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

/** 仓室资产性质：省公司自有 / 租赁（租赁需填租赁单位） */
export type WarehouseAssetNature = '省公司自有' | '租赁'

export type WarehouseSiteType = '备品仓' | '仪器室' | '工器具室' | '综合仓'

export interface WarehouseSite {
  id: string
  code: string
  name: string
  location: string
  orgId: string
  orgName: string
  assetNature: WarehouseAssetNature
  /** 租赁单位（资产性质=租赁时必填） */
  leaseUnit?: string
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

export const warehouseAssetNatureOptions: WarehouseAssetNature[] = ['省公司自有', '租赁']

/** 省公司全称（展示用） */
export const PROVINCE_COMPANY_FULL_NAME = '国网星海省电力有限公司'

export const warehouseSiteTypeOptions: WarehouseSiteType[] = [
  '备品仓',
  '仪器室',
  '工器具室',
  '综合仓'
]

/** 仓库配备的智能化设施类别（不属于仓内物资台账） */
export type WarehouseSmartDeviceCategory =
  'RFID设备' | '智能门禁' | '视频监控' | '环境监测' | '智能货架' | '作业终端'

export type WarehouseSmartDeviceStatus = '在用' | '离线' | '故障' | '停用'

export interface WarehouseSmartDevice {
  id: string
  code: string
  name: string
  category: WarehouseSmartDeviceCategory
  warehouseId: string
  warehouseName: string
  orgId: string
  orgName: string
  manufacturer: string
  model: string
  quantity: number
  status: WarehouseSmartDeviceStatus
  installLocation: string
  commissioningDate: string
  lastOnlineTime?: string
  remark?: string
}

export const warehouseSmartDeviceCategoryOptions: WarehouseSmartDeviceCategory[] = [
  'RFID设备',
  '智能门禁',
  '视频监控',
  '环境监测',
  '智能货架',
  '作业终端'
]

export const warehouseSmartDeviceStatusOptions: WarehouseSmartDeviceStatus[] = [
  '在用',
  '离线',
  '故障',
  '停用'
]

/** 一级专业域：依据专业仓储备定额测算材料划分 */
export type SpecialtyDomain = '营销' | '运检' | '调控'

/**
 * 叶级专业分类。
 * 营销当前材料未继续拆分；运检下设输电/变电/配电；调控下设二次。
 */
export type SpecialtyType = '营销' | '输电' | '变电' | '配电' | '二次'

export interface SpecialtyTreeOption {
  [key: string]: unknown
  value: SpecialtyDomain | SpecialtyType
  label: string
  children?: SpecialtyTreeOption[]
}

/** 增加方式（台账「增加方式」） */
export type IncreaseMode = '购置' | '调拨转入' | '工程转备品' | '盘盈' | '其他'

export const increaseModeOptions: IncreaseMode[] = [
  '购置',
  '调拨转入',
  '工程转备品',
  '盘盈',
  '其他'
]

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
  /** 所属专业（规范录入与统计） */
  specialty?: SpecialtyType
}

/** 按物资类型配置的试验/检定周期（天） */
export interface CheckCycleSetting {
  id: string
  category: AssetCategory
  typeName: string
  /** 周期天数 */
  cycleDays: number
  /** spare=试验，instrument/tool=检定 */
  checkKind: 'trial' | 'calibration'
}

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
  /** 入库时间（确认入库后写入，用于计算在库时长） */
  inboundTime?: string
  /** 是否在库（语义字段，可由 status 推导） */
  inStock?: boolean
  /** 是否可用 */
  usable?: boolean
  /** 出库领用：预计归还日（仪器/工器具） */
  expectedReturnDate?: string
  /** 出库用途工程 */
  projectName?: string
  /** 增加方式 */
  increaseMode?: IncreaseMode
  /** 是否纳入应急物资储备（仅备品备件使用） */
  isEmergency?: boolean
}

/** 出库业务类型：常规走申请审批；抢修先领用后补办 */
export type OutboundKind = '常规' | '抢修'

/** 关联工单类型（非工作票） */
export type WorkOrderType = '大修' | '日常运维' | '抢修'

export const workOrderTypeOptions: WorkOrderType[] = ['大修', '日常运维', '抢修']
export const outboundKindOptions: OutboundKind[] = ['常规', '抢修']

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
  /** @deprecated 使用 fundingSource */
  scene?: string
  fundingSource?: FundingSource
  workOrderNo?: string
  workOrderType?: WorkOrderType
  wbsCode?: string
  outboundKind?: OutboundKind
  physicalId?: string
  projectName?: string
  expectedReturnDate?: string
  approver?: string
  /** 仪器/工器具出库后是否已归还 */
  returned?: boolean
  returnTime?: string
}

export type StockBillType = '入库' | '出库'

/** 资金来源（替代原「场景」） */
export type FundingSource = '成本' | '零购' | '工程转备品'

/** @deprecated 兼容旧种子，新逻辑用 FundingSource */
export type InboundScene =
  FundingSource | '采购' | '归还' | '调拨' | '检修回收' | '物资库转入' | '盘盈'

export type OutboundScene =
  FundingSource | '日常领用' | '抢修领用' | '调拨' | '送检' | '盘亏' | '报废'

export type StockBillStatus =
  | '草稿'
  | '待审批'
  | '已通过'
  | '已驳回'
  | '待确认'
  | '已确认'
  /** 抢修领用后待补办出库手续 */
  | '待补办'
  /** 已上传应急抢修审批单，等待补办审批 */
  | '补办待审'

export interface StockBill {
  id: string
  billNo: string
  category: AssetCategory
  billType: StockBillType
  /** 资金来源 */
  fundingSource: FundingSource
  /** @deprecated 兼容旧数据 */
  scene?: InboundScene | OutboundScene
  status: StockBillStatus
  assetCode: string
  assetName: string
  /** 设备型号（冗余展示） */
  model?: string
  quantity: number
  applicant: string
  orgId: string
  orgName: string
  warehouseId?: string
  warehouseName?: string
  /** 出库关联工单号；入库一般不用 */
  workOrderNo?: string
  /** 工单类型：大修 / 日常运维 / 抢修 */
  workOrderType?: WorkOrderType
  /** WBS 编码（常规大修/日常运维必填；抢修不要求） */
  wbsCode?: string
  /** 出库业务类型，默认常规 */
  outboundKind?: OutboundKind
  /** 抢修补办截止日期（领用日起 5 个工作日） */
  makeupDeadline?: string
  /** 应急抢修审批单（演示存文件名/说明） */
  emergencyApprovalFile?: string
  reason: string
  physicalId?: string
  approver?: string
  approveTime?: string
  approveRemark?: string
  confirmer?: string
  confirmTime?: string
  /** 入库确认时间，等同库存入库时间 */
  inboundTime?: string
  createTime: string
  rejectReason?: string
  projectName?: string
  expectedReturnDate?: string
}

export const fundingSourceOptions: FundingSource[] = ['成本', '零购', '工程转备品']

/** @deprecated */
export const inboundSceneOptions: FundingSource[] = fundingSourceOptions
/** @deprecated */
export const outboundSceneOptions: FundingSource[] = fundingSourceOptions

export interface FaultRecord {
  id: string
  category: AssetCategory
  assetCode: string
  assetName: string
  faultDesc: string
  /** 故障等级（备品备件不分级，仪器仪表/工器具保留） */
  faultLevel?: '一般' | '严重' | '紧急'
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
  tagType?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
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
  /** 计划开始日期 */
  startDate?: string
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
  /** 适用专业；采用营销/运检/调控标准树的叶级值 */
  specialty?: SpecialtyType
  formulaType: QuotaFormulaType
  /** K：百分比字段；生产仓表示供电可靠性，配置原则/调控备品表示故障率 */
  k: number
  /** a/α：生产仓为差异系数；配置原则为不平均系数 */
  a: number
  /** T：备品订货周期（月） */
  t?: number
  /** P：备品健康寿命（年） */
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
  /** A：随公式变化；生产仓为资产原值（万元），配置原则为同类设备数量 */
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
  specialty?: SpecialtyType
  formulaType: QuotaFormulaType
  deviceCount: number
  /** N：某单位某类设备的储备定额 */
  standardQty: number
  /** @deprecated 甲方要求取消上下限展示，保留字段兼容旧数据 */
  upperLimit?: number
  lowerLimit?: number
  actualQty: number
  /** 可用库存 */
  availableQty?: number
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
  tool: '工器具'
}

export const specialtyOptions: SpecialtyType[] = ['营销', '输电', '变电', '配电', '二次']

/** 专业分类标准树，级联选择器以叶级值写入现有 specialty 字段。 */
export const specialtyTreeOptions: SpecialtyTreeOption[] = [
  { value: '营销', label: '营销' },
  {
    value: '运检',
    label: '运检',
    children: [
      { value: '输电', label: '输电' },
      { value: '变电', label: '变电' },
      { value: '配电', label: '配电' }
    ]
  },
  {
    value: '调控',
    label: '调控',
    children: [{ value: '二次', label: '二次' }]
  }
]

const specialtyDomainMap: Record<SpecialtyType, SpecialtyDomain> = {
  营销: '营销',
  输电: '运检',
  变电: '运检',
  配电: '运检',
  二次: '调控'
}

/** 旧数据迁移：直流/通信归并调控二次；综合保持未分类，避免无依据归类。 */
export function normalizeSpecialty(value?: string | null): SpecialtyType | undefined {
  if (specialtyOptions.includes(value as SpecialtyType)) return value as SpecialtyType
  if (value === '直流' || value === '通信') return '二次'
  return undefined
}

export function specialtyDomainOf(value?: string | null): SpecialtyDomain | undefined {
  const normalized = normalizeSpecialty(value)
  return normalized ? specialtyDomainMap[normalized] : undefined
}

export function specialtyPathLabel(value?: string | null): string {
  const normalized = normalizeSpecialty(value)
  if (!normalized) return '待规范'
  const domain = specialtyDomainMap[normalized]
  return domain === normalized ? normalized : `${domain} / ${normalized}`
}

export const subModuleLabels = {
  ledger: '台账管理',
  inout: '出入库记录',
  fault: '故障记录',
  maintenance: '维修记录',
  inventory: '盘点记录',
  trial: '试验记录',
  calibration: '检定记录',
  retirement: '退役报废',
  outboundStats: '出库统计'
} as const

export type SubModule = keyof typeof subModuleLabels

/** 出入库三级页动作（审批页合并原确认） */
export type InOutPageAction =
  | 'in-apply'
  | 'in-approve'
  | 'out-apply'
  | 'out-approve'
  | 'stock-status'
  | 'shortage'
  | 'inout-log'
  | 'transfer'

/** 盘点三级页动作 */
export type InventoryPageAction = 'plan' | 'execute' | 'progress'

/** 转仓/调拨单（收-发-调-转中的调转） */
export type TransferBillStatus = '待审批' | '已驳回' | '待确认' | '已完成'

export interface TransferBill {
  id: string
  billNo: string
  category: AssetCategory
  assetCode: string
  assetName: string
  quantity: number
  fromWarehouseId: string
  fromWarehouseName: string
  toWarehouseId: string
  toWarehouseName: string
  applicant: string
  orgId: string
  orgName: string
  reason: string
  status: TransferBillStatus
  createTime: string
  approver?: string
  approveTime?: string
  rejectReason?: string
  confirmer?: string
  confirmTime?: string
  physicalId?: string
}

/** 试验/检定记录 */
export interface CheckRecord {
  id: string
  category: AssetCategory
  assetCode: string
  assetName: string
  checkKind: 'trial' | 'calibration'
  checkDate: string
  nextDueDate: string
  result: '合格' | '不合格'
  operator: string
  orgName: string
  remark?: string
}

/** 退役报废记录 */
export interface RetirementRecord {
  id: string
  category: AssetCategory
  assetCode: string
  assetName: string
  reason: string
  applicant: string
  orgName: string
  status: '待审批' | '已报废'
  createTime: string
  approveTime?: string
}
