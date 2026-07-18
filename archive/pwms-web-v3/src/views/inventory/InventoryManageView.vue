<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { hasPermission } from '@/utils/permission'
import { isInventoryCenterOrg } from '@/utils/org'
import type { AssetCategory, InventoryPageAction } from '@/types'

const categoryOptions: { value: AssetCategory | 'all'; label: string }[] = [
  { value: 'spare', label: '备品备件' },
  { value: 'instrument', label: '仪器仪表' },
  { value: 'tool', label: '工器具' },
  { value: 'all', label: '全品类' },
]

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByOrg } = useDataScope()

const category = computed(() => route.meta.category as AssetCategory | undefined)
const aggregate = computed(() => Boolean(route.meta.aggregateAssets))
const action = computed(() => (route.meta.inventoryAction || 'progress') as InventoryPageAction)

const canDispatch = computed(() => hasPermission(userStore.context, 'inventory:dispatch'))
const canExecute = computed(() => hasPermission(userStore.context, 'inventory:execute'))

const tasks = computed(() => {
  let list = dataStore.inventoryTasks
  if (!aggregate.value && category.value) list = list.filter((t) => t.category === category.value)
  return scopeByOrg(list)
})

const roots = computed(() => tasks.value.filter((t) => !t.parentId))

const execTasks = computed(() =>
  tasks.value.filter((t) => t.level === 'team' || t.level === 'county' || t.level === 'warehouse'),
)

const dispatchVisible = ref(false)
const dispatchForm = reactive({
  taskName: '',
  centerOrgId: '',
  deadline: '',
  category: 'spare' as AssetCategory | 'all',
})

const centerOrgs = computed(() =>
  dataStore.organizations.filter((o) => isInventoryCenterOrg(o)),
)

function openDispatch() {
  dispatchForm.taskName = `${new Date().getFullYear()}年盘点计划`
  dispatchForm.centerOrgId = centerOrgs.value.find((o) => o.id === userStore.context.orgId)?.id || centerOrgs.value[0]?.id || ''
  dispatchForm.deadline = ''
  dispatchForm.category = category.value || 'spare'
  dispatchVisible.value = true
}

function doDispatch() {
  try {
    const cats: AssetCategory[] =
      category.value
        ? [category.value]
        : dispatchForm.category === 'all'
          ? ['spare', 'instrument', 'tool']
          : [dispatchForm.category]
    if (!cats.length) throw new Error('请选择物资类别')
    for (const cat of cats) {
      const label = categoryOptions.find((c) => c.value === cat)?.label || cat
      dataStore.dispatchInventoryTask({
        category: cat,
        taskName: cats.length > 1 ? `${dispatchForm.taskName}（${label}）` : dispatchForm.taskName,
        centerOrgId: dispatchForm.centerOrgId,
        assignee: userStore.displayName,
        deadline: dispatchForm.deadline || '2026-12-31',
      })
    }
    ElMessage.success(cats.length > 1 ? `已下达 ${cats.length} 类物资盘点计划` : '已按省市县层级下达盘点计划')
    dispatchVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

const activeTaskId = ref('')
const lines = computed(() =>
  dataStore.inventoryLineItems.filter((l) => l.taskId === activeTaskId.value),
)

const scanVisible = ref(false)
const photoVisible = ref(false)
const currentLineId = ref('')
const scanCode = ref('')
const actualQty = ref(0)
const photoPreview = ref('')

function openScan(lineId: string, book: number) {
  currentLineId.value = lineId
  actualQty.value = book
  scanCode.value = ''
  scanVisible.value = true
}

function submitScan() {
  const line = dataStore.inventoryLineItems.find((l) => l.id === currentLineId.value)
  if (!line) return
  const expect = line.physicalId || line.assetCode
  if (scanCode.value && scanCode.value !== expect && scanCode.value !== line.assetCode) {
    ElMessage.warning('扫码与账面实物不一致，仍可按实盘数登记差异')
  }
  try {
    dataStore.updateInventoryLine(currentLineId.value, actualQty.value, {
      checkMethod: 'scan',
      scanCode: scanCode.value || expect,
    })
    ElMessage.success('扫码盘点已登记')
    scanVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

function openPhoto(lineId: string, book: number) {
  currentLineId.value = lineId
  actualQty.value = book
  photoPreview.value = ''
  photoVisible.value = true
}

function onPhotoChange(file: { raw?: File }) {
  const raw = file.raw
  if (!raw) return
  const reader = new FileReader()
  reader.onload = () => {
    photoPreview.value = String(reader.result || '')
  }
  reader.readAsDataURL(raw)
}

function submitPhoto() {
  if (!photoPreview.value) {
    ElMessage.warning('请先拍照/选择图片')
    return
  }
  try {
    dataStore.updateInventoryLine(currentLineId.value, actualQty.value, {
      checkMethod: 'photo',
      photoDataUrl: photoPreview.value,
    })
    ElMessage.success('拍照盘点已登记')
    photoVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

function doPostLine(lineId: string) {
  try {
    dataStore.postInventoryAdjustment(lineId, userStore.displayName)
    ElMessage.success('差异已过账，台账数量已更新')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doPostTask() {
  if (!activeTaskId.value) return
  try {
    await ElMessageBox.confirm(
      '将对当前任务下全部「有差异」且未过账的明细调整台账数量并生成出入库流水，是否继续？',
      '批量过账确认',
      { type: 'warning' },
    )
    const n = dataStore.postInventoryTaskAdjustments(activeTaskId.value, userStore.displayName)
    ElMessage.success(`已过账 ${n} 条差异明细`)
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}

const pendingAdjustCount = computed(
  () =>
    dataStore.inventoryLineItems.filter(
      (l) => l.taskId === activeTaskId.value && l.status === '有差异' && !l.adjusted,
    ).length,
)

function progressPct(row: { totalCount: number; checkedCount: number }) {
  if (!row.totalCount) return 0
  return Math.min(100, Math.round((row.checkedCount / row.totalCount) * 100))
}

function childrenOf(id: string) {
  return tasks.value.filter((t) => t.parentId === id)
}

const treeData = computed(() =>
  roots.value.map((r) => ({
    ...r,
    children: childrenOf(r.id).map((c) => ({
      ...c,
      children: childrenOf(c.id),
    })),
  })),
)

const progressSummary = computed(() => {
  const rootsList = roots.value
  const leafs = execTasks.value
  const completed = leafs.filter((t) => t.status === '已完成').length
  const ongoing = leafs.filter((t) => t.status === '盘点中').length
  const pending = leafs.filter((t) => t.status === '待盘点').length
  const overdue = leafs.filter((t) => {
    if (t.status === '已完成' || !t.deadline) return false
    return t.deadline < new Date().toISOString().slice(0, 10)
  }).length
  const totalQty = rootsList.reduce((s, t) => s + t.totalCount, 0)
  const checkedQty = rootsList.reduce((s, t) => s + t.checkedCount, 0)
  const overall = totalQty ? Math.round((checkedQty / totalQty) * 100) : 0
  return { completed, ongoing, pending, overdue, overall, taskCount: leafs.length }
})

function isOverdue(row: { status: string; deadline: string }) {
  if (row.status === '已完成' || !row.deadline) return false
  return row.deadline < new Date().toISOString().slice(0, 10)
}

const pageDesc = computed(() => {
  if (action.value === 'plan') return '由省公司或地市公司下达盘点计划，系统按组织树逐级分解至县公司/班组。'
  if (action.value === 'execute')
    return '选择本单位执行任务，通过实物ID扫码或现场拍照登记实盘；有差异明细可过账回写台账并生成流水。'
  return '汇总各单位盘点完成率、逾期情况与层级进度，支撑督办管控。'
})
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="panel-actions">
        <div>
          <h3 class="page-title">
            {{ action === 'plan' ? '盘点计划下达' : action === 'execute' ? '执行盘点' : '进度管控' }}
          </h3>
          <p class="page-desc">{{ pageDesc }}</p>
        </div>
        <div class="panel-actions__right">
          <el-button v-if="action === 'plan' && canDispatch" type="primary" @click="openDispatch">
            下达计划
          </el-button>
          <el-button
            v-if="action === 'execute' && canExecute && activeTaskId && pendingAdjustCount > 0"
            type="warning"
            @click="doPostTask"
          >
            批量过账（{{ pendingAdjustCount }}）
          </el-button>
          <el-button
            v-if="action === 'progress'"
            @click="router.push(aggregate ? '/warehouse/inventory/execute' : `/${category || 'spare'}/inventory/execute`)"
          >
            去执行盘点
          </el-button>
        </div>
      </div>

      <div v-if="action === 'progress'" class="progress-kpis">
        <div class="pk">
          <div class="pk-label">整体完成率</div>
          <div class="pk-value">{{ progressSummary.overall }}%</div>
        </div>
        <div class="pk">
          <div class="pk-label">执行任务数</div>
          <div class="pk-value">{{ progressSummary.taskCount }}</div>
        </div>
        <div class="pk">
          <div class="pk-label">已完成</div>
          <div class="pk-value ok">{{ progressSummary.completed }}</div>
        </div>
        <div class="pk">
          <div class="pk-label">进行中</div>
          <div class="pk-value warn">{{ progressSummary.ongoing }}</div>
        </div>
        <div class="pk">
          <div class="pk-label">待盘点</div>
          <div class="pk-value">{{ progressSummary.pending }}</div>
        </div>
        <div class="pk">
          <div class="pk-label">已逾期</div>
          <div class="pk-value danger">{{ progressSummary.overdue }}</div>
        </div>
      </div>

      <template v-if="action === 'plan'">
        <el-table :data="treeData" row-key="id" default-expand-all border stripe>
          <el-table-column prop="taskName" label="计划名称" min-width="220" />
          <el-table-column prop="orgName" label="组织" width="140" />
          <el-table-column prop="level" label="层级" width="90" />
          <el-table-column prop="assignee" label="负责人" width="100" />
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column prop="deadline" label="截止" width="120" />
          <el-table-column prop="createTime" label="下达时间" width="170" />
        </el-table>
      </template>

      <template v-else-if="action === 'progress'">
        <el-table :data="treeData" row-key="id" default-expand-all border stripe>
          <el-table-column prop="taskName" label="任务" min-width="220" />
          <el-table-column prop="orgName" label="组织" width="140" />
          <el-table-column prop="level" label="层级" width="90" />
          <el-table-column label="完成进度" width="220">
            <template #default="{ row }">
              <el-progress
                :percentage="progressPct(row)"
                :stroke-width="10"
                :status="row.status === '已完成' ? 'success' : isOverdue(row) ? 'exception' : undefined"
              />
              <span class="prog-text">{{ row.checkedCount }}/{{ row.totalCount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag
                size="small"
                :type="row.status === '已完成' ? 'success' : row.status === '盘点中' ? 'warning' : 'info'"
              >
                {{ row.status }}
              </el-tag>
              <el-tag v-if="isOverdue(row)" size="small" type="danger" style="margin-left: 4px">逾期</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="deadline" label="截止" width="120" />
        </el-table>
      </template>

      <template v-else>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-table
              :data="execTasks"
              highlight-current-row
              height="520"
              @current-change="(r: any) => (activeTaskId = r?.id || '')"
            >
              <el-table-column prop="taskName" label="执行任务" min-width="160" />
              <el-table-column prop="status" label="状态" width="80" />
            </el-table>
          </el-col>
          <el-col :span="16">
            <el-empty v-if="!activeTaskId" description="请选择左侧执行任务" />
            <el-table v-else :data="lines" border stripe height="520">
              <el-table-column prop="assetCode" label="编码" width="120" />
              <el-table-column prop="assetName" label="名称" min-width="100" />
              <el-table-column prop="bookQuantity" label="账面" width="70" />
              <el-table-column prop="actualQuantity" label="实盘" width="70" />
              <el-table-column prop="status" label="结果" width="80">
                <template #default="{ row }">
                  <el-tag
                    size="small"
                    :type="row.status === '有差异' ? 'danger' : row.status === '已盘' ? 'success' : 'info'"
                  >
                    {{ row.status }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="过账" width="90">
                <template #default="{ row }">
                  <el-tag v-if="row.adjusted" size="small" type="success">已过账</el-tag>
                  <span v-else-if="row.status === '有差异'" class="muted">待过账</span>
                  <span v-else class="muted">—</span>
                </template>
              </el-table-column>
              <el-table-column prop="checkMethod" label="方式" width="80" />
              <el-table-column v-if="canExecute" label="操作" width="200">
                <template #default="{ row }">
                  <template v-if="!row.adjusted">
                    <el-button link type="primary" @click="openScan(row.id, row.bookQuantity)">扫码</el-button>
                    <el-button link type="primary" @click="openPhoto(row.id, row.bookQuantity)">拍照</el-button>
                  </template>
                  <el-button
                    v-if="row.status === '有差异' && !row.adjusted"
                    link
                    type="warning"
                    @click="doPostLine(row.id)"
                  >
                    过账
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-col>
        </el-row>
      </template>
    </div>

    <el-dialog v-model="dispatchVisible" title="下达盘点计划" width="480px">
      <el-form label-width="100px">
        <el-form-item label="计划名称"><el-input v-model="dispatchForm.taskName" /></el-form-item>
        <el-form-item v-if="aggregate || !category" label="物资类别">
          <el-select v-model="dispatchForm.category" style="width: 100%">
            <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="下达组织">
          <el-select v-model="dispatchForm.centerOrgId" style="width: 100%">
            <el-option v-for="o in centerOrgs" :key="o.id" :label="o.name" :value="o.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="dispatchForm.deadline" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dispatchVisible = false">取消</el-button>
        <el-button type="primary" @click="doDispatch">下达</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="scanVisible" title="扫码盘点" width="420px">
      <el-form label-width="90px">
        <el-form-item label="实物ID/编码"><el-input v-model="scanCode" placeholder="请扫描或录入实物ID" /></el-form-item>
        <el-form-item label="实盘数量"><el-input-number v-model="actualQty" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scanVisible = false">取消</el-button>
        <el-button type="primary" @click="submitScan">登记</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="photoVisible" title="拍照盘点" width="480px">
      <el-form label-width="90px">
        <el-form-item label="现场照片">
          <el-upload :auto-upload="false" :show-file-list="false" accept="image/*" :on-change="onPhotoChange">
            <el-button>选择/拍摄图片</el-button>
          </el-upload>
          <img v-if="photoPreview" :src="photoPreview" class="photo-preview" alt="preview" />
        </el-form-item>
        <el-form-item label="实盘数量"><el-input-number v-model="actualQty" :min="0" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="photoVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPhoto">登记</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.prog-text { margin-left: 8px; font-size: 12px; color: var(--pwms-text-secondary); }
.muted { color: var(--pwms-text-secondary); font-size: 12px; }
.photo-preview { display: block; margin-top: 8px; max-width: 100%; max-height: 200px; border-radius: 6px; }

.progress-kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;

  .pk {
    background: var(--pwms-panel-elevated);
    border: 1px solid var(--pwms-border);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  }
  .pk-label {
    font-size: 12px;
    color: var(--pwms-text-secondary);
  }
  .pk-value {
    margin-top: 6px;
    font-size: 22px;
    font-weight: 700;
    color: var(--pwms-primary);
    &.ok { color: var(--el-color-success); }
    &.warn { color: var(--el-color-warning); }
    &.danger { color: var(--el-color-danger); }
  }
}

@media (max-width: 1100px) {
  .progress-kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
