<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { usePagination } from '@/composables/usePagination'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { matchKeyword } from '@/utils/pwms/filter'
import type { Role } from '@/types'

const dataStore = useDataStore()
const userStore = useUserStore()
const dialogVisible = ref(false)
const permVisible = ref(false)
const editingId = ref<string | null>(null)
const selectedRole = ref<Role | null>(null)
const formRef = ref<FormInstance>()
const selectedPerms = ref<string[]>([])

const filterDefaults = { keyword: '' }
const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(filterDefaults, (item, f) => {
  const r = item as Role
  return matchKeyword(f.keyword as string, r.name, r.code, r.description)
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '角色名称/编码/描述', width: '240px' },
])

const tableData = computed(() => filterListWithCount(dataStore.roles))
const { currentPage, pageSize, total, pageData } = usePagination(tableData, 10)

const form = reactive({ name: '', code: '', description: '' })
const rules: FormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
}

const allPermissions = [
  { group: '生产仓', items: ['warehouse:view', 'warehouse:edit'] },
  { group: '台账管理', items: ['ledger:view', 'ledger:edit'] },
  { group: '出入库', items: ['inout:view', 'inout:edit', 'inout:apply', 'inout:approve', 'inout:confirm'] },
  { group: '故障维修', items: ['fault:view', 'fault:edit', 'maintenance:view', 'maintenance:edit'] },
  { group: '盘点', items: ['inventory:view', 'inventory:dispatch', 'inventory:execute'] },
  { group: '定额', items: ['quota:view', 'quota:edit'] },
  { group: '告警', items: ['alert:view', 'alert:handle'] },
  { group: '系统设置', items: ['system:org', 'system:role', 'system:user'] },
]

function openDialog(row?: Role) {
  editingId.value = row?.id ?? null
  if (row) Object.assign(form, { name: row.name, code: row.code, description: row.description })
  else Object.assign(form, { name: '', code: '', description: '' })
  dialogVisible.value = true
}

function openPermission(role: Role) {
  selectedRole.value = role
  selectedPerms.value = role.permissions.includes('*') ? ['*'] : [...role.permissions]
  permVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editingId.value) {
    dataStore.updateRole(editingId.value, { ...form })
    ElMessage.success('角色已更新')
  } else {
    dataStore.addRole({ ...form, permissions: [] })
    ElMessage.success('角色已新增')
  }
  userStore.syncSession()
  dialogVisible.value = false
}

function handlePermSave() {
  if (!selectedRole.value) return
  const perms = selectedPerms.value.includes('*') ? ['*'] : selectedPerms.value
  dataStore.updateRole(selectedRole.value.id, { permissions: perms })
  userStore.syncSession()
  ElMessage.success('权限已保存')
  permVisible.value = false
}

async function handleDelete(row: Role) {
  await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    dataStore.removeRole(row.id)
    userStore.syncSession()
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <PageShell tip="配置业务角色与功能权限，人员账号通过角色获得操作范围。">
    <PageHeader title="角色权限">
      <template #actions>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增角色</el-button>
      </template>
    </PageHeader>

    <FilterBar :fields="filterFields" :model-value="draft" :result-count="resultCount" @update:model-value="Object.assign(draft, $event)" @search="search" @reset="reset" />

    <el-table :data="pageData" stripe border>
      <el-table-column prop="name" label="角色名称" width="140" />
      <el-table-column prop="code" label="角色编码" width="160" />
      <el-table-column prop="description" label="描述" min-width="200" />
      <el-table-column label="权限范围" min-width="200">
        <template #default="{ row }">
          <el-tag v-if="row.permissions.includes('*')" type="danger" size="small">全部权限</el-tag>
          <template v-else>
            <el-tag v-for="p in row.permissions" :key="p" size="small" style="margin: 2px">{{ p }}</el-tag>
          </template>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" size="small" plain @click="openDialog(row)">编辑</el-button>
            <el-button type="primary" size="small" plain @click="openPermission(row)">配置权限</el-button>
            <el-button type="danger" size="small" plain @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无角色数据" /></template>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑角色' : '新增角色'" width="520px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="角色名称" prop="name"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="角色编码" prop="code"><el-input v-model="form.code" /></el-form-item>
      <el-form-item label="描述"><el-input v-model="form.description" type="textarea" :rows="2" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="permVisible" :title="'配置权限 - ' + (selectedRole?.name ?? '')" width="560px">
    <el-checkbox v-model="selectedPerms" label="*" @change="selectedPerms = ['*']">全部权限</el-checkbox>
    <template v-if="!selectedPerms.includes('*')">
      <div v-for="group in allPermissions" :key="group.group" class="perm-group">
        <div class="perm-title">{{ group.group }}</div>
        <el-checkbox-group v-model="selectedPerms">
          <el-checkbox v-for="item in group.items" :key="item" :label="item" :value="item" />
        </el-checkbox-group>
      </div>
    </template>
    <template #footer>
      <el-button @click="permVisible = false">取消</el-button>
      <el-button type="primary" @click="handlePermSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.perm-group {
  margin-bottom: 16px;

  .perm-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--pwms-text-secondary);
  }
}
</style>
