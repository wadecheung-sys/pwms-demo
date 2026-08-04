<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'
import { usePagination } from '@/composables/usePagination'
import { useTableFilter } from '@/composables/useTableFilter'
import { useDataScope } from '@/composables/useDataScope'
import { useDataStore } from '@/stores/data'
import type { WarehouseSmartDevice, WarehouseSmartDeviceStatus } from '@/types'
import { warehouseSmartDeviceCategoryOptions, warehouseSmartDeviceStatusOptions } from '@/types'
import { matchExact, matchKeyword } from '@/utils/pwms/filter'

interface SmartDeviceRow extends WarehouseSmartDevice {
  warehouseLocation: string
}

interface WarehouseSummaryRow {
  warehouseId: string
  warehouseName: string
  orgName: string
  warehouseLocation: string
  categoryCount: number
  totalQuantity: number
  activeQuantity: number
  abnormalQuantity: number
}

const route = useRoute()
const dataStore = useDataStore()
const { scopeByOrg, scopeWarehouses, visibleOrganizations } = useDataScope()

const visibleWarehouses = computed(() => scopeWarehouses(dataStore.warehouseSites))
const scopedDevices = computed(() => scopeByOrg(dataStore.warehouseSmartDevices))
const rows = computed<SmartDeviceRow[]>(() =>
  scopedDevices.value.map((device) => ({
    ...device,
    warehouseLocation: dataStore.getWarehouseSite(device.warehouseId)?.location || '—',
  })),
)

const filterDefaults = { keyword: '', orgId: '', warehouseId: '', category: '', status: '' }
const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(
  filterDefaults,
  (item, filters) => {
    const row = item as SmartDeviceRow
    return (
      matchExact(row.orgId, filters.orgId) &&
      matchExact(row.warehouseId, filters.warehouseId) &&
      matchExact(row.category, filters.category) &&
      matchExact(row.status, filters.status) &&
      matchKeyword(
        filters.keyword,
        row.name,
        row.code,
        row.model,
        row.manufacturer,
        row.warehouseName,
        row.warehouseLocation,
        row.installLocation,
      )
    )
  },
)

const filterFields = computed<FilterField[]>(() => [
  {
    key: 'keyword',
    type: 'input',
    label: '关键字',
    placeholder: '名称/编码/型号/位置',
    width: '210px',
  },
  {
    key: 'orgId',
    type: 'select',
    label: '单位',
    placeholder: '所属单位',
    width: '170px',
    options: [
      { label: '全部单位', value: '' },
      ...visibleOrganizations.value.map((org) => ({ label: org.name, value: org.id })),
    ],
  },
  {
    key: 'warehouseId',
    type: 'select',
    label: '仓库',
    placeholder: '生产仓',
    width: '190px',
    options: [
      { label: '全部仓库', value: '' },
      ...visibleWarehouses.value.map((site) => ({ label: site.name, value: site.id })),
    ],
  },
  {
    key: 'category',
    type: 'select',
    label: '类别',
    placeholder: '设备类别',
    width: '140px',
    options: [
      { label: '全部类别', value: '' },
      ...warehouseSmartDeviceCategoryOptions.map((category) => ({ label: category, value: category })),
    ],
  },
  {
    key: 'status',
    type: 'select',
    label: '状态',
    placeholder: '运行状态',
    width: '120px',
    options: [
      { label: '全部状态', value: '' },
      ...warehouseSmartDeviceStatusOptions.map((status) => ({ label: status, value: status })),
    ],
  },
])

const tableData = computed(() => filterListWithCount(rows.value))
const { currentPage, pageSize, total, pageData } = usePagination(tableData, 10)

const summary = computed(() => {
  const list = tableData.value
  const totalQuantity = list.reduce((sum, item) => sum + item.quantity, 0)
  const activeQuantity = list
    .filter((item) => item.status === '在用')
    .reduce((sum, item) => sum + item.quantity, 0)
  const abnormalQuantity = list
    .filter((item) => item.status === '离线' || item.status === '故障')
    .reduce((sum, item) => sum + item.quantity, 0)
  return {
    warehouseCount: new Set(list.map((item) => item.warehouseId)).size,
    categoryCount: new Set(list.map((item) => item.category)).size,
    totalQuantity,
    activeQuantity,
    abnormalQuantity,
  }
})

const warehouseSummaryRows = computed<WarehouseSummaryRow[]>(() => {
  const groups = new Map<string, SmartDeviceRow[]>()
  for (const item of tableData.value) {
    if (!groups.has(item.warehouseId)) groups.set(item.warehouseId, [])
    groups.get(item.warehouseId)!.push(item)
  }
  return [...groups.values()].map((list) => ({
    warehouseId: list[0]!.warehouseId,
    warehouseName: list[0]!.warehouseName,
    orgName: list[0]!.orgName,
    warehouseLocation: list[0]!.warehouseLocation,
    categoryCount: new Set(list.map((item) => item.category)).size,
    totalQuantity: list.reduce((sum, item) => sum + item.quantity, 0),
    activeQuantity: list
      .filter((item) => item.status === '在用')
      .reduce((sum, item) => sum + item.quantity, 0),
    abnormalQuantity: list
      .filter((item) => item.status === '离线' || item.status === '故障')
      .reduce((sum, item) => sum + item.quantity, 0),
  }))
})

function drillWarehouse(row: WarehouseSummaryRow) {
  draft.value.warehouseId = row.warehouseId
  search()
}

function statusTagType(status: WarehouseSmartDeviceStatus) {
  const map: Record<WarehouseSmartDeviceStatus, 'success' | 'warning' | 'danger' | 'info'> = {
    在用: 'success',
    离线: 'warning',
    故障: 'danger',
    停用: 'info',
  }
  return map[status]
}

watch(
  () => route.query.warehouseId,
  (warehouseId) => {
    const id = typeof warehouseId === 'string' ? warehouseId : ''
    draft.value.warehouseId = visibleWarehouses.value.some((site) => site.id === id) ? id : ''
    search()
  },
  { immediate: true },
)
</script>

<template>
  <PageShell tip="统计当前权限范围内各生产仓配备的智能化设施；先看仓库汇总，点击穿透到设备明细。">
    <PageHeader title="仓库智能化设备统计" />

    <FilterBar
      :fields="filterFields"
      :model-value="draft"
      :result-count="resultCount"
      @update:model-value="Object.assign(draft, $event)"
      @search="search"
      @reset="reset"
    />

    <div class="kpi-grid">
      <div class="kpi"><span>配备仓库</span><strong>{{ summary.warehouseCount }}</strong></div>
      <div class="kpi"><span>设备类别</span><strong>{{ summary.categoryCount }}</strong></div>
      <div class="kpi"><span>设备总数</span><strong>{{ summary.totalQuantity }}</strong></div>
      <div class="kpi"><span>在用数量</span><strong>{{ summary.activeQuantity }}</strong></div>
      <div class="kpi kpi--danger"><span>异常数量</span><strong>{{ summary.abnormalQuantity }}</strong></div>
    </div>

    <section class="stats-section">
      <h4>仓库配备统计（点击查看设备）</h4>
      <el-table :data="warehouseSummaryRows" stripe border class="clickable-rows" @row-click="drillWarehouse">
        <el-table-column prop="warehouseName" label="仓库" min-width="170" />
        <el-table-column prop="orgName" label="所属单位" min-width="140" />
        <el-table-column prop="warehouseLocation" label="仓库地点" min-width="210" show-overflow-tooltip />
        <el-table-column prop="categoryCount" label="种类数" width="90" align="center" />
        <el-table-column prop="totalQuantity" label="总数量" width="90" align="center" />
        <el-table-column prop="activeQuantity" label="在用数" width="90" align="center" />
        <el-table-column prop="abnormalQuantity" label="异常数" width="90" align="center" />
        <el-table-column label="" width="110" fixed="right">
          <template #default><span class="row-hint">穿透查看 →</span></template>
        </el-table-column>
        <template #empty><el-empty description="暂无智能化设备统计" /></template>
      </el-table>
    </section>

    <section class="stats-section">
      <h4>智能化设备明细</h4>
      <el-table :data="pageData" stripe border>
        <el-table-column prop="code" label="设备编码" width="145" />
        <el-table-column prop="name" label="设备名称" min-width="150" />
        <el-table-column prop="category" label="设备类别" width="110" />
        <el-table-column prop="warehouseName" label="所属仓库" min-width="170" />
        <el-table-column prop="warehouseLocation" label="仓库地点" min-width="190" show-overflow-tooltip />
        <el-table-column prop="model" label="规格型号" width="130" />
        <el-table-column prop="manufacturer" label="生产厂家" min-width="140" />
        <el-table-column prop="installLocation" label="安装位置" min-width="140" />
        <el-table-column prop="quantity" label="数量" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="commissioningDate" label="投运日期" width="110" />
        <el-table-column prop="lastOnlineTime" label="最近在线" width="165">
          <template #default="{ row }">{{ row.lastOnlineTime || '—' }}</template>
        </el-table-column>
        <template #empty><el-empty description="暂无智能化设备" /></template>
      </el-table>
      <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
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

  &--danger strong {
    color: var(--el-color-danger);
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
