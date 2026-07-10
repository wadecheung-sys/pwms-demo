<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/FilterBar.vue'
import PageToolbar from '@/components/PageToolbar.vue'
import type { FilterField } from '@/components/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { useDataStore } from '@/stores/data'
import { matchExact, matchKeyword } from '@/utils/filter'
import type { Person } from '@/types'

const dataStore = useDataStore()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const filterDefaults = { keyword: '', orgId: '', roleId: '', status: '' }

const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(
  filterDefaults,
  (item, f) => {
    const p = item as Person
    return (
      matchExact(p.orgId, f.orgId as string) &&
      matchExact(p.roleId, f.roleId as string) &&
      matchExact(p.status, f.status as string) &&
      matchKeyword(f.keyword as string, p.name, p.employeeNo, p.orgName, p.phone)
    )
  },
)

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '姓名/工号/电话', width: '180px' },
  {
    key: 'orgId',
    type: 'select',
    placeholder: '组织机构',
    options: [{ label: '全部组织', value: '' }, ...dataStore.organizations.map((o) => ({ label: o.name, value: o.id }))],
    width: '150px',
  },
  {
    key: 'roleId',
    type: 'select',
    placeholder: '角色',
    options: [{ label: '全部角色', value: '' }, ...dataStore.roles.map((r) => ({ label: r.name, value: r.id }))],
    width: '140px',
  },
  {
    key: 'status',
    type: 'select',
    placeholder: '状态',
    options: [{ label: '全部', value: '' }, { label: '在职', value: '在职' }, { label: '离职', value: '离职' }],
    width: '120px',
  },
])

const tableData = computed(() => filterListWithCount(dataStore.persons))

const exportColumns = [
  { key: 'employeeNo', label: '工号' },
  { key: 'name', label: '姓名' },
  { key: 'orgName', label: '所属组织' },
  { key: 'roleName', label: '角色' },
  { key: 'phone', label: '联系电话' },
  { key: 'status', label: '状态' },
]
const exportData = computed(() => tableData.value as Record<string, unknown>[])

const form = reactive({
  name: '',
  employeeNo: '',
  orgId: '',
  roleId: '',
  phone: '',
  status: '在职' as Person['status'],
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  employeeNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  orgId: [{ required: true, message: '请选择组织', trigger: 'change' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

function openDialog(row?: Person) {
  editingId.value = row?.id ?? null
  if (row) Object.assign(form, { name: row.name, employeeNo: row.employeeNo, orgId: row.orgId, roleId: row.roleId, phone: row.phone, status: row.status })
  else Object.assign(form, { name: '', employeeNo: '', orgId: '', roleId: '', phone: '', status: '在职' })
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    if (editingId.value) {
      dataStore.updatePerson(editingId.value, { ...form })
      ElMessage.success('人员信息已更新')
    } else {
      dataStore.addPerson({ ...form })
      ElMessage.success('人员已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(row: Person) {
  await ElMessageBox.confirm(`确定删除人员「${row.name}」吗？`, '提示', { type: 'warning' })
  dataStore.removePerson(row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="panel-actions">
        <PageToolbar title="人员管理" filename="人员管理" :columns="exportColumns" :data="exportData" />
        <div class="panel-actions__right">
          <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增人员</el-button>
        </div>
      </div>

      <FilterBar :fields="filterFields" :model-value="draft" :result-count="resultCount" @update:model-value="Object.assign(draft, $event)" @search="search" @reset="reset" />

      <el-table :data="tableData" stripe border>
        <el-table-column prop="employeeNo" label="工号" width="100" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="orgName" label="所属组织" min-width="130" />
        <el-table-column prop="roleName" label="角色" width="120" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === '在职' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑人员' : '新增人员'" width="520px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="姓名" prop="name"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="工号" prop="employeeNo"><el-input v-model="form.employeeNo" /></el-form-item>
        <el-form-item label="组织机构" prop="orgId">
          <el-select v-model="form.orgId" style="width: 100%">
            <el-option v-for="org in dataStore.organizations" :key="org.id" :label="org.name" :value="org.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" style="width: 100%">
            <el-option v-for="role in dataStore.roles" :key="role.id" :label="role.name" :value="role.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="在职" value="在职" /><el-option label="离职" value="离职" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
