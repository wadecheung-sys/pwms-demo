import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import * as seed from '@/mock/data'
import type {
  AssetCategory,
  AssetLedger,
  AssetLifecycleEvent,
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
import { genAssetCode, genId, nowStr } from '@/utils/id'
import { clearBusinessData, loadJson, saveJson } from '@/utils/persist'

interface BusinessData {
  organizations: Organization[]
  roles: Role[]
  persons: Person[]
  manufacturers: Manufacturer[]
  deviceTypes: DeviceType[]
  ledgers: AssetLedger[]
  inOutRecords: InOutRecord[]
  faultRecords: FaultRecord[]
  maintenanceRecords: MaintenanceRecord[]
  inventoryTasks: InventoryTask[]
  inventoryLineItems: InventoryLineItem[]
}

function getSeed(): BusinessData {
  return {
    organizations: [...seed.organizations],
    roles: [...seed.roles],
    persons: [...seed.persons],
    manufacturers: [...seed.manufacturers],
    deviceTypes: [...seed.deviceTypes],
    ledgers: [...seed.ledgers],
    inOutRecords: [...seed.inOutRecords],
    faultRecords: [...seed.faultRecords],
    maintenanceRecords: [...seed.maintenanceRecords],
    inventoryTasks: [...seed.inventoryTasks],
    inventoryLineItems: [...seed.inventoryLineItems],
  }
}

export const useDataStore = defineStore('data', () => {
  const data = ref<BusinessData>(loadJson('business', getSeed()))

  watch(data, (v) => saveJson('business', v), { deep: true })

  const organizations = computed(() => data.value.organizations)
  const roles = computed(() => data.value.roles)
  const persons = computed(() => data.value.persons)
  const manufacturers = computed(() => data.value.manufacturers)
  const deviceTypes = computed(() => data.value.deviceTypes)
  const ledgers = computed(() => data.value.ledgers)
  const inOutRecords = computed(() => data.value.inOutRecords)
  const faultRecords = computed(() => data.value.faultRecords)
  const maintenanceRecords = computed(() => data.value.maintenanceRecords)
  const inventoryTasks = computed(() => data.value.inventoryTasks)
  const inventoryLineItems = computed(() => data.value.inventoryLineItems)

  function getOrg(id: string) {
    return data.value.organizations.find((o) => o.id === id)
  }

  function getRole(id: string) {
    return data.value.roles.find((r) => r.id === id)
  }

  function getDeviceType(id: string) {
    return data.value.deviceTypes.find((d) => d.id === id)
  }

  function getLedgerByCode(code: string) {
    return data.value.ledgers.find((l) => l.assetCode === code)
  }

  function ledgersByCategory(category: AssetCategory) {
    return data.value.ledgers.filter((l) => l.category === category)
  }

  function deviceTypesByCategory(category: AssetCategory | Manufacturer['category'] | 'warehouse') {
    return data.value.deviceTypes.filter((d) => d.category === category)
  }

  function manufacturersByCategory(category: Manufacturer['category']) {
    return data.value.manufacturers.filter((m) => m.category === category)
  }

  // --- Organization ---
  function addOrganization(item: Omit<Organization, 'id' | 'level'>) {
    const parent = item.parentId ? getOrg(item.parentId) : null
    const level = parent ? parent.level + 1 : 1
    data.value.organizations.push({ ...item, id: genId('org'), level })
  }

  function updateOrganization(id: string, patch: Partial<Organization>) {
    const idx = data.value.organizations.findIndex((o) => o.id === id)
    if (idx < 0) return
    const updated = { ...data.value.organizations[idx], ...patch, id }
    data.value.organizations[idx] = updated
    if (patch.name) {
      data.value.persons.forEach((p) => {
        if (p.orgId === id) p.orgName = patch.name!
      })
      data.value.ledgers.forEach((l) => {
        if (l.orgId === id) l.orgName = patch.name!
      })
      data.value.inventoryTasks.forEach((t) => {
        if (t.orgId === id) t.orgName = patch.name!
      })
    }
  }

  function removeOrganization(id: string) {
    const hasChildren = data.value.organizations.some((o) => o.parentId === id)
    if (hasChildren) throw new Error('请先删除下级组织')
    data.value.organizations = data.value.organizations.filter((o) => o.id !== id)
  }

  // --- Role ---
  function addRole(item: Omit<Role, 'id'>) {
    data.value.roles.push({ ...item, id: genId('role') })
  }

  function updateRole(id: string, patch: Partial<Role>) {
    const idx = data.value.roles.findIndex((r) => r.id === id)
    if (idx < 0) return
    data.value.roles[idx] = { ...data.value.roles[idx], ...patch, id }
    if (patch.name) {
      data.value.persons.forEach((p) => {
        if (p.roleId === id) p.roleName = patch.name!
      })
    }
  }

  function removeRole(id: string) {
    const inUse = data.value.persons.some((p) => p.roleId === id)
    if (inUse) throw new Error('该角色仍有关联人员')
    data.value.roles = data.value.roles.filter((r) => r.id !== id)
  }

  // --- Person ---
  function addPerson(item: Omit<Person, 'id' | 'orgName' | 'roleName'>) {
    const org = getOrg(item.orgId)
    const role = getRole(item.roleId)
    data.value.persons.push({
      ...item,
      id: genId('p'),
      orgName: org?.name ?? '',
      roleName: role?.name ?? '',
    })
  }

  function updatePerson(id: string, patch: Partial<Omit<Person, 'id'>>) {
    const idx = data.value.persons.findIndex((p) => p.id === id)
    if (idx < 0) return
    const cur = data.value.persons[idx]
    const org = patch.orgId ? getOrg(patch.orgId) : getOrg(cur.orgId)
    const role = patch.roleId ? getRole(patch.roleId) : getRole(cur.roleId)
    data.value.persons[idx] = {
      ...cur,
      ...patch,
      id,
      orgName: org?.name ?? cur.orgName,
      roleName: role?.name ?? cur.roleName,
    }
  }

  function removePerson(id: string) {
    data.value.persons = data.value.persons.filter((p) => p.id !== id)
  }

  // --- Manufacturer ---
  function addManufacturer(item: Omit<Manufacturer, 'id'>) {
    data.value.manufacturers.push({ ...item, id: genId('m') })
  }

  function updateManufacturer(id: string, patch: Partial<Manufacturer>) {
    const idx = data.value.manufacturers.findIndex((m) => m.id === id)
    if (idx < 0) return
    data.value.manufacturers[idx] = { ...data.value.manufacturers[idx], ...patch, id }
  }

  function removeManufacturer(id: string) {
    data.value.manufacturers = data.value.manufacturers.filter((m) => m.id !== id)
  }

  // --- DeviceType ---
  function addDeviceType(item: Omit<DeviceType, 'id'>) {
    const dup = data.value.deviceTypes.some((d) => d.code === item.code && d.category === item.category)
    if (dup) throw new Error('类型编码已存在')
    data.value.deviceTypes.push({ ...item, id: genId('dt') })
  }

  function updateDeviceType(id: string, patch: Partial<DeviceType>) {
    const idx = data.value.deviceTypes.findIndex((d) => d.id === id)
    if (idx < 0) return
    const updated = { ...data.value.deviceTypes[idx], ...patch, id }
    data.value.deviceTypes[idx] = updated
    if (patch.name) {
      data.value.ledgers.forEach((l) => {
        if (l.typeId === id) l.typeName = patch.name!
      })
    }
  }

  function removeDeviceType(id: string) {
    const inUse = data.value.ledgers.some((l) => l.typeId === id)
    if (inUse) throw new Error('该类型仍有关联台账')
    data.value.deviceTypes = data.value.deviceTypes.filter((d) => d.id !== id)
  }

  // --- Ledger ---
  function addLedger(item: Omit<AssetLedger, 'id' | 'assetCode' | 'typeName' | 'orgName' | 'unit'>) {
    const dt = getDeviceType(item.typeId)
    const org = getOrg(item.orgId)
    if (!dt || !org) throw new Error('设备类型或组织无效')
    const assetCode = genAssetCode(
      item.category,
      data.value.ledgers.map((l) => l.assetCode),
    )
    data.value.ledgers.push({
      ...item,
      id: genId('l'),
      assetCode,
      typeName: dt.name,
      orgName: org.name,
      unit: dt.unit,
    })
  }

  function updateLedger(id: string, patch: Partial<AssetLedger>) {
    const idx = data.value.ledgers.findIndex((l) => l.id === id)
    if (idx < 0) return
    const cur = data.value.ledgers[idx]
    const dt = patch.typeId ? getDeviceType(patch.typeId) : getDeviceType(cur.typeId)
    const org = patch.orgId ? getOrg(patch.orgId) : getOrg(cur.orgId)
    data.value.ledgers[idx] = {
      ...cur,
      ...patch,
      id,
      typeName: dt?.name ?? cur.typeName,
      orgName: org?.name ?? cur.orgName,
      unit: dt?.unit ?? cur.unit,
    }
  }

  function removeLedger(id: string) {
    data.value.ledgers = data.value.ledgers.filter((l) => l.id !== id)
  }

  // --- InOut（联动台账数量）---
  function addInOutRecord(item: Omit<InOutRecord, 'id' | 'assetName' | 'orgName' | 'operateTime'>) {
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    if (item.type === '出库' && ledger.quantity < item.quantity) {
      throw new Error(`库存不足，当前库存 ${ledger.quantity} ${ledger.unit}`)
    }
    if (item.type === '入库') ledger.quantity += item.quantity
    else ledger.quantity -= item.quantity

    data.value.inOutRecords.unshift({
      ...item,
      id: genId('io'),
      assetName: ledger.name,
      orgName: ledger.orgName,
      operateTime: nowStr(),
    })
  }

  function removeInOutRecord(id: string) {
    const record = data.value.inOutRecords.find((r) => r.id === id)
    if (!record) return
    const ledger = getLedgerByCode(record.assetCode)
    if (ledger) {
      if (record.type === '入库') ledger.quantity -= record.quantity
      else ledger.quantity += record.quantity
    }
    data.value.inOutRecords = data.value.inOutRecords.filter((r) => r.id !== id)
  }

  // --- Fault ---
  function addFaultRecord(item: Omit<FaultRecord, 'id' | 'assetName' | 'orgName' | 'reportTime'>) {
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    data.value.faultRecords.unshift({
      ...item,
      id: genId('f'),
      assetName: ledger.name,
      orgName: ledger.orgName,
      reportTime: nowStr(),
    })
  }

  function updateFaultRecord(id: string, patch: Partial<FaultRecord>) {
    const idx = data.value.faultRecords.findIndex((f) => f.id === id)
    if (idx < 0) return
    data.value.faultRecords[idx] = { ...data.value.faultRecords[idx], ...patch, id }
  }

  function removeFaultRecord(id: string) {
    data.value.faultRecords = data.value.faultRecords.filter((f) => f.id !== id)
  }

  // --- Maintenance ---
  function addMaintenanceRecord(
    item: Omit<MaintenanceRecord, 'id' | 'assetName'>,
  ) {
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    data.value.maintenanceRecords.unshift({
      ...item,
      id: genId('mr'),
      assetName: ledger.name,
    })
  }

  function updateMaintenanceRecord(id: string, patch: Partial<MaintenanceRecord>) {
    const idx = data.value.maintenanceRecords.findIndex((m) => m.id === id)
    if (idx < 0) return
    const cur = data.value.maintenanceRecords[idx]
    const ledger = patch.assetCode ? getLedgerByCode(patch.assetCode) : getLedgerByCode(cur.assetCode)
    const updated = {
      ...cur,
      ...patch,
      id,
      assetName: ledger?.name ?? cur.assetName,
    }
    data.value.maintenanceRecords[idx] = updated
    syncMaintenanceCompletion(updated)
  }

  function removeMaintenanceRecord(id: string) {
    const record = data.value.maintenanceRecords.find((m) => m.id === id)
    data.value.maintenanceRecords = data.value.maintenanceRecords.filter((m) => m.id !== id)
    if (record?.faultId) {
      const fault = data.value.faultRecords.find((f) => f.id === record.faultId)
      if (fault && fault.status === '处理中') {
        fault.status = '待处理'
        fault.maintenanceId = null
      }
    }
  }

  /** 故障转维修：创建维修单并关联故障，台账置为维修中 */
  function convertFaultToMaintenance(
    faultId: string,
    item: Omit<MaintenanceRecord, 'id' | 'assetName' | 'category' | 'assetCode' | 'faultId'>,
  ): string {
    const fault = data.value.faultRecords.find((f) => f.id === faultId)
    if (!fault) throw new Error('故障记录不存在')
    if (fault.status === '已关闭') throw new Error('该故障已关闭')
    if (fault.maintenanceId) throw new Error('该故障已关联维修单')

    const ledger = getLedgerByCode(fault.assetCode)
    if (!ledger) throw new Error('关联资产不存在')

    const maintenanceId = genId('mr')
    data.value.maintenanceRecords.unshift({
      ...item,
      id: maintenanceId,
      category: fault.category,
      assetCode: fault.assetCode,
      assetName: ledger.name,
      faultId: fault.id,
    })

    fault.status = '处理中'
    fault.maintenanceId = maintenanceId
    if (ledger.status !== '报废') ledger.status = '维修中'

    return maintenanceId
  }

  /** 构建资产生命周期时间线（按时间倒序） */
  function getAssetLifecycle(assetCode: string): AssetLifecycleEvent[] {
    const events: AssetLifecycleEvent[] = []
    const ledger = getLedgerByCode(assetCode)
    if (ledger) {
      events.push({
        id: `lc-${ledger.id}`,
        type: 'ledger',
        title: '台账建档',
        time: ledger.purchaseDate,
        description: `${ledger.name}（${ledger.assetCode}）录入台账，库位 ${ledger.warehouseName}`,
        tag: ledger.status,
      })
    }

    for (const r of data.value.inOutRecords.filter((x) => x.assetCode === assetCode)) {
      events.push({
        id: r.id,
        type: 'inout',
        title: r.type,
        time: r.operateTime,
        description: `${r.type} ${r.quantity}，操作人 ${r.operator}，${r.reason}`,
        tag: r.type,
        tagType: r.type === '入库' ? 'success' : 'warning',
      })
    }

    for (const f of data.value.faultRecords.filter((x) => x.assetCode === assetCode)) {
      events.push({
        id: f.id,
        type: 'fault',
        title: '故障上报',
        time: f.reportTime,
        description: `${f.faultDesc}（${f.faultLevel}）上报人 ${f.reporter}`,
        tag: f.status,
        tagType: f.status === '已关闭' ? 'success' : f.status === '处理中' ? 'warning' : 'danger',
      })
    }

    for (const m of data.value.maintenanceRecords.filter((x) => x.assetCode === assetCode)) {
      events.push({
        id: m.id,
        type: 'maintenance',
        title: m.projectName,
        time: m.startDate,
        description: `维修厂家 ${m.vendor}，金额 ${m.amount} 元，${m.fundingSource}`,
        tag: m.status,
        tagType: m.status === '已完成' ? 'success' : 'warning',
      })
    }

    for (const line of data.value.inventoryLineItems.filter((x) => x.assetCode === assetCode)) {
      const task = data.value.inventoryTasks.find((t) => t.id === line.taskId)
      events.push({
        id: line.id,
        type: 'inventory',
        title: '盘点记录',
        time: task?.createTime ?? '',
        description: `任务「${task?.taskName ?? ''}」账面 ${line.bookQuantity}，实盘 ${line.actualQuantity ?? '待盘'}`,
        tag: line.status,
        tagType: line.status === '有差异' ? 'danger' : line.status === '已盘' ? 'success' : 'info',
      })
    }

    return events.sort((a, b) => (b.time > a.time ? 1 : -1))
  }

  function syncMaintenanceCompletion(record: MaintenanceRecord) {
    if (record.status !== '已完成') return
    if (record.faultId) {
      const fault = data.value.faultRecords.find((f) => f.id === record.faultId)
      if (fault) fault.status = '已关闭'
    }
    const ledger = getLedgerByCode(record.assetCode)
    if (ledger && ledger.status === '维修中') {
      ledger.status = '在用'
    }
  }

  // --- Inventory ---
  function addInventoryTask(
    item: Omit<InventoryTask, 'id' | 'createTime'> & { id?: never },
  ) {
    const { totalCount = 0, checkedCount = 0, status = '待盘点', level = 'warehouse', parentId = null, ...rest } = item
    data.value.inventoryTasks.unshift({
      ...rest,
      id: genId('inv'),
      createTime: nowStr(),
      totalCount,
      checkedCount,
      status,
      level,
      parentId,
    })
  }

  function dispatchInventoryTask(params: {
    category: AssetCategory
    taskName: string
    centerOrgId: string
    assignee: string
    deadline: string
  }) {
    const center = getOrg(params.centerOrgId)
    if (!center || center.level !== 2) throw new Error('请选择二级生产中心组织')

    const childOrgs = data.value.organizations.filter((o) => o.parentId === params.centerOrgId)
    if (!childOrgs.length) throw new Error('该中心下无下级生产仓')

    const rootId = genId('inv')
    let totalAll = 0

    const childTasks: InventoryTask[] = childOrgs.map((org) => {
      const orgLedgers = data.value.ledgers.filter(
        (l) => l.category === params.category && l.orgId === org.id,
      )
      const totalCount = orgLedgers.reduce((s, l) => s + l.quantity, 0)
      totalAll += totalCount
      const taskId = genId('inv')
      orgLedgers.forEach((l) => {
        data.value.inventoryLineItems.push({
          id: genId('ili'),
          taskId,
          assetCode: l.assetCode,
          assetName: l.name,
          typeName: l.typeName,
          warehouseName: l.warehouseName,
          bookQuantity: l.quantity,
          actualQuantity: null,
          status: '待盘',
        })
      })
      return {
        id: taskId,
        category: params.category,
        taskName: `${params.taskName} — ${org.name}`,
        orgId: org.id,
        orgName: org.name,
        assignee: params.assignee,
        totalCount,
        checkedCount: 0,
        status: '待盘点' as const,
        deadline: params.deadline,
        createTime: nowStr(),
        parentId: rootId,
        level: 'warehouse' as const,
      }
    })

    const rootTask: InventoryTask = {
      id: rootId,
      category: params.category,
      taskName: params.taskName,
      orgId: center.id,
      orgName: center.name,
      assignee: params.assignee,
      totalCount: totalAll,
      checkedCount: 0,
      status: '待盘点',
      deadline: params.deadline,
      createTime: nowStr(),
      parentId: null,
      level: 'center',
    }

    data.value.inventoryTasks.unshift(rootTask, ...childTasks)
    return rootId
  }

  function updateInventoryLine(
    id: string,
    actualQuantity: number,
  ) {
    const line = data.value.inventoryLineItems.find((l) => l.id === id)
    if (!line) return
    line.actualQuantity = actualQuantity
    line.status =
      actualQuantity === line.bookQuantity ? '已盘' : '有差异'

    const task = data.value.inventoryTasks.find((t) => t.id === line.taskId)
    if (!task) return

    const lines = data.value.inventoryLineItems.filter((l) => l.taskId === task.id)
    task.checkedCount = lines.filter((l) => l.status !== '待盘').length
    if (task.checkedCount === 0) task.status = '待盘点'
    else if (task.checkedCount < lines.length) task.status = '盘点中'
    else task.status = '已完成'

    if (task.parentId) recalcParentInventory(task.parentId)
  }

  function recalcParentInventory(parentId: string) {
    const parent = data.value.inventoryTasks.find((t) => t.id === parentId)
    if (!parent) return
    const children = data.value.inventoryTasks.filter((t) => t.parentId === parentId)
    parent.totalCount = children.reduce((s, c) => s + c.totalCount, 0)
    parent.checkedCount = children.reduce((s, c) => s + c.checkedCount, 0)
    if (parent.checkedCount === 0) parent.status = '待盘点'
    else if (parent.checkedCount < parent.totalCount) parent.status = '盘点中'
    else parent.status = '已完成'
  }

  function removeInventoryTask(id: string) {
    const childIds = data.value.inventoryTasks.filter((t) => t.parentId === id).map((t) => t.id)
    const allIds = [id, ...childIds]
    data.value.inventoryTasks = data.value.inventoryTasks.filter((t) => !allIds.includes(t.id))
    data.value.inventoryLineItems = data.value.inventoryLineItems.filter(
      (l) => !allIds.includes(l.taskId),
    )
  }

  // --- Dashboard stats ---
  const dashboardStats = computed(() => ({
    warehouseCount: data.value.deviceTypes.filter((d) => d.category === 'warehouse').length,
    spareCount: data.value.ledgers.filter((l) => l.category === 'spare').reduce((s, l) => s + l.quantity, 0),
    instrumentCount: data.value.ledgers.filter((l) => l.category === 'instrument').reduce((s, l) => s + l.quantity, 0),
    toolCount: data.value.ledgers.filter((l) => l.category === 'tool').reduce((s, l) => s + l.quantity, 0),
    pendingFaults: data.value.faultRecords.filter((f) => f.status === '待处理').length,
    ongoingMaintenance: data.value.maintenanceRecords.filter((m) => m.status === '进行中').length,
    inventoryProgress: (() => {
      const roots = data.value.inventoryTasks.filter((t) => t.level === 'center')
      if (!roots.length) return 0
      const total = roots.reduce((s, t) => s + t.totalCount, 0)
      const checked = roots.reduce((s, t) => s + t.checkedCount, 0)
      return total ? Math.round((checked / total) * 100) : 0
    })(),
    orgCount: data.value.organizations.length,
  }))

  function resetAllData() {
    clearBusinessData()
    data.value = getSeed()
  }

  return {
    data,
    organizations,
    roles,
    persons,
    manufacturers,
    deviceTypes,
    ledgers,
    inOutRecords,
    faultRecords,
    maintenanceRecords,
    inventoryTasks,
    inventoryLineItems,
    dashboardStats,
    getOrg,
    getRole,
    getDeviceType,
    getLedgerByCode,
    ledgersByCategory,
    deviceTypesByCategory,
    manufacturersByCategory,
    addOrganization,
    updateOrganization,
    removeOrganization,
    addRole,
    updateRole,
    removeRole,
    addPerson,
    updatePerson,
    removePerson,
    addManufacturer,
    updateManufacturer,
    removeManufacturer,
    addDeviceType,
    updateDeviceType,
    removeDeviceType,
    addLedger,
    updateLedger,
    removeLedger,
    addInOutRecord,
    removeInOutRecord,
    addFaultRecord,
    updateFaultRecord,
    removeFaultRecord,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    removeMaintenanceRecord,
    convertFaultToMaintenance,
    getAssetLifecycle,
    addInventoryTask,
    dispatchInventoryTask,
    updateInventoryLine,
    removeInventoryTask,
    resetAllData,
  }
})
