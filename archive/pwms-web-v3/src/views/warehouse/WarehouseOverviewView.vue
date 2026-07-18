<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useDataScope } from '@/composables/useDataScope'
import { getSmartWarehouseEnv } from '@/mock/warehouseEnv'
import type { AssetCategory, WarehouseSite, WarehouseUseStatus } from '@/types'
import { categoryLabels } from '@/types'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const { scopeWarehouses, scopeLedgersByCategories } = useDataScope()

const selectedWarehouseId = ref('')

const warehouseOptions = computed(() => scopeWarehouses(dataStore.warehouseSites))

const currentSite = computed(() =>
  selectedWarehouseId.value ? dataStore.getWarehouseSite(selectedWarehouseId.value) : null,
)

const smartEnv = computed(() =>
  currentSite.value?.isSmart ? getSmartWarehouseEnv(currentSite.value.id) : null,
)

interface CategoryStat {
  category: AssetCategory
  label: string
  typeCount: number
  totalQuantity: number
  inStockQuantity: number
}

const categoryOrder: AssetCategory[] = ['spare', 'instrument', 'tool']

function computeCategoryStat(warehouseId: string, category: AssetCategory): CategoryStat {
  const items = scopeLedgersByCategories(dataStore.ledgers, [category]).filter(
    (l) => l.warehouseId === warehouseId,
  )
  return {
    category,
    label: categoryLabels[category],
    typeCount: new Set(items.map((i) => i.typeId)).size,
    totalQuantity: items.reduce((s, l) => s + l.quantity, 0),
    inStockQuantity: items
      .filter((l) => l.status === '在库')
      .reduce((s, l) => s + l.quantity, 0),
  }
}

const categoryStats = computed(() => {
  if (!selectedWarehouseId.value) return []
  return categoryOrder.map((cat) => computeCategoryStat(selectedWarehouseId.value, cat))
})

const totalDevices = computed(() => categoryStats.value.reduce((s, r) => s + r.totalQuantity, 0))

function initSelection() {
  const fromQuery = route.query.warehouseId as string | undefined
  if (fromQuery && warehouseOptions.value.some((w) => w.id === fromQuery)) {
    selectedWarehouseId.value = fromQuery
    return
  }
  if (!selectedWarehouseId.value && warehouseOptions.value.length) {
    selectedWarehouseId.value = warehouseOptions.value[0].id
  } else if (
    selectedWarehouseId.value &&
    !warehouseOptions.value.some((w) => w.id === selectedWarehouseId.value)
  ) {
    selectedWarehouseId.value = warehouseOptions.value[0]?.id ?? ''
  }
}

watch(
  () => route.query.warehouseId,
  () => initSelection(),
  { immediate: true },
)

watch(selectedWarehouseId, (id) => {
  if (!id || route.query.warehouseId === id) return
  router.replace({ path: route.path, query: { warehouseId: id } })
})

function useStatusTagType(status: WarehouseUseStatus) {
  const map: Record<WarehouseUseStatus, '' | 'success' | 'warning' | 'danger' | 'info'> = {
    在用: 'success',
    停用: 'danger',
    改造中: 'warning',
    待建: 'info',
  }
  return map[status]
}

function goLedger(category: AssetCategory) {
  if (!selectedWarehouseId.value) return
  router.push({ path: `/${category}/ledger`, query: { warehouseId: selectedWarehouseId.value } })
}

function goWarehouseLedger(site?: WarehouseSite | null) {
  router.push({ path: '/warehouse/ledger', query: site ? { keyword: site.name } : {} })
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel overview-panel">
      <div class="overview-header">
        <div>
          <h2 class="overview-title">生产仓概览</h2>
          <p class="overview-desc">选择生产仓地点，查看仓室基本信息、仓内物资统计及智慧仓环境监测。</p>
        </div>
        <div class="warehouse-selector">
          <span class="selector-label">选择生产仓</span>
          <el-select
            v-model="selectedWarehouseId"
            placeholder="请选择生产仓地点"
            filterable
            style="width: 360px"
          >
            <el-option
              v-for="w in warehouseOptions"
              :key="w.id"
              :label="`${w.name}（${w.code}）`"
              :value="w.id"
            >
              <div class="option-row">
                <span>{{ w.name }}</span>
                <span class="option-sub">{{ w.location }}</span>
              </div>
            </el-option>
          </el-select>
        </div>
      </div>

      <el-empty
        v-if="!warehouseOptions.length"
        description="管辖范围内暂无生产仓地点"
      >
        <el-button type="primary" @click="router.push('/warehouse/ledger')">前往生产仓台账录入</el-button>
      </el-empty>

      <template v-else-if="currentSite">
        <el-card shadow="never" class="info-card">
          <template #header>
            <div class="card-header">
              <span>{{ currentSite.name }}</span>
              <div class="card-header__tags">
                <el-tag v-if="currentSite.isSmart" size="small" type="success">智慧仓</el-tag>
                <el-tag size="small" :type="useStatusTagType(currentSite.useStatus)">
                  {{ currentSite.useStatus }}
                </el-tag>
              </div>
            </div>
          </template>
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="仓室编码">{{ currentSite.code }}</el-descriptions-item>
            <el-descriptions-item label="仓库地点" :span="2">{{ currentSite.location }}</el-descriptions-item>
            <el-descriptions-item label="所属单位">{{ currentSite.orgName }}</el-descriptions-item>
            <el-descriptions-item label="资产性质">{{ currentSite.assetNature }}</el-descriptions-item>
            <el-descriptions-item label="面积">{{ currentSite.area }} ㎡</el-descriptions-item>
            <el-descriptions-item label="库管人员">{{ currentSite.keeperName }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ currentSite.contactPhone || '—' }}</el-descriptions-item>
            <el-descriptions-item label="仓室类型">{{ currentSite.warehouseType || '—' }}</el-descriptions-item>
            <el-descriptions-item v-if="currentSite.remark" label="备注" :span="3">
              {{ currentSite.remark }}
            </el-descriptions-item>
          </el-descriptions>
          <div class="card-footer">
            <el-button link type="primary" @click="goWarehouseLedger(currentSite)">编辑仓室信息 →</el-button>
            <el-button link type="primary" @click="router.push('/spare/inout/in-apply')">入库申请 →</el-button>
            <el-button link type="primary" @click="router.push('/spare/inout/out-apply')">出库申请 →</el-button>
            <el-button link type="primary" @click="router.push('/spare/inventory/execute')">执行盘点 →</el-button>
            <el-button link type="primary" @click="router.push('/spare/inventory/progress')">盘点进度 →</el-button>
          </div>
        </el-card>

        <el-card v-if="currentSite.isSmart && smartEnv" shadow="never" class="env-card">
          <template #header>
            <div class="card-header">
              <span>智慧仓环境监测</span>
              <el-tag size="small" type="success">在线</el-tag>
            </div>
          </template>
          <div class="env-grid">
            <div class="env-item">
              <div class="env-item__label">温度</div>
              <div class="env-item__value">{{ smartEnv.temperature }}<small>℃</small></div>
            </div>
            <div class="env-item">
              <div class="env-item__label">湿度</div>
              <div class="env-item__value">{{ smartEnv.humidity }}<small>%</small></div>
            </div>
            <div class="env-item">
              <div class="env-item__label">烟感状态</div>
              <div class="env-item__value">
                <el-tag :type="smartEnv.smokeNormal ? 'success' : 'danger'" size="small">
                  {{ smartEnv.smokeNormal ? '正常' : '告警' }}
                </el-tag>
              </div>
            </div>
          </div>
          <div class="env-updated">最近采集：{{ smartEnv.updatedAt }}</div>
        </el-card>

        <div class="stats-section">
          <div class="stats-section__head">
            <h3>仓内物资统计</h3>
            <span class="stats-summary">合计 {{ totalDevices }} 件/套/台</span>
          </div>
          <el-table :data="categoryStats" stripe border>
            <el-table-column prop="label" label="类别" width="120" />
            <el-table-column prop="typeCount" label="种类数" width="100" align="center" />
            <el-table-column prop="totalQuantity" label="总数量" width="100" align="center" />
            <el-table-column prop="inStockQuantity" label="在库数" width="100" align="center" />
            <el-table-column label="操作" min-width="120">
              <template #default="{ row }">
                <el-button link type="primary" @click="goLedger(row.category)">查看台账 →</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <el-empty description="该仓室暂无仓内物资台账" :image-size="64" />
            </template>
          </el-table>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.overview-panel {
  padding-top: 8px;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.overview-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.overview-desc {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  max-width: 520px;
  line-height: 1.6;
}

.warehouse-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.selector-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.option-row {
  display: flex;
  flex-direction: column;
  line-height: 1.4;

  .option-sub {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.info-card {
  margin-bottom: 24px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;

  &__tags {
    display: flex;
    gap: 8px;
  }
}

.card-footer {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px 8px;
}

.env-card {
  margin-bottom: 24px;
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.env-item {
  text-align: center;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 6px;
  }

  &__value {
    font-size: 22px;
    font-weight: 600;
    color: var(--el-text-color-primary);

    small {
      font-size: 13px;
      font-weight: normal;
      margin-left: 2px;
    }
  }
}

.env-updated {
  margin-top: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: right;
}

.stats-section {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
  }
}

.stats-summary {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
