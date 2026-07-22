<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { usePagination } from '@/composables/usePagination'
import type { AssetCategory, CheckCycleSetting } from '@/types'
import { categoryLabels } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const dataStore = useDataStore()
const rows = computed(() => dataStore.checkCycleSettings)
const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)

const dialog = ref(false)
const form = reactive({
  id: '',
  category: 'spare' as AssetCategory,
  typeName: '',
  cycleDays: 365,
  checkKind: 'trial' as CheckCycleSetting['checkKind'],
})

function openCreate() {
  form.id = ''
  form.category = 'spare'
  form.typeName = ''
  form.cycleDays = 365
  form.checkKind = 'trial'
  dialog.value = true
}

function openEdit(row: CheckCycleSetting) {
  Object.assign(form, row)
  dialog.value = true
}

function onCategoryChange() {
  form.checkKind = form.category === 'spare' ? 'trial' : 'calibration'
}

function save() {
  if (!form.typeName.trim()) {
    ElMessage.error('请填写物资类型名称')
    return
  }
  dataStore.saveCheckCycleSetting({
    id: form.id || undefined,
    category: form.category,
    typeName: form.typeName.trim(),
    cycleDays: form.cycleDays,
    checkKind: form.checkKind,
  })
  ElMessage.success('已保存')
  dialog.value = false
}

function remove(id: string) {
  dataStore.removeCheckCycleSetting(id)
  ElMessage.success('已删除')
}
</script>

<template>
  <PageShell tip="按物资类型设定试验/检定周期（天）。保存后立即重算台账合格/临期/超期与是否可用。">
    <PageHeader title="检定试验周期设置">
      <template #actions>
        <el-button type="primary" @click="openCreate">新增</el-button>
      </template>
    </PageHeader>
    <el-table :data="pageData" stripe border>
      <el-table-column label="类别" width="110">
        <template #default="{ row }">{{ categoryLabels[row.category as AssetCategory] }}</template>
      </el-table-column>
      <el-table-column prop="typeName" label="物资类型" min-width="140" />
      <el-table-column label="检测类型" width="100">
        <template #default="{ row }">{{ row.checkKind === 'trial' ? '试验' : '检定' }}</template>
      </el-table-column>
      <el-table-column prop="cycleDays" label="周期(天)" width="100" />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />

    <el-dialog v-model="dialog" title="周期设置" width="440px">
      <el-form label-width="100px">
        <el-form-item label="物资类别">
          <el-select v-model="form.category" style="width: 100%" @change="onCategoryChange">
            <el-option label="备品备件" value="spare" />
            <el-option label="仪器仪表" value="instrument" />
            <el-option label="工器具" value="tool" />
          </el-select>
        </el-form-item>
        <el-form-item label="物资类型">
          <el-input v-model="form.typeName" placeholder="如：熔断器 / 压力表" />
        </el-form-item>
        <el-form-item label="检测类型">
          <el-select v-model="form.checkKind" style="width: 100%">
            <el-option label="试验" value="trial" />
            <el-option label="检定" value="calibration" />
          </el-select>
        </el-form-item>
        <el-form-item label="周期(天)">
          <el-input-number v-model="form.cycleDays" :min="1" :max="3650" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>
