<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { usePagination } from '@/composables/usePagination'
import { hasPermission } from '@/utils/pwms/permission'
import type { AssetCategory, AssetLedger } from '@/types'
import { specialtyOptions, warehouseAssetNatureOptions, increaseModeOptions } from '@/types'
import { calcWarehouseAgeDays } from '@/utils/pwms/ledgerFlags'
import {
  buildLedgerFilterFields,
  ledgerFilterDefaults,
  matchLedger,
  type LedgerFilters,
} from '@/views/Pwms/asset/assetFilters'
import AssetDetailDrawer from '@/components/Pwms/AssetDetailDrawer.vue'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByOrg, scopeWarehouses, visibleOrganizations } = useDataScope()

const category = computed(() => (route.meta.category as AssetCategory) || 'spare')
const canEdit = computed(() => hasPermission(userStore.context, 'ledger:edit'))

const draft = ref<LedgerFilters>({ ...ledgerFilterDefaults })
const applied = ref<LedgerFilters>({ ...ledgerFilterDefaults })

function syncFiltersFromRoute() {
  const next = { ...ledgerFilterDefaults }
  const q = route.query
  if (q.warehouseId) next.warehouseId = String(q.warehouseId)
  if (q.orgId) next.orgId = String(q.orgId)
  if (q.status) next.status = String(q.status)
  if (q.inStock) next.inStock = String(q.inStock)
  if (q.usable) next.usable = String(q.usable)
  if (q.qualifyStatus) next.qualifyStatus = String(q.qualifyStatus)
  if (q.typeName) next.typeName = String(q.typeName)
  if (q.specialty) next.specialty = String(q.specialty)
  if (q.keyword) next.keyword = String(q.keyword)
  draft.value = { ...next }
  applied.value = { ...next }
}

watch(() => route.path, syncFiltersFromRoute, { immediate: true })

/** 同页再次穿透：整表按 query 重置，避免残留关键字/类型等本地条件 */
watch(
  () =>
    [
      String(route.query.warehouseId || ''),
      String(route.query.orgId || ''),
      String(route.query.status || ''),
      String(route.query.inStock || ''),
      String(route.query.typeName || ''),
    ] as const,
  (_next, prev) => {
    if (!prev) return
    syncFiltersFromRoute()
  },
)

function search() {
  applied.value = { ...draft.value }
}

function resetFilters() {
  draft.value = { ...ledgerFilterDefaults }
  applied.value = { ...ledgerFilterDefaults }
  const q = route.query
  if (q.warehouseId || q.orgId || q.status || q.inStock || q.typeName) {
    router.replace({ path: route.path, query: {} })
  }
}

const baseLedgers = computed(() =>
  scopeByOrg(dataStore.ledgers.filter((l) => l.category === category.value)),
)

const filterFields = computed(() =>
  buildLedgerFilterFields(
    baseLedgers.value,
    visibleOrganizations.value,
    scopeWarehouses(dataStore.warehouseSites),
  ),
)

const orgIdSet = computed(() => {
  if (!applied.value.orgId) return null
  return new Set(dataStore.getOrgDescendantIdsFrom(applied.value.orgId, true))
})

const rows = computed(() =>
  baseLedgers.value.filter((l) => matchLedger(l, applied.value, { orgIdSet: orgIdSet.value })),
)
const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)
const resultCount = computed(() => rows.value.length)

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const detailCode = ref<string | null>(null)

const form = reactive({
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
  physicalId: '',
  assetNo: '',
  specialty: '变电' as AssetLedger['specialty'],
  keeperName: '',
  assetNature: '省公司自有' as AssetLedger['assetNature'],
  deviceStatus: '备用' as AssetLedger['deviceStatus'],
  originalValue: 0,
  voltageLevel: '',
  storageArea: '',
  shelfNo: '',
  binNo: '',
  lastCheckDate: '',
  spareSource: '',
  increaseMode: '购置' as NonNullable<AssetLedger['increaseMode']>,
  remark: '',
})

const typeOptions = computed(() => dataStore.deviceTypesByCategory(category.value))
const orgOptions = computed(() => dataStore.organizations)
const warehouseOptions = computed(() =>
  dataStore.warehouseSites.filter((w) => !form.orgId || w.orgId === form.orgId || true),
)

const summary = computed(() => {
  const list = rows.value
  const inStock = list.filter((l) => l.inStock !== false && l.status === '在库').length
  const overdue = list.filter(
    (l) => l.checkDueStatus === '超期' || l.trialDueStatus === '超期',
  ).length
  const usable = list.filter((l) => l.usable !== false && l.inStock !== false && l.status === '在库').length
  const qty = list.reduce((s, l) => s + l.quantity, 0)
  return { total: list.length, inStock, overdue, usable, qty }
})

function ageDays(row: AssetLedger) {
  return calcWarehouseAgeDays(row.inboundTime) ?? row.warehouseAgeDays
}

function resetForm() {
  Object.assign(form, {
    name: '',
    typeId: typeOptions.value[0]?.id ?? '',
    orgId: userStore.context.orgId,
    warehouseId: '',
    manufacturer: '',
    model: '',
    quantity: 1,
    status: '在库',
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyDate: '',
    physicalId: '',
    assetNo: '',
    specialty: '变电',
    keeperName: userStore.displayName,
    assetNature: '省公司自有',
    deviceStatus: '备用',
    originalValue: 0,
    voltageLevel: '',
    storageArea: 'A区',
    shelfNo: '01',
    binNo: '',
    lastCheckDate: '',
    spareSource: '流动资金购置',
    increaseMode: '购置',
    remark: '',
  })
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: AssetLedger) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    typeId: row.typeId,
    orgId: row.orgId,
    warehouseId: row.warehouseId,
    manufacturer: row.manufacturer,
    model: row.model,
    quantity: row.quantity,
    status: row.status,
    purchaseDate: row.purchaseDate,
    warrantyDate: row.warrantyDate,
    physicalId: row.physicalId ?? '',
    assetNo: row.assetNo ?? '',
    specialty: row.specialty ?? '综合',
    keeperName: row.keeperName ?? '',
    assetNature: row.assetNature ?? '省公司自有',
    deviceStatus: row.deviceStatus ?? '备用',
    originalValue: row.originalValue ?? 0,
    voltageLevel: row.voltageLevel ?? '',
    storageArea: row.storageArea ?? '',
    shelfNo: row.shelfNo ?? '',
    binNo: row.binNo ?? '',
    lastCheckDate: row.lastCheckDate ?? '',
    spareSource: row.spareSource ?? '',
    increaseMode: row.increaseMode ?? '购置',
    remark: row.remark ?? '',
  })
  dialogVisible.value = true
}

function save() {
  try {
    if (!form.warehouseId) throw new Error('请选择生产仓地点')
    if (editingId.value) {
      dataStore.updateLedger(editingId.value, { ...form, category: category.value })
      ElMessage.success('已更新')
    } else {
      dataStore.addLedger({ ...form, category: category.value })
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doRemove(row: AssetLedger) {
  try {
    await ElMessageBox.confirm(`确认删除台账「${row.name}」？删除后不可恢复。`, '删除确认', {
      type: 'warning',
    })
    dataStore.removeLedger(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}

function inStockLabel(row: AssetLedger) {
  if (row.inStock != null) return row.inStock ? '在库' : '不在库'
  return row.status === '在库' ? '在库' : row.status
}

function qualifyLabel(row: AssetLedger) {
  if (category.value === 'spare') return row.trialDueStatus || row.checkDueStatus || '—'
  return row.checkDueStatus || '—'
}

function qualifyTagType(row: AssetLedger): 'success' | 'warning' | 'danger' | 'info' {
  const s = qualifyLabel(row)
  if (s === '超期') return 'danger'
  if (s === '临期') return 'warning'
  if (s === '正常') return 'success'
  return 'info'
}

function usableLabel(row: AssetLedger) {
  if (row.usable != null) return row.usable ? '可用' : '不可用'
  if (row.disposeStatus === '占用' || row.status === '在用') return '不可用'
  return '可用'
}
</script>

<template>
  <PageShell
    tip="台账先看汇总再查明细：在库/合格/可用由作业与检定周期自动维护；报废建议走「退役报废」审批，此处为快捷归档。"
  >
    <PageHeader title="台账管理">
      <template #actions>
        <el-button v-if="canEdit" type="primary" @click="openCreate">新增台账</el-button>
      </template>
    </PageHeader>

    <FilterBar
      :fields="filterFields"
      :model-value="draft"
      :result-count="resultCount"
      @update:model-value="Object.assign(draft, $event)"
      @search="search"
      @reset="resetFilters"
    />

    <el-row :gutter="12" class="summary-row">
      <el-col :span="4"><el-statistic title="台账条数" :value="summary.total" /></el-col>
      <el-col :span="4"><el-statistic title="库存总量" :value="summary.qty" /></el-col>
      <el-col :span="4"><el-statistic title="在库件数" :value="summary.inStock" /></el-col>
      <el-col :span="4"><el-statistic title="可用件数" :value="summary.usable" /></el-col>
      <el-col :span="4"><el-statistic title="超期预警" :value="summary.overdue" /></el-col>
    </el-row>

    <el-table :data="pageData" stripe border>
        <el-table-column prop="assetCode" label="装备编码" width="120" fixed />
        <el-table-column prop="physicalId" label="实物ID" width="120" />
        <el-table-column prop="assetNo" label="资产编号" width="120" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="specialty" label="专业" width="80" />
        <el-table-column prop="typeName" label="类型" width="90" />
        <el-table-column prop="increaseMode" label="增加方式" width="100" />
        <el-table-column prop="warehouseName" label="存放地点" min-width="130" />
        <el-table-column label="仓位" width="120">
          <template #default="{ row }">
            {{ [row.storageArea, row.shelfNo, row.binNo].filter(Boolean).join('/') || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column label="在库" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="inStockLabel(row) === '在库' ? 'success' : 'info'">
              {{ inStockLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="合格" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="qualifyTagType(row)">{{ qualifyLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="可用" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="usableLabel(row) === '可用' ? 'success' : 'warning'">
              {{ usableLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="在库时长" width="90" align="center">
          <template #default="{ row }">{{ ageDays(row) ?? '—' }}</template>
        </el-table-column>
        <el-table-column prop="keeperName" label="保管人" width="90" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" plain @click="detailCode = row.assetCode">详情</el-button>
              <el-button v-if="canEdit" type="primary" size="small" plain @click="openEdit(row)">编辑</el-button>
              <el-button
                v-if="canEdit && row.status !== '报废' && row.disposeStatus !== '已报废'"
                type="warning"
                size="small"
                plain
                @click="router.push(`/${category}/retirement`)"
              >
                退役
              </el-button>
              <el-button v-if="canEdit" type="danger" size="small" plain @click="doRemove(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无台账数据" /></template>
      </el-table>
      <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑台账' : '新增台账'" width="720px" destroy-on-close>
      <p class="dialog-hint">请完整填写台账基础信息、存放位置与组织归属；仪器类请维护校验相关字段。</p>
      <el-form label-width="100px" class="ledger-form">
        <el-divider content-position="left">基础信息</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="名称" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" required>
              <el-select v-model="form.typeId" style="width: 100%">
                <el-option v-for="t in typeOptions" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实物ID">
              <el-input v-model="form.physicalId" placeholder="一物一码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产编号">
              <el-input v-model="form.assetNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业分类">
              <el-select v-model="form.specialty" style="width: 100%">
                <el-option v-for="s in specialtyOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号">
              <el-input v-model="form.model" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">存放与组织</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属单位">
              <el-select v-model="form.orgId" filterable style="width: 100%">
                <el-option v-for="o in orgOptions" :key="o.id" :label="o.name" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产仓地点" required>
              <el-select v-model="form.warehouseId" filterable style="width: 100%">
                <el-option v-for="w in warehouseOptions" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="库区"><el-input v-model="form.storageArea" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="货架"><el-input v-model="form.shelfNo" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓位"><el-input v-model="form.binNo" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保管人"><el-input v-model="form.keeperName" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产性质">
              <el-select v-model="form.assetNature" style="width: 100%">
                <el-option v-for="n in warehouseAssetNatureOptions" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">状态与数量</el-divider>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="数量"><el-input-number v-model="form.quantity" :min="0" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="台账状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="在库" value="在库" />
                <el-option label="在用" value="在用" />
                <el-option label="维修中" value="维修中" />
                <el-option label="报废" value="报废" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="设备状态">
              <el-select v-model="form.deviceStatus" style="width: 100%">
                <el-option label="在运" value="在运" />
                <el-option label="备用" value="备用" />
                <el-option label="检修" value="检修" />
                <el-option label="停用" value="停用" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产厂家"><el-input v-model="form.manufacturer" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电压等级"><el-input v-model="form.voltageLevel" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="category === 'spare' ? '最近试验' : '最近检定'">
              <el-date-picker v-model="form.lastCheckDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="周期说明">
              <span class="form-hint">合格/临期/超期由「检定周期设置」+最近日期自动计算</span>
            </el-form-item>
          </el-col>
          <el-col v-if="category === 'spare'" :span="12">
            <el-form-item label="备品来源"><el-input v-model="form.spareSource" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="增加方式">
              <el-select v-model="form.increaseMode" style="width: 100%">
                <el-option v-for="m in increaseModeOptions" :key="m" :label="m" :value="m" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
  </el-dialog>

  <AssetDetailDrawer :asset-code="detailCode" @close="detailCode = null" />
</template>

<style scoped lang="scss">
.ledger-form :deep(.el-divider) { margin: 8px 0 16px; }
.summary-row {
  margin-bottom: 16px;
  padding: 8px 4px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.form-hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 32px;
}
</style>
