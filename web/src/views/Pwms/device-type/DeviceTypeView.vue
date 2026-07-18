<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { useDataStore } from '@/stores/data'
import { matchExact, matchKeyword, uniqueOptions } from '@/utils/pwms/filter'
import type { AssetCategory, DeviceType } from '@/types'

const route = useRoute()
const dataStore = useDataStore()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const category = computed(() => route.path.split('/').pop() as AssetCategory)
const categoryData = computed(() => dataStore.deviceTypes.filter((d) => d.category === category.value))

const filterDefaults = { keyword: '', unit: '' }
const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(filterDefaults, (item, f) => {
  const d = item as DeviceType
  return matchExact(d.unit, f.unit as string) && matchKeyword(f.keyword as string, d.name, d.code, d.description)
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '类型名称/编码/说明', width: '200px' },
  { key: 'unit', type: 'select', placeholder: '计量单位', options: uniqueOptions(categoryData.value.map((d) => d.unit), '全部单位'), width: '130px' },
])

const tableData = computed(() => filterListWithCount(categoryData.value))

const form = reactive({ code: '', name: '', unit: '', description: '' })
const rules: FormRules = {
  code: [{ required: true, message: '请输入类型编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入计量单位', trigger: 'blur' }],
}

function openDialog(row?: DeviceType) {
  editingId.value = row?.id ?? null
  if (row) Object.assign(form, { code: row.code, name: row.name, unit: row.unit, description: row.description })
  else Object.assign(form, { code: '', name: '', unit: '', description: '' })
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  try {
    if (editingId.value) {
      dataStore.updateDeviceType(editingId.value, { ...form })
      ElMessage.success('设备类型已更新')
    } else {
      dataStore.addDeviceType({ category: category.value, ...form })
      ElMessage.success('设备类型已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(row: DeviceType) {
  await ElMessageBox.confirm(`确定删除类型「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    dataStore.removeDeviceType(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <PageShell tip="维护设备类型编码、名称与计量单位，供台账与出入库选用。">
    <PageHeader title="设备类型">
      <template #actions>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增类型</el-button>
      </template>
    </PageHeader>

    <FilterBar :fields="filterFields" :model-value="draft" :result-count="resultCount" @update:model-value="Object.assign(draft, $event)" @search="search" @reset="reset" />

    <el-table :data="tableData" stripe border>
      <el-table-column prop="code" label="类型编码" width="110" />
      <el-table-column prop="name" label="类型名称" width="120" />
      <el-table-column prop="unit" label="计量单位" width="90" align="center" />
      <el-table-column prop="description" label="说明" min-width="200" />
      <el-table-column label="操作" width="168" fixed="right">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" size="small" plain @click="openDialog(row)">编辑</el-button>
            <el-button type="danger" size="small" plain @click="handleDelete(row)">删除</el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </PageShell>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑设备类型' : '新增设备类型'" width="520px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="类型编码" prop="code"><el-input v-model="form.code" placeholder="如 WH-007" /></el-form-item>
      <el-form-item label="类型名称" prop="name"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="计量单位" prop="unit"><el-input v-model="form.unit" placeholder="如 台、套、个" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>
