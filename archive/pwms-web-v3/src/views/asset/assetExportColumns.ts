import type { ExportColumn } from '@/utils/export'
import type { SubModule } from '@/types'

const ledgerColumns: ExportColumn[] = [
  { key: 'assetCode', label: '资产编码' },
  { key: 'name', label: '设备名称' },
  { key: 'typeName', label: '设备类型' },
  { key: 'orgName', label: '所属组织' },
  { key: 'warehouseName', label: '生产仓地点' },
  { key: 'quantity', label: '数量' },
  { key: 'unit', label: '单位' },
  { key: 'status', label: '状态' },
  { key: 'manufacturer', label: '生产厂家' },
  { key: 'model', label: '规格型号' },
]

const inoutColumns: ExportColumn[] = [
  { key: 'assetCode', label: '资产编码' },
  { key: 'assetName', label: '设备名称' },
  { key: 'type', label: '类型' },
  { key: 'quantity', label: '数量' },
  { key: 'operator', label: '操作人' },
  { key: 'orgName', label: '组织机构' },
  { key: 'reason', label: '事由' },
  { key: 'operateTime', label: '操作时间' },
]

const faultColumns: ExportColumn[] = [
  { key: 'assetCode', label: '资产编码' },
  { key: 'assetName', label: '设备名称' },
  { key: 'faultDesc', label: '故障描述' },
  { key: 'faultLevel', label: '故障等级' },
  { key: 'reporter', label: '上报人' },
  { key: 'orgName', label: '组织机构' },
  { key: 'status', label: '状态' },
  { key: 'reportTime', label: '上报时间' },
]

const maintenanceColumns: ExportColumn[] = [
  { key: 'projectName', label: '维修项目' },
  { key: 'assetName', label: '关联设备' },
  { key: 'fundingSource', label: '资金来源' },
  { key: 'amount', label: '金额(元)' },
  { key: 'vendor', label: '维修厂家' },
  { key: 'startDate', label: '开始日期' },
  { key: 'endDate', label: '结束日期' },
  { key: 'operator', label: '经办人' },
  { key: 'status', label: '状态' },
]

const inventoryColumns: ExportColumn[] = [
  { key: 'taskName', label: '盘点任务' },
  { key: 'orgName', label: '组织机构' },
  { key: 'level', label: '层级', formatter: (v) => (v === 'center' ? '中心汇总' : '生产仓') },
  { key: 'assignee', label: '负责人' },
  { key: 'totalCount', label: '应盘数量' },
  { key: 'checkedCount', label: '已盘数量' },
  { key: 'status', label: '状态' },
  { key: 'deadline', label: '截止日期' },
]

export function getExportColumns(subModule: SubModule): ExportColumn[] {
  const map = {
    ledger: ledgerColumns,
    inout: inoutColumns,
    fault: faultColumns,
    maintenance: maintenanceColumns,
    inventory: inventoryColumns,
  }
  return map[subModule]
}

export function getExportFilename(categoryLabel: string, subModuleLabel: string) {
  return `${categoryLabel}_${subModuleLabel}`
}
