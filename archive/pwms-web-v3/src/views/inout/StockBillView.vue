<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { hasPermission } from '@/utils/permission'
import type { AssetCategory, InOutPageAction, InboundScene, OutboundScene, StockBill } from '@/types'
import { inboundSceneOptions, outboundSceneOptions } from '@/types'

const route = useRoute()
const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByOrg } = useDataScope()

const category = computed(() => route.meta.category as AssetCategory | undefined)
const aggregate = computed(() => Boolean(route.meta.aggregateAssets))
const action = computed(() => (route.meta.inoutAction || 'inout-log') as InOutPageAction)

const canApply = computed(() => hasPermission(userStore.context, 'inout:apply') || hasPermission(userStore.context, 'inout:edit'))
const canApprove = computed(() => hasPermission(userStore.context, 'inout:approve') || hasPermission(userStore.context, '*'))
const canConfirm = computed(() => hasPermission(userStore.context, 'inout:confirm') || hasPermission(userStore.context, 'inout:edit'))

const scopedLedgers = computed(() => {
  let list = dataStore.ledgers
  if (!aggregate.value && category.value) list = list.filter((l) => l.category === category.value)
  return scopeByOrg(list).filter((l) => l.status !== '报废' && l.disposeStatus !== '已报废')
})

const bills = computed(() => {
  let list = dataStore.stockBills
  if (!aggregate.value && category.value) list = list.filter((b) => b.category === category.value)
  list = scopeByOrg(list)
  if (action.value === 'in-apply') return list.filter((b) => b.billType === '入库' && ['草稿', '待审批', '已驳回'].includes(b.status))
  if (action.value === 'in-approve') return list.filter((b) => b.billType === '入库' && b.status === '待审批')
  if (action.value === 'in-confirm') return list.filter((b) => b.billType === '入库' && (b.status === '待确认' || b.status === '已通过'))
  if (action.value === 'out-apply') return list.filter((b) => b.billType === '出库' && ['草稿', '待审批', '已驳回'].includes(b.status))
  if (action.value === 'out-approve') return list.filter((b) => b.billType === '出库' && b.status === '待审批')
  if (action.value === 'out-confirm') return list.filter((b) => b.billType === '出库' && (b.status === '待确认' || b.status === '已通过'))
  return list
})

const logs = computed(() => {
  let list = dataStore.inOutRecords
  if (!aggregate.value && category.value) list = list.filter((r) => r.category === category.value)
  return list
})

const titleMap: Record<InOutPageAction, string> = {
  'in-apply': '入库申请单',
  'in-approve': '入库审批',
  'in-confirm': '入库确认',
  'out-apply': '出库申请单',
  'out-approve': '出库审批',
  'out-confirm': '出库确认',
  'stock-status': '在库状态',
  shortage: '缺额视图',
  'inout-log': '出入库记录',
}

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const confirmVisible = ref(false)
const confirmPhysicalId = ref('')
const currentBill = ref<StockBill | null>(null)

const form = reactive({
  assetCode: '',
  quantity: 1,
  scene: '采购' as InboundScene | OutboundScene,
  reason: '',
  workOrderNo: '',
})

const isInbound = computed(() => action.value.startsWith('in-'))
const isApplyPage = computed(() => action.value === 'in-apply' || action.value === 'out-apply')

function openCreate() {
  editingId.value = null
  form.assetCode = scopedLedgers.value[0]?.assetCode ?? ''
  form.quantity = 1
  form.scene = isInbound.value ? '采购' : '日常领用'
  form.reason = ''
  form.workOrderNo = ''
  dialogVisible.value = true
}

function openEdit(row: StockBill) {
  editingId.value = row.id
  form.assetCode = row.assetCode
  form.quantity = row.quantity
  form.scene = row.scene
  form.reason = row.reason
  form.workOrderNo = row.workOrderNo || ''
  dialogVisible.value = true
}

function submitCreate() {
  try {
    const ledger = dataStore.getLedgerByCode(form.assetCode)
    if (!ledger) throw new Error('请选择物资')
    if (editingId.value) {
      dataStore.updateStockBill(editingId.value, {
        assetCode: form.assetCode,
        quantity: form.quantity,
        scene: form.scene,
        reason: form.reason || form.scene,
        workOrderNo: form.workOrderNo || undefined,
      })
      dataStore.resubmitStockBill(editingId.value)
      ElMessage.success('已修改并重新提交审批')
    } else {
      dataStore.createStockBill({
        category: ledger.category,
        billType: isInbound.value ? '入库' : '出库',
        scene: form.scene,
        assetCode: form.assetCode,
        quantity: form.quantity,
        applicant: userStore.displayName,
        orgId: ledger.orgId,
        orgName: ledger.orgName,
        warehouseId: ledger.warehouseId,
        warehouseName: ledger.warehouseName,
        reason: form.reason || form.scene,
        workOrderNo: form.workOrderNo || undefined,
        status: '待审批',
      })
      ElMessage.success('已提交申请，等待审批')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doResubmit(row: StockBill) {
  try {
    dataStore.resubmitStockBill(row.id)
    ElMessage.success('已重新提交审批')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doRemove(row: StockBill) {
  try {
    await ElMessageBox.confirm(`确认删除单据 ${row.billNo}？`, '删除确认', { type: 'warning' })
    dataStore.removeStockBill(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}

async function doApprove(row: StockBill) {
  try {
    dataStore.approveStockBill(row.id, userStore.displayName)
    ElMessage.success('已审批通过，待确认')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doReject(row: StockBill) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', { inputPlaceholder: '原因' })
    dataStore.rejectStockBill(row.id, userStore.displayName, value || '驳回')
    ElMessage.success('已驳回')
  } catch {
    /* cancel */
  }
}

function openConfirm(row: StockBill) {
  currentBill.value = row
  confirmPhysicalId.value = ''
  confirmVisible.value = true
}

function doConfirm() {
  if (!currentBill.value) return
  try {
    dataStore.confirmStockBill(currentBill.value.id, userStore.displayName, confirmPhysicalId.value)
    ElMessage.success('确认成功，库存已更新')
    confirmVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

function createReplenish(row: { category: AssetCategory; typeName: string; shortage: number; orgId?: string; warehouseId?: string }) {
  const ledger = dataStore.ledgers.find(
    (l) =>
      l.category === row.category &&
      l.typeName === row.typeName &&
      (!row.warehouseId || l.warehouseId === row.warehouseId) &&
      (!row.orgId || l.orgId === row.orgId) &&
      l.status !== '报废',
  )
  if (!ledger) {
    ElMessage.warning('未找到对应品类台账，请先维护台账后再发起补仓')
    return
  }
  try {
    dataStore.createStockBill({
      category: ledger.category,
      billType: '入库',
      scene: '采购',
      assetCode: ledger.assetCode,
      quantity: Math.max(1, row.shortage),
      applicant: userStore.displayName,
      orgId: ledger.orgId,
      orgName: ledger.orgName,
      warehouseId: ledger.warehouseId,
      warehouseName: ledger.warehouseName,
      reason: `定额缺额补仓（${row.typeName}，缺额 ${row.shortage}）`,
      status: '待审批',
    })
    ElMessage.success('已生成入库申请，请前往入库审批处理')
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

const shortageRows = computed(() =>
  dataStore.quotaResults.filter((q) => {
    if (q.shortage <= 0) return false
    if (!aggregate.value && category.value && q.category !== category.value) return false
    return true
  }),
)

const statusTag = (s: string) => {
  if (s === '已确认') return 'success'
  if (s === '待审批' || s === '待确认') return 'warning'
  if (s === '已驳回') return 'danger'
  return 'info'
}

const dialogTitle = computed(() => {
  if (editingId.value) return isInbound.value ? '修改入库申请' : '修改出库申请'
  return isInbound.value ? '新建入库申请' : '新建出库申请'
})
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="panel-actions">
        <div>
          <h3 class="page-title">{{ titleMap[action] }}</h3>
          <p class="page-desc">专业仓出入库线上申请—审批—确认；确认时校验实物 ID，仪器超期禁止出库。</p>
        </div>
        <div class="panel-actions__right">
          <el-button
            v-if="isApplyPage && canApply"
            type="primary"
            @click="openCreate"
          >
            新建申请
          </el-button>
        </div>
      </div>

      <!-- 在库状态 -->
      <template v-if="action === 'stock-status'">
        <el-table :data="scopedLedgers" stripe border>
          <el-table-column prop="assetCode" label="装备编码" width="130" />
          <el-table-column prop="physicalId" label="实物ID" width="130" />
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="warehouseName" label="存放地点" min-width="140" />
          <el-table-column prop="storageArea" label="库区" width="80" />
          <el-table-column prop="shelfNo" label="货架" width="70" />
          <el-table-column prop="binNo" label="仓位" width="90" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="status" label="台账状态" width="90" />
          <el-table-column prop="disposeStatus" label="处置状态" width="90" />
          <el-table-column prop="checkDueStatus" label="校验" width="90" />
        </el-table>
      </template>

      <!-- 缺额 -->
      <template v-else-if="action === 'shortage'">
        <el-empty v-if="!shortageRows.length" description="暂无缺额，请先在定额管理中测算" />
        <el-table v-else :data="shortageRows" stripe border>
          <el-table-column prop="orgName" label="单位" min-width="120" />
          <el-table-column prop="warehouseName" label="仓室" min-width="140" />
          <el-table-column prop="typeName" label="品类" width="100" />
          <el-table-column prop="lowerLimit" label="定额下限" width="100" />
          <el-table-column prop="actualQty" label="实库存" width="90" />
          <el-table-column prop="shortage" label="缺额" width="90">
            <template #default="{ row }">
              <el-tag type="danger">{{ row.shortage }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="canApply" label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="createReplenish(row)">发起补仓</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <!-- 流水 -->
      <template v-else-if="action === 'inout-log'">
        <el-table :data="logs" stripe border>
          <el-table-column prop="operateTime" label="时间" width="170" />
          <el-table-column prop="type" label="类型" width="80" />
          <el-table-column prop="scene" label="场景" width="100" />
          <el-table-column prop="assetCode" label="编码" width="120" />
          <el-table-column prop="assetName" label="名称" min-width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="physicalId" label="实物ID" width="120" />
          <el-table-column prop="workOrderNo" label="工作票/工单" width="140" />
          <el-table-column prop="operator" label="操作人" width="90" />
          <el-table-column prop="reason" label="事由" min-width="120" />
        </el-table>
      </template>

      <!-- 单据 -->
      <template v-else>
        <el-table :data="bills" stripe border>
          <el-table-column prop="billNo" label="单号" width="150" />
          <el-table-column prop="scene" label="场景" width="100" />
          <el-table-column prop="assetName" label="物资" min-width="120" />
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column prop="workOrderNo" label="工作票号" width="140" />
          <el-table-column prop="applicant" label="申请人" width="90" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="rejectReason" label="驳回原因" min-width="120" show-overflow-tooltip />
          <el-table-column prop="createTime" label="创建时间" width="170" />
          <el-table-column label="操作" width="240" fixed="right">
            <template #default="{ row }">
              <template v-if="isApplyPage && canApply && (row.status === '草稿' || row.status === '已驳回')">
                <el-button link type="primary" @click="openEdit(row)">修改重提</el-button>
                <el-button link type="primary" @click="doResubmit(row)">直接重提</el-button>
                <el-button link type="danger" @click="doRemove(row)">删除</el-button>
              </template>
              <template v-if="action.includes('approve') && canApprove">
                <el-button link type="primary" @click="doApprove(row)">通过</el-button>
                <el-button link type="danger" @click="doReject(row)">驳回</el-button>
              </template>
              <el-button
                v-if="action.includes('confirm') && canConfirm"
                link
                type="primary"
                @click="openConfirm(row)"
              >
                扫码确认
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form label-width="100px">
        <el-form-item label="物资">
          <el-select v-model="form.assetCode" filterable style="width: 100%">
            <el-option
              v-for="l in scopedLedgers"
              :key="l.id"
              :label="`${l.assetCode} ${l.name}（库存${l.quantity}）`"
              :value="l.assetCode"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="场景">
          <el-select v-model="form.scene" style="width: 100%">
            <el-option
              v-for="s in isInbound ? inboundSceneOptions.filter((x) => x !== '盘盈') : outboundSceneOptions.filter((x) => !['盘亏', '报废'].includes(x))"
              :key="s"
              :label="s"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="1" />
        </el-form-item>
        <el-form-item v-if="!isInbound" label="工作票号">
          <el-input v-model="form.workOrderNo" placeholder="出仓联动工单/工作票（可选）" />
        </el-form-item>
        <el-form-item label="事由">
          <el-input v-model="form.reason" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">{{ editingId ? '保存并重提' : '提交审批' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="confirmVisible" title="实物 ID 扫码确认" width="440px">
      <p class="hint">请扫描或录入实物 ID / 装备编码完成确认。</p>
      <el-input v-model="confirmPhysicalId" placeholder="请扫描或录入实物 ID" />
      <template #footer>
        <el-button @click="confirmVisible = false">取消</el-button>
        <el-button type="primary" @click="doConfirm">确认关账</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.hint {
  margin: 0 0 12px;
  color: var(--pwms-text-secondary);
  font-size: 13px;
}
</style>
