import type {
  AssetLedger,
  DeviceType,
  FaultRecord,
  InOutRecord,
  InventoryLineItem,
  InventoryTask,
  MaintenanceRecord,
  Manufacturer,
  Organization,
  Person,
  Role,
} from '@/types'

export const organizations: Organization[] = [
  { id: 'org-1', name: '集团总部', parentId: null, level: 1, leader: '张总', phone: '010-88880001' },
  { id: 'org-2', name: '华北生产中心', parentId: 'org-1', level: 2, leader: '李主任', phone: '010-88880002' },
  { id: 'org-3', name: '一号生产仓', parentId: 'org-2', level: 3, leader: '王仓管', phone: '010-88880003' },
  { id: 'org-4', name: '二号生产仓', parentId: 'org-2', level: 3, leader: '赵仓管', phone: '010-88880004' },
  { id: 'org-5', name: '设备保障部', parentId: 'org-2', level: 3, leader: '刘部长', phone: '010-88880005' },
]

export const roles: Role[] = [
  { id: 'role-1', name: '系统管理员', code: 'admin', description: '拥有全部系统权限', permissions: ['*'] },
  { id: 'role-2', name: '仓管员', code: 'warehouse_keeper', description: '负责台账与出入库', permissions: ['ledger', 'inout', 'inventory'] },
  { id: 'role-3', name: '维修员', code: 'maintainer', description: '负责故障与维修记录', permissions: ['fault', 'maintenance'] },
  { id: 'role-4', name: '盘点员', code: 'auditor', description: '负责盘点任务执行', permissions: ['inventory'] },
]

export const persons: Person[] = [
  { id: 'p-1', name: '管理员', employeeNo: 'EMP001', orgId: 'org-1', orgName: '集团总部', roleId: 'role-1', roleName: '系统管理员', phone: '13800000001', status: '在职' },
  { id: 'p-2', name: '王仓管', employeeNo: 'EMP002', orgId: 'org-3', orgName: '一号生产仓', roleId: 'role-2', roleName: '仓管员', phone: '13800000002', status: '在职' },
  { id: 'p-3', name: '赵仓管', employeeNo: 'EMP003', orgId: 'org-4', orgName: '二号生产仓', roleId: 'role-2', roleName: '仓管员', phone: '13800000003', status: '在职' },
  { id: 'p-4', name: '刘维修', employeeNo: 'EMP004', orgId: 'org-5', orgName: '设备保障部', roleId: 'role-3', roleName: '维修员', phone: '13800000004', status: '在职' },
  { id: 'p-5', name: '陈盘点', employeeNo: 'EMP005', orgId: 'org-3', orgName: '一号生产仓', roleId: 'role-4', roleName: '盘点员', phone: '13800000005', status: '在职' },
]

export const manufacturers: Manufacturer[] = [
  { id: 'm-1', name: '华北机电有限公司', category: 'spare', contact: '孙经理', phone: '13900000001', address: '北京市顺义区', qualification: 'ISO9001' },
  { id: 'm-2', name: '精密仪器科技', category: 'instrument', contact: '周经理', phone: '13900000002', address: '上海市浦东新区', qualification: 'CNAS认证' },
  { id: 'm-3', name: '工器具制造厂', category: 'tool', contact: '吴经理', phone: '13900000003', address: '天津市武清区', qualification: '生产许可证' },
  { id: 'm-4', name: '中电备件供应', category: 'spare', contact: '郑经理', phone: '13900000004', address: '深圳市南山区', qualification: 'ISO9001' },
]

export const deviceTypes: DeviceType[] = [
  { id: 'dt-1', name: '输送带', category: 'warehouse', code: 'WH-001', unit: '条', description: '生产仓输送设备' },
  { id: 'dt-2', name: '仓储货架', category: 'warehouse', code: 'WH-002', unit: '组', description: '重型仓储货架' },
  { id: 'dt-3', name: '叉车', category: 'warehouse', code: 'WH-003', unit: '台', description: '电动叉车' },
  { id: 'dt-4', name: '包装机', category: 'warehouse', code: 'WH-004', unit: '台', description: '自动包装设备' },
  { id: 'dt-5', name: '温控系统', category: 'warehouse', code: 'WH-005', unit: '套', description: '仓库温湿度控制' },
  { id: 'dt-6', name: '安全监控', category: 'warehouse', code: 'WH-006', unit: '套', description: '视频监控与报警' },
  { id: 'dt-7', name: '轴承', category: 'spare', code: 'SP-001', unit: '个', description: '通用轴承备件' },
  { id: 'dt-8', name: '密封件', category: 'spare', code: 'SP-002', unit: '套', description: '设备密封备件' },
  { id: 'dt-9', name: '压力表', category: 'instrument', code: 'IN-001', unit: '块', description: '0-1.6MPa压力表' },
  { id: 'dt-10', name: '万用表', category: 'instrument', code: 'IN-002', unit: '台', description: '数字万用表' },
  { id: 'dt-11', name: '扳手套装', category: 'tool', code: 'TL-001', unit: '套', description: '标准扳手工具组' },
  { id: 'dt-12', name: '绝缘手套', category: 'tool', code: 'TL-002', unit: '副', description: '电工绝缘防护' },
]

export const ledgers: AssetLedger[] = [
  { id: 'l-1', category: 'warehouse', assetCode: 'WH20250001', name: '1号输送带', typeId: 'dt-1', typeName: '输送带', orgId: 'org-3', orgName: '一号生产仓', warehouseName: 'A区', manufacturer: '华北机电', model: 'SS-200', quantity: 2, unit: '条', status: '在用', purchaseDate: '2024-03-15', warrantyDate: '2027-03-15' },
  { id: 'l-2', category: 'warehouse', assetCode: 'WH20250002', name: '重型货架A', typeId: 'dt-2', typeName: '仓储货架', orgId: 'org-3', orgName: '一号生产仓', warehouseName: 'B区', manufacturer: '中电备件', model: 'HJ-500', quantity: 10, unit: '组', status: '在库', purchaseDate: '2023-08-20', warrantyDate: '2028-08-20' },
  { id: 'l-3', category: 'warehouse', assetCode: 'WH20250003', name: '电动叉车01', typeId: 'dt-3', typeName: '叉车', orgId: 'org-4', orgName: '二号生产仓', warehouseName: 'C区', manufacturer: '华北机电', model: 'CPD-30', quantity: 1, unit: '台', status: '维修中', purchaseDate: '2022-05-10', warrantyDate: '2025-05-10' },
  { id: 'l-4', category: 'spare', assetCode: 'SP20250001', name: '6205轴承', typeId: 'dt-7', typeName: '轴承', orgId: 'org-3', orgName: '一号生产仓', warehouseName: '备件库', manufacturer: '华北机电', model: '6205-2RS', quantity: 50, unit: '个', status: '在库', purchaseDate: '2025-01-10', warrantyDate: '2026-01-10' },
  { id: 'l-5', category: 'spare', assetCode: 'SP20250002', name: 'O型密封圈组', typeId: 'dt-8', typeName: '密封件', orgId: 'org-4', orgName: '二号生产仓', warehouseName: '备件库', manufacturer: '中电备件', model: 'NBR-50', quantity: 120, unit: '套', status: '在库', purchaseDate: '2024-09-01', warrantyDate: '2026-09-01' },
  { id: 'l-6', category: 'instrument', assetCode: 'IN20250001', name: '压力表P01', typeId: 'dt-9', typeName: '压力表', orgId: 'org-4', orgName: '二号生产仓', warehouseName: '仪表室', manufacturer: '精密仪器科技', model: 'Y-100', quantity: 5, unit: '块', status: '在用', purchaseDate: '2024-06-01', warrantyDate: '2026-06-01' },
  { id: 'l-7', category: 'instrument', assetCode: 'IN20250002', name: '数字万用表M01', typeId: 'dt-10', typeName: '万用表', orgId: 'org-5', orgName: '设备保障部', warehouseName: '仪表室', manufacturer: '精密仪器科技', model: 'FLUKE-17B', quantity: 3, unit: '台', status: '在库', purchaseDate: '2024-12-01', warrantyDate: '2027-12-01' },
  { id: 'l-8', category: 'tool', assetCode: 'TL20250001', name: '扳手工具组', typeId: 'dt-11', typeName: '扳手套装', orgId: 'org-5', orgName: '设备保障部', warehouseName: '工具间', manufacturer: '工器具制造厂', model: 'BS-32', quantity: 8, unit: '套', status: '在库', purchaseDate: '2024-11-05', warrantyDate: '2027-11-05' },
  { id: 'l-9', category: 'tool', assetCode: 'TL20250002', name: '绝缘手套', typeId: 'dt-12', typeName: '绝缘手套', orgId: 'org-3', orgName: '一号生产仓', warehouseName: '工具间', manufacturer: '工器具制造厂', model: '12KV', quantity: 15, unit: '副', status: '在用', purchaseDate: '2025-02-20', warrantyDate: '2026-02-20' },
]

export const inOutRecords: InOutRecord[] = [
  { id: 'io-1', category: 'spare', assetCode: 'SP20250001', assetName: '6205轴承', type: '入库', quantity: 30, operator: '王仓管', orgName: '一号生产仓', reason: '采购入库', operateTime: '2025-01-10 09:30:00' },
  { id: 'io-2', category: 'spare', assetCode: 'SP20250001', assetName: '6205轴承', type: '出库', quantity: 5, operator: '王仓管', orgName: '一号生产仓', reason: '设备维修领用', operateTime: '2025-02-15 14:20:00' },
  { id: 'io-3', category: 'tool', assetCode: 'TL20250001', assetName: '扳手工具组', type: '出库', quantity: 2, operator: '赵仓管', orgName: '二号生产仓', reason: '现场作业领用', operateTime: '2025-03-01 08:45:00' },
  { id: 'io-4', category: 'warehouse', assetCode: 'WH20250002', assetName: '重型货架A', type: '入库', quantity: 4, operator: '王仓管', orgName: '一号生产仓', reason: '新购入库', operateTime: '2025-03-20 10:00:00' },
  { id: 'io-5', category: 'instrument', assetCode: 'IN20250001', assetName: '压力表P01', type: '出库', quantity: 1, operator: '赵仓管', orgName: '二号生产仓', reason: '校准送检', operateTime: '2025-04-01 11:30:00' },
  { id: 'io-6', category: 'spare', assetCode: 'SP20250002', assetName: 'O型密封圈组', type: '入库', quantity: 50, operator: '赵仓管', orgName: '二号生产仓', reason: '补货入库', operateTime: '2025-05-08 09:15:00' },
]

export const faultRecords: FaultRecord[] = [
  { id: 'f-1', category: 'warehouse', assetCode: 'WH20250001', assetName: '1号输送带', faultDesc: '电机异响，运行不稳定', faultLevel: '严重', reporter: '王仓管', orgName: '一号生产仓', reportTime: '2025-04-10 10:00:00', status: '处理中' },
  { id: 'f-2', category: 'instrument', assetCode: 'IN20250001', assetName: '压力表P01', faultDesc: '指针偏差超出允许范围', faultLevel: '一般', reporter: '赵仓管', orgName: '二号生产仓', reportTime: '2025-04-12 15:30:00', status: '待处理' },
  { id: 'f-3', category: 'warehouse', assetCode: 'WH20250003', assetName: '电动叉车01', faultDesc: '液压系统泄漏', faultLevel: '紧急', reporter: '赵仓管', orgName: '二号生产仓', reportTime: '2025-05-20 08:00:00', status: '待处理' },
  { id: 'f-4', category: 'tool', assetCode: 'TL20250002', assetName: '绝缘手套', faultDesc: '表面老化裂纹', faultLevel: '一般', reporter: '王仓管', orgName: '一号生产仓', reportTime: '2025-06-01 14:00:00', status: '已关闭' },
]

export const maintenanceRecords: MaintenanceRecord[] = [
  { id: 'mr-1', category: 'warehouse', assetCode: 'WH20250001', assetName: '1号输送带', projectName: '输送带电机检修', fundingSource: '年度维修预算', amount: 8500, vendor: '华北机电有限公司', startDate: '2025-04-11', endDate: '2025-04-15', operator: '刘维修', status: '进行中' },
  { id: 'mr-2', category: 'instrument', assetCode: 'IN20250001', assetName: '压力表P01', projectName: '压力表校准', fundingSource: '专项校准经费', amount: 1200, vendor: '精密仪器科技', startDate: '2025-03-20', endDate: '2025-03-22', operator: '刘维修', status: '已完成' },
  { id: 'mr-3', category: 'warehouse', assetCode: 'WH20250003', assetName: '电动叉车01', projectName: '叉车液压系统维修', fundingSource: '年度维修预算', amount: 15600, vendor: '华北机电有限公司', startDate: '2025-05-21', endDate: '2025-05-28', operator: '刘维修', status: '进行中' },
  { id: 'mr-4', category: 'tool', assetCode: 'TL20250002', assetName: '绝缘手套', projectName: '绝缘手套更换', fundingSource: '日常维护经费', amount: 680, vendor: '工器具制造厂', startDate: '2025-06-02', endDate: '2025-06-02', operator: '刘维修', status: '已完成' },
]

/** 盘点任务：中心级 parentId=null，生产仓级 parentId 指向中心任务 */
export const inventoryTasks: InventoryTask[] = [
  { id: 'inv-root-1', category: 'warehouse', taskName: '2025年Q2华北中心生产仓盘点', orgId: 'org-2', orgName: '华北生产中心', assignee: '李主任', totalCount: 515, checkedCount: 435, status: '盘点中', deadline: '2025-06-30', createTime: '2025-06-01 08:00:00', parentId: null, level: 'center' },
  { id: 'inv-1', category: 'warehouse', taskName: '2025年Q2一号仓盘点', orgId: 'org-3', orgName: '一号生产仓', assignee: '陈盘点', totalCount: 120, checkedCount: 85, status: '盘点中', deadline: '2025-06-30', createTime: '2025-06-01 08:30:00', parentId: 'inv-root-1', level: 'warehouse' },
  { id: 'inv-4', category: 'warehouse', taskName: '2025年Q2二号仓盘点', orgId: 'org-4', orgName: '二号生产仓', assignee: '赵仓管', totalCount: 95, checkedCount: 95, status: '已完成', deadline: '2025-06-25', createTime: '2025-06-01 08:30:00', parentId: 'inv-root-1', level: 'warehouse' },
  { id: 'inv-root-2', category: 'spare', taskName: '2025年Q2华北中心备件盘点', orgId: 'org-2', orgName: '华北生产中心', assignee: '李主任', totalCount: 470, checkedCount: 470, status: '已完成', deadline: '2025-06-15', createTime: '2025-06-01 08:00:00', parentId: null, level: 'center' },
  { id: 'inv-2', category: 'spare', taskName: '2025年Q2一号仓备件库盘点', orgId: 'org-3', orgName: '一号生产仓', assignee: '王仓管', totalCount: 350, checkedCount: 350, status: '已完成', deadline: '2025-06-15', createTime: '2025-06-01 08:30:00', parentId: 'inv-root-2', level: 'warehouse' },
  { id: 'inv-5', category: 'spare', taskName: '2025年Q2二号仓备件库盘点', orgId: 'org-4', orgName: '二号生产仓', assignee: '赵仓管', totalCount: 120, checkedCount: 120, status: '已完成', deadline: '2025-06-15', createTime: '2025-06-01 08:30:00', parentId: 'inv-root-2', level: 'warehouse' },
  { id: 'inv-root-3', category: 'tool', taskName: '2025年Q2华北中心工器具盘点', orgId: 'org-2', orgName: '华北生产中心', assignee: '李主任', totalCount: 53, checkedCount: 8, status: '盘点中', deadline: '2025-07-15', createTime: '2025-07-01 08:00:00', parentId: null, level: 'center' },
  { id: 'inv-3', category: 'tool', taskName: '2025年Q2工器具盘点', orgId: 'org-5', orgName: '设备保障部', assignee: '刘维修', totalCount: 45, checkedCount: 0, status: '待盘点', deadline: '2025-07-15', createTime: '2025-07-01 08:30:00', parentId: 'inv-root-3', level: 'warehouse' },
  { id: 'inv-6', category: 'tool', taskName: '2025年Q2一号仓工器具盘点', orgId: 'org-3', orgName: '一号生产仓', assignee: '王仓管', totalCount: 8, checkedCount: 8, status: '已完成', deadline: '2025-07-10', createTime: '2025-07-01 08:30:00', parentId: 'inv-root-3', level: 'warehouse' },
]

export const inventoryLineItems: InventoryLineItem[] = [
  { id: 'ili-1', taskId: 'inv-1', assetCode: 'WH20250001', assetName: '1号输送带', typeName: '输送带', warehouseName: 'A区', bookQuantity: 2, actualQuantity: 2, status: '已盘' },
  { id: 'ili-2', taskId: 'inv-1', assetCode: 'WH20250002', assetName: '重型货架A', typeName: '仓储货架', warehouseName: 'B区', bookQuantity: 10, actualQuantity: 10, status: '已盘' },
  { id: 'ili-3', taskId: 'inv-1', assetCode: 'TL20250002', assetName: '绝缘手套', typeName: '绝缘手套', warehouseName: '工具间', bookQuantity: 15, actualQuantity: 14, status: '有差异' },
  { id: 'ili-4', taskId: 'inv-4', assetCode: 'WH20250003', assetName: '电动叉车01', typeName: '叉车', warehouseName: 'C区', bookQuantity: 1, actualQuantity: 1, status: '已盘' },
  { id: 'ili-5', taskId: 'inv-4', assetCode: 'IN20250001', assetName: '压力表P01', typeName: '压力表', warehouseName: '仪表室', bookQuantity: 5, actualQuantity: 5, status: '已盘' },
  { id: 'ili-6', taskId: 'inv-2', assetCode: 'SP20250001', assetName: '6205轴承', typeName: '轴承', warehouseName: '备件库', bookQuantity: 50, actualQuantity: 50, status: '已盘' },
  { id: 'ili-7', taskId: 'inv-3', assetCode: 'TL20250001', assetName: '扳手工具组', typeName: '扳手套装', warehouseName: '工具间', bookQuantity: 8, actualQuantity: null, status: '待盘' },
  { id: 'ili-8', taskId: 'inv-6', assetCode: 'TL20250002', assetName: '绝缘手套', typeName: '绝缘手套', warehouseName: '工具间', bookQuantity: 15, actualQuantity: 15, status: '已盘' },
]

export const dashboardStats = {
  warehouseCount: 6,
  spareCount: 350,
  instrumentCount: 48,
  toolCount: 86,
  pendingFaults: 1,
  ongoingMaintenance: 1,
  inventoryProgress: 72,
  orgCount: organizations.length,
}
