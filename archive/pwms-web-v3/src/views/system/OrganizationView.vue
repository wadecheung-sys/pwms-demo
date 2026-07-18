<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/FilterBar.vue'
import type { FilterField } from '@/components/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { useDataStore } from '@/stores/data'
import { matchExact, matchKeyword } from '@/utils/filter'
import {
  formatOrgOptionLabel,
  getOrgDescendantIds,
  getValidParentOptions,
  orgTypeLabels,
  orgTypeTagType,
} from '@/utils/org'
import type { Organization, OrgType } from '@/types'

const dataStore = useDataStore()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const selectedTreeOrgId = ref<string | null>(null)
const treeRef = ref()

const orgTypeOptions = (Object.keys(orgTypeLabels) as OrgType[]).map((type) => ({
  label: orgTypeLabels[type],
  value: type,
}))

const filterDefaults = { keyword: '', type: '' }
const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(filterDefaults, (item, f) => {
  const o = item as Organization
  const inTree =
    !selectedTreeOrgId.value ||
    getOrgDescendantIds(dataStore.organizations, selectedTreeOrgId.value, true).includes(o.id)
  return (
    inTree &&
    matchExact(o.type, f.type as string) &&
    matchKeyword(f.keyword as string, o.name, o.code, o.shortName, o.leader, o.phone)
  )
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '名称/编码/负责人', width: '200px' },
  {
    key: 'type',
    type: 'select',
    placeholder: '组织类型',
    options: [{ label: '全部类型', value: '' }, ...orgTypeOptions],
    width: '150px',
  },
])

const treeData = computed(() => dataStore.getOrgTree())
const tableData = computed(() => filterListWithCount(dataStore.organizations))

const form = reactive({
  name: '',
  code: '',
  type: 'city' as OrgType,
  parentId: null as string | null,
  shortName: '',
  leader: '',
  phone: '',
})

const parentOptions = computed(() =>
  getValidParentOptions(dataStore.organizations, form.type, editingId.value),
)

const rules: FormRules = {
  name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入组织编码', trigger: 'blur' }],
  type: [{ required: true, message: '请选择组织类型', trigger: 'change' }],
}

watch(
  () => form.type,
  (type) => {
    if (type === 'division') {
      form.parentId = null
      return
    }
    if (form.parentId && !parentOptions.value.some((o) => o.id === form.parentId)) {
      form.parentId = parentOptions.value[0]?.id ?? null
    }
  },
)

function openDialog(row?: Organization) {
  editingId.value = row?.id ?? null
  if (row) {
    Object.assign(form, {
      name: row.name,
      code: row.code,
      type: row.type,
      parentId: row.parentId,
      shortName: row.shortName ?? '',
      leader: row.leader ?? '',
      phone: row.phone ?? '',
    })
  } else {
    Object.assign(form, {
      name: '',
      code: '',
      type: 'city',
      parentId: selectedTreeOrgId.value,
      shortName: '',
      leader: '',
      phone: '',
    })
  }
  dialogVisible.value = true
}

function handleTreeClick(data: Organization) {
  selectedTreeOrgId.value = selectedTreeOrgId.value === data.id ? null : data.id
  search()
}

function clearTreeFilter() {
  selectedTreeOrgId.value = null
  treeRef.value?.setCurrentKey(null)
  search()
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    const payload = {
      name: form.name,
      code: form.code,
      type: form.type,
      parentId: form.type === 'division' ? null : form.parentId,
      shortName: form.shortName || undefined,
      leader: form.leader || undefined,
      phone: form.phone || undefined,
    }
    if (editingId.value) {
      dataStore.updateOrganization(editingId.value, payload)
      ElMessage.success('组织已更新')
    } else {
      dataStore.addOrganization(payload)
      ElMessage.success('组织已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(row: Organization) {
  await ElMessageBox.confirm(`确定删除组织「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    dataStore.removeOrganization(row.id)
    if (selectedTreeOrgId.value === row.id) clearTreeFilter()
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <div class="page-container org-page">
    <div class="org-layout">
      <div class="page-panel org-tree-panel">
        <div class="panel-header">
          <span class="panel-title">组织树</span>
          <el-button v-if="selectedTreeOrgId" link type="primary" size="small" @click="clearTreeFilter">
            清除筛选
          </el-button>
        </div>
        <el-tree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          :props="{ label: 'name', children: 'children' }"
          @node-click="handleTreeClick"
        >
          <template #default="{ data }">
            <span class="tree-node">
              <span class="tree-node__name">{{ data.name }}</span>
              <el-tag size="small" :type="orgTypeTagType[data.type as OrgType]" effect="plain">
                {{ orgTypeLabels[data.type as OrgType] }}
              </el-tag>
            </span>
          </template>
        </el-tree>
      </div>

      <div class="page-panel org-table-panel">
        <div class="panel-actions">
          <div class="panel-hint">东北分部 → 省公司 → 地市公司 → 县公司 → 班组</div>
          <div class="panel-actions__right">
            <el-button type="primary" @click="openDialog()">
              <el-icon><Plus /></el-icon>
              新增组织
            </el-button>
          </div>
        </div>

        <FilterBar
          :fields="filterFields"
          :model-value="draft"
          :result-count="resultCount"
          @update:model-value="Object.assign(draft, $event)"
          @search="search"
          @reset="reset"
        />

        <el-table :data="tableData" row-key="id" stripe border>
          <el-table-column prop="code" label="组织编码" width="120" />
          <el-table-column prop="name" label="组织名称" min-width="160" />
          <el-table-column prop="type" label="类型" width="110" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="orgTypeTagType[row.type as OrgType]">
                {{ orgTypeLabels[row.type as OrgType] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="level" label="层级" width="70" align="center" />
          <el-table-column prop="leader" label="负责人" width="100" />
          <el-table-column prop="phone" label="联系电话" width="140" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑组织' : '新增组织'" width="560px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="组织名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="组织编码" prop="code"><el-input v-model="form.code" placeholder="如 SY-CITY" /></el-form-item>
        <el-form-item label="组织类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="opt in orgTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.type !== 'division'" label="上级组织" prop="parentId">
          <el-select v-model="form.parentId" placeholder="请选择上级组织" style="width: 100%" filterable>
            <el-option
              v-for="org in parentOptions"
              :key="org.id"
              :label="formatOrgOptionLabel(org)"
              :value="org.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="简称"><el-input v-model="form.shortName" placeholder="可选" /></el-form-item>
        <el-form-item label="负责人"><el-input v-model="form.leader" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.org-page {
  height: 100%;
}

.org-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  min-height: calc(100vh - 140px);
}

.org-tree-panel {
  width: 300px;
  flex-shrink: 0;
}

.org-table-panel {
  flex: 1;
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.panel-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.tree-node__name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
