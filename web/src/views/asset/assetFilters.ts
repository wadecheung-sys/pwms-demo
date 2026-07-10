import type { FilterField } from '@/components/FilterBar.vue'
import type {
  AssetLedger,
  FaultRecord,
  InOutRecord,
  InventoryTask,
  MaintenanceRecord,
  SubModule,
} from '@/types'
import { matchDateRange, matchExact, matchKeyword, uniqueOptions } from '@/utils/filter'
import type { Organization } from '@/types'

export interface LedgerFilters {
  keyword: string
  orgId: string
  typeName: string
  status: string
  warehouseName: string
}

export interface InOutFilters {
  keyword: string
  type: string
  orgName: string
  operator: string
  dateRange: [string, string] | null
}

export interface FaultFilters {
  keyword: string
  faultLevel: string
  status: string
  orgName: string
  dateRange: [string, string] | null
}

export interface MaintenanceFilters {
  keyword: string
  status: string
  fundingSource: string
  vendor: string
  dateRange: [string, string] | null
}

export interface InventoryFilters {
  keyword: string
  orgId: string
  status: string
  level: string
  dateRange: [string, string] | null
}

const orgOptions = (organizations: Organization[]) => [
  { label: '全部组织', value: '' },
  ...organizations.map((o) => ({ label: o.name, value: o.id })),
]

const orgNameOptions = (names: string[]) => uniqueOptions(names, '全部组织')

export const ledgerFilterDefaults: LedgerFilters = {
  keyword: '',
  orgId: '',
  typeName: '',
  status: '',
  warehouseName: '',
}

export function buildLedgerFilterFields(items: AssetLedger[], organizations: Organization[]): FilterField[] {
  return [
    { key: 'keyword', type: 'input', placeholder: '设备名称/编码', width: '180px' },
    { key: 'orgId', type: 'select', placeholder: '组织机构', options: orgOptions(organizations), width: '150px' },
    {
      key: 'typeName',
      type: 'select',
      placeholder: '设备类型',
      options: uniqueOptions(
        items.map((i) => i.typeName),
        '全部类型',
      ),
      width: '130px',
    },
    {
      key: 'status',
      type: 'select',
      placeholder: '状态',
      options: uniqueOptions(items.map((i) => i.status), '全部状态'),
      width: '120px',
    },
    {
      key: 'warehouseName',
      type: 'select',
      placeholder: '库位',
      options: uniqueOptions(items.map((i) => i.warehouseName), '全部库位'),
      width: '120px',
    },
  ]
}

export function matchLedger(item: AssetLedger, f: LedgerFilters): boolean {
  return (
    matchExact(item.orgId, f.orgId) &&
    matchExact(item.typeName, f.typeName) &&
    matchExact(item.status, f.status) &&
    matchExact(item.warehouseName, f.warehouseName) &&
    matchKeyword(f.keyword, item.name, item.assetCode, item.manufacturer)
  )
}

export const inOutFilterDefaults: InOutFilters = {
  keyword: '',
  type: '',
  orgName: '',
  operator: '',
  dateRange: null,
}


export function buildInOutFilterFieldsFromData(data: InOutRecord[]): FilterField[] {
  return [
    { key: 'keyword', type: 'input', placeholder: '设备名称/编码', width: '180px' },
    {
      key: 'type',
      type: 'select',
      placeholder: '出入库类型',
      options: [
        { label: '全部', value: '' },
        { label: '入库', value: '入库' },
        { label: '出库', value: '出库' },
      ],
      width: '130px',
    },
    {
      key: 'orgName',
      type: 'select',
      placeholder: '组织机构',
      options: orgNameOptions(data.map((i) => i.orgName)),
      width: '150px',
    },
    {
      key: 'operator',
      type: 'select',
      placeholder: '操作人',
      options: uniqueOptions(data.map((i) => i.operator), '全部'),
      width: '120px',
    },
    { key: 'dateRange', type: 'date-range', width: '260px' },
  ]
}

export function matchInOut(item: InOutRecord, f: InOutFilters): boolean {
  return (
    matchExact(item.type, f.type) &&
    matchExact(item.orgName, f.orgName) &&
    matchExact(item.operator, f.operator) &&
    matchDateRange(item.operateTime, f.dateRange) &&
    matchKeyword(f.keyword, item.assetName, item.assetCode, item.reason)
  )
}

export const faultFilterDefaults: FaultFilters = {
  keyword: '',
  faultLevel: '',
  status: '',
  orgName: '',
  dateRange: null,
}

export function buildFaultFilterFields(data: FaultRecord[]): FilterField[] {
  return [
    { key: 'keyword', type: 'input', placeholder: '设备名称/故障描述', width: '180px' },
    {
      key: 'faultLevel',
      type: 'select',
      placeholder: '故障等级',
      options: uniqueOptions(data.map((i) => i.faultLevel), '全部等级'),
      width: '120px',
    },
    {
      key: 'status',
      type: 'select',
      placeholder: '处理状态',
      options: uniqueOptions(data.map((i) => i.status), '全部状态'),
      width: '120px',
    },
    {
      key: 'orgName',
      type: 'select',
      placeholder: '组织机构',
      options: orgNameOptions(data.map((i) => i.orgName)),
      width: '150px',
    },
    { key: 'dateRange', type: 'date-range', width: '260px' },
  ]
}

export function matchFault(item: FaultRecord, f: FaultFilters): boolean {
  return (
    matchExact(item.faultLevel, f.faultLevel) &&
    matchExact(item.status, f.status) &&
    matchExact(item.orgName, f.orgName) &&
    matchDateRange(item.reportTime, f.dateRange) &&
    matchKeyword(f.keyword, item.assetName, item.assetCode, item.faultDesc, item.reporter)
  )
}

export const maintenanceFilterDefaults: MaintenanceFilters = {
  keyword: '',
  status: '',
  fundingSource: '',
  vendor: '',
  dateRange: null,
}

export function buildMaintenanceFilterFields(data: MaintenanceRecord[]): FilterField[] {
  return [
    { key: 'keyword', type: 'input', placeholder: '项目/设备名称', width: '180px' },
    {
      key: 'status',
      type: 'select',
      placeholder: '状态',
      options: uniqueOptions(data.map((i) => i.status), '全部状态'),
      width: '120px',
    },
    {
      key: 'fundingSource',
      type: 'select',
      placeholder: '资金来源',
      options: uniqueOptions(data.map((i) => i.fundingSource), '全部来源'),
      width: '150px',
    },
    {
      key: 'vendor',
      type: 'select',
      placeholder: '维修厂家',
      options: uniqueOptions(data.map((i) => i.vendor), '全部厂家'),
      width: '160px',
    },
    { key: 'dateRange', type: 'date-range', width: '260px' },
  ]
}

export function matchMaintenance(item: MaintenanceRecord, f: MaintenanceFilters): boolean {
  return (
    matchExact(item.status, f.status) &&
    matchExact(item.fundingSource, f.fundingSource) &&
    matchExact(item.vendor, f.vendor) &&
    matchDateRange(item.startDate, f.dateRange) &&
    matchKeyword(f.keyword, item.projectName, item.assetName, item.assetCode, item.operator)
  )
}

export const inventoryFilterDefaults: InventoryFilters = {
  keyword: '',
  orgId: '',
  status: '',
  level: '',
  dateRange: null,
}

export function buildInventoryFilterFields(data: InventoryTask[], organizations: Organization[]): FilterField[] {
  return [
    { key: 'keyword', type: 'input', placeholder: '任务名称/负责人', width: '180px' },
    { key: 'orgId', type: 'select', placeholder: '组织机构', options: orgOptions(organizations), width: '150px' },
    {
      key: 'status',
      type: 'select',
      placeholder: '盘点状态',
      options: uniqueOptions(data.map((i) => i.status), '全部状态'),
      width: '120px',
    },
    {
      key: 'level',
      type: 'select',
      placeholder: '任务层级',
      options: [
        { label: '全部层级', value: '' },
        { label: '中心汇总', value: 'center' },
        { label: '生产仓执行', value: 'warehouse' },
      ],
      width: '130px',
    },
    { key: 'dateRange', type: 'date-range', width: '260px' },
  ]
}

export function matchInventory(item: InventoryTask, f: InventoryFilters): boolean {
  return (
    matchExact(item.orgId, f.orgId) &&
    matchExact(item.status, f.status) &&
    matchExact(item.level, f.level) &&
    matchDateRange(item.deadline, f.dateRange) &&
    matchKeyword(f.keyword, item.taskName, item.orgName, item.assignee)
  )
}

export function getFilterDefaults(subModule: SubModule) {
  const map = {
    ledger: ledgerFilterDefaults,
    inout: inOutFilterDefaults,
    fault: faultFilterDefaults,
    maintenance: maintenanceFilterDefaults,
    inventory: inventoryFilterDefaults,
  }
  return { ...map[subModule] }
}

export function applyAssetFilter(
  subModule: SubModule,
  item: unknown,
  filters: Record<string, unknown>,
): boolean {
  switch (subModule) {
    case 'ledger':
      return matchLedger(item as AssetLedger, filters as unknown as LedgerFilters)
    case 'inout':
      return matchInOut(item as InOutRecord, filters as unknown as InOutFilters)
    case 'fault':
      return matchFault(item as FaultRecord, filters as unknown as FaultFilters)
    case 'maintenance':
      return matchMaintenance(item as MaintenanceRecord, filters as unknown as MaintenanceFilters)
    case 'inventory':
      return matchInventory(item as InventoryTask, filters as unknown as InventoryFilters)
    default:
      return true
  }
}

export function buildFilterFields(
  subModule: SubModule,
  data: unknown[],
  organizations: Organization[],
): FilterField[] {
  switch (subModule) {
    case 'ledger':
      return buildLedgerFilterFields(data as AssetLedger[], organizations)
    case 'inout':
      return buildInOutFilterFieldsFromData(data as InOutRecord[])
    case 'fault':
      return buildFaultFilterFields(data as FaultRecord[])
    case 'maintenance':
      return buildMaintenanceFilterFields(data as MaintenanceRecord[])
    case 'inventory':
      return buildInventoryFilterFields(data as InventoryTask[], organizations)
    default:
      return []
  }
}

export function getTypeOptionsForCategory(_category: string) {
  return []
}
