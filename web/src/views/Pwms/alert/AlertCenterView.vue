<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { hasPermission } from '@/utils/pwms/permission'
import type { AlertItem } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'

const dataStore = useDataStore()
const userStore = useUserStore()
const router = useRouter()

const statusFilter = ref<'全部' | '未处理' | '已处理' | '已忽略'>('未处理')
const categoryFilter = ref('全部')

const canHandle = computed(() => hasPermission(userStore.context, 'alert:handle') || hasPermission(userStore.context, '*'))

const rows = computed(() =>
  dataStore.alerts.filter((a) => {
    if (statusFilter.value !== '全部' && a.status !== statusFilter.value) return false
    if (categoryFilter.value !== '全部' && a.category !== categoryFilter.value) return false
    return true
  }),
)

function levelType(level: string) {
  if (level === '严重') return 'danger'
  if (level === '警告') return 'warning'
  return 'info'
}

function go(row: AlertItem) {
  if (row.routePath) router.push(row.routePath)
}

function handle(row: AlertItem, status: '已处理' | '已忽略') {
  dataStore.handleAlert(row.id, status)
  ElMessage.success(status === '已处理' ? '已处理' : '已忽略')
}
</script>

<template>
  <PageShell
    tip="覆盖库存/定额、校验、环境、合规四类风险；支持穿透到台账、仓室、定额结果。"
  >
    <PageHeader title="告警中心">
      <template #actions>
        <el-select v-model="categoryFilter" style="width: 120px">
          <el-option label="全部类型" value="全部" />
          <el-option label="库存" value="库存" />
          <el-option label="定额" value="定额" />
          <el-option label="校验" value="校验" />
          <el-option label="环境" value="环境" />
          <el-option label="合规" value="合规" />
        </el-select>
        <el-radio-group v-model="statusFilter">
          <el-radio-button value="未处理">未处理</el-radio-button>
          <el-radio-button value="已处理">已处理</el-radio-button>
          <el-radio-button value="已忽略">已忽略</el-radio-button>
          <el-radio-button value="全部">全部</el-radio-button>
        </el-radio-group>
      </template>
    </PageHeader>

      <el-table :data="rows" border stripe>
        <el-table-column prop="createTime" label="时间" width="170" />
        <el-table-column prop="category" label="类型" width="80" />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="{ row }">
            <el-tag :type="levelType(row.level)" size="small">{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="160" />
        <el-table-column prop="content" label="内容" min-width="240" show-overflow-tooltip />
        <el-table-column prop="orgName" label="单位" width="120" />
        <el-table-column prop="status" label="状态" width="90" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button type="primary" size="small" plain @click="go(row)">穿透</el-button>
              <template v-if="canHandle && row.status === '未处理'">
                <el-button type="success" size="small" plain @click="handle(row, '已处理')">处理</el-button>
                <el-button size="small" plain @click="handle(row, '已忽略')">忽略</el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
  </PageShell>
</template>
