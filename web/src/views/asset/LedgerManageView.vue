<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDataScope } from '@/composables/useDataScope'
import { hasPermission } from '@/utils/permission'
import type { AssetCategory, AssetLedger } from '@/types'
import { specialtyOptions, warehouseAssetNatureOptions } from '@/types'
import AssetDetailDrawer from '@/components/AssetDetailDrawer.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const userStore = useUserStore()
const { scopeByOrg } = useDataScope()

const category = computed(() => (route.meta.category as AssetCategory) || 'spare')
const canEdit = computed(() => hasPermission(userStore.context, 'ledger:edit'))

const keyword = ref('')
const filterWarehouseId = computed(() => (route.query.warehouseId as string) || '')
const filterOrgId = computed(() => (route.query.orgId as string) || '')

const rows = computed(() => {
  let list = dataStore.ledgers.filter((l) => l.category === category.value)
  list = scopeByOrg(list)
  if (filterWarehouseId.value) {
    list = list.filter((l) => l.warehouseId === filterWarehouseId.value)
  }
  if (filterOrgId.value) {
    const orgIds = new Set(dataStore.getOrgDescendantIdsFrom(filterOrgId.value, true))
    list = list.filter((l) => orgIds.has(l.orgId))
  }
  if (keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase()
    list = list.filter(
      (l) =>
        l.name.toLowerCase().includes(k) ||
        l.assetCode.toLowerCase().includes(k) ||
        (l.physicalId || '').toLowerCase().includes(k) ||
        (l.assetNo || '').toLowerCase().includes(k),
    )
  }
  return list
})

const filterHint = computed(() => {
  if (filterWarehouseId.value) {
    const wh = dataStore.getWarehouseSite(filterWarehouseId.value)
    return wh ? `当前筛选仓室：${wh.name}` : ''
  }
  if (filterOrgId.value) {
    const org = dataStore.getOrg(filterOrgId.value)
    return org ? `当前筛选单位：${org.name}（含下级）` : ''
  }
  return ''
})

function clearRouteFilter() {
  router.replace({ path: route.path, query: {} })
}

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const detailCode = ref<string | null>(null)

const form = reactive({
  name: '',
  typeId: '',
  orgId: '',
  warehouseId: '',
  manufacturer: '',
  model: '',
  quantity: 1,
  status: '在库' as AssetLedger['status'],
  purchaseDate: '',
  warrantyDate: '',
  physicalId: '',
  assetNo: '',
  specialty: '变电' as AssetLedger['specialty'],
  keeperName: '',
  assetNature: '自有' as AssetLedger['assetNature'],
  disposeStatus: '在库' as AssetLedger['disposeStatus'],
  deviceStatus: '备用' as AssetLedger['deviceStatus'],
  originalValue: 0,
  voltageLevel: '',
  storageArea: '',
  shelfNo: '',
  binNo: '',
  lastCheckDate: '',
  checkDueStatus: '正常' as AssetLedger['checkDueStatus'],
  spareSource: '',
  remark: '',
})

const typeOptions = computed(() => dataStore.deviceTypesByCategory(category.value))
const orgOptions = computed(() => dataStore.organizations)
const warehouseOptions = computed(() =>
  dataStore.warehouseSites.filter((w) => !form.orgId || w.orgId === form.orgId || true),
)

function resetForm() {
  Object.assign(form, {
    name: '',
    typeId: typeOptions.value[0]?.id ?? '',
    orgId: userStore.context.orgId,
    warehouseId: '',
    manufacturer: '',
    model: '',
    quantity: 1,
    status: '在库',
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyDate: '',
    physicalId: '',
    assetNo: '',
    specialty: '变电',
    keeperName: userStore.displayName,
    assetNature: '自有',
    disposeStatus: '在库',
    deviceStatus: '备用',
    originalValue: 0,
    voltageLevel: '',
    storageArea: 'A区',
    shelfNo: '01',
    binNo: '',
    lastCheckDate: '',
    checkDueStatus: '正常',
    spareSource: '流动资金购置',
    remark: '',
  })
}

function openCreate() {
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

function openEdit(row: AssetLedger) {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name,
    typeId: row.typeId,
    orgId: row.orgId,
    warehouseId: row.warehouseId,
    manufacturer: row.manufacturer,
    model: row.model,
    quantity: row.quantity,
    status: row.status,
    purchaseDate: row.purchaseDate,
    warrantyDate: row.warrantyDate,
    physicalId: row.physicalId ?? '',
    assetNo: row.assetNo ?? '',
    specialty: row.specialty ?? '综合',
    keeperName: row.keeperName ?? '',
    assetNature: row.assetNature ?? '自有',
    disposeStatus: row.disposeStatus ?? '在库',
    deviceStatus: row.deviceStatus ?? '备用',
    originalValue: row.originalValue ?? 0,
    voltageLevel: row.voltageLevel ?? '',
    storageArea: row.storageArea ?? '',
    shelfNo: row.shelfNo ?? '',
    binNo: row.binNo ?? '',
    lastCheckDate: row.lastCheckDate ?? '',
    checkDueStatus: row.checkDueStatus ?? '正常',
    spareSource: row.spareSource ?? '',
    remark: row.remark ?? '',
  })
  dialogVisible.value = true
}

function save() {
  try {
    if (!form.warehouseId) throw new Error('请选择生产仓地点')
    if (editingId.value) {
      dataStore.updateLedger(editingId.value, { ...form, category: category.value })
      ElMessage.success('已更新')
    } else {
      dataStore.addLedger({ ...form, category: category.value })
      ElMessage.success('已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error((e as Error).message)
  }
}

async function doDispose(row: AssetLedger) {
  try {
    await ElMessageBox.confirm(
      `确认对「${row.name}」办理报废？将扣减剩余库存 ${row.quantity} 并归档处置状态。`,
      '报废确认',
      { type: 'warning', confirmButtonText: '确认报废' },
    )
    dataStore.disposeLedger(row.id, userStore.displayName)
    ElMessage.success('报废已完成，库存已清零')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}

async function doRemove(row: AssetLedger) {
  try {
    await ElMessageBox.confirm(`确认删除台账「${row.name}」？删除后不可恢复。`, '删除确认', {
      type: 'warning',
    })
    dataStore.removeLedger(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    if ((e as string) !== 'cancel') ElMessage.error((e as Error).message || '已取消')
  }
}
</script>

<template>
  <div class="page-container">
    <div class="page-panel">
      <div class="panel-actions">
        <div>
          <h3 class="page-title">台账管理</h3>
          <p class="page-desc">维护装备台账：实物ID、资产编号、专业分类、库区货架仓位、校验与处置状态等。</p>
        </div>
        <div class="panel-actions__right">
          <el-tag v-if="filterHint" type="info" class="filter-tag" closable @close="clearRouteFilter">
            {{ filterHint }}
          </el-tag>
          <el-input v-model="keyword" clearable placeholder="编码/名称/实物ID" style="width: 220px" />
          <el-button v-if="canEdit" type="primary" @click="openCreate">新增台账</el-button>
        </div>
      </div>

      <el-table :data="rows" stripe border>
        <el-table-column prop="assetCode" label="装备编码" width="120" fixed />
        <el-table-column prop="physicalId" label="实物ID" width="120" />
        <el-table-column prop="assetNo" label="资产编号" width="120" show-overflow-tooltip />
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="specialty" label="专业" width="80" />
        <el-table-column prop="typeName" label="类型" width="90" />
        <el-table-column prop="warehouseName" label="存放地点" min-width="130" />
        <el-table-column label="仓位" width="120">
          <template #default="{ row }">
            {{ [row.storageArea, row.shelfNo, row.binNo].filter(Boolean).join('/') || '—' }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column prop="disposeStatus" label="处置" width="80" />
        <el-table-column prop="keeperName" label="保管人" width="90" />
        <el-table-column v-if="category === 'instrument'" prop="checkDueStatus" label="校验" width="80" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="detailCode = row.assetCode">详情</el-button>
            <el-button v-if="canEdit" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="canEdit && row.status !== '报废' && row.disposeStatus !== '已报废'"
              link
              type="warning"
              @click="doDispose(row)"
            >
              报废
            </el-button>
            <el-button v-if="canEdit" link type="danger" @click="doRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑台账' : '新增台账'" width="720px" destroy-on-close>
      <el-form label-width="100px" class="ledger-form">
        <el-divider content-position="left">基础信息</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="名称" required>
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="类型" required>
              <el-select v-model="form.typeId" style="width: 100%">
                <el-option v-for="t in typeOptions" :key="t.id" :label="t.name" :value="t.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实物ID">
              <el-input v-model="form.physicalId" placeholder="一物一码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产编号">
              <el-input v-model="form.assetNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="专业分类">
              <el-select v-model="form.specialty" style="width: 100%">
                <el-option v-for="s in specialtyOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="规格型号">
              <el-input v-model="form.model" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">存放与组织</el-divider>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="所属单位">
              <el-select v-model="form.orgId" filterable style="width: 100%">
                <el-option v-for="o in orgOptions" :key="o.id" :label="o.name" :value="o.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产仓地点" required>
              <el-select v-model="form.warehouseId" filterable style="width: 100%">
                <el-option v-for="w in warehouseOptions" :key="w.id" :label="w.name" :value="w.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="库区"><el-input v-model="form.storageArea" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="货架"><el-input v-model="form.shelfNo" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="仓位"><el-input v-model="form.binNo" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="保管人"><el-input v-model="form.keeperName" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产性质">
              <el-select v-model="form.assetNature" style="width: 100%">
                <el-option v-for="n in warehouseAssetNatureOptions" :key="n" :label="n" :value="n" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">状态与数量</el-divider>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="数量"><el-input-number v-model="form.quantity" :min="0" /></el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="台账状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="在库" value="在库" />
                <el-option label="在用" value="在用" />
                <el-option label="维修中" value="维修中" />
                <el-option label="报废" value="报废" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="处置状态">
              <el-select v-model="form.disposeStatus" style="width: 100%">
                <el-option label="在库" value="在库" />
                <el-option label="可用" value="可用" />
                <el-option label="占用" value="占用" />
                <el-option label="待报废" value="待报废" />
                <el-option label="已报废" value="已报废" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生产厂家"><el-input v-model="form.manufacturer" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电压等级"><el-input v-model="form.voltageLevel" /></el-form-item>
          </el-col>
          <el-col v-if="category === 'instrument'" :span="12">
            <el-form-item label="最近校验"><el-date-picker v-model="form.lastCheckDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
          </el-col>
          <el-col v-if="category === 'instrument'" :span="12">
            <el-form-item label="校验状态">
              <el-select v-model="form.checkDueStatus" style="width: 100%">
                <el-option label="正常" value="正常" />
                <el-option label="临期" value="临期" />
                <el-option label="超期" value="超期" />
                <el-option label="未校验" value="未校验" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="category === 'spare'" :span="12">
            <el-form-item label="备品来源"><el-input v-model="form.spareSource" /></el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <AssetDetailDrawer :asset-code="detailCode" @close="detailCode = null" />
  </div>
</template>

<style scoped lang="scss">
.page-title { margin: 0; font-size: 18px; font-weight: 600; }
.page-desc { margin: 4px 0 0; color: #8c8c8c; font-size: 13px; }
.ledger-form :deep(.el-divider) { margin: 8px 0 16px; }
.filter-tag { max-width: 280px; }
</style>
