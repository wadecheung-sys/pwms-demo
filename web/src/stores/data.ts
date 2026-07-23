import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import * as seed from '@/mock/data'
import type {
  AlertItem,
  AssetCategory,
  AssetLedger,
  AssetLifecycleEvent,
  CheckCycleSetting,
  CheckRecord,
  DeviceType,
  FaultRecord,
  FundingSource,
  InOutRecord,
  InventoryCheckMethod,
  InventoryLineItem,
  InventoryPlanLevel,
  InventoryTask,
  MaintenanceRecord,
  Manufacturer,
  OrgDeviceParam,
  Organization,
  OrgType,
  Person,
  QuotaResult,
  QuotaRule,
  RetirementRecord,
  Role,
  StockBill,
  TransferBill,
  WarehouseSite,
  OutboundKind,
} from '@/types'
import { genAssetCode, genId, nowStr } from '@/utils/pwms/id'
import { addWorkingDays, todayDateOnly } from '@/utils/pwms/date'
import {
  buildOrgTree,
  getOrgChildren,
  getOrgDescendantIds,
  isInventoryCenterOrg,
  levelFromType,
  validateOrgHierarchy,
} from '@/utils/pwms/org'
import { clearBusinessData, loadJson, saveJson } from '@/utils/pwms/persist'
import {
  applyDueFromCycles,
  refreshLedgersDueAndFlags,
  resolveNextDueForCheck,
  syncLedgerOperationalFlags,
} from '@/utils/pwms/ledgerFlags'
import { calcStandardQty } from '@/utils/pwms/quota'

/** 业务数据结构版本；v12：工单类型/WBS + 抢修先领用后补办 */
export const BUSINESS_SCHEMA_VERSION = 12

interface BusinessData {
  schemaVersion: number
  organizations: Organization[]
  roles: Role[]
  persons: Person[]
  warehouseSites: WarehouseSite[]
  manufacturers: Manufacturer[]
  deviceTypes: DeviceType[]
  ledgers: AssetLedger[]
  stockBills: StockBill[]
  transferBills: TransferBill[]
  inOutRecords: InOutRecord[]
  faultRecords: FaultRecord[]
  maintenanceRecords: MaintenanceRecord[]
  inventoryTasks: InventoryTask[]
  inventoryLineItems: InventoryLineItem[]
  quotaRules: QuotaRule[]
  orgDeviceParams: OrgDeviceParam[]
  quotaResults: QuotaResult[]
  alerts: AlertItem[]
  checkRecords: CheckRecord[]
  retirementRecords: RetirementRecord[]
  checkCycleSettings: CheckCycleSetting[]
}

function normalizeFunding(v?: string): FundingSource {
  if (v === '成本' || v === '零购' || v === '工程转备品') return v
  return '成本'
}

function getSeed(): BusinessData {
  const seedData: BusinessData = {
    schemaVersion: BUSINESS_SCHEMA_VERSION,
    organizations: [...seed.organizations],
    roles: [...seed.roles],
    persons: [...seed.persons],
    warehouseSites: [...seed.warehouseSites],
    manufacturers: [...seed.manufacturers],
    deviceTypes: [...seed.deviceTypes],
    ledgers: [...seed.ledgers],
    stockBills: [...seed.stockBills],
    transferBills: [...(seed.transferBills || [])],
    inOutRecords: [...seed.inOutRecords],
    faultRecords: [...seed.faultRecords],
    maintenanceRecords: [...seed.maintenanceRecords],
    inventoryTasks: [...seed.inventoryTasks],
    inventoryLineItems: [...seed.inventoryLineItems],
    quotaRules: [...seed.quotaRules],
    orgDeviceParams: [...seed.orgDeviceParams],
    quotaResults: [...seed.quotaResults],
    alerts: [...seed.alerts],
    checkRecords: [...(seed.checkRecords || [])],
    retirementRecords: [...(seed.retirementRecords || [])],
    checkCycleSettings: [...(seed.checkCycleSettings || [])],
  }
  refreshLedgersDueAndFlags(seedData.ledgers, seedData.checkCycleSettings)
  return seedData
}

function loadBusinessData(): BusinessData {
  const fallback = getSeed()
  const raw = loadJson<Partial<BusinessData> | null>('business', null)
  if (!raw || raw.schemaVersion !== BUSINESS_SCHEMA_VERSION) return fallback
  if (!raw.organizations?.length || !raw.organizations[0]?.type) return fallback
  if (!raw.warehouseSites?.length) return fallback
  if (!raw.ledgers?.length || !raw.ledgers[0]?.warehouseId) return fallback
  const data = raw as BusinessData
  if (!data.checkRecords) data.checkRecords = [...(seed.checkRecords || [])]
  if (!data.retirementRecords) data.retirementRecords = [...(seed.retirementRecords || [])]
  if (!data.checkCycleSettings) data.checkCycleSettings = [...(seed.checkCycleSettings || [])]
  if (!data.transferBills) data.transferBills = [...(seed.transferBills || [])]
  refreshLedgersDueAndFlags(data.ledgers, data.checkCycleSettings || [])
  return data
}

export const useDataStore = defineStore('data', () => {
  const data = ref<BusinessData>(loadBusinessData())

  watch(data, (v) => saveJson('business', v), { deep: true })

  const organizations = computed(() => data.value.organizations)
  const roles = computed(() => data.value.roles)
  const persons = computed(() => data.value.persons)
  const warehouseSites = computed(() => data.value.warehouseSites)
  const manufacturers = computed(() => data.value.manufacturers)
  const deviceTypes = computed(() => data.value.deviceTypes)
  const ledgers = computed(() => data.value.ledgers)
  const stockBills = computed(() => data.value.stockBills)
  const transferBills = computed(() => data.value.transferBills || [])
  const inOutRecords = computed(() => data.value.inOutRecords)
  const faultRecords = computed(() => data.value.faultRecords)
  const maintenanceRecords = computed(() => data.value.maintenanceRecords)
  const inventoryTasks = computed(() => data.value.inventoryTasks)
  const inventoryLineItems = computed(() => data.value.inventoryLineItems)
  const quotaRules = computed(() => data.value.quotaRules)
  const orgDeviceParams = computed(() => data.value.orgDeviceParams)
  const quotaResults = computed(() => data.value.quotaResults)
  const alerts = computed(() => data.value.alerts)
  const checkRecords = computed(() => data.value.checkRecords || [])
  const retirementRecords = computed(() => data.value.retirementRecords || [])
  const checkCycleSettings = computed(() => data.value.checkCycleSettings || [])

  function getOrg(id: string) {
    return data.value.organizations.find((o) => o.id === id)
  }

  function getPerson(id: string) {
    return data.value.persons.find((p) => p.id === id)
  }

  function getWarehouseSite(id: string) {
    return data.value.warehouseSites.find((w) => w.id === id)
  }

  function genWarehouseCode(): string {
    const year = new Date().getFullYear()
    const existing = data.value.warehouseSites.map((w) => w.code)
    let seq = 1
    let code = `WS${year}${String(seq).padStart(4, '0')}`
    while (existing.includes(code)) {
      seq += 1
      code = `WS${year}${String(seq).padStart(4, '0')}`
    }
    return code
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

  function deviceTypesByCategory(category: AssetCategory) {
    return data.value.deviceTypes.filter((d) => d.category === category)
  }

  function manufacturersByCategory(category: Manufacturer['category']) {
    return data.value.manufacturers.filter((m) => m.category === category)
  }

  function getOrgTree() {
    return buildOrgTree(data.value.organizations)
  }

  function getOrgChildrenIds(parentId: string) {
    return getOrgChildren(data.value.organizations, parentId).map((o) => o.id)
  }

  function getOrgDescendantIdsFrom(rootId: string, includeSelf = true) {
    return getOrgDescendantIds(data.value.organizations, rootId, includeSelf)
  }

  // --- Organization ---
  function addOrganization(item: Omit<Organization, 'id' | 'level'>) {
    const parent = item.parentId ? getOrg(item.parentId) : null
    const hierarchyError = validateOrgHierarchy(item.type, parent ?? null)
    if (hierarchyError) throw new Error(hierarchyError)
    if (data.value.organizations.some((o) => o.code === item.code)) {
      throw new Error('组织编码已存在')
    }
    const level = levelFromType(item.type)
    data.value.organizations.push({ ...item, id: genId('org'), level })
  }

  function updateOrganization(id: string, patch: Partial<Omit<Organization, 'id'>>) {
    const idx = data.value.organizations.findIndex((o) => o.id === id)
    if (idx < 0) return
    const current = data.value.organizations[idx]
    const nextType = patch.type ?? current.type
    const nextParentId = patch.parentId !== undefined ? patch.parentId : current.parentId
    const parent = nextParentId ? getOrg(nextParentId) : null

    if (nextParentId === id) throw new Error('上级组织不能为自身')
    if (nextParentId && getOrgDescendantIdsFrom(id, false).includes(nextParentId)) {
      throw new Error('上级组织不能为下级节点')
    }

    const hierarchyError = validateOrgHierarchy(nextType, parent ?? null)
    if (hierarchyError) throw new Error(hierarchyError)

    if (patch.code && data.value.organizations.some((o) => o.code === patch.code && o.id !== id)) {
      throw new Error('组织编码已存在')
    }

    const updated: Organization = {
      ...current,
      ...patch,
      id,
      type: nextType,
      parentId: nextParentId,
      level: levelFromType(nextType),
    }
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
    const inUse =
      data.value.persons.some((p) => p.orgId === id) ||
      data.value.ledgers.some((l) => l.orgId === id) ||
      data.value.inventoryTasks.some((t) => t.orgId === id) ||
      data.value.warehouseSites.some((w) => w.orgId === id)
    if (inUse) throw new Error('该组织仍有关联人员或业务数据')
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
    const inUse = data.value.warehouseSites.some((w) => w.keeperId === id)
    if (inUse) throw new Error('该人员仍为生产仓库管员，请先调整仓室信息')
    data.value.persons = data.value.persons.filter((p) => p.id !== id)
  }

  // --- WarehouseSite ---
  function addWarehouseSite(item: Omit<WarehouseSite, 'id' | 'orgName' | 'keeperName' | 'createdAt'>) {
    const org = getOrg(item.orgId)
    const keeper = getPerson(item.keeperId)
    if (!org) throw new Error('所属单位无效')
    if (!keeper) throw new Error('库管人员无效')
    if (data.value.warehouseSites.some((w) => w.code === item.code)) {
      throw new Error('仓室编码已存在')
    }
    data.value.warehouseSites.unshift({
      ...item,
      id: genId('ws'),
      orgName: org.name,
      keeperName: keeper.name,
      contactPhone: item.contactPhone || keeper.phone,
      createdAt: nowStr(),
    })
  }

  function updateWarehouseSite(id: string, patch: Partial<Omit<WarehouseSite, 'id' | 'createdAt'>>) {
    const idx = data.value.warehouseSites.findIndex((w) => w.id === id)
    if (idx < 0) return
    const current = data.value.warehouseSites[idx]
    const org = patch.orgId ? getOrg(patch.orgId) : getOrg(current.orgId)
    const keeper = patch.keeperId ? getPerson(patch.keeperId) : getPerson(current.keeperId)
    if (!org) throw new Error('所属单位无效')
    if (!keeper) throw new Error('库管人员无效')
    if (patch.code && data.value.warehouseSites.some((w) => w.code === patch.code && w.id !== id)) {
      throw new Error('仓室编码已存在')
    }
    data.value.warehouseSites[idx] = {
      ...current,
      ...patch,
      id,
      orgName: org.name,
      keeperName: keeper.name,
      contactPhone: patch.contactPhone ?? keeper.phone ?? current.contactPhone,
    }
    if (patch.name) {
      data.value.ledgers.forEach((l) => {
        if (l.warehouseId === id) l.warehouseName = patch.name!
      })
      data.value.inventoryLineItems.forEach((line) => {
        const ledger = data.value.ledgers.find((l) => l.assetCode === line.assetCode)
        if (ledger?.warehouseId === id) line.warehouseName = patch.name!
      })
    }
  }

  function removeWarehouseSite(id: string) {
    const linked = data.value.ledgers.some((l) => l.warehouseId === id)
    if (linked) throw new Error('该仓室仍有关联设备台账，请先调整或删除设备')
    data.value.warehouseSites = data.value.warehouseSites.filter((w) => w.id !== id)
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
  function addLedger(item: Omit<AssetLedger, 'id' | 'assetCode' | 'typeName' | 'orgName' | 'unit' | 'warehouseName'>) {
    const dt = getDeviceType(item.typeId)
    const org = getOrg(item.orgId)
    const wh = getWarehouseSite(item.warehouseId)
    if (!dt || !org) throw new Error('设备类型或组织无效')
    if (!wh) throw new Error('请选择有效的生产仓地点')
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
      warehouseName: wh.name,
      unit: dt.unit,
      inboundTime: item.inboundTime || nowStr(),
    })
    const created = data.value.ledgers[data.value.ledgers.length - 1]
    applyDueFromCycles(created, data.value.checkCycleSettings || [])
    syncLedgerOperationalFlags(created)
  }

  function updateLedger(id: string, patch: Partial<AssetLedger>) {
    const idx = data.value.ledgers.findIndex((l) => l.id === id)
    if (idx < 0) return
    const cur = data.value.ledgers[idx]
    const dt = patch.typeId ? getDeviceType(patch.typeId) : getDeviceType(cur.typeId)
    const org = patch.orgId ? getOrg(patch.orgId) : getOrg(cur.orgId)
    const wh = patch.warehouseId ? getWarehouseSite(patch.warehouseId) : getWarehouseSite(cur.warehouseId)
    if (patch.warehouseId && !wh) throw new Error('请选择有效的生产仓地点')
    const next = {
      ...cur,
      ...patch,
      id,
      typeName: dt?.name ?? cur.typeName,
      orgName: org?.name ?? cur.orgName,
      warehouseName: wh?.name ?? cur.warehouseName,
      unit: dt?.unit ?? cur.unit,
    }
    applyDueFromCycles(next, data.value.checkCycleSettings || [])
    syncLedgerOperationalFlags(next)
    data.value.ledgers[idx] = next
  }

  function removeLedger(id: string) {
    const ledger = data.value.ledgers.find((l) => l.id === id)
    if (!ledger) return
    const pending = data.value.stockBills.some(
      (b) => b.assetCode === ledger.assetCode && !['已确认', '已驳回'].includes(b.status),
    )
    if (pending) throw new Error('该物资存在未完结出入库单据，无法删除')
    if (ledger.quantity > 0) throw new Error('库存数量大于零，请先出库或办理报废后再删除')
    data.value.ledgers = data.value.ledgers.filter((l) => l.id !== id)
  }

  /** 资产报废：扣减剩余库存并归档处置状态 */
  function disposeLedger(id: string, operator: string, reason = '资产报废') {
    const ledger = data.value.ledgers.find((l) => l.id === id)
    if (!ledger) throw new Error('台账不存在')
    if (ledger.status === '报废' || ledger.disposeStatus === '已报废') {
      throw new Error('该物资已报废')
    }
    const qty = ledger.quantity
    if (qty > 0) {
      data.value.inOutRecords.unshift({
        id: genId('io'),
        category: ledger.category,
        assetCode: ledger.assetCode,
        assetName: ledger.name,
        type: '出库',
        quantity: qty,
        operator,
        orgName: ledger.orgName,
        reason,
        operateTime: nowStr(),
        fundingSource: '成本',
        physicalId: ledger.physicalId,
      })
      ledger.quantity = 0
    }
    ledger.status = '报废'
    ledger.disposeStatus = '已报废'
    ledger.inStock = false
    ledger.usable = false
    syncLedgerOperationalFlags(ledger)
  }

  // --- StockBill 审批出入库（确认后才改库存）---
  function genBillNo(billType: '入库' | '出库') {
    const prefix = billType === '入库' ? 'RK' : 'CK'
    const d = new Date()
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const seq = String(data.value.stockBills.length + 1).padStart(3, '0')
    return `${prefix}${ymd}${seq}`
  }

  function createStockBill(
    item: Omit<StockBill, 'id' | 'billNo' | 'assetName' | 'createTime' | 'status'> & {
      status?: StockBill['status']
      orgName?: string
    },
  ) {
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    if (item.billType === '出库' && ledger.checkDueStatus === '超期' && (ledger.category === 'instrument' || ledger.category === 'tool')) {
      pushAlert({
        category: '校验',
        level: '严重',
        title: `${ledger.name}检定超期禁止出库`,
        content: `${ledger.assetCode} 检定已超期，出库申请已拦截。`,
        targetType: 'ledger',
        targetId: ledger.id,
        routePath: `/${ledger.category}/ledger`,
        orgName: ledger.orgName,
      })
      throw new Error('该物资检定已超期，禁止出库（请先完成检定）')
    }
    if (item.billType === '出库' && ledger.usable === false) {
      throw new Error('物资当前不可用，禁止出库')
    }
    if (item.billType === '出库' && ledger.inStock === false) {
      throw new Error('物资不在库，无法出库')
    }
    const outboundKind: OutboundKind = item.billType === '出库' ? item.outboundKind || '常规' : '常规'
    if (item.billType === '出库' && outboundKind === '常规') {
      const wot = item.workOrderType
      if (!wot || wot === '抢修') throw new Error('常规出库请选择大修或日常运维工单类型')
      if (!item.projectName?.trim()) throw new Error('常规出库须填写项目名称')
      if (!item.wbsCode?.trim()) throw new Error('常规出库须填写 WBS 编码')
      if (!item.workOrderNo?.trim()) throw new Error('常规出库须填写工单号')
    }
    const fundingSource = normalizeFunding(
      item.fundingSource || (item as { scene?: string }).scene,
    )
    const bill: StockBill = {
      ...item,
      fundingSource,
      outboundKind: item.billType === '出库' ? outboundKind : undefined,
      id: genId('sb'),
      billNo: genBillNo(item.billType),
      assetName: ledger.name,
      model: item.model || ledger.model,
      orgName: item.orgName || ledger.orgName,
      warehouseId: item.warehouseId || ledger.warehouseId,
      warehouseName: item.warehouseName || ledger.warehouseName,
      status: item.status ?? '待审批',
      createTime: nowStr(),
      inboundTime: item.billType === '入库' ? item.inboundTime || undefined : item.inboundTime,
    }
    data.value.stockBills.unshift(bill)
    return bill.id
  }

  function submitStockBill(id: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) return
    if (bill.status !== '草稿') throw new Error('仅草稿可提交审批')
    bill.status = '待审批'
  }

  function updateStockBill(
    id: string,
    patch: Partial<
      Pick<
        StockBill,
        | 'assetCode'
        | 'quantity'
        | 'fundingSource'
        | 'reason'
        | 'workOrderNo'
        | 'workOrderType'
        | 'wbsCode'
        | 'outboundKind'
        | 'warehouseId'
        | 'warehouseName'
        | 'model'
        | 'projectName'
        | 'expectedReturnDate'
        | 'inboundTime'
        | 'emergencyApprovalFile'
        | 'makeupDeadline'
      >
    >,
  ) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) throw new Error('单据不存在')
    if (!['草稿', '已驳回', '待补办'].includes(bill.status)) {
      throw new Error('仅草稿、已驳回或待补办单据可修改')
    }
    if (patch.assetCode && patch.assetCode !== bill.assetCode) {
      const ledger = getLedgerByCode(patch.assetCode)
      if (!ledger) throw new Error('资产编码不存在')
      bill.assetCode = ledger.assetCode
      bill.assetName = ledger.name
      bill.model = ledger.model
      bill.category = ledger.category
      bill.orgId = ledger.orgId
      bill.orgName = ledger.orgName
      bill.warehouseId = ledger.warehouseId
      bill.warehouseName = ledger.warehouseName
    }
    if (patch.quantity != null) bill.quantity = patch.quantity
    if (patch.fundingSource != null) bill.fundingSource = normalizeFunding(patch.fundingSource)
    if (patch.reason != null) bill.reason = patch.reason
    if (patch.workOrderNo !== undefined) bill.workOrderNo = patch.workOrderNo
    if (patch.workOrderType !== undefined) bill.workOrderType = patch.workOrderType
    if (patch.wbsCode !== undefined) bill.wbsCode = patch.wbsCode
    if (patch.outboundKind !== undefined) bill.outboundKind = patch.outboundKind
    if (patch.warehouseId !== undefined) bill.warehouseId = patch.warehouseId
    if (patch.warehouseName !== undefined) bill.warehouseName = patch.warehouseName
    if (patch.model !== undefined) bill.model = patch.model
    if (patch.projectName !== undefined) bill.projectName = patch.projectName
    if (patch.expectedReturnDate !== undefined) bill.expectedReturnDate = patch.expectedReturnDate
    if (patch.inboundTime !== undefined) bill.inboundTime = patch.inboundTime
    if (patch.emergencyApprovalFile !== undefined) bill.emergencyApprovalFile = patch.emergencyApprovalFile
    if (patch.makeupDeadline !== undefined) bill.makeupDeadline = patch.makeupDeadline
  }

  /** 驳回/草稿单据重新提交审批 */
  function resubmitStockBill(id: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) throw new Error('单据不存在')
    if (!['草稿', '已驳回'].includes(bill.status)) {
      throw new Error('当前状态不可重新提交')
    }
    const ledger = getLedgerByCode(bill.assetCode)
    if (!ledger) throw new Error('资产不存在')
    if (bill.billType === '出库' && ledger.checkDueStatus === '超期' && (ledger.category === 'instrument' || ledger.category === 'tool')) {
      throw new Error('该物资检定已超期，禁止出库')
    }
    bill.status = '待审批'
    bill.rejectReason = undefined
    bill.approver = undefined
    bill.approveTime = undefined
    bill.approveRemark = undefined
  }

  /** 申请人撤回待审批单据为草稿 */
  function withdrawStockBill(id: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) throw new Error('单据不存在')
    if (bill.status !== '待审批') throw new Error('仅待审批单据可撤回')
    bill.status = '草稿'
    bill.approver = undefined
    bill.approveTime = undefined
    bill.approveRemark = undefined
    bill.rejectReason = undefined
  }

  function approveStockBill(id: string, approver: string, remark?: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) return
    if (bill.status !== '待审批') throw new Error('当前状态不可审批')
    bill.status = '待确认'
    bill.approver = approver
    bill.approveTime = nowStr()
    bill.approveRemark = remark
  }

  function rejectStockBill(id: string, approver: string, reason: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) return
    if (bill.status !== '待审批') throw new Error('当前状态不可驳回')
    bill.status = '已驳回'
    bill.approver = approver
    bill.approveTime = nowStr()
    bill.rejectReason = reason
  }

  function confirmStockBill(id: string, confirmer: string, physicalId: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) return
    if (bill.status !== '待确认' && bill.status !== '已通过') {
      throw new Error('当前状态不可确认')
    }
    const ledger = getLedgerByCode(bill.assetCode)
    if (!ledger) throw new Error('资产不存在')
    if (bill.billType === '出库' && ledger.checkDueStatus === '超期' && (ledger.category === 'instrument' || ledger.category === 'tool')) {
      throw new Error('检定超期，禁止确认出库')
    }
    if (!physicalId?.trim()) throw new Error('请扫码或录入实物 ID')
    const expect = ledger.physicalId || ledger.assetCode
    if (physicalId.trim() !== expect && physicalId.trim() !== ledger.assetCode) {
      throw new Error(`实物 ID 不匹配，期望 ${expect}`)
    }
    if (bill.billType === '出库' && ledger.quantity < bill.quantity) {
      throw new Error(`库存不足，当前库存 ${ledger.quantity} ${ledger.unit}`)
    }
    if (bill.billType === '入库') {
      ledger.quantity += bill.quantity
      ledger.status = '在库'
      bill.inboundTime = nowStr()
      ledger.inboundTime = bill.inboundTime
      applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
      syncLedgerOperationalFlags(ledger)
    } else {
      ledger.quantity -= bill.quantity
      if (ledger.quantity <= 0) {
        ledger.status = '在用'
        ledger.quantity = 0
      }
      if (bill.expectedReturnDate) ledger.expectedReturnDate = bill.expectedReturnDate
      if (bill.projectName) ledger.projectName = bill.projectName
      applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
      syncLedgerOperationalFlags(ledger)
    }

    bill.status = '已确认'
    bill.confirmer = confirmer
    bill.confirmTime = nowStr()
    bill.physicalId = physicalId.trim()

    data.value.inOutRecords.unshift({
      id: genId('io'),
      category: bill.category,
      assetCode: bill.assetCode,
      assetName: bill.assetName,
      type: bill.billType,
      quantity: bill.quantity,
      operator: confirmer,
      orgName: bill.orgName,
      reason: bill.reason,
      operateTime: nowStr(),
      billId: bill.id,
      fundingSource: bill.fundingSource,
      workOrderNo: bill.workOrderNo,
      workOrderType: bill.workOrderType,
      wbsCode: bill.wbsCode,
      outboundKind: bill.outboundKind,
      physicalId: bill.physicalId,
      projectName: bill.projectName,
      expectedReturnDate: bill.expectedReturnDate,
      approver: bill.approver,
      returned: bill.billType === '出库' ? false : undefined,
    })
  }

  function assertOutboundAllowed(ledger: AssetLedger) {
    if (ledger.checkDueStatus === '超期' && (ledger.category === 'instrument' || ledger.category === 'tool')) {
      throw new Error('该物资检定已超期，禁止出库（请先完成检定）')
    }
    if (ledger.usable === false) throw new Error('物资当前不可用，禁止出库')
    if (ledger.inStock === false) throw new Error('物资不在库，无法出库')
  }

  function applyOutboundStock(ledger: AssetLedger, bill: StockBill) {
    if (ledger.quantity < bill.quantity) {
      throw new Error(`库存不足，当前库存 ${ledger.quantity} ${ledger.unit}`)
    }
    ledger.quantity -= bill.quantity
    if (ledger.quantity <= 0) {
      ledger.status = '在用'
      ledger.quantity = 0
    }
    if (bill.expectedReturnDate) ledger.expectedReturnDate = bill.expectedReturnDate
    if (bill.projectName) ledger.projectName = bill.projectName
    applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
    syncLedgerOperationalFlags(ledger)
  }

  /**
   * 抢修出库：先领用即扣账，生成待补办单据（5 个工作日内补传应急抢修审批单）
   */
  function issueEmergencyOutbound(
    item: Omit<StockBill, 'id' | 'billNo' | 'assetName' | 'createTime' | 'status' | 'billType' | 'outboundKind'> & {
      physicalId: string
      orgName?: string
    },
  ) {
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    assertOutboundAllowed(ledger)
    if (!item.physicalId?.trim()) throw new Error('请扫码或录入实物 ID')
    const expect = ledger.physicalId || ledger.assetCode
    if (item.physicalId.trim() !== expect && item.physicalId.trim() !== ledger.assetCode) {
      throw new Error(`实物 ID 不匹配，期望 ${expect}`)
    }

    const fundingSource = normalizeFunding(item.fundingSource || (item as { scene?: string }).scene)
    const bill: StockBill = {
      ...item,
      fundingSource,
      billType: '出库',
      outboundKind: '抢修',
      workOrderType: item.workOrderType || '抢修',
      id: genId('sb'),
      billNo: genBillNo('出库'),
      assetName: ledger.name,
      model: item.model || ledger.model,
      orgName: item.orgName || ledger.orgName,
      warehouseId: item.warehouseId || ledger.warehouseId,
      warehouseName: item.warehouseName || ledger.warehouseName,
      status: '待补办',
      makeupDeadline: addWorkingDays(todayDateOnly(), 5),
      physicalId: item.physicalId.trim(),
      confirmer: item.applicant,
      confirmTime: nowStr(),
      createTime: nowStr(),
    }
    applyOutboundStock(ledger, bill)
    data.value.stockBills.unshift(bill)
    data.value.inOutRecords.unshift({
      id: genId('io'),
      category: bill.category,
      assetCode: bill.assetCode,
      assetName: bill.assetName,
      type: '出库',
      quantity: bill.quantity,
      operator: bill.applicant,
      orgName: bill.orgName,
      reason: bill.reason || '应急抢修领用',
      operateTime: nowStr(),
      billId: bill.id,
      fundingSource: bill.fundingSource,
      workOrderNo: bill.workOrderNo,
      workOrderType: bill.workOrderType,
      wbsCode: bill.wbsCode,
      outboundKind: '抢修',
      physicalId: bill.physicalId,
      projectName: bill.projectName,
      expectedReturnDate: bill.expectedReturnDate,
      returned: false,
    })
    return bill.id
  }

  /** 提交抢修补办：须上传应急抢修审批单 */
  function submitEmergencyMakeup(
    id: string,
    payload: { emergencyApprovalFile: string; workOrderNo?: string },
  ) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) throw new Error('单据不存在')
    if (bill.outboundKind !== '抢修' || bill.status !== '待补办') {
      throw new Error('仅抢修待补办单据可提交补办')
    }
    if (!payload.emergencyApprovalFile?.trim()) {
      throw new Error('请上传应急抢修审批单（对口专业提供）')
    }
    bill.emergencyApprovalFile = payload.emergencyApprovalFile.trim()
    if (payload.workOrderNo !== undefined) bill.workOrderNo = payload.workOrderNo || undefined
    bill.status = '补办待审'
    bill.rejectReason = undefined
  }

  function approveEmergencyMakeup(id: string, approver: string, remark?: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) throw new Error('单据不存在')
    if (bill.status !== '补办待审') throw new Error('当前状态不可审批补办')
    bill.status = '已确认'
    bill.approver = approver
    bill.approveTime = nowStr()
    bill.approveRemark = remark || '抢修补办手续已审批'
  }

  function rejectEmergencyMakeup(id: string, approver: string, reason: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) throw new Error('单据不存在')
    if (bill.status !== '补办待审') throw new Error('当前状态不可驳回补办')
    bill.status = '待补办'
    bill.approver = approver
    bill.approveTime = nowStr()
    bill.rejectReason = reason
    bill.emergencyApprovalFile = undefined
  }

  /** 扫描抢修补办逾期并写入告警（幂等：同单据未处理告警不重复） */
  function syncEmergencyMakeupOverdueAlerts() {
    const today = todayDateOnly()
    for (const bill of data.value.stockBills) {
      if (bill.outboundKind !== '抢修' || bill.status !== '待补办') continue
      if (!bill.makeupDeadline || bill.makeupDeadline >= today) continue
      const exists = data.value.alerts.some(
        (a) =>
          a.targetType === 'bill' &&
          a.targetId === bill.id &&
          a.status === '未处理' &&
          a.title.includes('抢修补办逾期'),
      )
      if (exists) continue
      pushAlert({
        category: '合规',
        level: '警告',
        title: `抢修补办逾期 ${bill.billNo}`,
        content: `${bill.assetName} 于 ${bill.confirmTime || bill.createTime} 抢修领用，应于 ${bill.makeupDeadline} 前补办出库手续（含应急抢修审批单），现已逾期。`,
        targetType: 'bill',
        targetId: bill.id,
        routePath: '/warehouse/inout/out-apply',
        orgName: bill.orgName,
      })
    }
  }

  /** 仪器/工器具领用归还：出库流水标记已归还，台账回到在库 */
  function returnOutboundRecord(recordId: string, operator: string) {
    const record = data.value.inOutRecords.find((r) => r.id === recordId)
    if (!record) throw new Error('出库记录不存在')
    if (record.type !== '出库') throw new Error('仅出库记录可归还')
    if (record.category === 'spare') throw new Error('备品出库不支持归还入库，请走新采购/入库流程')
    if (record.returned) throw new Error('该出库记录已归还')
    const ledger = getLedgerByCode(record.assetCode)
    if (!ledger) throw new Error('台账不存在')
    if (ledger.status === '报废') throw new Error('已报废物资不可归还')

    ledger.quantity += record.quantity
    ledger.status = '在库'
    ledger.inboundTime = nowStr()
    ledger.expectedReturnDate = undefined
    applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
    syncLedgerOperationalFlags(ledger)

    record.returned = true
    record.returnTime = nowStr()

    data.value.inOutRecords.unshift({
      id: genId('io'),
      category: record.category,
      assetCode: record.assetCode,
      assetName: record.assetName,
      type: '入库',
      quantity: record.quantity,
      operator,
      orgName: ledger.orgName,
      reason: `领用归还（关联出库 ${record.id}）`,
      operateTime: nowStr(),
      fundingSource: record.fundingSource || '成本',
      physicalId: ledger.physicalId,
      billId: record.billId,
      approver: record.approver,
    })
  }

  function removeStockBill(id: string) {
    const bill = data.value.stockBills.find((b) => b.id === id)
    if (!bill) return
    if (bill.status === '已确认') throw new Error('已确认单据不可删除')
    data.value.stockBills = data.value.stockBills.filter((b) => b.id !== id)
  }

  function genTransferNo() {
    const d = new Date()
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const seq = String((data.value.transferBills?.length || 0) + 1).padStart(3, '0')
    return `ZB${ymd}${seq}`
  }

  function createTransferBill(
    item: Omit<TransferBill, 'id' | 'billNo' | 'createTime' | 'status'> & { status?: TransferBill['status'] },
  ) {
    if (!data.value.transferBills) data.value.transferBills = []
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    if (ledger.usable === false || ledger.checkDueStatus === '超期' || ledger.trialDueStatus === '超期') {
      throw new Error('物资超期或不可用，禁止调拨')
    }
    if (ledger.quantity < item.quantity) throw new Error(`库存不足，当前 ${ledger.quantity}`)
    if (item.fromWarehouseId === item.toWarehouseId) throw new Error('调出仓与调入仓不能相同')
    const bill: TransferBill = {
      ...item,
      id: genId('tb'),
      billNo: genTransferNo(),
      status: item.status ?? '待审批',
      createTime: nowStr(),
    }
    data.value.transferBills.unshift(bill)
    return bill.id
  }

  function approveTransferBill(id: string, approver: string) {
    const bill = data.value.transferBills.find((b) => b.id === id)
    if (!bill) throw new Error('调拨单不存在')
    if (bill.status !== '待审批') throw new Error('当前状态不可审批')
    bill.status = '待确认'
    bill.approver = approver
    bill.approveTime = nowStr()
  }

  function rejectTransferBill(id: string, approver: string, reason: string) {
    const bill = data.value.transferBills.find((b) => b.id === id)
    if (!bill) throw new Error('调拨单不存在')
    if (bill.status !== '待审批') throw new Error('当前状态不可驳回')
    bill.status = '已驳回'
    bill.approver = approver
    bill.approveTime = nowStr()
    bill.rejectReason = reason
  }

  function confirmTransferBill(id: string, confirmer: string, physicalId: string) {
    const bill = data.value.transferBills.find((b) => b.id === id)
    if (!bill) throw new Error('调拨单不存在')
    if (bill.status !== '待确认') throw new Error('当前状态不可确认')
    const ledger = getLedgerByCode(bill.assetCode)
    if (!ledger) throw new Error('资产不存在')
    if (!physicalId?.trim()) throw new Error('请扫码或录入实物 ID')
    const expect = ledger.physicalId || ledger.assetCode
    if (physicalId.trim() !== expect && physicalId.trim() !== ledger.assetCode) {
      throw new Error(`实物 ID 不匹配，期望 ${expect}`)
    }
    if (ledger.warehouseId !== bill.fromWarehouseId) {
      throw new Error('物资当前不在调出仓，无法确认')
    }
    if (ledger.quantity < bill.quantity) throw new Error('库存不足，无法调拨')

    const toWh = getWarehouseSite(bill.toWarehouseId)
    if (!toWh) throw new Error('调入仓不存在')

    // 全量调拨：变更仓室；部分数量则拆分到目标仓台账
    if (bill.quantity >= ledger.quantity) {
      ledger.warehouseId = toWh.id
      ledger.warehouseName = toWh.name
      ledger.orgId = toWh.orgId
      ledger.orgName = toWh.orgName
      ledger.increaseMode = '调拨转入'
      ledger.inboundTime = nowStr()
      applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
      syncLedgerOperationalFlags(ledger)
    } else {
      ledger.quantity -= bill.quantity
      applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
      syncLedgerOperationalFlags(ledger)
      const moved: AssetLedger = {
        ...ledger,
        id: genId('l'),
        quantity: bill.quantity,
        warehouseId: toWh.id,
        warehouseName: toWh.name,
        orgId: toWh.orgId,
        orgName: toWh.orgName,
        increaseMode: '调拨转入',
        inboundTime: nowStr(),
        status: '在库',
      }
      applyDueFromCycles(moved, data.value.checkCycleSettings || [])
      syncLedgerOperationalFlags(moved)
      data.value.ledgers.push(moved)
    }

    bill.status = '已完成'
    bill.confirmer = confirmer
    bill.confirmTime = nowStr()
    bill.physicalId = physicalId.trim()

    data.value.inOutRecords.unshift(
      {
        id: genId('io'),
        category: bill.category,
        assetCode: bill.assetCode,
        assetName: bill.assetName,
        type: '出库',
        quantity: bill.quantity,
        operator: confirmer,
        orgName: bill.orgName,
        reason: `转仓调出 → ${bill.toWarehouseName}（${bill.billNo}）`,
        operateTime: nowStr(),
        fundingSource: '成本',
        physicalId: bill.physicalId,
        approver: bill.approver,
      },
      {
        id: genId('io'),
        category: bill.category,
        assetCode: bill.assetCode,
        assetName: bill.assetName,
        type: '入库',
        quantity: bill.quantity,
        operator: confirmer,
        orgName: toWh.orgName,
        reason: `转仓调入 ← ${bill.fromWarehouseName}（${bill.billNo}）`,
        operateTime: nowStr(),
        fundingSource: '成本',
        physicalId: bill.physicalId,
        approver: bill.approver,
      },
    )
  }

  /** 兼容历史出入库流水 */
  function addInOutRecord(item: Omit<InOutRecord, 'id' | 'assetName' | 'orgName' | 'operateTime'>) {
    const ledger = getLedgerByCode(item.assetCode)
    if (!ledger) throw new Error('资产编码不存在')
    if (item.type === '出库' && ledger.quantity < item.quantity) {
      throw new Error(`库存不足，当前库存 ${ledger.quantity} ${ledger.unit}`)
    }
    if (item.type === '入库') {
      ledger.quantity += item.quantity
      if (ledger.status !== '报废') ledger.status = '在库'
    } else {
      ledger.quantity -= item.quantity
      if (ledger.quantity <= 0) {
        ledger.quantity = 0
        if (ledger.status !== '报废') ledger.status = '在用'
      }
    }
    applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
    syncLedgerOperationalFlags(ledger)

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
    if (record.billId) throw new Error('由审批单生成的流水不可直接删除')
    const ledger = getLedgerByCode(record.assetCode)
    if (ledger) {
      if (record.type === '入库') ledger.quantity -= record.quantity
      else ledger.quantity += record.quantity
    }
    data.value.inOutRecords = data.value.inOutRecords.filter((r) => r.id !== id)
  }

  function pushAlert(
    item: Omit<AlertItem, 'id' | 'createTime' | 'status'> & { status?: AlertItem['status'] },
  ) {
    data.value.alerts.unshift({
      ...item,
      id: genId('al'),
      status: item.status ?? '未处理',
      createTime: nowStr(),
    })
  }

  function handleAlert(id: string, status: '已处理' | '已忽略', remark?: string) {
    const al = data.value.alerts.find((a) => a.id === id)
    if (!al) return
    al.status = status
    al.handleTime = nowStr()
    al.handleRemark = remark
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
        description: `${ledger.name}（${ledger.assetCode}）录入台账，存放于 ${ledger.warehouseName}`,
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
      ledger.status = '在库'
      applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
      syncLedgerOperationalFlags(ledger)
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

  function levelForOrgType(type: OrgType): InventoryPlanLevel {
    if (type === 'province') return 'province'
    if (type === 'city') return 'city'
    if (type === 'county') return 'county'
    if (type === 'team') return 'team'
    return 'center'
  }

  /** 省市县（班组）逐级下达盘点计划 */
  function dispatchInventoryTask(params: {
    category: AssetCategory
    taskName: string
    centerOrgId: string
    assignee: string
    deadline: string
    startDate?: string
    /** 市可直达县/所：指定目标组织，空则自动级联全部下级 */
    targetOrgIds?: string[]
  }) {
    const center = getOrg(params.centerOrgId)
    if (!center || !isInventoryCenterOrg(center)) {
      throw new Error('请选择省公司或地市公司作为盘点汇总组织')
    }

    const rootId = genId('inv')
    const created: InventoryTask[] = []
    const startDate = params.startDate

    function leafOrgsUnder(orgId: string): Organization[] {
      const descendants = getOrgDescendantIds(data.value.organizations, orgId, false)
      let orgs = data.value.organizations.filter(
        (o) => descendants.includes(o.id) && (o.type === 'team' || o.type === 'county'),
      )
      if (params.targetOrgIds?.length) {
        const allow = new Set(params.targetOrgIds)
        orgs = orgs.filter((o) => allow.has(o.id) || params.targetOrgIds!.some((tid) => {
          const kids = getOrgDescendantIds(data.value.organizations, tid, true)
          return kids.includes(o.id)
        }))
      }
      return orgs
    }

    const rootTask: InventoryTask = {
      id: rootId,
      category: params.category,
      taskName: params.taskName,
      orgId: center.id,
      orgName: center.name,
      assignee: params.assignee,
      totalCount: 0,
      checkedCount: 0,
      status: '待盘点',
      startDate,
      deadline: params.deadline,
      createTime: nowStr(),
      parentId: null,
      level: levelForOrgType(center.type),
    }
    created.push(rootTask)

    // 地市级中间节点（若从省下发）
    const midOrgs =
      center.type === 'province'
        ? data.value.organizations.filter((o) => o.parentId === center.id && o.type === 'city')
        : []

    const midMap = new Map<string, string>()
    for (const mid of midOrgs) {
      const midId = genId('inv')
      midMap.set(mid.id, midId)
      created.push({
        id: midId,
        category: params.category,
        taskName: `${params.taskName} — ${mid.name}`,
        orgId: mid.id,
        orgName: mid.name,
        assignee: params.assignee,
        totalCount: 0,
        checkedCount: 0,
        status: '待盘点',
        startDate,
        deadline: params.deadline,
        createTime: nowStr(),
        parentId: rootId,
        level: 'city',
      })
    }

    const execOrgs =
      center.type === 'city'
        ? leafOrgsUnder(center.id)
        : midOrgs.flatMap((m) => leafOrgsUnder(m.id).map((o) => ({ ...o, midId: m.id })))

    let totalAll = 0
    const execList =
      center.type === 'city'
        ? execOrgs.map((o) => ({ org: o as Organization, parentTaskId: rootId }))
        : (execOrgs as Array<Organization & { midId: string }>).map((o) => ({
            org: o,
            parentTaskId: midMap.get(o.midId) || rootId,
          }))

    for (const { org, parentTaskId } of execList) {
      const orgIds = getOrgDescendantIds(data.value.organizations, org.id, true)
      const orgLedgers = data.value.ledgers.filter(
        (l) => l.category === params.category && orgIds.includes(l.orgId),
      )
      if (!orgLedgers.length) continue
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
          physicalId: l.physicalId,
        })
      })
      created.push({
        id: taskId,
        category: params.category,
        taskName: `${params.taskName} — ${org.name}`,
        orgId: org.id,
        orgName: org.name,
        assignee: params.assignee,
        totalCount,
        checkedCount: 0,
        status: '待盘点',
        startDate,
        deadline: params.deadline,
        createTime: nowStr(),
        parentId: parentTaskId,
        level: levelForOrgType(org.type),
      })
    }

    if (created.length <= 1) throw new Error('该组织下无可盘点的下级单位/台账')

    rootTask.totalCount = totalAll
    // 回填市级合计
    for (const mid of created.filter((t) => t.level === 'city' && t.parentId === rootId)) {
      const children = created.filter((t) => t.parentId === mid.id)
      mid.totalCount = children.reduce((s, c) => s + c.totalCount, 0)
    }

    data.value.inventoryTasks.unshift(...created)
    return rootId
  }

  function updateInventoryLine(
    id: string,
    actualQuantity: number,
    extra?: { checkMethod?: InventoryCheckMethod; scanCode?: string; photoDataUrl?: string },
  ) {
    const line = data.value.inventoryLineItems.find((l) => l.id === id)
    if (!line) return
    if (line.adjusted) throw new Error('该明细已过账，不可再次修改实盘')
    line.actualQuantity = actualQuantity
    line.status = actualQuantity === line.bookQuantity ? '已盘' : '有差异'
    if (extra?.checkMethod) line.checkMethod = extra.checkMethod
    if (extra?.scanCode) line.scanCode = extra.scanCode
    if (extra?.photoDataUrl) line.photoDataUrl = extra.photoDataUrl

    const task = data.value.inventoryTasks.find((t) => t.id === line.taskId)
    if (!task) return

    const lines = data.value.inventoryLineItems.filter((l) => l.taskId === task.id)
    task.checkedCount = lines.filter((l) => l.status !== '待盘').length
    if (task.checkedCount === 0) task.status = '待盘点'
    else if (task.checkedCount < lines.length) task.status = '盘点中'
    else task.status = '已完成'

    if (task.parentId) recalcParentInventory(task.parentId)
  }

  /** 盘点差异过账：按实盘调整台账数量并生成流水 */
  function postInventoryAdjustment(lineId: string, operator: string) {
    const line = data.value.inventoryLineItems.find((l) => l.id === lineId)
    if (!line) throw new Error('盘点明细不存在')
    if (line.actualQuantity == null) throw new Error('尚未登记实盘数量')
    if (line.status !== '有差异') throw new Error('仅有差异明细可过账')
    if (line.adjusted) throw new Error('该明细已过账')

    const ledger = getLedgerByCode(line.assetCode)
    if (!ledger) throw new Error('台账不存在')

    const diff = line.actualQuantity - line.bookQuantity
    if (diff === 0) {
      line.adjusted = true
      line.adjustedAt = nowStr()
      line.adjustedBy = operator
      return
    }

    if (diff > 0) {
      ledger.quantity += diff
      if (ledger.status !== '报废') ledger.status = '在库'
      data.value.inOutRecords.unshift({
        id: genId('io'),
        category: ledger.category,
        assetCode: ledger.assetCode,
        assetName: ledger.name,
        type: '入库',
        quantity: diff,
        operator,
        orgName: ledger.orgName,
        reason: `盘点盘盈（账面 ${line.bookQuantity} → 实盘 ${line.actualQuantity}）`,
        operateTime: nowStr(),
        fundingSource: '成本',
        physicalId: ledger.physicalId,
      })
    } else {
      const outQty = Math.abs(diff)
      if (ledger.quantity < outQty) {
        throw new Error(`台账库存不足，无法盘亏出库（当前 ${ledger.quantity}）`)
      }
      ledger.quantity -= outQty
      if (ledger.quantity <= 0) {
        ledger.quantity = 0
        if (ledger.status !== '报废') ledger.status = '在用'
      }
      data.value.inOutRecords.unshift({
        id: genId('io'),
        category: ledger.category,
        assetCode: ledger.assetCode,
        assetName: ledger.name,
        type: '出库',
        quantity: outQty,
        operator,
        orgName: ledger.orgName,
        reason: `盘点盘亏（账面 ${line.bookQuantity} → 实盘 ${line.actualQuantity}）`,
        operateTime: nowStr(),
        fundingSource: '成本',
        physicalId: ledger.physicalId,
      })
    }
    applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
    syncLedgerOperationalFlags(ledger)

    line.adjusted = true
    line.adjustedAt = nowStr()
    line.adjustedBy = operator
  }

  /** 对任务下全部有差异且未过账明细批量过账 */
  function postInventoryTaskAdjustments(taskId: string, operator: string) {
    const lines = data.value.inventoryLineItems.filter(
      (l) => l.taskId === taskId && l.status === '有差异' && !l.adjusted,
    )
    if (!lines.length) throw new Error('没有待过账的差异明细')
    for (const line of lines) {
      postInventoryAdjustment(line.id, operator)
    }
    return lines.length
  }

  function recalcParentInventory(parentId: string) {
    const parent = data.value.inventoryTasks.find((t) => t.id === parentId)
    if (!parent) return
    const children = data.value.inventoryTasks.filter((t) => t.parentId === parentId)
    parent.totalCount = children.reduce((s, c) => s + c.totalCount, 0)
    parent.checkedCount = children.reduce((s, c) => s + c.checkedCount, 0)
    if (parent.checkedCount === 0) parent.status = '待盘点'
    else if (children.every((c) => c.status === '已完成')) parent.status = '已完成'
    else if (parent.checkedCount > 0) parent.status = '盘点中'
    if (parent.parentId) recalcParentInventory(parent.parentId)
  }

  function removeInventoryTask(id: string) {
    const collect = (pid: string): string[] => {
      const kids = data.value.inventoryTasks.filter((t) => t.parentId === pid).map((t) => t.id)
      return [pid, ...kids.flatMap(collect)]
    }
    const allIds = collect(id)
    data.value.inventoryTasks = data.value.inventoryTasks.filter((t) => !allIds.includes(t.id))
    data.value.inventoryLineItems = data.value.inventoryLineItems.filter(
      (l) => !allIds.includes(l.taskId),
    )
  }

  // --- Quota ---
  function saveQuotaRule(item: Omit<QuotaRule, 'id'> & { id?: string }) {
    if (item.id) {
      const idx = data.value.quotaRules.findIndex((r) => r.id === item.id)
      if (idx >= 0) data.value.quotaRules[idx] = { ...data.value.quotaRules[idx], ...item, id: item.id }
      return item.id
    }
    const id = genId('qr')
    data.value.quotaRules.unshift({ ...item, id })
    return id
  }

  function removeQuotaRule(id: string) {
    data.value.quotaRules = data.value.quotaRules.filter((r) => r.id !== id)
  }

  function saveOrgDeviceParam(item: Omit<OrgDeviceParam, 'id' | 'updatedAt' | 'orgName' | 'warehouseName'> & { id?: string }) {
    const org = getOrg(item.orgId)
    const wh = item.warehouseId ? getWarehouseSite(item.warehouseId) : undefined
    const payload: OrgDeviceParam = {
      id: item.id || genId('odp'),
      orgId: item.orgId,
      orgName: org?.name ?? '',
      warehouseId: item.warehouseId,
      warehouseName: wh?.name,
      ruleId: item.ruleId,
      deviceCount: item.deviceCount,
      updatedAt: nowStr(),
    }
    if (item.id) {
      const idx = data.value.orgDeviceParams.findIndex((p) => p.id === item.id)
      if (idx >= 0) data.value.orgDeviceParams[idx] = payload
    } else {
      data.value.orgDeviceParams.unshift(payload)
    }
    return payload.id
  }

  function removeOrgDeviceParam(id: string) {
    data.value.orgDeviceParams = data.value.orgDeviceParams.filter((p) => p.id !== id)
  }

  function calculateAllQuotas() {
    const results: QuotaResult[] = []
    for (const param of data.value.orgDeviceParams) {
      const rule = data.value.quotaRules.find((r) => r.id === param.ruleId)
      if (!rule) continue
      const standardQty = calcStandardQty(rule.formulaType, param.deviceCount, rule)
      const matched = data.value.ledgers.filter(
        (l) =>
          l.category === rule.category &&
          l.typeName === rule.typeName &&
          (param.warehouseId ? l.warehouseId === param.warehouseId : l.orgId === param.orgId),
      )
      const actualQty = matched.reduce((s, l) => s + l.quantity, 0)
      const availableQty = matched
        .filter((l) => l.inStock !== false && l.usable !== false && l.status !== '报废')
        .reduce((s, l) => s + l.quantity, 0)
      const shortage = Math.max(0, standardQty - availableQty)
      const overage = Math.max(0, availableQty - standardQty)
      const res: QuotaResult = {
        id: genId('qres'),
        ruleId: rule.id,
        ruleName: rule.name,
        orgId: param.orgId,
        orgName: param.orgName,
        warehouseId: param.warehouseId,
        warehouseName: param.warehouseName,
        category: rule.category,
        typeName: rule.typeName,
        formulaType: rule.formulaType,
        deviceCount: param.deviceCount,
        standardQty,
        actualQty,
        availableQty,
        shortage,
        overage,
        calculatedAt: nowStr(),
      }
      results.push(res)
      if (shortage > 0) {
        pushAlert({
          category: '定额',
          level: '警告',
          title: `${rule.typeName}可用库存低于标准定额`,
          content: `${param.orgName}${param.warehouseName ? '「' + param.warehouseName + '」' : ''}「${rule.typeName}」可用 ${availableQty}，标准定额 ${standardQty}，缺额 ${shortage}，建议补仓。`,
          targetType: 'quota',
          targetId: res.id,
          routePath: '/quota/results',
          orgName: param.orgName,
        })
      }
    }
    data.value.quotaResults = results
    return results
  }

  function addCheckRecord(item: Omit<CheckRecord, 'id'>) {
    if (!data.value.checkRecords) data.value.checkRecords = []
    const ledger = getLedgerByCode(item.assetCode)
    const nextDueDate = resolveNextDueForCheck(
      item,
      ledger?.typeName || '',
      data.value.checkCycleSettings || [],
    )
    const rec: CheckRecord = { ...item, id: genId('chk'), nextDueDate }
    data.value.checkRecords.unshift(rec)
    if (ledger) {
      ledger.lastCheckDate = item.checkDate
      if (item.result === '不合格') {
        applyDueFromCycles(ledger, data.value.checkCycleSettings || [], { forceFail: true })
      } else {
        applyDueFromCycles(ledger, data.value.checkCycleSettings || [])
      }
      syncLedgerOperationalFlags(ledger)
    }
    return rec.id
  }

  function refreshAllCheckDueStatuses() {
    refreshLedgersDueAndFlags(data.value.ledgers, data.value.checkCycleSettings || [])
  }

  function addRetirementRecord(
    item: Omit<RetirementRecord, 'id' | 'createTime' | 'status'> & { status?: RetirementRecord['status'] },
  ) {
    if (!data.value.retirementRecords) data.value.retirementRecords = []
    const rec: RetirementRecord = {
      ...item,
      id: genId('ret'),
      status: item.status ?? '待审批',
      createTime: nowStr(),
    }
    data.value.retirementRecords.unshift(rec)
    return rec.id
  }

  function approveRetirement(id: string) {
    const rec = data.value.retirementRecords.find((r) => r.id === id)
    if (!rec) throw new Error('记录不存在')
    if (rec.status !== '待审批') throw new Error('当前状态不可审批')
    rec.status = '已报废'
    rec.approveTime = nowStr()
    const ledger = getLedgerByCode(rec.assetCode)
    if (ledger) {
      disposeLedger(ledger.id, rec.applicant, rec.reason)
    }
  }

  function saveCheckCycleSetting(
    item: Omit<CheckCycleSetting, 'id'> & { id?: string },
  ) {
    if (!data.value.checkCycleSettings) data.value.checkCycleSettings = []
    if (item.id) {
      const idx = data.value.checkCycleSettings.findIndex((c) => c.id === item.id)
      if (idx >= 0) {
        data.value.checkCycleSettings[idx] = { ...(item as CheckCycleSetting) }
        refreshAllCheckDueStatuses()
        return item.id
      }
    }
    const id = item.id || genId('ccs')
    data.value.checkCycleSettings.unshift({
      id,
      category: item.category,
      typeName: item.typeName,
      cycleDays: item.cycleDays,
      checkKind: item.checkKind,
    })
    refreshAllCheckDueStatuses()
    return id
  }

  function removeCheckCycleSetting(id: string) {
    data.value.checkCycleSettings = (data.value.checkCycleSettings || []).filter((c) => c.id !== id)
    refreshAllCheckDueStatuses()
  }

  const dashboardStats = computed(() => ({
    warehouseCount: data.value.warehouseSites.length,
    spareCount: data.value.ledgers.filter((l) => l.category === 'spare').reduce((s, l) => s + l.quantity, 0),
    instrumentCount: data.value.ledgers.filter((l) => l.category === 'instrument').reduce((s, l) => s + l.quantity, 0),
    toolCount: data.value.ledgers.filter((l) => l.category === 'tool').reduce((s, l) => s + l.quantity, 0),
    pendingFaults: data.value.faultRecords.filter((f) => f.status === '待处理').length,
    ongoingMaintenance: data.value.maintenanceRecords.filter((m) => m.status === '进行中').length,
    inventoryProgress: (() => {
      const roots = data.value.inventoryTasks.filter((t) => !t.parentId)
      if (!roots.length) return 0
      const total = roots.reduce((s, t) => s + t.totalCount, 0)
      const checked = roots.reduce((s, t) => s + t.checkedCount, 0)
      return total ? Math.round((checked / total) * 100) : 0
    })(),
    orgCount: data.value.organizations.length,
    openAlerts: data.value.alerts.filter((a) => a.status === '未处理').length,
    shortageCount: data.value.quotaResults.filter((q) => q.shortage > 0).length,
  }))

  function resetAllData() {
    clearBusinessData()
    data.value = getSeed()
    syncEmergencyMakeupOverdueAlerts()
  }

  syncEmergencyMakeupOverdueAlerts()

  return {
    data,
    organizations,
    roles,
    persons,
    warehouseSites,
    manufacturers,
    deviceTypes,
    ledgers,
    stockBills,
    transferBills,
    inOutRecords,
    faultRecords,
    maintenanceRecords,
    inventoryTasks,
    inventoryLineItems,
    quotaRules,
    orgDeviceParams,
    quotaResults,
    alerts,
    checkRecords,
    retirementRecords,
    checkCycleSettings,
    dashboardStats,
    getOrg,
    getOrgTree,
    getOrgChildrenIds,
    getOrgDescendantIdsFrom,
    getPerson,
    getWarehouseSite,
    genWarehouseCode,
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
    addWarehouseSite,
    updateWarehouseSite,
    removeWarehouseSite,
    addManufacturer,
    updateManufacturer,
    removeManufacturer,
    addDeviceType,
    updateDeviceType,
    removeDeviceType,
    addLedger,
    updateLedger,
    removeLedger,
    disposeLedger,
    createStockBill,
    submitStockBill,
    updateStockBill,
    resubmitStockBill,
    withdrawStockBill,
    approveStockBill,
    rejectStockBill,
    confirmStockBill,
    issueEmergencyOutbound,
    submitEmergencyMakeup,
    approveEmergencyMakeup,
    rejectEmergencyMakeup,
    syncEmergencyMakeupOverdueAlerts,
    returnOutboundRecord,
    removeStockBill,
    createTransferBill,
    approveTransferBill,
    rejectTransferBill,
    confirmTransferBill,
    addInOutRecord,
    removeInOutRecord,
    pushAlert,
    handleAlert,
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
    postInventoryAdjustment,
    postInventoryTaskAdjustments,
    removeInventoryTask,
    saveQuotaRule,
    removeQuotaRule,
    saveOrgDeviceParam,
    removeOrgDeviceParam,
    calculateAllQuotas,
    addCheckRecord,
    refreshAllCheckDueStatuses,
    addRetirementRecord,
    approveRetirement,
    saveCheckCycleSetting,
    removeCheckCycleSetting,
    resetAllData,
  }
})
