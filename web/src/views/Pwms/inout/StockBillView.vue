<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { usePagination } from '@/composables/usePagination'
import { hasPermission } from '@/utils/pwms/permission'
import { buildOrgTree, orgTypeLabels } from '@/utils/pwms/org'
import type { AssetCategory, AssetLedger, FundingSource, InOutPageAction, StockBill } from '@/types'
import { categoryLabels, fundingSourceOptions } from '@/types'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const route = useRoute()
const router = useRouter()
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
  if (action.value === 'in-apply') {
    return list.filter((b) => b.billType === '入库' && ['草稿', '待审批', '已驳回'].includes(b.status))
  }
  if (action.value === 'in-approve') {
    return list.filter((b) => b.billType === '入库' && ['待审批', '待确认'].includes(b.status))
  }
  if (action.value === 'out-apply') {
    return list.filter((b) => b.billType === '出库' && ['草稿', '待审批', '已驳回'].includes(b.status))
  }
  if (action.value === 'out-approve') {
    return list.filter((b) => b.billType === '出库' && ['待审批', '待确认'].includes(b.status))
  }
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
  'out-apply': '出库申请单',
  'out-approve': '出库审批',
  'stock-status': '在库状态',
  shortage: '缺额视图',
  'inout-log': '出入库记录',
  transfer: '转仓调拨',
}

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const confirmVisible = ref(false)
const confirmPhysicalId = ref('')
const currentBill = ref<StockBill | null>(null)

const form = reactive({
  assetCode: '',
  quantity: 1,
  fundingSource: '成本' as FundingSource,
  reason: '',
  workOrderNo: '',
  projectName: '',
  expectedReturnDate: '',
})

const isInbound = computed(() => action.value.startsWith('in-'))
const isApplyPage = computed(() => action.value === 'in-apply' || action.value === 'out-apply')
const isApprovePage = computed(() => action.value.includes('approve'))

const showBillOpColumn = computed(() => {
  if (isApplyPage.value) return canApply.value
  if (isApprovePage.value) return canApprove.value || canConfirm.value
  return false
})

function billFundingSource(row: StockBill): string {
  return row.fundingSource || row.scene || '—'
}

function canEditApplyBill(row: StockBill) {
  return isApplyPage.value && canApply.value && (row.status === '草稿' || row.status === '已驳回')
}

function canWithdrawApplyBill(row: StockBill) {
  return isApplyPage.value && canApply.value && row.status === '待审批'
}

function canApproveBill(row: StockBill) {
  return isApprovePage.value && canApprove.value && row.status === '待审批'
}

function canConfirmBill(row: StockBill) {
  return isApprovePage.value && canConfirm.value && row.status === '待确认'
}

async function doWithdraw(row: StockBill) {
  try {
    await ElMessageBox.confirm(`确定撤回申请单 ${row.billNo}？撤回后可修改再提交。`, '撤回确认', {
      type: 'warning',
    })
    dataStore.withdrawStockBill(row.id)
    ElMessage.success('已撤回为草稿')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}

function openCreate() {
  editingId.value = null
  form.assetCode = scopedLedgers.value[0]?.assetCode ?? ''
  form.quantity = 1
  form.fundingSource = '成本'
  form.reason = ''
  form.workOrderNo = ''
  form.projectName = ''
  form.expectedReturnDate = ''
  dialogVisible.value = true
}

function openEdit(row: StockBill) {
  editingId.value = row.id
  form.assetCode = row.assetCode
  form.quantity = row.quantity
  form.fundingSource = (row.fundingSource || row.scene || '成本') as FundingSource
  form.reason = row.reason
  form.workOrderNo = row.workOrderNo || ''
  form.projectName = row.projectName || ''
  form.expectedReturnDate = row.expectedReturnDate || ''
  dialogVisible.value = true
}

function submitCreate() {
  try {
    const ledger = dataStore.getLedgerByCode(form.assetCode)
    if (!ledger) throw new Error('请选择物资')
    const payload = {
      assetCode: form.assetCode,
      quantity: form.quantity,
      fundingSource: form.fundingSource,
      reason: form.reason || form.fundingSource,
      workOrderNo: isInbound.value ? undefined : form.workOrderNo || undefined,
      model: ledger.model,
      projectName: isInbound.value ? undefined : form.projectName || undefined,
      expectedReturnDate: isInbound.value ? undefined : form.expectedReturnDate || undefined,
    }
    if (editingId.value) {
      dataStore.updateStockBill(editingId.value, payload)
      dataStore.resubmitStockBill(editingId.value)
      ElMessage.success('已修改并重新提交审批')
    } else {
      dataStore.createStockBill({
        category: ledger.category,
        billType: isInbound.value ? '入库' : '出库',
        fundingSource: form.fundingSource,
        assetCode: form.assetCode,
        quantity: form.quantity,
        applicant: userStore.displayName,
        orgId: ledger.orgId,
        orgName: ledger.orgName,
        warehouseId: ledger.warehouseId,
        warehouseName: ledger.warehouseName,
        model: ledger.model,
        reason: form.reason || form.fundingSource,
        workOrderNo: isInbound.value ? undefined : form.workOrderNo || undefined,
        projectName: isInbound.value ? undefined : form.projectName || undefined,
        expectedReturnDate: isInbound.value ? undefined : form.expectedReturnDate || undefined,
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
    ElMessage.success('已审批通过，请扫码确认关账')
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
      fundingSource: '零购',
      scene: '零购',
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
  scopeByOrg(dataStore.quotaResults).filter((q) => {
    if (q.shortage <= 0) return false
    if (!aggregate.value && category.value && q.category !== category.value) return false
    return true
  }),
)

/** 在库状态：组织树汇总 */
interface StockStatusNode {
  id: string
  label: string
  levelLabel: string
  qty: number
  qualified: number
  overdue: number
  orgId?: string
  warehouseId?: string
  children?: StockStatusNode[]
}

function dueStatusOf(l: AssetLedger): string | undefined {
  return l.category === 'spare' ? l.trialDueStatus || l.checkDueStatus : l.checkDueStatus
}

function isQualified(l: AssetLedger): boolean {
  const s = dueStatusOf(l)
  return !s || s === '正常' || s === '未校验'
}

function isOverdue(l: AssetLedger): boolean {
  return dueStatusOf(l) === '超期'
}

function sumLedgerStats(items: AssetLedger[]) {
  return {
    qty: items.reduce((s, l) => s + l.quantity, 0),
    qualified: items.filter(isQualified).reduce((s, l) => s + l.quantity, 0),
    overdue: items.filter(isOverdue).reduce((s, l) => s + l.quantity, 0),
  }
}

const stockStatusTree = computed((): StockStatusNode[] => {
  const ledgers = scopedLedgers.value.filter((l) => l.inStock !== false && l.status !== '在用')
  const orgs = dataStore.organizations
  const tree = buildOrgTree(orgs)

  function orgNode(o: (typeof tree)[0]): StockStatusNode | null {
    const orgIds = dataStore.getOrgDescendantIdsFrom(o.id, true)
    const orgLedgers = ledgers.filter((l) => orgIds.includes(l.orgId))
    const whNodes: StockStatusNode[] = dataStore.warehouseSites
      .filter((w) => orgIds.includes(w.orgId))
      .map((w) => {
        const whLedgers = orgLedgers.filter((l) => l.warehouseId === w.id)
        if (!whLedgers.length) return null
        const stats = sumLedgerStats(whLedgers)
        return {
          id: `wh-${w.id}`,
          label: w.name,
          levelLabel: '仓室',
          warehouseId: w.id,
          orgId: w.orgId,
          ...stats,
        }
      })
      .filter(Boolean) as StockStatusNode[]

    const childOrgNodes = (o.children || []).map(orgNode).filter(Boolean) as StockStatusNode[]
    const children = [...childOrgNodes, ...whNodes]
    if (!children.length && !orgLedgers.length) return null

    const stats = sumLedgerStats(orgLedgers)
    const levelLabel =
      o.type === 'team' ? '供电所' : o.type === 'county' ? '县公司' : o.type === 'city' ? '地市' : orgTypeLabels[o.type]

    return {
      id: o.id,
      label: o.name,
      levelLabel,
      orgId: o.id,
      ...stats,
      children: children.length ? children : undefined,
    }
  }

  return tree.map(orgNode).filter(Boolean) as StockStatusNode[]
})

function categoriesInScope(ledgers: AssetLedger[]): AssetCategory[] {
  const order: AssetCategory[] = ['spare', 'instrument', 'tool']
  return order.filter((c) => ledgers.some((l) => l.category === c))
}

/** 仓室类型 → 品类（综合仓不强绑，交给范围内实际品类） */
function categoryFromWarehouseType(warehouseType?: string): AssetCategory | null {
  if (!warehouseType) return null
  if (warehouseType.includes('工器具')) return 'tool'
  if (warehouseType.includes('仪器')) return 'instrument'
  if (warehouseType.includes('备品')) return 'spare'
  return null
}

const categoryPickVisible = ref(false)
const categoryPickOptions = ref<AssetCategory[]>([])
const pendingDrillQuery = ref<Record<string, string>>({})

function goLedger(cat: AssetCategory, query: Record<string, string>) {
  router.push({ path: `/${cat}/ledger`, query })
}

function confirmCategoryPick(cat: AssetCategory) {
  categoryPickVisible.value = false
  goLedger(cat, pendingDrillQuery.value)
}

function drillStockStatusRow(row: StockStatusNode) {
  // 只带组织/仓室上下文；品类必须对准，不能用「数量最多」误跳到备品导致工器具/扳手消失
  const query: Record<string, string> = {}
  let scopeLedgers = scopedLedgers.value
  if (row.warehouseId) {
    query.warehouseId = row.warehouseId
    scopeLedgers = scopeLedgers.filter((l) => l.warehouseId === row.warehouseId)
  } else if (row.orgId) {
    query.orgId = row.orgId
    const orgIds = new Set(dataStore.getOrgDescendantIdsFrom(row.orgId, true))
    scopeLedgers = scopeLedgers.filter((l) => orgIds.has(l.orgId))
  } else {
    return
  }

  const present = categoriesInScope(scopeLedgers)
  if (!present.length) {
    ElMessage.info('该范围暂无台账物资')
    return
  }
  if (present.length === 1) {
    goLedger(present[0]!, query)
    return
  }

  if (row.warehouseId) {
    const wh = dataStore.getWarehouseSite(row.warehouseId)
    const hinted = categoryFromWarehouseType(wh?.warehouseType)
    if (hinted && present.includes(hinted)) {
      goLedger(hinted, query)
      return
    }
  }

  pendingDrillQuery.value = query
  categoryPickOptions.value = present
  categoryPickVisible.value = true
}

function drillShortageRow(row: {
  category: AssetCategory
  warehouseId?: string
  orgId?: string
  typeName?: string
}) {
  const cat = row.category || 'spare'
  const query: Record<string, string> = {}
  if (row.warehouseId) query.warehouseId = row.warehouseId
  else if (row.orgId) query.orgId = row.orgId
  if (row.typeName) query.typeName = row.typeName
  goLedger(cat, query)
}

/** 缺额地图 */
const shortageMapRef = ref<HTMLDivElement | null>(null)
let shortageMap: L.Map | null = null

const shortageMapPoints = computed(() => {
  const points: { name: string; lat: number; lng: number; shortage: number; typeName: string }[] = []
  for (const q of shortageRows.value) {
    const wh = q.warehouseId ? dataStore.getWarehouseSite(q.warehouseId) : null
    if (!wh?.lat || !wh.lng) continue
    points.push({
      name: wh.name,
      lat: wh.lat,
      lng: wh.lng,
      shortage: q.shortage,
      typeName: q.typeName,
    })
  }
  return points
})

function renderShortageMap() {
  if (!shortageMapRef.value || action.value !== 'shortage') return
  if (!shortageMap) {
    shortageMap = L.map(shortageMapRef.value, { zoomControl: true }).setView([30.4, 120.6], 8)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(shortageMap)
  }
  shortageMap.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker) shortageMap!.removeLayer(layer)
  })
  for (const p of shortageMapPoints.value) {
    const radius = Math.max(8, Math.min(28, 6 + Math.sqrt(p.shortage) * 2))
    const marker = L.circleMarker([p.lat, p.lng], {
      radius,
      color: '#f56c6c',
      fillColor: '#fab6b6',
      fillOpacity: 0.85,
      weight: 2,
    })
    marker.bindPopup(`<b>${p.name}</b><br/>${p.typeName}<br/>缺额 ${p.shortage}`)
    marker.addTo(shortageMap!)
  }
  nextTick(() => shortageMap?.invalidateSize())
}

onMounted(() => {
  if (action.value === 'shortage') {
    nextTick(() => renderShortageMap())
    setTimeout(() => shortageMap?.invalidateSize(), 200)
  }
})

onUnmounted(() => {
  shortageMap?.remove()
  shortageMap = null
})

watch([shortageMapPoints, action], () => {
  if (action.value === 'shortage') renderShortageMap()
})

const listSource = computed((): unknown[] => {
  if (action.value === 'shortage') return shortageRows.value
  if (action.value === 'inout-log') return logs.value
  if (action.value === 'stock-status') return []
  return bills.value
})
const { currentPage, pageSize, total, pageData } = usePagination(listSource, 10)

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
  <PageShell tip="专业仓出入库线上申请—审批—确认；审批通过后同页扫码确认关账，仪器超期禁止出库。">
    <PageHeader :title="titleMap[action]">
      <template #actions>
        <el-button v-if="isApplyPage && canApply" type="primary" @click="openCreate">新建申请</el-button>
      </template>
    </PageHeader>

    <!-- 在库状态：组织树汇总（树浏览 + 点行穿透台账） -->
    <template v-if="action === 'stock-status'">
      <p class="panel-hint">展开可浏览组织树；点击仓室或组织行穿透至备品台账过滤结果。</p>
      <el-table
        :data="stockStatusTree"
        row-key="id"
        default-expand-all
        stripe
        border
        class="clickable-rows"
        @row-click="drillStockStatusRow"
      >
        <el-table-column prop="label" label="组织/仓室" min-width="200" />
        <el-table-column prop="levelLabel" label="层级" width="100" />
        <el-table-column prop="qty" label="在库数量" width="100" align="right" />
        <el-table-column prop="qualified" label="合格" width="100" align="right">
          <template #default="{ row }">
            <span class="ok-text">{{ row.qualified }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="overdue" label="超期" width="100" align="right">
          <template #default="{ row }">
            <el-tag v-if="row.overdue > 0" type="danger" size="small">{{ row.overdue }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column label="" width="120" fixed="right">
          <template #default>
            <span class="row-hint">穿透查看 →</span>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无在库物资" /></template>
      </el-table>
    </template>

    <!-- 缺额 -->
    <template v-else-if="action === 'shortage'">
      <div v-if="shortageMapPoints.length" class="shortage-map-panel">
        <div class="panel-head">缺额分布地图</div>
        <div ref="shortageMapRef" class="shortage-map" />
      </div>
      <el-empty v-if="!shortageRows.length" description="暂无缺额，请先在定额管理中测算" />
      <template v-else>
        <p class="panel-hint">点击行穿透至对应品类台账；可直接发起补仓。</p>
        <el-table :data="pageData" stripe border class="clickable-rows" @row-click="drillShortageRow">
          <el-table-column prop="orgName" label="单位" min-width="120" />
          <el-table-column prop="warehouseName" label="仓室" min-width="140" />
          <el-table-column prop="typeName" label="品类" width="100" />
          <el-table-column prop="standardQty" label="标准定额" width="100" />
          <el-table-column prop="actualQty" label="实库存" width="90" />
          <el-table-column prop="shortage" label="缺额" width="90">
            <template #default="{ row }">
              <el-tag type="danger">{{ row.shortage }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-if="canApply" label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button type="primary" size="small" plain @click.stop="createReplenish(row)">发起补仓</el-button>
              </div>
            </template>
          </el-table-column>
          <template #empty><el-empty description="暂无缺额" /></template>
        </el-table>
      </template>
    </template>

    <!-- 流水 -->
    <template v-else-if="action === 'inout-log'">
      <el-table :data="pageData" stripe border>
        <el-table-column prop="operateTime" label="时间" width="170" />
        <el-table-column prop="type" label="类型" width="80" />
        <el-table-column label="资金来源" width="110">
          <template #default="{ row }">{{ row.fundingSource || row.scene || '—' }}</template>
        </el-table-column>
        <el-table-column prop="assetCode" label="编码" width="120" />
        <el-table-column prop="assetName" label="名称" min-width="120" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="physicalId" label="实物ID" width="120" />
        <el-table-column prop="workOrderNo" label="工作票/工单" width="140" />
        <el-table-column prop="operator" label="操作人" width="90" />
        <el-table-column prop="reason" label="事由" min-width="120" />
        <template #empty><el-empty description="暂无出入库记录" /></template>
      </el-table>
    </template>

    <!-- 单据 -->
    <template v-else>
      <el-table :data="pageData" stripe border>
        <el-table-column prop="billNo" label="单号" width="150" />
        <el-table-column label="资金来源" width="110">
          <template #default="{ row }">{{ billFundingSource(row) }}</template>
        </el-table-column>
        <el-table-column prop="assetName" label="物资" min-width="120" />
        <el-table-column v-if="isInbound" prop="model" label="型号" width="100" show-overflow-tooltip />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column v-if="isInbound" prop="warehouseName" label="存放仓室" min-width="130" show-overflow-tooltip />
        <el-table-column v-if="!isInbound" prop="workOrderNo" label="工作票/工单号" width="140" />
        <el-table-column prop="applicant" label="申请人" width="90" />
        <el-table-column v-if="isApprovePage" prop="approver" label="审批人" width="90" />
        <el-table-column v-if="isInbound && isApprovePage" prop="inboundTime" label="入库时间" width="170">
          <template #default="{ row }">{{ row.inboundTime || row.confirmTime || '—' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectReason" label="驳回原因" min-width="120" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="170" />
        <el-table-column v-if="showBillOpColumn" label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <div v-if="canEditApplyBill(row)" class="table-actions">
              <el-button type="primary" size="small" plain @click="openEdit(row)">修改重提</el-button>
              <el-button type="primary" size="small" plain @click="doResubmit(row)">直接重提</el-button>
              <el-button type="danger" size="small" plain @click="doRemove(row)">删除</el-button>
            </div>
            <div v-else-if="canWithdrawApplyBill(row)" class="table-actions">
              <el-button type="warning" size="small" plain @click="doWithdraw(row)">撤回</el-button>
            </div>
            <div v-else-if="canApproveBill(row)" class="table-actions">
              <el-button type="success" size="small" plain @click="doApprove(row)">通过</el-button>
              <el-button type="danger" size="small" plain @click="doReject(row)">驳回</el-button>
            </div>
            <div v-else-if="canConfirmBill(row)" class="table-actions">
              <el-button type="primary" size="small" plain @click="openConfirm(row)">扫码确认</el-button>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无申请单据" /></template>
      </el-table>
    </template>
    <TablePagination
      v-if="action !== 'stock-status'"
      v-model:page="currentPage"
      v-model:page-size="pageSize"
      :total="total"
    />
  </PageShell>

  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
    <p class="dialog-hint">提交后进入审批；审批通过后在审批页扫码确认关账。</p>
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
      <el-form-item label="资金来源">
        <el-select v-model="form.fundingSource" style="width: 100%">
          <el-option v-for="s in fundingSourceOptions" :key="s" :label="s" :value="s" />
        </el-select>
      </el-form-item>
      <el-form-item label="数量">
        <el-input-number v-model="form.quantity" :min="1" />
      </el-form-item>
      <el-form-item v-if="!isInbound" label="工作票/工单">
        <el-input v-model="form.workOrderNo" placeholder="出仓联动工单/工作票" />
      </el-form-item>
      <el-form-item v-if="!isInbound" label="使用工程">
        <el-input v-model="form.projectName" placeholder="领用工程/作业名称" />
      </el-form-item>
      <el-form-item v-if="!isInbound" label="预计归还">
        <el-date-picker
          v-model="form.expectedReturnDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="仪器/工器具建议填写"
          style="width: 100%"
        />
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
    <p class="dialog-hint">请扫描或录入实物 ID / 装备编码完成确认关账。</p>
    <el-input v-model="confirmPhysicalId" placeholder="请扫描或录入实物 ID" />
    <template #footer>
      <el-button @click="confirmVisible = false">取消</el-button>
      <el-button type="primary" @click="doConfirm">确认关账</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="categoryPickVisible" title="选择台账品类" width="420px">
    <p class="dialog-hint">该范围包含多个品类。扳手等工器具在「工器具」台账中；请选择要打开的台账：</p>
    <div class="category-pick">
      <el-button
        v-for="c in categoryPickOptions"
        :key="c"
        type="primary"
        plain
        @click="confirmCategoryPick(c)"
      >
        {{ categoryLabels[c] }}
      </el-button>
    </div>
  </el-dialog>
</template>

<style scoped lang="scss">
.text-muted {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
.ok-text {
  color: var(--el-color-success);
}
.panel-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.clickable-rows :deep(.el-table__row) {
  cursor: pointer;
}
.row-hint {
  font-size: 12px;
  color: var(--el-color-primary);
}
.category-pick {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.shortage-map-panel {
  margin-bottom: 16px;
  border: 1px solid var(--pwms-border, var(--el-border-color-lighter));
  border-radius: 8px;
  overflow: hidden;
  .panel-head {
    padding: 10px 14px;
    font-weight: 600;
    border-bottom: 1px solid var(--pwms-border, var(--el-border-color-lighter));
    background: var(--pwms-panel-elevated, var(--el-fill-color-blank));
  }
}
.shortage-map {
  height: 280px;
  width: 100%;
}
</style>
