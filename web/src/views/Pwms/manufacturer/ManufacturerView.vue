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
import type { Manufacturer } from '@/types'

const route = useRoute()
const dataStore = useDataStore()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const category = computed(() => {
  const seg = route.path.split('/').pop() ?? 'spare'
  return (['spare', 'instrument', 'tool'].includes(seg) ? seg : 'spare') as Manufacturer['category']
})

const categoryData = computed(() => dataStore.manufacturers.filter((m) => m.category === category.value))

const filterDefaults = { keyword: '', qualification: '' }

const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(filterDefaults, (item, f) => {
  const m = item as Manufacturer
  return matchExact(m.qualification, f.qualification as string) && matchKeyword(f.keyword as string, m.name, m.contact, m.phone, m.address)
})

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '厂家名称/联系人/地址', width: '200px' },
  { key: 'qualification', type: 'select', placeholder: '资质', options: uniqueOptions(categoryData.value.map((m) => m.qualification), '全部资质'), width: '140px' },
])

const tableData = computed(() => filterListWithCount(categoryData.value))

const form = reactive({ name: '', contact: '', phone: '', address: '', qualification: '' })
const rules: FormRules = {
  name: [{ required: true, message: '请输入厂家名称', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
}

function openDialog(row?: Manufacturer) {
  editingId.value = row?.id ?? null
  if (row) Object.assign(form, row)
  else Object.assign(form, { name: '', contact: '', phone: '', address: '', qualification: '' })
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (editingId.value) {
    dataStore.updateManufacturer(editingId.value, { ...form })
    ElMessage.success('厂家信息已更新')
  } else {
    dataStore.addManufacturer({ category: category.value, ...form })
    ElMessage.success('厂家已新增')
  }
  dialogVisible.value = false
}

async function handleDelete(row: Manufacturer) {
  await ElMessageBox.confirm(`确定删除厂家「${row.name}」吗？`, '提示', { type: 'warning' })
  dataStore.removeManufacturer(row.id)
  ElMessage.success('已删除')
}
</script>

<template>
  <PageShell tip="维护厂家基础信息与资质，供台账与出入库关联选用。">
    <PageHeader title="厂家管理">
      <template #actions>
        <el-button type="primary" @click="openDialog()"><el-icon><Plus /></el-icon> 新增厂家</el-button>
      </template>
    </PageHeader>

    <FilterBar :fields="filterFields" :model-value="draft" :result-count="resultCount" @update:model-value="Object.assign(draft, $event)" @search="search" @reset="reset" />

    <el-table :data="tableData" stripe border>
      <el-table-column prop="name" label="厂家名称" min-width="160" />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column prop="phone" label="联系电话" width="130" />
      <el-table-column prop="address" label="地址" min-width="160" />
      <el-table-column prop="qualification" label="资质" width="120" />
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

  <el-dialog v-model="dialogVisible" :title="editingId ? '编辑厂家' : '新增厂家'" width="520px" destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
      <el-form-item label="厂家名称" prop="name"><el-input v-model="form.name" /></el-form-item>
      <el-form-item label="联系人" prop="contact"><el-input v-model="form.contact" /></el-form-item>
      <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
      <el-form-item label="地址"><el-input v-model="form.address" /></el-form-item>
      <el-form-item label="资质"><el-input v-model="form.qualification" placeholder="如 ISO9001" /></el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>
