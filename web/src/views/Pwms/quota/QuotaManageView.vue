<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDataStore } from '@/stores/data'
import { usePagination } from '@/composables/usePagination'
import type { QuotaFormulaType, SpecialtyType } from '@/types'
import { specialtyPathLabel, specialtyTreeOptions } from '@/types'
import { calcStandardQty, resolveUnevenCoeff } from '@/utils/pwms/quota'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'
import TablePagination from '@/components/Pwms/TablePagination.vue'

const route = useRoute()
const dataStore = useDataStore()
const action = computed(
  () => (route.meta.quotaAction || 'rules') as 'rules' | 'params' | 'results' | 'catalog'
)

const ruleDialog = ref(false)
const paramDialog = ref(false)
const specialtyCascaderProps = { emitPath: false }
const ruleForm = reactive({
  id: '',
  name: '',
  category: 'spare' as const,
  typeName: '熔断器',
  specialty: '' as SpecialtyType | '',
  formulaType: 'standard' as QuotaFormulaType,
  k: 1,
  a: 0,
  t: 3,
  p: 20,
  unit: '只',
  remark: ''
})

const paramForm = reactive({
  id: '',
  orgId: '',
  warehouseId: '',
  ruleId: '',
  deviceCount: 100
})

function openRule(edit?: boolean, id?: string) {
  if (edit && id) {
    const r = dataStore.quotaRules.find((x) => x.id === id)
    if (r) Object.assign(ruleForm, { ...r, specialty: r.specialty || '' })
  } else {
    Object.assign(ruleForm, {
      id: '',
      name: '',
      category: 'spare',
      typeName: '熔断器',
      specialty: '',
      formulaType: 'standard',
      k: 1,
      a: 0,
      t: 3,
      p: 20,
      unit: '只',
      remark: ''
    })
  }
  ruleDialog.value = true
}

function saveRule() {
  if (!ruleForm.name.trim() || !ruleForm.typeName.trim() || !ruleForm.specialty) {
    ElMessage.error('请填写规则名称、品类名称并选择适用专业')
    return
  }
  if (ruleForm.k < 0 || ruleForm.k > 100) {
    ElMessage.error('K 为百分比，请填写 0～100 之间的数值')
    return
  }
  if (ruleForm.formulaType === 'production' && (ruleForm.a < 0.8 || ruleForm.a > 2.4)) {
    ElMessage.error('生产仓差异系数 α 应在 0.8～2.4 范围内')
    return
  }
  if (ruleForm.formulaType === 'standard' && (ruleForm.t <= 0 || ruleForm.p <= 0)) {
    ElMessage.error('配置原则公式中的 T、P 必须大于 0')
    return
  }
  dataStore.saveQuotaRule({
    id: ruleForm.id || undefined,
    name: ruleForm.name,
    category: ruleForm.category,
    typeName: ruleForm.typeName,
    specialty: ruleForm.specialty as SpecialtyType,
    formulaType: ruleForm.formulaType,
    k: ruleForm.k,
    a: ruleForm.a,
    t: ruleForm.t,
    p: ruleForm.p,
    unit: ruleForm.unit,
    remark: ruleForm.remark
  })
  ElMessage.success('规则已保存')
  ruleDialog.value = false
}

function openParam(edit?: boolean, id?: string) {
  if (edit && id) {
    const p = dataStore.orgDeviceParams.find((x) => x.id === id)
    if (p) {
      Object.assign(paramForm, {
        id: p.id,
        orgId: p.orgId,
        warehouseId: p.warehouseId || '',
        ruleId: p.ruleId,
        deviceCount: p.deviceCount
      })
    }
  } else {
    Object.assign(paramForm, {
      id: '',
      orgId: dataStore.organizations[0]?.id ?? '',
      warehouseId: '',
      ruleId: dataStore.quotaRules[0]?.id ?? '',
      deviceCount: 100
    })
  }
  paramDialog.value = true
}

function saveParam() {
  dataStore.saveOrgDeviceParam({ ...paramForm, id: paramForm.id || undefined })
  ElMessage.success('参数已保存')
  paramDialog.value = false
}

async function removeRule(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该定额规则？关联参数需重新绑定。', '删除确认', {
      type: 'warning'
    })
    dataStore.removeQuotaRule(id)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

async function removeParam(id: string) {
  try {
    await ElMessageBox.confirm('确认删除该单位参数？', '删除确认', { type: 'warning' })
    dataStore.removeOrgDeviceParam(id)
    ElMessage.success('已删除')
  } catch {
    /* cancel */
  }
}

function calc() {
  const res = dataStore.calculateAllQuotas()
  ElMessage.success(`已测算 ${res.length} 条，缺额将写入告警中心`)
}

const titles = {
  rules: '定额规则',
  params: '单位参数填报',
  results: '定额测算结果',
  catalog: '省市定额分布'
}

function formulaLabel(formulaType: QuotaFormulaType) {
  return formulaType === 'standard' ? '配置原则公式' : '生产仓公式（待重构）'
}

const selectedParamRule = computed(() =>
  dataStore.quotaRules.find((rule) => rule.id === paramForm.ruleId)
)
const paramAk = computed(() => {
  const rule = selectedParamRule.value
  return rule ? (paramForm.deviceCount * rule.k) / 100 : 0
})
const recommendedA = computed(() => resolveUnevenCoeff(paramAk.value))
const paramPreview = computed(() => {
  const rule = selectedParamRule.value
  return rule ? calcStandardQty(rule.formulaType, paramForm.deviceCount, rule) : 0
})
const paramPreviewTitle = computed(() => {
  const rule = selectedParamRule.value
  if (!rule) return ''
  if (rule.formulaType === 'production') {
    return `公式来源已确认，当前试算 N=${paramPreview.value}；但标准中 A 为电网资产原值（万元）、N 为金额定额，不能直接与实物数量比较，参数模型待重构。`
  }
  return `试算：A×K%=${paramAk.value.toFixed(2)}，表 A-1 建议 a=${recommendedA.value}；当前规则 a=${rule.a || recommendedA.value}，测算 N=${paramPreview.value}`
})

const listSource = computed((): unknown[] => {
  if (action.value === 'rules') return dataStore.quotaRules
  if (action.value === 'params') return dataStore.orgDeviceParams
  return dataStore.quotaResults
})
const { currentPage, pageSize, total, pageData } = usePagination(listSource, 10)

/** 省市定额分布地图 */
const catalogMapRef = ref<HTMLDivElement | null>(null)
let catalogMap: L.Map | null = null

const catalogMapPoints = computed(() => {
  const points: {
    name: string
    lat: number
    lng: number
    standardQty: number
    actualQty: number
    shortage: number
  }[] = []
  for (const q of dataStore.quotaResults) {
    const wh = q.warehouseId ? dataStore.getWarehouseSite(q.warehouseId) : null
    if (!wh?.lat || !wh.lng) continue
    points.push({
      name: wh.name,
      lat: wh.lat,
      lng: wh.lng,
      standardQty: q.standardQty,
      actualQty: q.actualQty,
      shortage: q.shortage
    })
  }
  return points
})

function renderCatalogMap() {
  if (!catalogMapRef.value || action.value !== 'catalog') return
  if (!catalogMap) {
    catalogMap = L.map(catalogMapRef.value, { zoomControl: true }).setView([41.1, 122.5], 7)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(catalogMap)
  }
  catalogMap.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker) catalogMap!.removeLayer(layer)
  })
  for (const p of catalogMapPoints.value) {
    const radius = Math.max(8, Math.min(32, 6 + Math.sqrt(p.standardQty)))
    const color = p.shortage > 0 ? '#f56c6c' : '#409eff'
    const fill = p.shortage > 0 ? '#fab6b6' : '#69b1ff'
    const marker = L.circleMarker([p.lat, p.lng], {
      radius,
      color,
      fillColor: fill,
      fillOpacity: 0.8,
      weight: 2
    })
    marker.bindPopup(
      `<b>${p.name}</b><br/>标准 ${p.standardQty}<br/>实存 ${p.actualQty}<br/>缺额 ${p.shortage}`
    )
    marker.addTo(catalogMap!)
  }
  nextTick(() => catalogMap?.invalidateSize())
}

onMounted(() => {
  if (action.value === 'catalog') {
    nextTick(() => renderCatalogMap())
    setTimeout(() => catalogMap?.invalidateSize(), 200)
  }
})

onUnmounted(() => {
  catalogMap?.remove()
  catalogMap = null
})

watch([catalogMapPoints, action], () => {
  if (action.value === 'catalog') renderCatalogMap()
})

function availableQty(row: { availableQty?: number; actualQty: number }) {
  return row.availableQty ?? row.actualQty
}
</script>

<template>
  <PageShell tip="定额规则按营销、运检、调控专业归类；不同专业的变量含义和公式口径不得交叉套用。">
    <PageHeader :title="titles[action]">
      <template #actions>
        <el-button v-if="action === 'rules'" type="primary" @click="openRule(false)"
          >新增规则</el-button
        >
        <el-button v-if="action === 'params'" type="primary" @click="openParam(false)"
          >填报参数</el-button
        >
        <el-button v-if="action === 'results' || action === 'catalog'" type="primary" @click="calc"
          >重新测算</el-button
        >
      </template>
    </PageHeader>

    <div v-if="action === 'catalog'" class="catalog-map-panel">
      <div class="panel-head">全省定额分布地图</div>
      <div ref="catalogMapRef" class="catalog-map" />
    </div>

    <el-table v-if="action === 'rules'" :data="pageData" border stripe>
      <el-table-column prop="name" label="规则名称" min-width="160" />
      <el-table-column prop="typeName" label="品类" width="100" />
      <el-table-column label="适用专业" width="150">
        <template #default="{ row }">{{ specialtyPathLabel(row.specialty) }}</template>
      </el-table-column>
      <el-table-column prop="formulaType" label="公式" width="110">
        <template #default="{ row }">
          {{ formulaLabel(row.formulaType) }}
        </template>
      </el-table-column>
      <el-table-column prop="k" label="K(%)" width="80" />
      <el-table-column label="a" width="70">
        <template #default="{ row }">{{ row.a > 0 ? row.a : '自动' }}</template>
      </el-table-column>
      <el-table-column prop="t" label="T(月)" width="80" />
      <el-table-column prop="p" label="P(年)" width="80" />
      <el-table-column prop="remark" label="说明" min-width="140" />
      <el-table-column label="操作" width="168">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" size="small" plain @click="openRule(true, row.id)"
              >编辑</el-button
            >
            <el-button type="danger" size="small" plain @click="removeRule(row.id)">删除</el-button>
          </div>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无定额规则" /></template>
    </el-table>

    <el-table v-else-if="action === 'params'" :data="pageData" border stripe>
      <el-table-column prop="orgName" label="单位" min-width="120" />
      <el-table-column prop="warehouseName" label="仓室" min-width="140" />
      <el-table-column label="规则" min-width="140">
        <template #default="{ row }">
          {{ dataStore.quotaRules.find((r) => r.id === row.ruleId)?.name || row.ruleId }}
        </template>
      </el-table-column>
      <el-table-column prop="deviceCount" label="设备量 A" width="100" />
      <el-table-column prop="updatedAt" label="更新时间" width="170" />
      <el-table-column label="操作" width="168">
        <template #default="{ row }">
          <div class="table-actions">
            <el-button type="primary" size="small" plain @click="openParam(true, row.id)"
              >编辑</el-button
            >
            <el-button type="danger" size="small" plain @click="removeParam(row.id)"
              >删除</el-button
            >
          </div>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无定额参数" /></template>
    </el-table>

    <el-table v-else :data="pageData" border stripe>
      <el-table-column prop="orgName" label="单位" min-width="120" />
      <el-table-column prop="warehouseName" label="仓室" min-width="140" />
      <el-table-column prop="typeName" label="品类" width="100" />
      <el-table-column label="适用专业" width="150">
        <template #default="{ row }">{{ specialtyPathLabel(row.specialty) }}</template>
      </el-table-column>
      <el-table-column v-if="action === 'results'" prop="formulaType" label="公式" width="100">
        <template #default="{ row }">
          {{ formulaLabel(row.formulaType) }}
        </template>
      </el-table-column>
      <el-table-column v-if="action === 'results'" prop="deviceCount" label="A" width="70" />
      <el-table-column prop="standardQty" label="储备定额 N" width="110" />
      <el-table-column prop="actualQty" label="实库存" width="90" />
      <el-table-column label="可用库存" width="100">
        <template #default="{ row }">{{ availableQty(row) }}</template>
      </el-table-column>
      <el-table-column prop="shortage" label="缺额" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.shortage > 0" type="danger">{{ row.shortage }}</el-tag>
          <span v-else>0</span>
        </template>
      </el-table-column>
      <el-table-column
        v-if="action === 'results'"
        prop="calculatedAt"
        label="测算时间"
        width="170"
      />
      <template #empty><el-empty description="暂无测算结果" /></template>
    </el-table>
    <TablePagination v-model:page="currentPage" v-model:page-size="pageSize" :total="total" />
  </PageShell>

  <el-dialog v-model="ruleDialog" title="定额规则" width="680px">
    <el-alert
      v-if="ruleForm.formulaType === 'standard'"
      title="依据本地《电网设备备品备件配置原则》（2014-11-15印发）：备品可参考 N=A·K%·a·T/P；备件应按附表比例或定量配置，不能一律套用该公式。"
      type="success"
      show-icon
      :closable="false"
      class="formula-alert"
    />
    <el-alert
      v-else
      title="客户补充材料第 29 页已确认生产仓公式 N=A×(1-K%)×α；其中 A 为电网资产原值（万元）、K 为供电可靠性、α 为差异系数。现有数量型参数与库存对比模型仍需重构，暂不可作为正式定额结果。"
      type="warning"
      show-icon
      :closable="false"
      class="formula-alert"
    />
    <el-form label-width="110px">
      <el-form-item label="名称"><el-input v-model="ruleForm.name" /></el-form-item>
      <el-form-item label="品类名称"><el-input v-model="ruleForm.typeName" /></el-form-item>
      <el-form-item label="适用专业">
        <el-cascader
          v-model="ruleForm.specialty"
          :options="specialtyTreeOptions"
          :props="specialtyCascaderProps"
          clearable
          style="width: 100%"
          placeholder="请选择营销、运检或调控专业"
        />
      </el-form-item>
      <el-form-item label="公式类型">
        <el-radio-group v-model="ruleForm.formulaType">
          <el-radio value="standard">配置原则 N=A·K%·a·T/P</el-radio>
          <el-radio value="production">生产仓 N=A×(1-K%)×α</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="K（%）">
        <el-input-number v-model="ruleForm.k" :min="0" :max="100" :step="0.1" />
        <span class="field-help">输入 1 表示 1%，不是比例 1.0</span>
      </el-form-item>
      <el-form-item :label="ruleForm.formulaType === 'production' ? 'α' : 'a'">
        <el-input-number v-model="ruleForm.a" :min="0" :max="2.4" :step="0.1" />
        <span v-if="ruleForm.formulaType === 'production'" class="field-help"
          >α=地理环境系数（0.8～1.2）×应急系数（1～2）</span
        >
        <span v-else class="field-help"
          >配置原则下应结合本单位 A×K% 按表取值；填 0 时系统自动查表</span
        >
      </el-form-item>
      <el-form-item v-if="ruleForm.formulaType === 'standard'" label="T(月)">
        <el-input-number v-model="ruleForm.t" :min="1" />
      </el-form-item>
      <el-form-item v-if="ruleForm.formulaType === 'standard'" label="P(年)">
        <el-input-number v-model="ruleForm.p" :min="1" />
      </el-form-item>
      <el-form-item label="单位"><el-input v-model="ruleForm.unit" /></el-form-item>
    </el-form>

    <div class="coefficient-help">
      <h4>公式与系数说明</h4>
      <div v-if="ruleForm.formulaType === 'production'" class="coefficient-grid">
        <div><strong>N</strong><span>生产仓备品备件储备定额，单位：万元</span></div>
        <div><strong>A</strong><span>电网资产原值，单位：万元</span></div>
        <div><strong>K</strong><span>供电可靠性，单位：百分比</span></div>
        <div><strong>α</strong><span>地理环境系数 × 应急系数</span></div>
      </div>
      <div v-else class="coefficient-grid">
        <div><strong>N</strong><span>某单位某类设备的储备定额</span></div>
        <div><strong>A</strong><span>该单位管辖的同类在运设备件数</span></div>
        <div><strong>K</strong><span>百台设备障碍率，单位为百分比</span></div>
        <div><strong>a</strong><span>不平均系数，由 A×K% 对照确定</span></div>
        <div><strong>T</strong><span>备品订货周期，单位：月</span></div>
        <div><strong>P</strong><span>备品健康寿命，单位：年</span></div>
      </div>
      <p v-if="ruleForm.formulaType === 'standard'" class="lookup-title">表 A-1 不平均系数对照</p>
      <div v-if="ruleForm.formulaType === 'standard'" class="lookup-row">
        <span>A×K%：≤1 / 2～5 / 6～10 / 11～20 / 21～30 / 31～40 / 41～70 / 71～100</span>
        <span>a：1 / 0.9 / 0.8 / 0.7 / 0.6 / 0.5 / 0.4 / 0.3</span>
      </div>
    </div>
    <template #footer>
      <el-button @click="ruleDialog = false">取消</el-button>
      <el-button type="primary" @click="saveRule">保存</el-button>
    </template>
  </el-dialog>

  <el-dialog v-model="paramDialog" title="单位参数" width="520px">
    <el-form label-width="100px">
      <el-form-item label="单位">
        <el-select v-model="paramForm.orgId" filterable style="width: 100%">
          <el-option
            v-for="o in dataStore.organizations"
            :key="o.id"
            :label="o.name"
            :value="o.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="仓室">
        <el-select v-model="paramForm.warehouseId" clearable filterable style="width: 100%">
          <el-option
            v-for="w in dataStore.warehouseSites"
            :key="w.id"
            :label="w.name"
            :value="w.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="规则">
        <el-select v-model="paramForm.ruleId" style="width: 100%">
          <el-option v-for="r in dataStore.quotaRules" :key="r.id" :label="r.name" :value="r.id" />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="selectedParamRule?.formulaType === 'production' ? '资产原值 A（万元）' : '设备量 A'"
      >
        <el-input-number v-model="paramForm.deviceCount" :min="1" />
      </el-form-item>
    </el-form>
    <el-alert
      v-if="selectedParamRule"
      :type="
        selectedParamRule.formulaType === 'standard' &&
        selectedParamRule.a > 0 &&
        selectedParamRule.a !== recommendedA
          ? 'warning'
          : 'info'
      "
      :closable="false"
      show-icon
      class="param-preview"
      :title="paramPreviewTitle"
    />
    <template #footer>
      <el-button @click="paramDialog = false">取消</el-button>
      <el-button type="primary" @click="saveParam">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.catalog-map-panel {
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
.catalog-map {
  height: 320px;
  width: 100%;
}

.formula-alert,
.param-preview {
  margin-bottom: 16px;
}

.field-help {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.coefficient-help {
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;

  h4,
  p {
    margin: 0;
  }
}

.coefficient-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 14px;
  margin-top: 10px;

  div {
    display: flex;
    gap: 8px;
    font-size: 13px;
  }

  strong {
    min-width: 16px;
    color: var(--el-color-primary);
  }
}

.lookup-title {
  margin-top: 12px !important;
  font-size: 13px;
  font-weight: 600;
}

.lookup-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
