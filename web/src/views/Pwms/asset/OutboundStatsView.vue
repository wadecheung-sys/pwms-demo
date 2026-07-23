<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
const isSpare = computed(() => category.value === 'spare')

const rows = computed(() => {
  const list = scopeByAssets(
    dataStore.inOutRecords.filter((r) => r.type === '出库' && r.category === category.value),
  )
  return list.map((r) => {
    const bill = dataStore.stockBills.find((b) => b.id === r.billId)
    const expected = r.expectedReturnDate || bill?.expectedReturnDate
    const overdue =
      !isSpare.value && expected
        ? new Date(expected) < new Date(new Date().toDateString()) && !r.returned
        : false
    return {
      ...r,
      projectName: r.projectName || bill?.projectName || '—',
      wbsCode: r.wbsCode || bill?.wbsCode || '—',
      workOrderType: r.workOrderType || bill?.workOrderType || '—',
      outboundKind: r.outboundKind || bill?.outboundKind || '常规',
      makeupStatus: bill?.outboundKind === '抢修' ? bill.status : '',
      approver: r.approver || bill?.approver || '—',
      expectedReturnDate: expected || '—',
      overdue,
      canReturn: !isSpare.value && !r.returned,
    }
  })
})

const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)

const tip = computed(() =>
  isSpare.value
    ? '备品出库统计：领用去向、领用人、审批人、项目/WBS、常规或抢修。'
    : '仪器/工器具出库统计：领用、审批、工单、预计归还及是否超期；确认归还后物资回到在库。',
)

const stats = computed(() => {
  const list = rows.value
  const pending = list.filter((r) => r.canReturn).length
  const overdue = list.filter((r) => r.overdue).length
  const returned = list.filter((r) => r.returned).length
  const emergency = list.filter((r) => r.outboundKind === '抢修').length
  return { total: list.length, pending, overdue, returned, emergency }
})

async function doReturn(row: { id: string; assetName: string }) {
  try {
    await ElMessageBox.confirm(`确认将「${row.assetName}」归还入库？`, '归还确认', { type: 'warning' })
    dataStore.returnOutboundRecord(row.id, userStore.displayName)
    ElMessage.success('已归还入库')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}
</script>

<template>
  <PageShell :tip="tip">
    <PageHeader :title="`${categoryLabels[category]} · 出库统计`">
      <template #actions>
        <el-tag type="info">出库 {{ stats.total }}</el-tag>
        <el-tag type="warning">抢修 {{ stats.emergency }}</el-tag>
        <el-tag v-if="!isSpare" type="warning">待归还 {{ stats.pending }}</el-tag>
        <el-tag v-if="!isSpare" type="danger">归还超期 {{ stats.overdue }}</el-tag>
        <el-tag v-if="!isSpare" type="success">已归还 {{ stats.returned }}</el-tag>
      </template>
    </PageHeader>
    <el-table :data="pageData" stripe border>
      <el-table-column prop="operateTime" label="出库时间" width="160" />
      <el-table-column prop="assetCode" label="资产编码" width="130" />
      <el-table-column prop="assetName" label="名称" min-width="140" />
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column prop="orgName" label="领用单位" width="120" />
      <el-table-column prop="operator" label="领用人" width="100" />
      <el-table-column prop="approver" label="审批人" width="100" />
      <el-table-column prop="outboundKind" label="出库类型" width="90" />
      <el-table-column prop="workOrderType" label="工单类型" width="100" />
      <el-table-column prop="workOrderNo" label="工单号" width="140" />
      <el-table-column prop="projectName" label="项目名称" min-width="120" show-overflow-tooltip />
      <el-table-column prop="wbsCode" label="WBS" width="120" show-overflow-tooltip />
      <el-table-column label="抢修补办" width="100">
        <template #default="{ row }">
          <span v-if="row.makeupStatus">{{ row.makeupStatus }}</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column v-if="!isSpare" prop="expectedReturnDate" label="预计归还" width="120" />
      <el-table-column v-if="!isSpare" label="归还状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.returned" type="success" size="small">已归还</el-tag>
          <el-tag v-else-if="row.overdue" type="danger" size="small">超期未还</el-tag>
          <el-tag v-else type="warning" size="small">待归还</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="事由" min-width="120" />
      <el-table-column v-if="!isSpare" label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.canReturn" type="primary" size="small" plain @click="doReturn(row)">
            归还
          </el-button>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>
</template>

<style scoped>
.muted {
  color: var(--el-text-color-placeholder);
}
</style>
