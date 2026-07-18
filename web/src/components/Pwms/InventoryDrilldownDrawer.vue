<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { InventoryLineItem, InventoryTask } from '@/types'
import { useDataStore } from '@/stores/data'

const props = defineProps<{
  task: InventoryTask | null
}>()

const visible = defineModel<boolean>('visible', { default: false })
const dataStore = useDataStore()

const stack = ref<InventoryTask[]>([])

watch(
  () => props.task,
  (task) => {
    if (task) stack.value = [task]
  },
)

const displayTask = computed(() => stack.value[stack.value.length - 1] ?? null)

const isSummaryLevel = computed(() => {
  const level = displayTask.value?.level
  return level === 'center' || level === 'province' || level === 'city'
})

const childTasks = computed(() => {
  const task = displayTask.value
  if (!task || !isSummaryLevel.value) return []
  return dataStore.inventoryTasks.filter((t) => t.parentId === task.id)
})

const lineItems = computed(() => {
  const task = displayTask.value
  if (!task) return []
  if (isSummaryLevel.value) return []
  return dataStore.inventoryLineItems.filter((l) => l.taskId === task.id)
})

function diffQty(row: InventoryLineItem) {
  if (row.actualQuantity === null) return '-'
  return row.actualQuantity - row.bookQuantity
}

function openChildTask(child: InventoryTask) {
  stack.value.push(child)
}

function goBack() {
  if (stack.value.length > 1) stack.value.pop()
}

function inventoryPercent(checked: number, total: number) {
  return total ? Math.round((checked / total) * 100) : 0
}

function submitLineCount(row: InventoryLineItem, val: number | null) {
  if (val === null || val < 0) return
  dataStore.updateInventoryLine(row.id, val)
  ElMessage.success('实盘数量已保存，任务进度已更新')
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="displayTask ? '盘点下钻 — ' + displayTask.taskName : '盘点明细'"
    size="760px"
    destroy-on-close
  >
    <template v-if="displayTask">
      <div class="drawer-toolbar">
        <el-button v-if="stack.length > 1" type="primary" size="small" plain @click="goBack">
          <el-icon><ArrowLeft /></el-icon> 返回上级
        </el-button>
        <el-tag size="small">{{ displayTask.orgName }}</el-tag>
        <el-tag size="small" type="info">{{ isSummaryLevel ? '汇总任务' : '执行任务' }}</el-tag>
      </div>

      <el-descriptions :column="2" border size="small" class="summary">
        <el-descriptions-item label="负责人">{{ displayTask.assignee }}</el-descriptions-item>
        <el-descriptions-item label="截止日期">{{ displayTask.deadline }}</el-descriptions-item>
        <el-descriptions-item label="应盘数量">{{ displayTask.totalCount }}</el-descriptions-item>
        <el-descriptions-item label="已盘数量">{{ displayTask.checkedCount }}</el-descriptions-item>
        <el-descriptions-item label="完成率" :span="2">
          <el-progress
            :percentage="inventoryPercent(displayTask.checkedCount, displayTask.totalCount)"
            :stroke-width="10"
            style="max-width: 280px"
          />
        </el-descriptions-item>
      </el-descriptions>

      <template v-if="isSummaryLevel">
        <h4 class="section-title">下级盘点任务（点击行下钻）</h4>
        <el-table :data="childTasks" stripe border highlight-current-row @row-click="openChildTask">
          <el-table-column prop="orgName" label="组织" width="130" />
          <el-table-column prop="assignee" label="负责人" width="90" />
          <el-table-column label="进度" min-width="140">
            <template #default="{ row }">
              <el-progress :percentage="inventoryPercent(row.checkedCount, row.totalCount)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="90" />
          <el-table-column label="操作" width="88">
            <template #default>
              <div class="table-actions">
                <el-button type="primary" size="small" plain>下钻</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <template v-else>
        <h4 class="section-title">资产盘点明细（录入实盘数量后回车保存）</h4>
        <el-table :data="lineItems" stripe border>
          <el-table-column prop="assetCode" label="资产编码" width="130" />
          <el-table-column prop="assetName" label="设备名称" min-width="110" />
          <el-table-column prop="bookQuantity" label="账面" width="65" align="center" />
          <el-table-column label="实盘" width="100" align="center">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.actualQuantity ?? undefined"
                :min="0"
                size="small"
                controls-position="right"
                @change="(v: number | undefined) => submitLineCount(row, v ?? null)"
              />
            </template>
          </el-table-column>
          <el-table-column label="差异" width="65" align="center">
            <template #default="{ row }">
              <span :class="{ diff: diffQty(row) !== '-' && diffQty(row) !== 0 }">{{ diffQty(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag
                :type="row.status === '有差异' ? 'danger' : row.status === '已盘' ? 'success' : 'info'"
                size="small"
              >{{ row.status }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </template>
  </el-drawer>
</template>

<style scoped lang="scss">
.drawer-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.summary {
  margin-bottom: 20px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.diff {
  color: var(--el-color-danger);
  font-weight: 600;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .el-button {
    margin: 0;
  }
}
</style>
