<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { usePagination } from '@/composables/usePagination'
import { useDataStore } from '@/stores/data'
import { matchExact, matchKeyword, uniqueOptions } from '@/utils/pwms/filter'
import type { AssetCategory, DeviceType, SpecialtyType } from '@/types'
import { specialtyOptions } from '@/types'

const route = useRoute()
const dataStore = useDataStore()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const category = computed(() => route.path.split('/').pop() as AssetCategory)
const categoryData = computed(() => dataStore.deviceTypes.filter((d) => d.category === category.value))

const filterDefaults = { keyword: '', unit: '', specialty: '' }
const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(filterDefaults, (item, f) => {
  const d = item as DeviceType
  return (
    matchExact(d.unit, f.unit as string) &&
    matchExact(d.specialty || '', f.specialty as string) &&
    matchKeyword(f.keyword as string, d.name, d.code, d.description)
  )
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '类型名称/编码/说明', width: '200px' },
  {
    key: 'specialty',
    type: 'select',
    placeholder: '专业',
    options: uniqueOptions(categoryData.value.map((d) => d.specialty || ''), '全部专业'),
    width: '120px',
  },
  {
    key: 'unit',
    type: 'select',
    placeholder: '计量单位',
    options: uniqueOptions(categoryData.value.map((d) => d.unit), '全部单位'),
    width: '130px',
  },
])

const tableData = computed(() => filterListWithCount(categoryData.value))
const { currentPage, pageSize, total, pageData } = usePagination(tableData, 10)

/** 按专业分组展示 */
const groupedPageData = computed(() => {
  const groups = new Map<string, DeviceType[]>()
  for (const row of pageData.value) {
    const key = row.specialty || '未分类'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  return [...groups.entries()].map(([specialty, rows]) => ({ specialty, rows }))
})

const form = reactive({
  code: '',
  name: '',
  unit: '',
  specialty: '综合' as SpecialtyType,
  description: '',
})
const rules: FormRules = {
  code: [{ required: true, message: '请输入类型编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入类型名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入计量单位', trigger: 'blur' }],
  specialty: [{ required: true, message: '请选择专业', trigger: 'change' }],
}

function openDialog(row?: DeviceType) {
  editingId.value = row?.id ?? null
  if (row) {
    Object.assign(form, {
      code: row.code,
      name: row.name,
      unit: row.unit,
      specialty: row.specialty || '综合',
      description: row.description,
    })
  } else {
    Object.assign(form, { code: '', name: '', unit: '', specialty: '综合', description: '' })
  }
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
  <PageShell tip="维护设备类型编码、名称、专业分类与计量单位，按专业分组展示，供台账与出入库选用。">
    <PageHeader title="设备类型">
      <template #actions>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增类型</el-button>
      </template>
    </PageHeader>

    <FilterBar
      :fields="filterFields"
      :model-value="draft"
      :result-count="resultCount"
      @update:model-value="Object.assign(draft, $event)"
      @search="search"
      @reset="reset"
    />

    <div v-for="group in groupedPageData" :key="group.specialty" class="specialty-group">
      <div class="group-head">
        <span class="group-title">{{ group.specialty }}</span>
        <span class="group-count">{{ group.rows.length }} 项</span>
      </div>
      <el-table :data="group.rows" stripe border>
        <el-table-column prop="code" label="类型编码" width="110" />
        <el-table-column prop="name" label="类型名称" width="120" />
        <el-table-column prop="specialty" label="专业" width="90" align="center" />
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
        <template #empty><el-empty description="暂无设备类型" /></template>
      </el-table>
    </div>
    <el-empty v-if="!groupedPageData.length" description="暂无设备类型" />
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑设备类型' : '新增设备类型'" width="520px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="类型编码" prop="code"><el-input v-model="form.code" placeholder="如 WH-007" /></el-form-item>
      <el-form-item label="类型名称" prop="name"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="专业分类" prop="specialty">
        <el-select v-model="form.specialty" style="width: 100%">
          <el-option v-for="s in specialtyOptions" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="计量单位" prop="unit"><el-input v-model="form.unit" placeholder="如 台、套、个" /></el-form-item>
      <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="3" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.specialty-group {
  margin-bottom: 20px;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--pwms-text, var(--el-text-color-primary));
}
.group-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
