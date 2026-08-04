<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import { useDataScope } from '@/composables/useDataScope'
import { useDataStore } from '@/stores/data'
import type { AssetLedger } from '@/types'
import { specialtyPathLabel } from '@/types'
import { matchKeyword } from '@/utils/pwms/filter'

interface EmergencyFilters extends Record<string, string> {
  keyword: string
  orgId: string
  warehouseId: string
  typeName: string
  specialty: string
}

interface CategorySummaryRow {
  typeId: string
  typeName: string
  specialty: string
  ledgerCount: number
  warehouseCount: number
  totalQuantity: number
  inStockQuantity: number
  usableQuantity: number
}

interface WarehouseSummaryRow {
  warehouseId: string
  warehouseName: string
  warehouseLocation: string
  orgId: string
  orgName: string
  categoryCount: number
  ledgerCount: number
  totalQuantity: number
  inStockQuantity: number
  usableQuantity: number
}

const router = useRouter()
const dataStore = useDataStore()
const { scopeByOrg, scopeWarehouses, visibleOrganizations } = useDataScope()

const filterDefaults: EmergencyFilters = {
  keyword: '',
  orgId: '',
  warehouseId: '',
  typeName: '',
  specialty: ''
}
const draft = ref<EmergencyFilters>({ ...filterDefaults })
const applied = ref<EmergencyFilters>({ ...filterDefaults })

const visibleWarehouses = computed(() => scopeWarehouses(dataStore.warehouseSites))
const emergencyLedgers = computed(() =>
  scopeByOrg(
    dataStore.ledgers.filter((ledger) => ledger.category === 'spare' && ledger.isEmergency === true)
  )
)

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '名称/编码/类型/保管人',
    width: '210px'
  },
  {
    key: 'orgId',
    type: 'select',
    label: '单位',
    placeholder: '所属单位',
    width: '170px',
    options: [
      { label: '全部单位', value: '' },
      ...visibleOrganizations.value.map((org) => ({ label: org.name, value: org.id }))
    ]
  },
  {
    key: 'warehouseId',
    type: 'select',
    label: '仓库',
    placeholder: '生产仓',
    width: '190px',
    options: [
      { label: '全部仓库', value: '' },
      ...visibleWarehouses.value.map((site) => ({ label: site.name, value: site.id }))
    ]
  },
  {
    key: 'typeName',
    type: 'select',
    label: '分类',
    placeholder: '设备类型',
    width: '150px',
    options: [
      { label: '全部类型', value: '' },
      ...[...new Set(emergencyLedgers.value.map((item) => item.typeName))]
        .sort((a, b) => a.localeCompare(b, 'zh-CN'))
        .map((name) => ({ label: name, value: name }))
    ]
  },
  {
    key: 'specialty',
    type: 'select',
    label: '专业',
    placeholder: '专业分类',
    width: '170px',
    options: [
      { label: '全部专业', value: '' },
      ...[...new Set(emergencyLedgers.value.map((item) => item.specialty).filter(Boolean))]
        .sort((a, b) => String(a).localeCompare(String(b), 'zh-CN'))
        .map((name) => ({ label: specialtyPathLabel(String(name)), value: String(name) }))
    ]
  }
])

function isInStock(item: AssetLedger) {
  return item.inStock ?? item.status === '在库'
}

function isUsable(item: AssetLedger) {
  if (item.usable != null) return item.usable
  if (item.disposeStatus === '占用' || item.status === '在用' || item.status === '报废')
    return false
  return isInStock(item)
}

const filteredLedgers = computed(() => {
  const filters = applied.value
  const orgIds = filters.orgId
    ? new Set(dataStore.getOrgDescendantIdsFrom(filters.orgId, true))
    : null
  return emergencyLedgers.value.filter((item) => {
    const warehouseLocation = dataStore.getWarehouseSite(item.warehouseId)?.location || ''
    return (
      (!orgIds || orgIds.has(item.orgId)) &&
      (!filters.warehouseId || item.warehouseId === filters.warehouseId) &&
      (!filters.typeName || item.typeName === filters.typeName) &&
      (!filters.specialty || item.specialty === filters.specialty) &&
      matchKeyword(
        filters.keyword,
        item.name,
        item.assetCode,
        item.physicalId,
        item.assetNo,
        item.typeName,
        item.orgName,
        item.warehouseName,
        warehouseLocation,
        item.keeperName
      )
    )
  })
})

const summary = computed(() => {
  const rows = filteredLedgers.value
  return {
    categoryCount: new Set(rows.map((item) => item.typeId || item.typeName)).size,
    ledgerCount: rows.length,
    warehouseCount: new Set(rows.map((item) => item.warehouseId)).size,
    totalQuantity: rows.reduce((sum, item) => sum + item.quantity, 0),
    usableQuantity: rows.filter(isUsable).reduce((sum, item) => sum + item.quantity, 0)
  }
})

const categorySummaryRows = computed<CategorySummaryRow[]>(() => {
  const groups = new Map<string, AssetLedger[]>()
  for (const item of filteredLedgers.value) {
    const key = item.typeId || item.typeName
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return [...groups.entries()]
    .map(([typeId, rows]) => ({
      typeId,
      typeName: rows[0]!.typeName,
      specialty:
        [...new Set(rows.map((item) => item.specialty).filter(Boolean))]
          .map((value) => specialtyPathLabel(value))
          .join('、') || '待规范',
      ledgerCount: rows.length,
      warehouseCount: new Set(rows.map((item) => item.warehouseId)).size,
      totalQuantity: rows.reduce((sum, item) => sum + item.quantity, 0),
      inStockQuantity: rows.filter(isInStock).reduce((sum, item) => sum + item.quantity, 0),
      usableQuantity: rows.filter(isUsable).reduce((sum, item) => sum + item.quantity, 0)
    }))
    .sort(
      (a, b) => b.totalQuantity - a.totalQuantity || a.typeName.localeCompare(b.typeName, 'zh-CN')
    )
})

const warehouseSummaryRows = computed<WarehouseSummaryRow[]>(() => {
  const groups = new Map<string, AssetLedger[]>()
  for (const item of filteredLedgers.value) {
    if (!groups.has(item.warehouseId)) groups.set(item.warehouseId, [])
    groups.get(item.warehouseId)!.push(item)
  }
  return [...groups.entries()]
    .map(([warehouseId, rows]) => ({
      warehouseId,
      warehouseName: rows[0]!.warehouseName,
      warehouseLocation: dataStore.getWarehouseSite(warehouseId)?.location || '—',
      orgId: rows[0]!.orgId,
      orgName: rows[0]!.orgName,
      categoryCount: new Set(rows.map((item) => item.typeId || item.typeName)).size,
      ledgerCount: rows.length,
      totalQuantity: rows.reduce((sum, item) => sum + item.quantity, 0),
      inStockQuantity: rows.filter(isInStock).reduce((sum, item) => sum + item.quantity, 0),
      usableQuantity: rows.filter(isUsable).reduce((sum, item) => sum + item.quantity, 0)
    }))
    .sort(
      (a, b) =>
        b.totalQuantity - a.totalQuantity || a.warehouseName.localeCompare(b.warehouseName, 'zh-CN')
    )
})

function search() {
  applied.value = { ...draft.value }
}

function reset() {
  draft.value = { ...filterDefaults }
  applied.value = { ...filterDefaults }
}

function drillToLedger(query: Record<string, string> = {}) {
  router.push({ path: '/spare/ledger', query: { isEmergency: '1', ...query } })
}

function drillCategory(row: CategorySummaryRow) {
  drillToLedger({ typeName: row.typeName })
}

function drillWarehouse(row: WarehouseSummaryRow) {
  drillToLedger({ warehouseId: row.warehouseId })
}
</script>

<template>
  <PageShell
    tip="仅统计台账中标注为应急的备品备件；按物资分类、生产仓汇总，点击统计行可穿透到对应台账。"
  >
    <PageHeader title="应急物资管理">
      <template #actions>
        <el-button type="primary" @click="drillToLedger()">查看全部应急台账</el-button>
      </template>
    </PageHeader>

    <FilterBar
      :fields="filterFields"
      :model-value="draft"
      :result-count="filteredLedgers.length"
      @update:model-value="Object.assign(draft, $event)"
      @search="search"
      @reset="reset"
    />

    <div class="kpi-grid">
      <div class="kpi"
        ><span>应急物资分类</span><strong>{{ summary.categoryCount }}</strong></div
      >
      <div class="kpi"
        ><span>台账条数</span><strong>{{ summary.ledgerCount }}</strong></div
      >
      <div class="kpi"
        ><span>储备总量</span><strong>{{ summary.totalQuantity }}</strong></div
      >
      <div class="kpi"
        ><span>可用数量</span><strong>{{ summary.usableQuantity }}</strong></div
      >
      <div class="kpi"
        ><span>覆盖仓库</span><strong>{{ summary.warehouseCount }}</strong></div
      >
    </div>

    <section class="stats-section">
      <h4>应急物资分类统计（点击穿透台账）</h4>
      <el-table
        :data="categorySummaryRows"
        stripe
        border
        class="clickable-rows"
        @row-click="drillCategory"
      >
        <el-table-column prop="typeName" label="物资分类" min-width="170" />
        <el-table-column prop="specialty" label="专业分类" min-width="130" />
        <el-table-column prop="ledgerCount" label="台账条数" width="100" align="center" />
        <el-table-column prop="warehouseCount" label="覆盖仓库" width="100" align="center" />
        <el-table-column prop="totalQuantity" label="储备总量" width="100" align="center" />
        <el-table-column prop="inStockQuantity" label="在库数量" width="100" align="center" />
        <el-table-column prop="usableQuantity" label="可用数量" width="100" align="center" />
        <el-table-column label="" width="110" fixed="right">
          <template #default><span class="row-hint">穿透查看 →</span></template>
        </el-table-column>
        <template #empty><el-empty description="暂无应急物资分类统计" /></template>
      </el-table>
    </section>

    <section class="stats-section">
      <h4>应急物资仓库分布（点击穿透台账）</h4>
      <el-table
        :data="warehouseSummaryRows"
        stripe
        border
        class="clickable-rows"
        @row-click="drillWarehouse"
      >
        <el-table-column prop="warehouseName" label="生产仓" min-width="170" />
        <el-table-column prop="orgName" label="所属单位" min-width="140" />
        <el-table-column
          prop="warehouseLocation"
          label="仓库地点"
          min-width="210"
          show-overflow-tooltip
        />
        <el-table-column prop="categoryCount" label="物资分类" width="100" align="center" />
        <el-table-column prop="ledgerCount" label="台账条数" width="100" align="center" />
        <el-table-column prop="totalQuantity" label="储备总量" width="100" align="center" />
        <el-table-column prop="inStockQuantity" label="在库数量" width="100" align="center" />
        <el-table-column prop="usableQuantity" label="可用数量" width="100" align="center" />
        <el-table-column label="" width="110" fixed="right">
          <template #default><span class="row-hint">穿透查看 →</span></template>
        </el-table-column>
        <template #empty><el-empty description="暂无应急物资仓库统计" /></template>
      </el-table>
    </section>
  </PageShell>
</template>

<style scoped lang="scss">
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid var(--pwms-border, var(--el-border-color-lighter));
  border-radius: 8px;
  background: var(--pwms-panel-elevated, var(--el-fill-color-blank));

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  strong {
    font-size: 23px;
    font-weight: 600;
  }
}

.stats-section {
  margin-top: 18px;

  h4 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 600;
  }
}

.clickable-rows :deep(.el-table__row) {
  cursor: pointer;
}

.row-hint {
  font-size: 12px;
  color: var(--el-color-primary);
}
</style>
