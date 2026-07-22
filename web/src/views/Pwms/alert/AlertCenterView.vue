<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { usePagination } from '@/composables/usePagination'
import { hasPermission } from '@/utils/pwms/permission'
import type { AlertItem } from '@/types'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const dataStore = useDataStore()
const userStore = useUserStore()
const router = useRouter()

const filterDefaults = { keyword: '', category: '', status: '未处理', level: '' }
const draft = ref({ ...filterDefaults })
const applied = ref({ ...filterDefaults })

const filterFields = computed((): FilterField[] => [
  { key: 'keyword', type: 'input', placeholder: '标题/内容/单位', width: '200px' },
  {
    key: 'category',
    type: 'select',
    placeholder: '告警类型',
    width: '120px',
    options: [
      { label: '全部类型', value: '' },
      { label: '库存', value: '库存' },
      { label: '定额', value: '定额' },
      { label: '校验', value: '校验' },
      { label: '环境', value: '环境' },
      { label: '合规', value: '合规' },
    ],
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '处理状态',
    width: '120px',
    options: [
      { label: '全部状态', value: '' },
      { label: '未处理', value: '未处理' },
      { label: '已处理', value: '已处理' },
      { label: '已忽略', value: '已忽略' },
    ],
  },
  {
    key: 'level',
    type: 'select',
    placeholder: '级别',
    width: '110px',
    options: [
      { label: '全部级别', value: '' },
      { label: '严重', value: '严重' },
      { label: '警告', value: '警告' },
      { label: '提示', value: '提示' },
    ],
  },
])

const canHandle = computed(
  () => hasPermission(userStore.context, 'alert:handle') || hasPermission(userStore.context, '*'),
)

const rows = computed(() =>
  dataStore.alerts.filter((a) => {
    const f = applied.value
    if (f.category && a.category !== f.category) return false
    if (f.status && a.status !== f.status) return false
    if (f.level && a.level !== f.level) return false
    if (f.keyword.trim()) {
      const k = f.keyword.trim().toLowerCase()
      const hit = [a.title, a.content, a.orgName].some((x) => (x || '').toLowerCase().includes(k))
      if (!hit) return false
    }
    return true
  }),
)
const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)
const resultCount = computed(() => rows.value.length)

function search() {
  applied.value = { ...draft.value }
}

function reset() {
  draft.value = { ...filterDefaults }
  applied.value = { ...filterDefaults }
}

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
  <PageShell tip="覆盖库存/定额、校验、环境、合规四类风险；支持穿透到台账、仓室、定额结果。">
    <PageHeader title="告警中心" />

    <FilterBar
      :fields="filterFields"
      :model-value="draft"
      :result-count="resultCount"
      :collapsible="false"
      @update:model-value="Object.assign(draft, $event)"
      @search="search"
      @reset="reset"
    />

    <el-table :data="pageData" border stripe>
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
      <template #empty><el-empty description="暂无告警" /></template>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>
</template>
