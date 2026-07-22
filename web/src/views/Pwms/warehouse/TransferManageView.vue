<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { usePagination } from '@/composables/usePagination'
import { hasPermission } from '@/utils/pwms/permission'
import type { TransferBill } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByOrg, scopeWarehouses } = useDataScope()

const canApply = computed(
  () => hasPermission(userStore.context, 'inout:apply') || hasPermission(userStore.context, 'inout:edit'),
)
const canApprove = computed(
  () => hasPermission(userStore.context, 'inout:approve') || hasPermission(userStore.context, '*'),
)
const canConfirm = computed(
  () => hasPermission(userStore.context, 'inout:confirm') || hasPermission(userStore.context, 'inout:edit'),
)

const rows = computed(() => scopeByOrg([...dataStore.transferBills]))
const { currentPage, pageSize, total, pageData } = usePagination(rows, 10)

const stats = computed(() => ({
  pending: rows.value.filter((b) => b.status === '待审批').length,
  confirm: rows.value.filter((b) => b.status === '待确认').length,
  done: rows.value.filter((b) => b.status === '已完成').length,
}))

const warehouses = computed(() => scopeWarehouses([...dataStore.warehouseSites]))
const ledgers = computed(() =>
  scopeByOrg(dataStore.ledgers.filter((l) => l.status !== '报废' && l.quantity > 0)),
)

const dialog = ref(false)
const confirmVisible = ref(false)
const confirmPhysicalId = ref('')
const current = ref<TransferBill | null>(null)

const form = reactive({
  assetCode: '',
  quantity: 1,
  toWarehouseId: '',
  reason: '',
})

function openCreate() {
  form.assetCode = ledgers.value[0]?.assetCode || ''
  form.quantity = 1
  form.toWarehouseId = ''
  form.reason = '仓间调拨'
  dialog.value = true
}

function selectedLedger() {
  return dataStore.getLedgerByCode(form.assetCode)
}

function submitCreate() {
  try {
    const ledger = selectedLedger()
    if (!ledger) throw new Error('请选择物资')
    const to = dataStore.getWarehouseSite(form.toWarehouseId)
    if (!to) throw new Error('请选择目标仓库')
    if (to.id === ledger.warehouseId) throw new Error('目标仓库不能与当前仓库相同')
    dataStore.createTransferBill({
      category: ledger.category,
      assetCode: ledger.assetCode,
      assetName: ledger.name,
      quantity: form.quantity,
      fromWarehouseId: ledger.warehouseId,
      fromWarehouseName: ledger.warehouseName,
      toWarehouseId: to.id,
      toWarehouseName: to.name,
      applicant: userStore.displayName,
      orgId: ledger.orgId,
      orgName: ledger.orgName,
      reason: form.reason || '仓间调拨',
      status: '待审批',
    })
    ElMessage.success('转仓申请已提交')
    dialog.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doApprove(row: TransferBill) {
  try {
    dataStore.approveTransferBill(row.id, userStore.displayName)
    ElMessage.success('已通过，待扫码确认转仓')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doReject(row: TransferBill) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', {
      inputPlaceholder: '原因',
      confirmButtonText: '驳回',
    })
    dataStore.rejectTransferBill(row.id, userStore.displayName, value || '驳回')
    ElMessage.success('已驳回')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}

function openConfirm(row: TransferBill) {
  current.value = row
  confirmPhysicalId.value = ''
  confirmVisible.value = true
}

function doConfirm() {
  if (!current.value) return
  try {
    dataStore.confirmTransferBill(current.value.id, userStore.displayName, confirmPhysicalId.value)
    ElMessage.success('转仓完成，台账已更新')
    confirmVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}
</script>

<template>
  <PageShell tip="仓间调拨先审批再扫码确认，确认后变更存放地点与组织归属。">
    <PageHeader title="转仓调拨">
      <template #actions>
        <el-tag type="warning">待审 {{ stats.pending }}</el-tag>
        <el-tag type="primary">待确认 {{ stats.confirm }}</el-tag>
        <el-tag type="success">已完成 {{ stats.done }}</el-tag>
        <el-button v-if="canApply" type="primary" @click="openCreate">发起调拨</el-button>
      </template>
    </PageHeader>

    <el-table :data="pageData" stripe border>
      <el-table-column prop="billNo" label="调拨单号" width="150" />
      <el-table-column prop="assetCode" label="资产编码" width="130" />
      <el-table-column prop="assetName" label="名称" min-width="120" />
      <el-table-column prop="quantity" label="数量" width="70" />
      <el-table-column prop="fromWarehouseName" label="调出仓" min-width="130" />
      <el-table-column prop="toWarehouseName" label="调入仓" min-width="130" />
      <el-table-column prop="applicant" label="申请人" width="90" />
      <el-table-column prop="approver" label="审批人" width="90" />
      <el-table-column prop="status" label="状态" width="90" />
      <el-table-column prop="createTime" label="申请时间" width="160" />
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <div v-if="canApprove && row.status === '待审批'" class="ops">
            <el-button type="success" size="small" plain @click="doApprove(row)">通过</el-button>
            <el-button type="danger" size="small" plain @click="doReject(row)">驳回</el-button>
          </div>
          <el-button
            v-else-if="canConfirm && row.status === '待确认'"
            type="primary"
            size="small"
            plain
            @click="openConfirm(row)"
          >
            扫码确认
          </el-button>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />

    <el-dialog v-model="dialog" title="发起转仓调拨" width="520px">
      <el-form label-width="100px">
        <el-form-item label="物资">
          <el-select v-model="form.assetCode" filterable style="width: 100%">
            <el-option
              v-for="l in ledgers"
              :key="l.id"
              :label="`${l.assetCode} ${l.name}（${l.warehouseName}·库存${l.quantity}）`"
              :value="l.assetCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调出仓">
          <el-input :model-value="selectedLedger()?.warehouseName || '—'" disabled />
        </el-form-item>
        <el-form-item label="调入仓">
          <el-select v-model="form.toWarehouseId" filterable style="width: 100%">
            <el-option
              v-for="w in warehouses.filter((x) => x.id !== selectedLedger()?.warehouseId)"
              :key="w.id"
              :label="w.name"
              :value="w.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="1" :max="selectedLedger()?.quantity || 1" />
        </el-form-item>
        <el-form-item label="事由">
          <el-input v-model="form.reason" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">提交审批</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="confirmVisible" title="转仓扫码确认" width="420px">
      <p class="hint">请扫描实物 ID / 装备编码完成转仓关账。</p>
      <el-input v-model="confirmPhysicalId" placeholder="实物 ID" />
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="primary" @click="doConfirm">确认转仓</el-button>
      </template>
    </el-dialog>
  </PageShell>
</template>

<style scoped>
.ops {
  display: flex;
  gap: 6px;
}
.muted {
  color: var(--el-text-color-placeholder);
}
.hint {
  margin: 0 0 12px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
