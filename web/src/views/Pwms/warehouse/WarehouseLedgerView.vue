<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import FilterBar from '@/components/Pwms/FilterBar.vue'
import PageToolbar from '@/components/Pwms/PageToolbar.vue'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'
import type { FilterField } from '@/components/Pwms/FilterBar.vue'
import { useTableFilter } from '@/composables/useTableFilter'
import { usePagination } from '@/composables/usePagination'
import { useDataScope } from '@/composables/useDataScope'
import { useDataStore } from '@/stores/data'
import { matchExact, matchKeyword } from '@/utils/pwms/filter'
import { enrichWarehouseAffiliation, formatOrgOptionLabel, getOrgDescendantIds } from '@/utils/pwms/org'
import type { WarehouseSite, WarehouseUseStatus } from '@/types'
import {
  PROVINCE_COMPANY_FULL_NAME,
  warehouseAssetNatureOptions,
  warehouseSiteTypeOptions,
  warehouseUseStatusOptions,
} from '@/types'

const dataStore = useDataStore()
const { scopeWarehouses, scopePersons, visibleOrganizations, canEditWarehouse } = useDataScope()
const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()

const filterDefaults = {
  keyword: '',
  orgId: '',
  useStatus: '',
  assetNature: '',
  warehouseType: '',
  isSmart: '',
}

const { draft, search, reset, filterListWithCount, resultCount } = useTableFilter(
  filterDefaults,
  (item, f) => {
    const w = item as WarehouseSite
    const smartMatch =
      f.isSmart === '' ||
      (f.isSmart === 'true' && w.isSmart === true) ||
      (f.isSmart === 'false' && !w.isSmart)
    return (
      matchExact(w.orgId, f.orgId as string) &&
      matchExact(w.useStatus, f.useStatus as string) &&
      matchExact(w.assetNature, f.assetNature as string) &&
      matchExact(w.warehouseType ?? '', f.warehouseType as string) &&
      smartMatch &&
      matchKeyword(
        f.keyword as string,
        w.code,
        w.name,
        w.location,
        w.orgName,
        w.keeperName,
        w.remark,
      )
    )
  },
)

const orgOptionsForWarehouse = computed(() =>
  visibleOrganizations.value.filter((o) => o.type === 'city' || o.type === 'county' || o.type === 'team'),
)

const scopedSites = computed(() => scopeWarehouses(dataStore.warehouseSites))

const filterFields = computed<FilterField[]>(() => [
  { key: 'keyword', type: 'input', placeholder: '编码/名称/地点/库管', width: '200px' },
  {
    key: 'orgId',
    type: 'select',
    placeholder: '所属单位',
    options: [
      { label: '全部单位', value: '' },
      ...orgOptionsForWarehouse.value.map((o) => ({ label: formatOrgOptionLabel(o), value: o.id })),
    ],
    width: '180px',
  },
  {
    key: 'useStatus',
    type: 'select',
    placeholder: '使用状态',
    options: [{ label: '全部状态', value: '' }, ...warehouseUseStatusOptions.map((s) => ({ label: s, value: s }))],
    width: '120px',
  },
  {
    key: 'assetNature',
    type: 'select',
    placeholder: '资产性质',
    options: [
      { label: '全部性质', value: '' },
      ...warehouseAssetNatureOptions.map((s) => ({ label: s, value: s })),
    ],
    width: '120px',
  },
  {
    key: 'warehouseType',
    type: 'select',
    placeholder: '仓室类型',
    options: [
      { label: '全部类型', value: '' },
      ...warehouseSiteTypeOptions.map((s) => ({ label: s, value: s })),
    ],
    width: '120px',
  },
  {
    key: 'isSmart',
    type: 'select',
    placeholder: '智慧仓',
    options: [
      { label: '全部', value: '' },
      { label: '是', value: 'true' },
      { label: '否', value: 'false' },
    ],
    width: '100px',
  },
])

const tableData = computed(() =>
  filterListWithCount(scopedSites.value).map((w) => {
    const enriched = enrichWarehouseAffiliation(dataStore.organizations, w)
    return {
      ...enriched,
      assetNatureDisplay:
        w.assetNature === '省公司自有'
          ? PROVINCE_COMPANY_FULL_NAME
          : `租赁${w.leaseUnit ? `（${w.leaseUnit}）` : ''}`,
    }
  }),
)
const { currentPage, pageSize, total, pageData } = usePagination(tableData, 10)

const exportColumns = [
  { key: 'code', label: '仓室编码' },
  { key: 'name', label: '仓室名称' },
  { key: 'location', label: '仓库地点' },
  { key: 'cityOrgName', label: '所属地市' },
  { key: 'countyOrgName', label: '所属县单位' },
  { key: 'stationOrgName', label: '所属供电所' },
  { key: 'orgName', label: '所属单位' },
  { key: 'assetNatureDisplay', label: '资产性质' },
  { key: 'leaseUnit', label: '租赁单位' },
  { key: 'useStatus', label: '使用状态' },
  { key: 'area', label: '面积(㎡)' },
  { key: 'keeperName', label: '库管人员' },
  { key: 'contactPhone', label: '联系电话' },
  { key: 'warehouseType', label: '仓室类型' },
  { key: 'isSmart', label: '智慧仓' },
  { key: 'remark', label: '备注' },
]

const exportData = computed(() =>
  tableData.value.map((w) => ({
    ...w,
    isSmart: w.isSmart ? '是' : '否',
    warehouseType: w.warehouseType ?? '',
    remark: w.remark ?? '',
    contactPhone: w.contactPhone ?? '',
    leaseUnit: w.leaseUnit ?? '',
  })) as Record<string, unknown>[],
)

const form = reactive({
  code: '',
  name: '',
  location: '',
  orgId: '',
  assetNature: '省公司自有' as WarehouseSite['assetNature'],
  leaseUnit: '',
  useStatus: '在用' as WarehouseUseStatus,
  area: 0,
  keeperId: '',
  contactPhone: '',
  warehouseType: '' as WarehouseSite['warehouseType'] | '',
  isSmart: false,
  remark: '',
})

const keeperOptions = computed(() => {
  const scopedPersons = scopePersons(dataStore.persons).filter((p) => p.status === '在职')
  if (!form.orgId) return scopedPersons
  const orgIds = getOrgDescendantIds(dataStore.organizations, form.orgId, true)
  return scopedPersons.filter((p) => orgIds.includes(p.orgId))
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入仓室编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入仓室名称', trigger: 'blur' }],
  location: [{ required: true, message: '请输入仓库地点', trigger: 'blur' }],
  orgId: [{ required: true, message: '请选择所属单位', trigger: 'change' }],
  assetNature: [{ required: true, message: '请选择资产性质', trigger: 'change' }],
  leaseUnit: [
    {
      validator: (_r, v, cb) => {
        if (form.assetNature === '租赁' && !String(v || '').trim()) cb(new Error('租赁仓室请填写租赁单位'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  useStatus: [{ required: true, message: '请选择使用状态', trigger: 'change' }],
  area: [{ required: true, message: '请输入面积', trigger: 'blur' }],
  keeperId: [{ required: true, message: '请选择库管人员', trigger: 'change' }],
}

watch(
  () => form.orgId,
  () => {
    if (form.keeperId && !keeperOptions.value.some((p) => p.id === form.keeperId)) {
      form.keeperId = keeperOptions.value[0]?.id ?? ''
    }
  },
)

watch(
  () => form.keeperId,
  (id) => {
    const person = dataStore.persons.find((p) => p.id === id)
    if (person && !form.contactPhone) form.contactPhone = person.phone
  },
)

function useStatusTagType(status: WarehouseUseStatus) {
  const map: Record<WarehouseUseStatus, 'success' | 'warning' | 'danger' | 'info'> = {
    在用: 'success',
    停用: 'danger',
    改造中: 'warning',
    待建: 'info',
  }
  return map[status]
}

function openDialog(row?: WarehouseSite) {
  editingId.value = row?.id ?? null
  if (row) {
    Object.assign(form, {
      code: row.code,
      name: row.name,
      location: row.location,
      orgId: row.orgId,
      assetNature: row.assetNature,
      leaseUnit: row.leaseUnit ?? '',
      useStatus: row.useStatus,
      area: row.area,
      keeperId: row.keeperId,
      contactPhone: row.contactPhone ?? '',
      warehouseType: row.warehouseType ?? '',
      isSmart: row.isSmart ?? false,
      remark: row.remark ?? '',
    })
  } else {
    Object.assign(form, {
      code: dataStore.genWarehouseCode(),
      name: '',
      location: '',
      orgId: orgOptionsForWarehouse.value[0]?.id ?? '',
      assetNature: '省公司自有',
      leaseUnit: '',
      useStatus: '在用',
      area: 0,
      keeperId: '',
      contactPhone: '',
      warehouseType: '',
      isSmart: false,
      remark: '',
    })
  }
  dialogVisible.value = true
}

async function handleSave() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  const payload = {
    code: form.code,
    name: form.name,
    location: form.location,
    orgId: form.orgId,
    assetNature: form.assetNature,
    leaseUnit: form.assetNature === '租赁' ? form.leaseUnit.trim() : undefined,
    useStatus: form.useStatus,
    area: Number(form.area),
    keeperId: form.keeperId,
    contactPhone: form.contactPhone || undefined,
    warehouseType: form.warehouseType || undefined,
    isSmart: form.isSmart,
    remark: form.remark || undefined,
  }
  try {
    if (editingId.value) {
      dataStore.updateWarehouseSite(editingId.value, payload)
      ElMessage.success('仓室信息已更新')
    } else {
      dataStore.addWarehouseSite(payload)
      ElMessage.success('仓室已新增')
    }
    dialogVisible.value = false
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '保存失败')
  }
}

async function handleDelete(row: WarehouseSite) {
  await ElMessageBox.confirm(`确定删除生产仓「${row.name}」吗？`, '提示', { type: 'warning' })
  try {
    dataStore.removeWarehouseSite(row.id)
    ElMessage.success('已删除')
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败')
  }
}
</script>

<template>
  <PageShell>
    <template #tip>
      录入生产仓<strong>地点</strong>（仓室主数据）：所属单位、资产性质、使用状态、面积、库管人员等，与仓内备品/仪器/工器具台账区分。
    </template>

    <PageHeader title="生产仓台账">
      <template #actions>
        <PageToolbar
          title="生产仓台账"
          filename="生产仓台账"
          :columns="exportColumns"
          :data="exportData"
        />
        <el-button v-if="canEditWarehouse" type="primary" @click="openDialog()">
          <el-icon><Plus /></el-icon>
          新增仓室
        </el-button>
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

      <el-table :data="pageData" row-key="id" stripe border>
        <el-table-column prop="code" label="仓室编码" width="120" fixed="left" />
        <el-table-column prop="name" label="仓室名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="location" label="仓库地点" min-width="200" show-overflow-tooltip />
        <el-table-column prop="cityOrgName" label="所属地市" width="120" show-overflow-tooltip />
        <el-table-column prop="countyOrgName" label="所属县单位" width="120" show-overflow-tooltip />
        <el-table-column prop="stationOrgName" label="所属供电所" width="120" show-overflow-tooltip />
        <el-table-column prop="orgName" label="所属单位" width="130" show-overflow-tooltip />
        <el-table-column prop="assetNatureDisplay" label="资产性质" min-width="160" show-overflow-tooltip />
        <el-table-column prop="useStatus" label="使用状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="useStatusTagType(row.useStatus)">{{ row.useStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="area" label="面积(㎡)" width="100" align="right" />
        <el-table-column prop="keeperName" label="库管人员" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="130" />
        <el-table-column prop="warehouseType" label="仓室类型" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.warehouseType || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="智慧仓" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.isSmart" size="small" type="success">是</el-tag>
            <span v-else class="text-muted">否</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="168" fixed="right">
          <template #default="{ row }">
            <div v-if="canEditWarehouse" class="table-actions">
              <el-button type="primary" size="small" plain @click="openDialog(row)">编辑</el-button>
              <el-button type="danger" size="small" plain @click="handleDelete(row)">删除</el-button>
            </div>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <template #empty><el-empty description="暂无仓室数据" /></template>
      </el-table>
      <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>

  <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑生产仓' : '新增生产仓'"
      width="640px"
      destroy-on-close
    >
      <p class="dialog-hint">仓室主数据与仓内物资台账相互独立；库管人员请从所属单位人员中选择。</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="仓室编码" prop="code">
              <el-input v-model="form.code" placeholder="如 WS20250001" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓室名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="仓库地点" prop="location">
          <el-input v-model="form.location" placeholder="详细地址或位置描述" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="所属单位" prop="orgId">
              <el-select v-model="form.orgId" placeholder="地市/县/班组" style="width: 100%" filterable>
                <el-option
                  v-for="org in orgOptionsForWarehouse"
                  :key="org.id"
                  :label="formatOrgOptionLabel(org)"
                  :value="org.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="库管人员" prop="keeperId">
              <el-select v-model="form.keeperId" placeholder="请先选择所属单位" style="width: 100%" filterable>
                <el-option
                  v-for="p in keeperOptions"
                  :key="p.id"
                  :label="`${p.name}（${p.orgName}）`"
                  :value="p.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="资产性质" prop="assetNature">
              <el-select v-model="form.assetNature" style="width: 100%">
                <el-option
                  v-for="n in warehouseAssetNatureOptions"
                  :key="n"
                  :label="n === '省公司自有' ? PROVINCE_COMPANY_FULL_NAME : n"
                  :value="n"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="form.assetNature === '租赁'" :span="8">
            <el-form-item label="租赁单位" prop="leaseUnit">
              <el-input v-model="form.leaseUnit" placeholder="租赁方单位名称" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="使用状态" prop="useStatus">
              <el-select v-model="form.useStatus" style="width: 100%">
                <el-option v-for="s in warehouseUseStatusOptions" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="面积(㎡)" prop="area">
              <el-input-number v-model="form.area" :min="0" :precision="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="仓室类型">
              <el-select v-model="form.warehouseType" placeholder="可选" style="width: 100%" clearable>
                <el-option v-for="t in warehouseSiteTypeOptions" :key="t" :label="t" :value="t" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="form.contactPhone" placeholder="默认取库管人员电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="智慧仓">
          <el-switch v-model="form.isSmart" active-text="是" inactive-text="否" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
</template>

<style scoped lang="scss">
.text-muted {
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
