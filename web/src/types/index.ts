export type AssetCategory = 'warehouse' | 'spare' | 'instrument' | 'tool'

export interface Organization {
  id: string
  name: string
  parentId: string | null
  level: number
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
  category: 'warehouse' | 'spare' | 'instrument' | 'tool'
  code: string
  unit: string
  description: string
}

export interface AssetLedger {
  id: string
  category: AssetCategory
  assetCode: string
  name: string
  typeId: string
  typeName: string
  orgId: string
  orgName: string
  warehouseName: string
  manufacturer: string
  model: string
  quantity: number
  unit: string
  status: '在库' | '在用' | '维修中' | '报废'
  purchaseDate: string
  warrantyDate: string
  remark?: string
}

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
}

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
  /** 关联维修记录 ID（转维修后写入） */
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
  /** 来源故障记录 ID */
  faultId?: string | null
}

/** 资产生命周期时间线条目 */
export interface AssetLifecycleEvent {
  id: string
  type: 'ledger' | 'inout' | 'fault' | 'maintenance' | 'inventory'
  title: string
  time: string
  description: string
  tag?: string
  tagType?: '' | 'success' | 'warning' | 'danger' | 'info'
}

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
  /** 上级任务 ID，中心级任务为 null */
  parentId: string | null
  /** center=中心汇总任务（可下钻至生产仓），warehouse=生产仓执行任务（可下钻至资产明细） */
  level: 'center' | 'warehouse'
}

/** 盘点资产明细行（生产仓级任务下钻） */
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
}

export interface MenuItem {
  path: string
  title: string
  icon?: string
  children?: MenuItem[]
}

export const categoryLabels: Record<AssetCategory, string> = {
  warehouse: '生产仓',
  spare: '备品备件',
  instrument: '仪器仪表',
  tool: '工器具',
}

export const subModuleLabels = {
  ledger: '台账录入',
  inout: '出入库记录',
  fault: '故障记录',
  maintenance: '维修记录',
  inventory: '盘点记录',
} as const

export type SubModule = keyof typeof subModuleLabels
