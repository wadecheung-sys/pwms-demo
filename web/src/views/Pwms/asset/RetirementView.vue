<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { usePagination } from '@/composables/usePagination'
import type { AssetCategory } from '@/types'
import { categoryLabels } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const route = useRoute()
const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByAssets } = useDataScope()
const category = computed(() => route.meta.category as AssetCategory)

const rows = computed(() =>
  scopeByAssets(dataStore.retirementRecords.filter((r) => r.category === category.value)),
)
const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)

const stats = computed(() => ({
  pending: rows.value.filter((r) => r.status === '待审批').length,
  done: rows.value.filter((r) => r.status === '已报废').length,
}))

const dialog = ref(false)
const form = reactive({ assetCode: '', reason: '' })
const ledgers = computed(() =>
  dataStore.ledgers.filter((l) => l.category === category.value && l.status !== '报废'),
)

function openCreate() {
  form.assetCode = ledgers.value[0]?.assetCode || ''
  form.reason = ''
  dialog.value = true
}

function save() {
  const ledger = dataStore.getLedgerByCode(form.assetCode)
  if (!ledger) return ElMessage.error('请选择资产')
  dataStore.addRetirementRecord({
    category: category.value,
    assetCode: ledger.assetCode,
    assetName: ledger.name,
    reason: form.reason || '退役报废',
    applicant: userStore.displayName,
    orgName: ledger.orgName,
    status: '待审批',
  })
  ElMessage.success('已提交退役报废申请')
  dialog.value = false
}

function approve(id: string) {
  dataStore.approveRetirement(id)
  ElMessage.success('已报废')
}
</script>

<template>
  <PageShell :tip="`${categoryLabels[category]}退役报废：汇总待审与已报废，可穿透至明细审批。`">
    <PageHeader title="退役报废管理">
      <template #actions>
        <el-button type="primary" @click="openCreate">申请报废</el-button>
      </template>
    </PageHeader>
    <div class="kpi-row">
      <el-tag type="warning">待审批 {{ stats.pending }}</el-tag>
      <el-tag type="info">已报废 {{ stats.done }}</el-tag>
    </div>
    <el-table :data="pageData" stripe border>
      <el-table-column prop="assetCode" label="资产编码" width="130" />
      <el-table-column prop="assetName" label="名称" min-width="140" />
      <el-table-column prop="reason" label="原因" min-width="140" />
      <el-table-column prop="applicant" label="申请人" width="100" />
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="createTime" label="申请时间" width="160" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === '待审批'" type="primary" link @click="approve(row.id)">批准报废</el-button>
        </template>
      </el-table-column>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />

    <el-dialog v-model="dialog" title="申请退役报废" width="440px">
      <el-form label-width="80px">
        <el-form-item label="资产">
          <el-select v-model="form.assetCode" filterable style="width: 100%">
            <el-option
              v-for="l in ledgers"
              :key="l.assetCode"
              :label="`${l.assetCode} ${l.name}`"
              :value="l.assetCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="form.reason" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="save">提交</el-button>
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
</style>
