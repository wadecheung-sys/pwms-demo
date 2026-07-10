<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'

const dataStore = useDataStore()
const stats = computed(() => dataStore.dashboardStats)

const statCards = computed(() => [
  { label: '生产仓设备类型', value: stats.value.warehouseCount, unit: '类', color: '#1677ff', icon: 'Box' },
  { label: '备品备件库存', value: stats.value.spareCount, unit: '件', color: '#52c41a', icon: 'Goods' },
  { label: '仪器仪表', value: stats.value.instrumentCount, unit: '台', color: '#722ed1', icon: 'Odometer' },
  { label: '工器具', value: stats.value.toolCount, unit: '套', color: '#fa8c16', icon: 'Tools' },
])

const pendingTasks = computed(() =>
  dataStore.inventoryTasks.filter((t) => t.status !== '已完成' && t.level === 'center').slice(0, 5),
)

const recentFaults = computed(() => dataStore.faultRecords.slice(0, 5))
const recentMaintenance = computed(() => dataStore.maintenanceRecords.slice(0, 5))

function inventoryPercent(checked: number, total: number) {
  return total ? Math.round((checked / total) * 100) : 0
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
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

      <el-row :gutter="24">
        <el-col :span="12">
          <div class="section-block">
            <h3 class="section-block__title">待办盘点任务</h3>
            <el-table :data="pendingTasks" border>
              <el-table-column prop="taskName" label="任务名称" min-width="160" />
              <el-table-column label="进度" width="140">
                <template #default="{ row }">
                  <el-progress :percentage="inventoryPercent(row.checkedCount, row.totalCount)" :stroke-width="8" />
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="90" />
              <template #empty><el-empty description="暂无待办任务" :image-size="64" /></template>
            </el-table>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="section-block">
            <div class="section-block__head">
              <h3 class="section-block__title">近期故障记录</h3>
              <el-badge v-if="stats.pendingFaults" :value="stats.pendingFaults" type="danger" />
            </div>
            <el-table :data="recentFaults" border>
              <el-table-column prop="assetName" label="设备名称" />
              <el-table-column prop="faultLevel" label="等级" width="80" />
              <el-table-column prop="status" label="状态" width="90" />
              <template #empty><el-empty description="暂无故障记录" :image-size="64" /></template>
            </el-table>
          </div>
        </el-col>
      </el-row>

      <div class="section-block">
        <h3 class="section-block__title">近期维修记录</h3>
        <el-table :data="recentMaintenance" border>
          <el-table-column prop="projectName" label="维修项目" min-width="140" />
          <el-table-column prop="assetName" label="关联设备" width="120" />
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
.section-block__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  .section-block__title {
    margin: 0;
  }
}
</style>
