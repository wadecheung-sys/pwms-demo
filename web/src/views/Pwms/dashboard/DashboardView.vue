<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import type { WarehouseSite } from '@/types'

const dataStore = useDataStore()
const userStore = useUserStore()
const router = useRouter()
const { scopeWarehouses, scopeLedgers, scopeByAssets, scopeByOrg } = useDataScope()

const scopedWarehouses = computed(() => scopeWarehouses(dataStore.warehouseSites))
const scopedLedgers = computed(() => scopeLedgers(dataStore.ledgers))

const stats = computed(() => {
  const ledgers = scopedLedgers.value
  const faults = scopeByAssets(dataStore.faultRecords, ledgers)
  const totalQty = ledgers.reduce((s, l) => s + l.quantity, 0)
  const inStockQty = ledgers.filter((l) => l.status === '在库').reduce((s, l) => s + l.quantity, 0)
  return {
    warehouseCount: scopedWarehouses.value.length,
    spareCount: ledgers.filter((l) => l.category === 'spare').reduce((s, l) => s + l.quantity, 0),
    instrumentCount: ledgers.filter((l) => l.category === 'instrument').reduce((s, l) => s + l.quantity, 0),
    toolCount: ledgers.filter((l) => l.category === 'tool').reduce((s, l) => s + l.quantity, 0),
    pendingFaults: faults.filter((f) => f.status === '待处理').length,
    totalQty,
    inStockQty,
    inStockRate: totalQty ? Math.round((inStockQty / totalQty) * 100) : 0,
    smartCount: scopedWarehouses.value.filter((w) => w.isSmart && w.useStatus === '在用').length,
  }
})

const statCards = computed(() => [
  { label: '生产仓地点', value: stats.value.warehouseCount, unit: '处', color: '#1677ff', icon: 'Box' },
  { label: '备品备件', value: stats.value.spareCount, unit: '件', color: '#52c41a', icon: 'Goods' },
  { label: '仪器仪表', value: stats.value.instrumentCount, unit: '台', color: '#722ed1', icon: 'Odometer' },
  { label: '工器具', value: stats.value.toolCount, unit: '套', color: '#fa8c16', icon: 'Tools' },
])

function warehouseAssetCount(site: WarehouseSite) {
  return scopedLedgers.value
    .filter((l) => l.warehouseId === site.id)
    .reduce((s, l) => s + l.quantity, 0)
}

const featuredWarehouses = computed(() =>
  scopedWarehouses.value.filter((w) => w.useStatus === '在用').slice(0, 8),
)

function goWarehouseOverview(warehouseId: string) {
  router.push({ path: '/warehouse/overview', query: { warehouseId } })
}

const pendingTasks = computed(() =>
  scopeByOrg(dataStore.inventoryTasks)
    .filter((t) => t.status !== '已完成' && t.level === 'center')
    .slice(0, 5),
)

const recentFaults = computed(() => scopeByAssets(dataStore.faultRecords, scopedLedgers.value).slice(0, 5))
const recentMaintenance = computed(() =>
  scopeByAssets(dataStore.maintenanceRecords, scopedLedgers.value).slice(0, 5),
)

function inventoryPercent(checked: number, total: number) {
  return total ? Math.round((checked / total) * 100) : 0
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="welcome-bar">
        <div>
          <h2 class="welcome-bar__title">{{ userStore.displayName }}，您好</h2>
          <p class="welcome-bar__sub">
            <span v-if="userStore.orgLabel">{{ userStore.orgLabel }}</span>
            <span v-if="userStore.context.roleName"> · {{ userStore.context.roleName }}</span>
          </p>
        </div>
        <div v-if="stats.smartCount" class="welcome-bar__badge">
          <el-tag type="success" effect="plain">智慧仓 {{ stats.smartCount }} 处</el-tag>
        </div>
      </div>

      <div class="stat-grid">
        <div v-for="item in statCards" :key="item.label" class="stat-item">
          <div class="stat-icon" :style="{ background: item.color + '15', color: item.color }">
            <el-icon :size="24"><component :is="item.icon" /></el-icon>
          </div>
          <div>
            <div class="stat-value">{{ item.value }}<small>{{ item.unit }}</small></div>
            <div class="stat-label">{{ item.label }}</div>
          </div>
        </div>
      </div>

      <div v-if="stats.totalQty" class="section-block in-stock-block">
        <div class="in-stock-block__head">
          <h3 class="section-block__title">仓内物资在库概况</h3>
          <span class="in-stock-block__meta">在库 {{ stats.inStockQty }} / 总量 {{ stats.totalQty }}</span>
        </div>
        <el-progress :percentage="stats.inStockRate" :stroke-width="12" :format="(p: number) => `${p}% 在库`" />
      </div>

      <div v-if="featuredWarehouses.length" class="section-block">
        <div class="section-block__head">
          <h3 class="section-block__title">辖区内生产仓</h3>
          <el-button link type="primary" @click="router.push('/warehouse/overview')">查看全部 →</el-button>
        </div>
        <div class="warehouse-grid">
          <div
            v-for="w in featuredWarehouses"
            :key="w.id"
            class="warehouse-card"
            @click="goWarehouseOverview(w.id)"
          >
            <div class="warehouse-card__top">
              <div class="warehouse-card__name">{{ w.name }}</div>
              <el-tag v-if="w.isSmart" size="small" type="success">智慧仓</el-tag>
            </div>
            <div class="warehouse-card__meta">{{ w.orgName }} · {{ w.area }}㎡ · {{ w.warehouseType || '综合仓' }}</div>
            <div class="warehouse-card__loc">{{ w.location }}</div>
            <div class="warehouse-card__stat">仓内物资 {{ warehouseAssetCount(w) }} 件/套/台</div>
          </div>
        </div>
      </div>

      <el-empty
        v-else-if="!stats.warehouseCount"
        description="管辖范围内暂无生产仓地点，请联系管理员录入或切换更高权限账号"
        :image-size="80"
      />

      <el-row :gutter="24">
        <el-col :span="12">
          <div class="section-block">
            <h3 class="section-block__title">待办盘点任务</h3>
            <el-table :data="pendingTasks" stripe border>
              <el-table-column prop="taskName" label="任务名称" min-width="160" />
              <el-table-column label="进度" width="140">
                <template #default="{ row }">
                  <el-progress :percentage="inventoryPercent(row.checkedCount, row.totalCount)" :stroke-width="8" />
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="90" />
              <template #empty><el-empty description="暂无待办盘点任务" :image-size="64" /></template>
            </el-table>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="section-block">
            <div class="section-block__head">
              <h3 class="section-block__title">近期故障记录</h3>
              <el-badge v-if="stats.pendingFaults" :value="stats.pendingFaults" type="danger" />
            </div>
            <el-table :data="recentFaults" stripe border>
              <el-table-column prop="assetName" label="物资名称" />
              <el-table-column prop="faultLevel" label="等级" width="80" />
              <el-table-column prop="status" label="状态" width="90" />
              <template #empty><el-empty description="暂无故障记录" :image-size="64" /></template>
            </el-table>
          </div>
        </el-col>
      </el-row>

      <div class="section-block">
        <h3 class="section-block__title">近期维修记录</h3>
        <el-table :data="recentMaintenance" stripe border>
          <el-table-column prop="projectName" label="维修项目" min-width="140" />
          <el-table-column prop="assetName" label="关联物资" width="120" />
          <el-table-column prop="fundingSource" label="资金来源" width="130" />
          <el-table-column prop="amount" label="金额(元)" width="100">
            <template #default="{ row }">{{ row.amount.toLocaleString() }}</template>
          </el-table-column>
          <el-table-column prop="vendor" label="维修厂家" min-width="140" />
          <el-table-column prop="status" label="状态" width="90" />
          <template #empty><el-empty description="暂无维修记录" :image-size="64" /></template>
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.welcome-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &__title {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 600;
  }

  &__sub {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.in-stock-block {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  &__meta {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}

.section-block__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;

  .section-block__title {
    margin: 0;
  }
}

.warehouse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.warehouse-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 14px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__name {
    font-weight: 600;
    color: var(--el-text-color-primary);
    line-height: 1.4;
  }

  &__meta {
    font-size: 12px;
    color: var(--el-color-primary);
    margin-bottom: 4px;
  }

  &__loc {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 6px;
  }

  &__stat {
    font-size: 12px;
    color: var(--el-text-color-regular);
  }
}
</style>
