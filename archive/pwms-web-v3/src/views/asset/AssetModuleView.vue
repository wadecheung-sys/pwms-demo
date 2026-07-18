<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/FilterBar.vue'
import PageToolbar from '@/components/PageToolbar.vue'
import InventoryDrilldownDrawer from '@/components/InventoryDrilldownDrawer.vue'
import AssetDetailDrawer from '@/components/AssetDetailDrawer.vue'
import type { AssetCategory, AssetLedger, FaultRecord, InventoryTask, SubModule } from '@/types'
import { categoryLabels, subModuleLabels } from '@/types'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { usePagination } from '@/composables/usePagination'
import { useDataScope } from '@/composables/useDataScope'
import { getExportColumns, getExportFilename } from '@/views/asset/assetExportColumns'
import {
  applyAssetFilter,
  buildFilterFields,
  getFilterDefaults,
} from '@/views/asset/assetFilters'
import { todayStr } from '@/utils/id'
import { isInventoryCenterOrg, getOrgDescendantIds } from '@/utils/org'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const userStore = useUserStore()
const appStore = useAppStore()
const {
  scopeLedgersByCategories,
  scopeByAssets,
  scopeByOrg,
  scopeWarehouses,
  visibleOrganizations,
  can,
  canEditLedger,
} = useDataScope()

const dialogVisible = ref(false)
const dispatchVisible = ref(false)
const convertVisible = ref(false)
const drilldownVisible = ref(false)
const detailVisible = ref(false)
const drilldownTask = ref<InventoryTask | null>(null)
const detailAssetCode = ref<string | null>(null)
const convertingFaultId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const dispatchFormRef = ref<FormInstance>()
const convertFormRef = ref<FormInstance>()

const category = computed(() => route.meta.category as AssetCategory | undefined)
const aggregateAssets = computed(() => route.meta.aggregateAssets === true)
const subModule = computed(() => route.meta.subModule as SubModule)
const pageTitle = computed(() => {
  if (aggregateAssets.value) {
    return `生产仓管理 · ${subModuleLabels[subModule.value]}`
  }
  return `${categoryLabels[category.value!]} · ${subModuleLabels[subModule.value]}`
})

const assetCategories = computed((): AssetCategory[] => {
  if (aggregateAssets.value) return ['spare', 'instrument', 'tool']
  return category.value ? [category.value] : []
})

const draft = ref<Record<string, unknown>>({})
const applied = ref<Record<string, unknown>>({})
const resultCount = ref(0)

function initFilters() {
  const defaults = getFilterDefaults(subModule.value)
  draft.value = { ...defaults }
  applied.value = { ...defaults }
  if (subModule.value === 'ledger' && route.query.warehouseId) {
    draft.value.warehouseId = route.query.warehouseId as string
    applied.value.warehouseId = route.query.warehouseId as string
  }
}

watch([category, subModule], initFilters, { immediate: true })
watch(() => route.query.warehouseId, initFilters)

function search() {
  applied.value = { ...draft.value }
}

function resetFilters() {
  initFilters()
}

const categoryData = computed(() => {
  const cats = assetCategories.value
  const scopedLedgers = scopeLedgersByCategories(dataStore.ledgers, cats)
  switch (subModule.value) {
    case 'ledger':
      return scopedLedgers
    case 'inout':
      return scopeByAssets(
        dataStore.inOutRecords.filter((i) => cats.includes(i.category)),
        scopedLedgers,
      )
    case 'fault':
      return scopeByAssets(
        dataStore.faultRecords.filter((i) => cats.includes(i.category)),
        scopedLedgers,
      )
    case 'maintenance':
      return scopeByAssets(
        dataStore.maintenanceRecords.filter((i) => cats.includes(i.category)),
        scopedLedgers,
      )
    case 'inventory':
      return scopeByOrg(dataStore.inventoryTasks.filter((i) => cats.includes(i.category)))
    default:
      return []
  }
})

const canEditCurrent = computed(() => {
  switch (subModule.value) {
    case 'ledger':
      return canEditLedger()
    case 'inout':
      return can('inout:edit')
    case 'fault':
      return can('fault:edit')
    case 'maintenance':
      return can('maintenance:edit')
    case 'inventory':
      return can('inventory:execute')
    default:
      return false
  }
})

const canDispatchInventory = computed(() => can('inventory:dispatch'))

const filterFields = computed(() =>
  buildFilterFields(
    subModule.value,
    categoryData.value,
    visibleOrganizations.value,
    scopeWarehouses(dataStore.warehouseSites),
  ),
)

const tableData = computed(() => {
  const result = categoryData.value.filter((item) =>
    applyAssetFilter(subModule.value, item, applied.value),
  )
  resultCount.value = result.length
  return result
})

const { currentPage, pageSize, total: pageTotal, pageData } = usePagination(tableData, 10)

const exportColumns = computed(() => getExportColumns(subModule.value))
const exportFilename = computed(() => {
  const catLabel = aggregateAssets.value ? '生产仓管理' : categoryLabels[category.value!]
  return getExportFilename(catLabel, subModuleLabels[subModule.value])
})
const exportTitle = computed(() => pageTitle.value)
const exportData = computed(() => tableData.value as Record<string, unknown>[])

const categoryLedgers = computed(() => {
  if (aggregateAssets.value) {
    return scopeLedgersByCategories(dataStore.ledgers, ['spare', 'instrument', 'tool']).filter((l) => l.warehouseId)
  }
  return scopeLedgersByCategories(dataStore.ledgers, category.value ? [category.value] : [])
})
const categoryDeviceTypes = computed(() => dataStore.deviceTypesByCategory(category.value!))

const warehouseOptions = computed(() => {
  let sites = scopeWarehouses(dataStore.warehouseSites)
  if (ledgerForm.orgId) {
    const orgIds = getOrgDescendantIds(dataStore.organizations, ledgerForm.orgId, true)
    sites = sites.filter((w) => orgIds.includes(w.orgId))
  }
  return sites
})
const centerOrgs = computed(() =>
  visibleOrganizations.value.filter((o) => isInventoryCenterOrg(o)),
)

const dialogTitle = computed(() => {
  const action = editingId.value ? '编辑' : '新增'
  return action + subModuleLabels[subModule.value]
})

// --- 表单 ---
const ledgerForm = reactive({
  name: '',
  typeId: '',
  orgId: '',
  warehouseId: '',
  manufacturer: '',
  model: '',
  quantity: 1,
  status: '在库' as AssetLedger['status'],
  purchaseDate: '',
  warrantyDate: '',
})

const inOutForm = reactive({
  assetCode: '',
  type: '入库' as '入库' | '出库',
  quantity: 1,
  operator: '',
  reason: '',
})

const faultForm = reactive({
  assetCode: '',
  faultDesc: '',
  faultLevel: '一般' as '一般' | '严重' | '紧急',
  reporter: '',
  status: '待处理' as '待处理' | '处理中' | '已关闭',
})

const maintenanceForm = reactive({
  assetCode: '',
  projectName: '',
  fundingSource: '',
  amount: 0,
  vendor: '',
  startDate: '',
  endDate: '',
  operator: '',
  status: '进行中' as '进行中' | '已完成',
})

const dispatchForm = reactive({
  taskName: '',
  centerOrgId: '',
  assignee: '',
  deadline: '',
})

const ledgerRules: FormRules = {
  name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
  typeId: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  orgId: [{ required: true, message: '请选择组织机构', trigger: 'change' }],
  warehouseId: [{ required: true, message: '请选择生产仓地点', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
}

const inOutRules: FormRules = {
  assetCode: [{ required: true, message: '请选择资产', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入数量', trigger: 'blur' }],
  operator: [{ required: true, message: '请输入操作人', trigger: 'blur' }],
  reason: [{ required: true, message: '请输入事由', trigger: 'blur' }],
}

const faultRules: FormRules = {
  assetCode: [{ required: true, message: '请选择资产', trigger: 'change' }],
  faultDesc: [{ required: true, message: '请输入故障描述', trigger: 'blur' }],
  reporter: [{ required: true, message: '请输入上报人', trigger: 'blur' }],
}

const maintenanceRules: FormRules = {
  assetCode: [{ required: true, message: '请选择资产', trigger: 'change' }],
  projectName: [{ required: true, message: '请输入维修项目', trigger: 'blur' }],
  fundingSource: [{ required: true, message: '请输入资金来源', trigger: 'blur' }],
  vendor: [{ required: true, message: '请输入维修厂家', trigger: 'blur' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
}

const dispatchRules: FormRules = {
  taskName: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  centerOrgId: [{ required: true, message: '请选择生产中心', trigger: 'change' }],
  assignee: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
  deadline: [{ required: true, message: '请选择截止日期', trigger: 'change' }],
}

function resetForms() {
  Object.assign(ledgerForm, {
    name: '', typeId: '', orgId: '', warehouseId: '', manufacturer: '', model: '',
    quantity: 1, status: '在库', purchaseDate: todayStr(), warrantyDate: '',
  })
  Object.assign(inOutForm, {
    assetCode: '', type: '入库', quantity: 1,
    operator: userStore.displayName || '管理员', reason: '',
  })
  Object.assign(faultForm, {
    assetCode: '', faultDesc: '', faultLevel: '一般',
    reporter: userStore.displayName || '管理员', status: '待处理',
  })
  Object.assign(maintenanceForm, {
    assetCode: '', projectName: '', fundingSource: '', amount: 0, vendor: '',
    startDate: todayStr(), endDate: '', operator: userStore.displayName || '管理员', status: '进行中',
  })
}

function openDialog(row?: AssetLedger) {
  editingId.value = row?.id ?? null
  resetForms()
  if (row && subModule.value === 'ledger') {
    Object.assign(ledgerForm, {
      name: row.name, typeId: row.typeId, orgId: row.orgId, warehouseId: row.warehouseId,
      manufacturer: row.manufacturer, model: row.model, quantity: row.quantity, status: row.status,
      purchaseDate: row.purchaseDate, warrantyDate: row.warrantyDate,
    })
  }
  dialogVisible.value = true
}

function openEditFault(row: (typeof dataStore.faultRecords)[0]) {
  editingId.value = row.id
  Object.assign(faultForm, {
    assetCode: row.assetCode, faultDesc: row.faultDesc, faultLevel: row.faultLevel,
    reporter: row.reporter, status: row.status,
  })
  dialogVisible.value = true
}

function openEditMaintenance(row: (typeof dataStore.maintenanceRecords)[0]) {
  editingId.value = row.id
  Object.assign(maintenanceForm, {
    assetCode: row.assetCode, projectName: row.projectName, fundingSource: row.fundingSource,
    amount: row.amount, vendor: row.vendor, startDate: row.startDate, endDate: row.endDate,
    operator: row.operator, status: row.status,
  })
  dialogVisible.value = true
}

function openDispatch() {
  Object.assign(dispatchForm, {
    taskName: `2025年Q3${aggregateAssets.value ? '生产仓' : categoryLabels[category.value!]}盘点`,
    centerOrgId: centerOrgs.value[0]?.id ?? '',
    assignee: userStore.displayName || '管理员',
    deadline: '',
  })
  dispatchVisible.value = true
}

async function handleSave() {
  await appStore.withLoading(async () => {
  const refMap: Partial<Record<SubModule, FormInstance | undefined>> = {
    ledger: formRef.value,
    inout: formRef.value,
    fault: formRef.value,
    maintenance: formRef.value,
  }
  const fr = refMap[subModule.value]
  if (fr) {
    const valid = await fr.validate().catch(() => false)
    if (!valid) return
  }

  try {
    switch (subModule.value) {
      case 'ledger':
        if (editingId.value) {
          dataStore.updateLedger(editingId.value, { ...ledgerForm })
          ElMessage.success('台账已更新')
        } else {
          dataStore.addLedger({ category: category.value!, ...ledgerForm })
          ElMessage.success('台账已新增')
        }
        break
      case 'inout': {
        const ioLedger = dataStore.getLedgerByCode(inOutForm.assetCode)
        if (!ioLedger) throw new Error('资产编码不存在')
        dataStore.addInOutRecord({ category: ioLedger.category, ...inOutForm })
        ElMessage.success('出入库记录已保存，台账数量已同步')
        break
      }
      case 'fault':
        if (editingId.value) {
          dataStore.updateFaultRecord(editingId.value, { ...faultForm })
          ElMessage.success('故障记录已更新')
        } else {
          const faultLedger = dataStore.getLedgerByCode(faultForm.assetCode)
          if (!faultLedger) throw new Error('资产编码不存在')
          dataStore.addFaultRecord({ category: faultLedger.category, ...faultForm })
          ElMessage.success('故障记录已新增')
        }
        break
      case 'maintenance':
        if (editingId.value) {
          dataStore.updateMaintenanceRecord(editingId.value, { ...maintenanceForm })
          ElMessage.success('维修记录已更新')
        } else {
          const mrLedger = dataStore.getLedgerByCode(maintenanceForm.assetCode)
          if (!mrLedger) throw new Error('资产编码不存在')
          dataStore.addMaintenanceRecord({ category: mrLedger.category, ...maintenanceForm })
          ElMessage.success('维修记录已新增')
        }
        break
    }
    dialogVisible.value = false
    editingId.value = null
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
  })
}

async function handleDispatch() {
  await appStore.withLoading(async () => {
  const valid = await dispatchFormRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    dataStore.dispatchInventoryTask({ category: category.value!, ...dispatchForm })
    ElMessage.success('盘点任务已下发至各生产仓，可点击「下钻明细」查看')
    dispatchVisible.value = false
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '下发失败')
  }
  })
}

async function handleDelete(label: string, fn: () => void) {
  await ElMessageBox.confirm(`确定删除该${label}吗？`, '提示', { type: 'warning' })
  try {
    fn()
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}

function openDrilldown(row: InventoryTask) {
  drilldownTask.value = row
  drilldownVisible.value = true
}

function openAssetDetail(assetCode: string) {
  detailAssetCode.value = assetCode
  detailVisible.value = true
}

function openConvertToMaintenance(row: FaultRecord) {
  convertingFaultId.value = row.id
  Object.assign(maintenanceForm, {
    assetCode: row.assetCode,
    projectName: `故障维修：${row.faultDesc.slice(0, 20)}`,
    fundingSource: '年度维修预算',
    amount: 0,
    vendor: '',
    startDate: todayStr(),
    endDate: '',
    operator: userStore.displayName || '管理员',
    status: '进行中',
  })
  convertVisible.value = true
}

async function handleConvert() {
  await appStore.withLoading(async () => {
  const valid = await convertFormRef.value?.validate().catch(() => false)
  if (!valid || !convertingFaultId.value) return
  try {
    const { assetCode: _a, ...rest } = maintenanceForm
    dataStore.convertFaultToMaintenance(convertingFaultId.value, rest)
    ElMessage.success('已转维修单，故障状态更新为「处理中」，台账状态更新为「维修中」')
    convertVisible.value = false
    convertingFaultId.value = null
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '转维修失败')
  }
  })
}

function inventoryPercent(checked: number, total: number) {
  return total ? Math.round((checked / total) * 100) : 0
}

function levelLabel(level: InventoryTask['level']) {
  return level === 'center' || level === 'province' || level === 'city' ? '汇总' : '执行'
}

function filterByWarehouse(warehouseId: string) {
  if (subModule.value !== 'ledger') return
  draft.value.warehouseId = warehouseId
  applied.value.warehouseId = warehouseId
  router.replace({ query: { ...route.query, warehouseId } })
}

watch(
  () => ledgerForm.orgId,
  () => {
    if (ledgerForm.warehouseId && !warehouseOptions.value.some((w) => w.id === ledgerForm.warehouseId)) {
      ledgerForm.warehouseId = warehouseOptions.value[0]?.id ?? ''
    }
  },
)

function onDialogOpen() {
  if (!editingId.value) resetForms()
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="panel-actions">
        <PageToolbar
          :title="exportTitle"
          :filename="exportFilename"
          :columns="exportColumns"
          :data="exportData"
        />
        <div class="panel-actions__right">
          <el-button
            v-if="subModule === 'inventory' && !aggregateAssets && canDispatchInventory"
            type="warning"
            @click="openDispatch"
          >
            <el-icon><Promotion /></el-icon> 下发盘点任务
          </el-button>
          <el-button
            v-if="subModule !== 'inout' && canEditCurrent"
            type="primary"
            @click="openDialog()"
          >
            <el-icon><Plus /></el-icon>
            {{ subModule === 'ledger' ? '新增台账' : '新增记录' }}
          </el-button>
          <el-button v-else-if="subModule === 'inout' && canEditCurrent" type="primary" @click="openDialog()">
            <el-icon><Plus /></el-icon> 登记出入库
          </el-button>
        </div>
      </div>

      <FilterBar
        :fields="filterFields"
        :model-value="draft"
        :result-count="resultCount"
        @update:model-value="Object.assign(draft, $event)"
        @search="search"
        @reset="resetFilters"
      />

      <el-table v-if="subModule === 'ledger'" :data="pageData" stripe border>
        <el-table-column prop="assetCode" label="资产编码" width="130">
          <template #default="{ row }">
            <el-button link type="primary" @click="openAssetDetail(row.assetCode)">{{ row.assetCode }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="设备名称" min-width="120" />
        <el-table-column prop="typeName" label="设备类型" width="100" />
        <el-table-column prop="orgName" label="所属组织" width="120" />
        <el-table-column prop="warehouseName" label="生产仓地点" min-width="140">
          <template #default="{ row }">
            <el-button link type="primary" @click="filterByWarehouse(row.warehouseId)">{{ row.warehouseName }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag
              :type="row.status === '在库' ? 'success' : row.status === '在用' ? '' : row.status === '维修中' ? 'warning' : 'info'"
              size="small"
            >{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAssetDetail(row.assetCode)">详情</el-button>
            <template v-if="canEditCurrent">
              <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete('台账', () => dataStore.removeLedger(row.id))">删除</el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无台账数据" /></template>
      </el-table>

      <el-table v-else-if="subModule === 'inout'" :data="pageData" stripe border>
        <el-table-column prop="assetCode" label="资产编码" width="130" />
        <el-table-column prop="assetName" label="设备名称" min-width="120" />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === '入库' ? 'success' : 'warning'" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" align="center" />
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="orgName" label="组织机构" width="120" />
        <el-table-column prop="reason" label="事由" min-width="140" />
        <el-table-column prop="operateTime" label="操作时间" width="170" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAssetDetail(row.assetCode)">详情</el-button>
            <el-button
              v-if="canEditCurrent"
              link
              type="danger"
              size="small"
              @click="handleDelete('记录', () => dataStore.removeInOutRecord(row.id))"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无出入库记录" /></template>
      </el-table>

      <el-table v-else-if="subModule === 'fault'" :data="pageData" stripe border>
        <el-table-column prop="assetCode" label="资产编码" width="130" />
        <el-table-column prop="assetName" label="设备名称" width="120" />
        <el-table-column prop="faultDesc" label="故障描述" min-width="180" />
        <el-table-column prop="faultLevel" label="等级" width="80">
          <template #default="{ row }">
            <el-tag :type="row.faultLevel === '紧急' ? 'danger' : row.faultLevel === '严重' ? 'warning' : 'info'" size="small">{{ row.faultLevel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column prop="reportTime" label="上报时间" width="170" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAssetDetail(row.assetCode)">详情</el-button>
            <el-button
              v-if="canEditCurrent && row.status !== '已关闭' && !row.maintenanceId"
              link
              type="warning"
              size="small"
              @click="openConvertToMaintenance(row)"
            >
              转维修
            </el-button>
            <template v-if="canEditCurrent">
              <el-button link type="primary" size="small" @click="openEditFault(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete('记录', () => dataStore.removeFaultRecord(row.id))">删除</el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无故障记录" /></template>
      </el-table>

      <el-table v-else-if="subModule === 'maintenance'" :data="pageData" stripe border>
        <el-table-column prop="projectName" label="维修项目" min-width="140" />
        <el-table-column prop="assetName" label="关联设备" width="120" />
        <el-table-column label="来源" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.faultId" size="small" type="warning">故障转入</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="fundingSource" label="资金来源" width="130" />
        <el-table-column prop="amount" label="金额(元)" width="100">
          <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="vendor" label="维修厂家" min-width="140" />
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openAssetDetail(row.assetCode)">详情</el-button>
            <template v-if="canEditCurrent">
              <el-button link type="primary" size="small" @click="openEditMaintenance(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete('记录', () => dataStore.removeMaintenanceRecord(row.id))">删除</el-button>
            </template>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无维修记录" /></template>
      </el-table>

      <el-table v-else :data="pageData" stripe border>
        <el-table-column prop="taskName" label="盘点任务" min-width="180" />
        <el-table-column prop="orgName" label="组织机构" width="120" />
        <el-table-column label="层级" width="100">
          <template #default="{ row }">
            <el-tag :type="row.level === 'center' ? '' : 'success'" size="small">{{ levelLabel(row.level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="应盘/已盘" width="110" align="center">
          <template #default="{ row }">{{ row.totalCount }} / {{ row.checkedCount }}</template>
        </el-table-column>
        <el-table-column label="完成率" width="150">
          <template #default="{ row }">
            <el-progress :percentage="inventoryPercent(row.checkedCount, row.totalCount)" :stroke-width="10" />
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDrilldown(row)">下钻明细</el-button>
            <el-button
              v-if="canEditCurrent"
              link
              type="danger"
              size="small"
              @click="handleDelete('任务', () => dataStore.removeInventoryTask(row.id))"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无盘点任务" /></template>
      </el-table>

      <div v-if="pageTotal > 0" class="table-pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pageTotal"
          layout="total, sizes, prev, pager, next"
          background
        />
      </div>
    </div>

    <InventoryDrilldownDrawer v-model:visible="drilldownVisible" :task="drilldownTask" />
    <AssetDetailDrawer v-model:visible="detailVisible" :asset-code="detailAssetCode" />

    <!-- 台账/出入库/故障/维修 表单 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close @open="onDialogOpen">
      <el-form v-if="subModule === 'ledger'" ref="formRef" :model="ledgerForm" :rules="ledgerRules" label-width="100px">
        <el-form-item label="设备名称" prop="name"><el-input v-model="ledgerForm.name" /></el-form-item>
        <el-form-item label="设备类型" prop="typeId">
          <el-select v-model="ledgerForm.typeId" style="width: 100%">
            <el-option v-for="dt in categoryDeviceTypes" :key="dt.id" :label="dt.name" :value="dt.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="组织机构" prop="orgId">
          <el-select v-model="ledgerForm.orgId" style="width: 100%">
            <el-option v-for="org in visibleOrganizations" :key="org.id" :label="org.name" :value="org.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="生产仓地点" prop="warehouseId">
          <el-select v-model="ledgerForm.warehouseId" placeholder="请选择已登记的生产仓" style="width: 100%" filterable>
            <el-option
              v-for="w in warehouseOptions"
              :key="w.id"
              :label="`${w.name}（${w.location}）`"
              :value="w.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生产厂家"><el-input v-model="ledgerForm.manufacturer" /></el-form-item>
        <el-form-item label="规格型号"><el-input v-model="ledgerForm.model" /></el-form-item>
        <el-form-item label="数量" prop="quantity"><el-input-number v-model="ledgerForm.quantity" :min="1" style="width: 100%" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="ledgerForm.status" style="width: 100%">
            <el-option label="在库" value="在库" /><el-option label="在用" value="在用" />
            <el-option label="维修中" value="维修中" /><el-option label="报废" value="报废" />
          </el-select>
        </el-form-item>
        <el-form-item label="购入日期"><el-date-picker v-model="ledgerForm.purchaseDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="保修截止"><el-date-picker v-model="ledgerForm.warrantyDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
      </el-form>

      <el-form v-else-if="subModule === 'inout'" ref="formRef" :model="inOutForm" :rules="inOutRules" label-width="100px">
        <el-form-item label="关联资产" prop="assetCode">
          <el-select v-model="inOutForm.assetCode" filterable style="width: 100%">
            <el-option v-for="l in categoryLedgers" :key="l.assetCode" :label="`${l.assetCode} - ${l.name}（库存${l.quantity}）`" :value="l.assetCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="inOutForm.type"><el-radio value="入库">入库</el-radio><el-radio value="出库">出库</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="数量" prop="quantity"><el-input-number v-model="inOutForm.quantity" :min="1" style="width: 100%" /></el-form-item>
        <el-form-item label="操作人" prop="operator"><el-input v-model="inOutForm.operator" /></el-form-item>
        <el-form-item label="事由" prop="reason"><el-input v-model="inOutForm.reason" type="textarea" :rows="2" /></el-form-item>
      </el-form>

      <el-form v-else-if="subModule === 'fault'" ref="formRef" :model="faultForm" :rules="faultRules" label-width="100px">
        <el-form-item label="关联资产" prop="assetCode">
          <el-select v-model="faultForm.assetCode" filterable style="width: 100%" :disabled="!!editingId">
            <el-option v-for="l in categoryLedgers" :key="l.assetCode" :label="`${l.assetCode} - ${l.name}`" :value="l.assetCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="故障描述" prop="faultDesc"><el-input v-model="faultForm.faultDesc" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="故障等级">
          <el-select v-model="faultForm.faultLevel" style="width: 100%">
            <el-option label="一般" value="一般" /><el-option label="严重" value="严重" /><el-option label="紧急" value="紧急" />
          </el-select>
        </el-form-item>
        <el-form-item label="上报人" prop="reporter"><el-input v-model="faultForm.reporter" /></el-form-item>
        <el-form-item label="处理状态">
          <el-select v-model="faultForm.status" style="width: 100%">
            <el-option label="待处理" value="待处理" /><el-option label="处理中" value="处理中" /><el-option label="已关闭" value="已关闭" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-form v-else-if="subModule === 'maintenance'" ref="formRef" :model="maintenanceForm" :rules="maintenanceRules" label-width="100px">
        <el-form-item label="关联资产" prop="assetCode">
          <el-select v-model="maintenanceForm.assetCode" filterable style="width: 100%" :disabled="!!editingId">
            <el-option v-for="l in categoryLedgers" :key="l.assetCode" :label="`${l.assetCode} - ${l.name}`" :value="l.assetCode" />
          </el-select>
        </el-form-item>
        <el-form-item label="维修项目" prop="projectName"><el-input v-model="maintenanceForm.projectName" /></el-form-item>
        <el-form-item label="资金来源" prop="fundingSource"><el-input v-model="maintenanceForm.fundingSource" placeholder="如：年度维修预算" /></el-form-item>
        <el-form-item label="金额(元)" prop="amount"><el-input-number v-model="maintenanceForm.amount" :min="0" :precision="2" style="width: 100%" /></el-form-item>
        <el-form-item label="维修厂家" prop="vendor"><el-input v-model="maintenanceForm.vendor" /></el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="maintenanceForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="结束日期"><el-date-picker v-model="maintenanceForm.endDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="经办人"><el-input v-model="maintenanceForm.operator" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="maintenanceForm.status" style="width: 100%">
            <el-option label="进行中" value="进行中" /><el-option label="已完成" value="已完成" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 盘点下发 -->
    <el-dialog v-model="dispatchVisible" title="下发盘点任务" width="520px" destroy-on-close>
      <el-form ref="dispatchFormRef" :model="dispatchForm" :rules="dispatchRules" label-width="100px">
        <el-form-item label="任务名称" prop="taskName"><el-input v-model="dispatchForm.taskName" /></el-form-item>
        <el-form-item label="生产中心" prop="centerOrgId">
          <el-select v-model="dispatchForm.centerOrgId" style="width: 100%">
            <el-option v-for="org in centerOrgs" :key="org.id" :label="org.name" :value="org.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人" prop="assignee"><el-input v-model="dispatchForm.assignee" /></el-form-item>
        <el-form-item label="截止日期" prop="deadline">
          <el-date-picker v-model="dispatchForm.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-alert type="info" :closable="false" show-icon title="将按组织树自动拆分至各生产仓，并生成资产盘点明细" />
      </el-form>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDispatch">确认下发</el-button>
      </template>
    </el-dialog>

    <!-- 故障转维修 -->
    <el-dialog v-model="convertVisible" title="故障转维修" width="560px" destroy-on-close>
      <el-alert type="info" :closable="false" show-icon class="convert-tip" title="将自动创建维修单、关联故障记录，并将台账状态置为「维修中」" />
      <el-form ref="convertFormRef" :model="maintenanceForm" :rules="maintenanceRules" label-width="100px" style="margin-top: 16px">
        <el-form-item label="维修项目" prop="projectName"><el-input v-model="maintenanceForm.projectName" /></el-form-item>
        <el-form-item label="资金来源" prop="fundingSource"><el-input v-model="maintenanceForm.fundingSource" /></el-form-item>
        <el-form-item label="金额(元)" prop="amount"><el-input-number v-model="maintenanceForm.amount" :min="0" :precision="2" style="width: 100%" /></el-form-item>
        <el-form-item label="维修厂家" prop="vendor"><el-input v-model="maintenanceForm.vendor" /></el-form-item>
        <el-form-item label="开始日期"><el-date-picker v-model="maintenanceForm.startDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
        <el-form-item label="经办人"><el-input v-model="maintenanceForm.operator" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="convertVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConvert">确认转维修</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.convert-tip {
  margin-bottom: 0;
}
</style>
