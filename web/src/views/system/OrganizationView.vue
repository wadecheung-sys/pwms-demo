<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/FilterBar.vue'
import type { FilterField } from '@/components/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { useDataStore } from '@/stores/data'
import { matchExact, matchKeyword } from '@/utils/filter'
import type { Organization } from '@/types'

const dataStore = useDataStore()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const filterDefaults = { keyword: '', level: '' }
const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(filterDefaults, (item, f) => {
  const o = item as Organization
  return matchExact(String(o.level), f.level as string) && matchKeyword(f.keyword as string, o.name, o.leader, o.phone)
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '组织名称/负责人', width: '200px' },
  {
    key: 'level',
    type: 'select',
    placeholder: '组织层级',
    options: [
      { label: '全部层级', value: '' },
      { label: '一级（集团）', value: '1' },
      { label: '二级（中心）', value: '2' },
      { label: '三级（生产仓）', value: '3' },
    ],
    width: '150px',
  },
])

const tableData = computed(() => filterListWithCount(dataStore.organizations))

const form = reactive({ name: '', parentId: '' as string | null, leader: '', phone: '' })
const rules: FormRules = { name: [{ required: true, message: '请输入组织名称', trigger: 'blur' }] }

function openDialog(row?: Organization) {
  editingId.value = row?.id ?? null
  if (row) Object.assign(form, { name: row.name, parentId: row.parentId, leader: row.leader ?? '', phone: row.phone ?? '' })
  else Object.assign(form, { name: '', parentId: null, leader: '', phone: '' })
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    if (editingId.value) {
      dataStore.updateOrganization(editingId.value, { name: form.name, parentId: form.parentId, leader: form.leader, phone: form.phone })
      ElMessage.success('组织已更新')
    } else {
      dataStore.addOrganization({ name: form.name, parentId: form.parentId || null, leader: form.leader, phone: form.phone })
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
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="panel-actions">
        <div />
        <div class="panel-actions__right">
          <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增组织</el-button>
        </div>
      </div>

      <FilterBar :fields="filterFields" :model-value="draft" :result-count="resultCount" @update:model-value="Object.assign(draft, $event)" @search="search" @reset="reset" />

      <el-table :data="tableData" row-key="id" stripe border>
        <el-table-column prop="name" label="组织名称" min-width="180">
          <template #default="{ row }">
            <span :style="{ paddingLeft: (row.level - 1) * 16 + 'px' }">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="level" label="层级" width="80" align="center" />
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑组织' : '新增组织'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="组织名称" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="上级组织">
          <el-select v-model="form.parentId" placeholder="无则为顶级" style="width: 100%" clearable>
            <el-option v-for="org in dataStore.organizations.filter((o) => o.id !== editingId)" :key="org.id" :label="org.name" :value="org.id" />
          </el-select>
        </el-form-item>
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
