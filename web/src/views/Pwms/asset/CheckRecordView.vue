<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { usePagination } from '@/composables/usePagination'
import { findCycleSetting, nextDueDateFrom } from '@/utils/pwms/ledgerFlags'
import type { AssetCategory, CheckRecord } from '@/types'
import { categoryLabels } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const route = useRoute()
const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByAssets } = useDataScope()

const category = computed(() => route.meta.category as AssetCategory)
const checkKind = computed(() => (category.value === 'spare' ? 'trial' : 'calibration') as CheckRecord['checkKind'])
const title = computed(() => (checkKind.value === 'trial' ? '试验记录' : '检定记录'))

const rows = computed(() =>
  scopeByAssets(
    dataStore.checkRecords.filter((r) => r.category === category.value && r.checkKind === checkKind.value),
  ),
)

const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)

const dialog = ref(false)
const form = reactive({
  assetCode: '',
  checkDate: '',
  nextDueDate: '',
  result: '合格' as CheckRecord['result'],
  remark: '',
})

const ledgers = computed(() =>
  dataStore.ledgers.filter((l) => l.category === category.value && l.status !== '报废'),
)

const stats = computed(() => {
  const list = rows.value
  const pass = list.filter((r) => r.result === '合格').length
  return { total: list.length, pass, fail: list.length - pass }
})

function openCreate() {
  form.assetCode = ledgers.value[0]?.assetCode || ''
  form.checkDate = new Date().toISOString().slice(0, 10)
  form.nextDueDate = ''
  form.result = '合格'
  form.remark = ''
  onAssetOrDateChange()
  dialog.value = true
}

function onAssetOrDateChange() {
  const ledger = dataStore.getLedgerByCode(form.assetCode)
  if (!ledger || !form.checkDate) return
  const setting = findCycleSetting(dataStore.checkCycleSettings, ledger)
  form.nextDueDate = nextDueDateFrom(form.checkDate, setting?.cycleDays || 365)
}

function save() {
  const ledger = dataStore.getLedgerByCode(form.assetCode)
  if (!ledger) {
    ElMessage.error('请选择资产')
    return
  }
  if (!form.nextDueDate) onAssetOrDateChange()
  dataStore.addCheckRecord({
    category: category.value,
    assetCode: ledger.assetCode,
    assetName: ledger.name,
    checkKind: checkKind.value,
    checkDate: form.checkDate,
    nextDueDate: form.nextDueDate || form.checkDate,
    result: form.result,
    operator: userStore.displayName,
    orgName: ledger.orgName,
    remark: form.remark,
  })
  ElMessage.success('已保存，台账合格状态已按周期刷新')
  dialog.value = false
}
</script>

<template>
  <PageShell :tip="`${categoryLabels[category]}的${title}：先看汇总，再维护明细；超期将影响出库可用性。`">
    <PageHeader :title="title">
      <template #actions>
        <el-button type="primary" @click="openCreate">新增记录</el-button>
      </template>
    </PageHeader>

    <div class="kpi-row">
      <el-tag type="info">合计 {{ stats.total }}</el-tag>
      <el-tag type="success">合格 {{ stats.pass }}</el-tag>
      <el-tag type="danger">不合格 {{ stats.fail }}</el-tag>
    </div>

    <el-table :data="pageData" stripe border>
      <el-table-column prop="assetCode" label="资产编码" width="130" />
      <el-table-column prop="assetName" label="名称" min-width="140" />
      <el-table-column prop="checkDate" label="检测日期" width="120" />
      <el-table-column prop="nextDueDate" label="下次到期" width="120" />
      <el-table-column prop="result" label="结果" width="90" />
      <el-table-column prop="operator" label="检测人" width="100" />
      <el-table-column prop="orgName" label="单位" width="120" />
      <el-table-column prop="remark" label="备注" min-width="120" />
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />

    <el-dialog v-model="dialog" :title="`新增${title}`" width="480px">
      <el-form label-width="100px">
        <el-form-item label="资产">
          <el-select v-model="form.assetCode" filterable style="width: 100%" @change="onAssetOrDateChange">
            <el-option
              v-for="l in ledgers"
              :key="l.assetCode"
              :label="`${l.assetCode} ${l.name}`"
              :value="l.assetCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="检测日期">
          <el-date-picker
            v-model="form.checkDate"
            type="date"
            value-format="YYYY-MM-DD"
            style="width: 100%"
            @change="onAssetOrDateChange"
          />
        </el-form-item>
        <el-form-item label="下次到期">
          <el-date-picker v-model="form.nextDueDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          <div class="hint">默认按系统「检定试验周期」自动推算，可改</div>
        </el-form-item>
        <el-form-item label="结果">
          <el-select v-model="form.result" style="width: 100%">
            <el-option label="合格" value="合格" />
            <el-option label="不合格" value="不合格" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<style scoped>
.kpi-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
