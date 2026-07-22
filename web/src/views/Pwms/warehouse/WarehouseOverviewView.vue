<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDataStore } from '@/stores/data'
import { useDataScope } from '@/composables/useDataScope'
import { getSmartWarehouseEnv } from '@/mock/warehouseEnv'
import {
  PROVINCE_COMPANY_FULL_NAME,
  type AssetCategory,
  type WarehouseSite,
  type WarehouseUseStatus,
} from '@/types'
import { categoryLabels } from '@/types'
import { getOrgChildren, getOrgDescendantIds, resolveOrgAffiliation, warehouseOrgTier } from '@/utils/pwms/org'
import PageHeader from '@/components/Pwms/PageHeader.vue'
import PageShell from '@/components/Pwms/PageShell.vue'

const route = useRoute()
const router = useRouter()
const dataStore = useDataStore()
const { scopeWarehouses, scopeLedgersByCategories } = useDataScope()

const selectedWarehouseId = ref('')
/** 同构层级穿透栈：空 = 全省（地市列表） */
const drillStack = ref<{ id: string; name: string }[]>([])
const currentDrillOrgId = computed(() =>
  drillStack.value.length ? drillStack.value[drillStack.value.length - 1]!.id : null,
)

const warehouseOptions = computed(() => scopeWarehouses(dataStore.warehouseSites))
const scopedLedgers = computed(() => scopeLedgersByCategories(dataStore.ledgers, ['spare', 'instrument', 'tool']))

const currentSite = computed(() =>
  selectedWarehouseId.value ? dataStore.getWarehouseSite(selectedWarehouseId.value) : null,
)

const smartEnv = computed(() =>
  currentSite.value?.isSmart ? getSmartWarehouseEnv(currentSite.value.id) : null,
)

const affiliation = computed(() =>
  currentSite.value
    ? resolveOrgAffiliation(dataStore.organizations, currentSite.value.orgId)
    : null,
)

interface CategoryStat {
  category: AssetCategory
  label: string
  typeCount: number
  totalQuantity: number
  inStockQuantity: number
}

const categoryOrder: AssetCategory[] = ['spare', 'instrument', 'tool']

function computeCategoryStat(warehouseId: string, category: AssetCategory): CategoryStat {
  const items = scopedLedgers.value.filter((l) => l.warehouseId === warehouseId && l.category === category)
  return {
    category,
    label: categoryLabels[category],
    typeCount: new Set(items.map((i) => i.typeId)).size,
    totalQuantity: items.reduce((s, l) => s + l.quantity, 0),
    inStockQuantity: items.filter((l) => l.status === '在库').reduce((s, l) => s + l.quantity, 0),
  }
}

const categoryStats = computed(() => {
  if (!selectedWarehouseId.value) return []
  return categoryOrder.map((cat) => computeCategoryStat(selectedWarehouseId.value, cat))
})

const totalDevices = computed(() => categoryStats.value.reduce((s, r) => s + r.totalQuantity, 0))

/** 全省/本级汇总 KPI */
const provinceSummary = computed(() => {
  const sites = warehouseOptions.value.filter((w) => w.useStatus !== '待建')
  const byTier = { province: 0, city: 0, county: 0, station: 0 }
  for (const s of sites) {
    byTier[warehouseOrgTier(dataStore.organizations, s.orgId)]++
  }
  const ledgers = scopedLedgers.value
  const qty = (cat: AssetCategory) =>
    ledgers.filter((l) => l.category === cat).reduce((s, l) => s + l.quantity, 0)
  const rate = (cat: AssetCategory, field: 'trialDueStatus' | 'checkDueStatus') => {
    const list = ledgers.filter((l) => l.category === cat)
    if (!list.length) return 100
    const ok = list.filter((l) => (l[field] || '正常') !== '超期').length
    return Math.round((ok / list.length) * 1000) / 10
  }
  return {
    totalSites: sites.length,
    ...byTier,
    spareQty: qty('spare'),
    instrumentQty: qty('instrument'),
    toolQty: qty('tool'),
    spareTrialRate: rate('spare', 'trialDueStatus'),
    instrumentCalRate: rate('instrument', 'checkDueStatus'),
    toolCalRate: rate('tool', 'checkDueStatus'),
  }
})

interface OrgStatRow {
  orgId: string
  orgName: string
  orgType: string
  siteCount: number
  spareQty: number
  instrumentQty: number
  toolQty: number
}

function buildOrgStatRow(orgId: string, orgName: string, orgType: string): OrgStatRow {
  const orgs = dataStore.organizations
  const descendantIds = new Set(getOrgDescendantIds(orgs, orgId, true))
  const siteIds = new Set(
    warehouseOptions.value.filter((s) => descendantIds.has(s.orgId)).map((s) => s.id),
  )
  const ledgers = scopedLedgers.value.filter((l) => siteIds.has(l.warehouseId))
  return {
    orgId,
    orgName,
    orgType,
    siteCount: siteIds.size,
    spareQty: ledgers.filter((l) => l.category === 'spare').reduce((s, l) => s + l.quantity, 0),
    instrumentQty: ledgers.filter((l) => l.category === 'instrument').reduce((s, l) => s + l.quantity, 0),
    toolQty: ledgers.filter((l) => l.category === 'tool').reduce((s, l) => s + l.quantity, 0),
  }
}

function orgTypeDisplay(type: string) {
  if (type === 'team') return '供电所'
  if (type === 'county') return '县公司'
  if (type === 'city') return '地市'
  if (type === 'province') return '省公司'
  return '分部'
}

/** 当前焦点下是否还有下级组织可穿透 */
const childOrgsAtFocus = computed(() => {
  const parentId = currentDrillOrgId.value
  const orgs = dataStore.organizations
  if (!parentId) return orgs.filter((o) => o.type === 'city')
  return getOrgChildren(orgs, parentId)
})

const hasChildOrgs = computed(() => childOrgsAtFocus.value.length > 0)

/** 末级：无下级组织时展示管辖仓室；中间层另展示本级直属仓 */
const showOrgLayer = computed(() => !currentDrillOrgId.value || hasChildOrgs.value)
const showLeafSiteLayer = computed(() => Boolean(currentDrillOrgId.value) && !hasChildOrgs.value)

const orgStatRows = computed((): OrgStatRow[] => {
  if (!showOrgLayer.value) return []
  return childOrgsAtFocus.value
    .map((org) => buildOrgStatRow(org.id, org.name, orgTypeDisplay(org.type)))
    .filter((r) => r.siteCount > 0)
})

const siteRowsUnderDrill = computed(() => {
  if (!currentDrillOrgId.value) return []
  const orgs = dataStore.organizations
  if (showLeafSiteLayer.value) {
    const descendantIds = new Set(getOrgDescendantIds(orgs, currentDrillOrgId.value, true))
    return warehouseOptions.value
      .filter((s) => descendantIds.has(s.orgId))
      .map((s) => mapSiteRow(s))
  }
  // 中间层：仅本级直属仓室
  return warehouseOptions.value
    .filter((s) => s.orgId === currentDrillOrgId.value)
    .map((s) => mapSiteRow(s))
})

const showDirectSiteCard = computed(
  () =>
    Boolean(currentDrillOrgId.value) &&
    hasChildOrgs.value &&
    siteRowsUnderDrill.value.length > 0,
)

function mapSiteRow(s: WarehouseSite) {
  const orgs = dataStore.organizations
  return {
    ...s,
    ...resolveOrgAffiliation(orgs, s.orgId),
    assetNatureLabel:
      s.assetNature === '省公司自有' ? PROVINCE_COMPANY_FULL_NAME : `租赁（${s.leaseUnit || '—'}）`,
  }
}

const breadcrumbItems = computed(() => [
  { id: null as string | null, name: '全省' },
  ...drillStack.value.map((s) => ({ id: s.id as string | null, name: s.name })),
])

function initSelection() {
  const fromQuery = route.query.warehouseId as string | undefined
  if (fromQuery && warehouseOptions.value.some((w) => w.id === fromQuery)) {
    selectedWarehouseId.value = fromQuery
    return
  }
  selectedWarehouseId.value = ''
}

watch(
  () => route.query.warehouseId,
  () => initSelection(),
  { immediate: true },
)

function enterSite(site: WarehouseSite) {
  router.push({ path: '/warehouse/overview', query: { warehouseId: site.id } })
}

function backToSummary() {
  selectedWarehouseId.value = ''
  router.replace({ path: '/warehouse/overview', query: {} })
}

function drillIntoOrg(row: OrgStatRow) {
  drillStack.value = [...drillStack.value, { id: row.orgId, name: row.orgName }]
}

function jumpBreadcrumb(index: number) {
  if (index <= 0) {
    drillStack.value = []
    return
  }
  drillStack.value = drillStack.value.slice(0, index)
}

function onOrgRowClick(row: OrgStatRow) {
  drillIntoOrg(row)
}

function useStatusTagType(status: WarehouseUseStatus) {
  const map: Record<WarehouseUseStatus, 'success' | 'warning' | 'danger' | 'info'> = {
    在用: 'success',
    停用: 'danger',
    改造中: 'warning',
    待建: 'info',
  }
  return map[status]
}

function goLedger(category: AssetCategory) {
  if (!selectedWarehouseId.value) return
  router.push({ path: `/${category}/ledger`, query: { warehouseId: selectedWarehouseId.value } })
}

function goWarehouseLedger(site?: WarehouseSite | null) {
  router.push({ path: '/warehouse/ledger', query: site ? { keyword: site.name } : {} })
}

function assetNatureDisplay(site: WarehouseSite) {
  if (site.assetNature === '省公司自有') return PROVINCE_COMPANY_FULL_NAME
  return `租赁${site.leaseUnit ? `（${site.leaseUnit}）` : ''}`
}
</script>

<template>
  <PageShell
    tip="生产仓概览先展示本级可见范围内全省/组织统计，行点击穿透下级；末级进入仓室列表，再进入单仓详情。"
  >
    <!-- 单仓详情 -->
    <template v-if="currentSite">
      <PageHeader title="生产仓仓室详情">
        <template #actions>
          <el-button @click="backToSummary">← 返回汇总</el-button>
        </template>
      </PageHeader>

      <el-card shadow="never" class="info-card">
        <template #header>
          <div class="card-header">
            <span>{{ currentSite.name }}</span>
            <div class="card-header__tags">
              <el-tag v-if="currentSite.isSmart" size="small" type="success">智慧仓</el-tag>
              <el-tag size="small" :type="useStatusTagType(currentSite.useStatus)">
                {{ currentSite.useStatus }}
              </el-tag>
            </div>
          </div>
        </template>
        <el-descriptions :column="3" border size="small">
          <el-descriptions-item label="仓室编码">{{ currentSite.code }}</el-descriptions-item>
          <el-descriptions-item label="仓库地点" :span="2">{{ currentSite.location }}</el-descriptions-item>
          <el-descriptions-item label="所属地市">{{ affiliation?.cityOrgName }}</el-descriptions-item>
          <el-descriptions-item label="所属县单位">{{ affiliation?.countyOrgName }}</el-descriptions-item>
          <el-descriptions-item label="所属供电所">{{ affiliation?.stationOrgName }}</el-descriptions-item>
          <el-descriptions-item label="资产性质" :span="2">{{ assetNatureDisplay(currentSite) }}</el-descriptions-item>
          <el-descriptions-item label="面积">{{ currentSite.area }} ㎡</el-descriptions-item>
          <el-descriptions-item label="库管人员">{{ currentSite.keeperName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentSite.contactPhone || '—' }}</el-descriptions-item>
          <el-descriptions-item label="仓室类型">{{ currentSite.warehouseType || '—' }}</el-descriptions-item>
        </el-descriptions>
        <div class="card-footer">
          <el-button link type="primary" @click="goWarehouseLedger(currentSite)">编辑仓室信息 →</el-button>
          <el-button link type="primary" @click="router.push('/warehouse/inout/in-apply')">入库申请 →</el-button>
          <el-button link type="primary" @click="router.push('/warehouse/inout/out-apply')">出库申请 →</el-button>
          <el-button link type="primary" @click="router.push('/warehouse/inventory/execute')">执行盘点 →</el-button>
        </div>
      </el-card>

      <el-card v-if="currentSite.isSmart && smartEnv" shadow="never" class="env-card">
        <template #header>
          <div class="card-header">
            <span>智慧仓环境监测</span>
            <el-tag size="small" type="success">在线</el-tag>
          </div>
        </template>
        <div class="env-grid">
          <div class="env-item">
            <div class="env-item__label">温度</div>
            <div class="env-item__value">{{ smartEnv.temperature }}<small>℃</small></div>
          </div>
          <div class="env-item">
            <div class="env-item__label">湿度</div>
            <div class="env-item__value">{{ smartEnv.humidity }}<small>%</small></div>
          </div>
          <div class="env-item">
            <div class="env-item__label">烟感状态</div>
            <div class="env-item__value">
              <el-tag :type="smartEnv.smokeNormal ? 'success' : 'danger'" size="small">
                {{ smartEnv.smokeNormal ? '正常' : '告警' }}
              </el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <div class="stats-section">
        <div class="stats-section__head">
          <h3>仓内物资统计</h3>
          <span class="stats-summary">合计 {{ totalDevices }} 件/套/台</span>
        </div>
        <el-table :data="categoryStats" stripe border>
          <el-table-column prop="label" label="类别" width="120" />
          <el-table-column prop="typeCount" label="种类数" width="100" align="center" />
          <el-table-column prop="totalQuantity" label="总数量" width="100" align="center" />
          <el-table-column prop="inStockQuantity" label="在库数" width="100" align="center" />
          <el-table-column label="操作" min-width="130">
            <template #default="{ row }">
              <el-button type="primary" size="small" plain @click="goLedger(row.category)">查看台账</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <!-- 全省/本级汇总 -->
    <template v-else>
      <PageHeader title="生产仓概览">
        <template #actions>
          <el-button type="primary" plain @click="router.push('/warehouse/ledger')">生产仓台账</el-button>
        </template>
      </PageHeader>

      <el-empty v-if="!warehouseOptions.length" description="管辖范围内暂无生产仓地点">
        <el-button type="primary" @click="router.push('/warehouse/ledger')">前往生产仓台账录入</el-button>
      </el-empty>

      <template v-else>
        <div class="kpi-grid">
          <div class="kpi"><div class="kpi__label">生产仓总数</div><div class="kpi__value">{{ provinceSummary.totalSites }}</div></div>
          <div class="kpi"><div class="kpi__label">省级挂靠</div><div class="kpi__value">{{ provinceSummary.province }}</div></div>
          <div class="kpi"><div class="kpi__label">市级</div><div class="kpi__value">{{ provinceSummary.city }}</div></div>
          <div class="kpi"><div class="kpi__label">县级</div><div class="kpi__value">{{ provinceSummary.county }}</div></div>
          <div class="kpi"><div class="kpi__label">供电所</div><div class="kpi__value">{{ provinceSummary.station }}</div></div>
          <div class="kpi"><div class="kpi__label">备品备件</div><div class="kpi__value">{{ provinceSummary.spareQty }}</div></div>
          <div class="kpi"><div class="kpi__label">仪器仪表</div><div class="kpi__value">{{ provinceSummary.instrumentQty }}</div></div>
          <div class="kpi"><div class="kpi__label">工器具</div><div class="kpi__value">{{ provinceSummary.toolQty }}</div></div>
          <div class="kpi"><div class="kpi__label">备品试验合格率</div><div class="kpi__value">{{ provinceSummary.spareTrialRate }}%</div></div>
          <div class="kpi"><div class="kpi__label">仪表检定合格率</div><div class="kpi__value">{{ provinceSummary.instrumentCalRate }}%</div></div>
          <div class="kpi"><div class="kpi__label">工器具检定合格率</div><div class="kpi__value">{{ provinceSummary.toolCalRate }}%</div></div>
        </div>

        <div class="drill-breadcrumb">
          <template v-for="(item, idx) in breadcrumbItems" :key="item.id ?? 'root'">
            <span v-if="idx > 0" class="drill-breadcrumb__sep">/</span>
            <button
              type="button"
              class="drill-breadcrumb__link"
              :class="{ 'is-current': idx === breadcrumbItems.length - 1 }"
              :disabled="idx === breadcrumbItems.length - 1"
              @click="jumpBreadcrumb(idx)"
            >
              {{ item.name }}
            </button>
          </template>
        </div>

        <el-card v-if="showOrgLayer" shadow="never" class="table-card">
          <template #header>
            <span>组织分级统计（点击行穿透查看）</span>
          </template>
          <el-table
            :data="orgStatRows"
            stripe
            border
            class="clickable-rows"
            @row-click="onOrgRowClick"
          >
            <el-table-column prop="orgName" label="单位" min-width="160" />
            <el-table-column prop="orgType" label="层级" width="90" />
            <el-table-column prop="siteCount" label="仓座数" width="90" align="center" />
            <el-table-column prop="spareQty" label="备品备件" width="100" align="center" />
            <el-table-column prop="instrumentQty" label="仪器仪表" width="100" align="center" />
            <el-table-column prop="toolQty" label="工器具" width="90" align="center" />
            <el-table-column label="" width="110" fixed="right">
              <template #default>
                <span class="row-hint">穿透查看 →</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <el-card v-if="showLeafSiteLayer || showDirectSiteCard" shadow="never" class="table-card">
          <template #header>
            <span>{{ showDirectSiteCard ? '本级直属仓室（点击行进入仓室）' : '仓室列表（点击行进入仓室）' }}</span>
          </template>
          <el-empty v-if="!siteRowsUnderDrill.length" description="该单位下暂无仓室" />
          <el-table
            v-else
            :data="siteRowsUnderDrill"
            stripe
            border
            class="clickable-rows"
            @row-click="(row: WarehouseSite) => enterSite(row)"
          >
            <el-table-column prop="name" label="仓室名称" min-width="160" />
            <el-table-column prop="cityOrgName" label="所属地市" width="120" />
            <el-table-column prop="countyOrgName" label="所属县单位" width="120" />
            <el-table-column prop="stationOrgName" label="所属供电所" width="120" />
            <el-table-column prop="assetNatureLabel" label="资产性质" min-width="160" />
            <el-table-column prop="useStatus" label="状态" width="80" />
            <el-table-column label="" width="110" fixed="right">
              <template #default>
                <span class="row-hint">进入仓室 →</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </template>
  </PageShell>
</template>

<style scoped lang="scss">
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.kpi {
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid var(--pwms-border, var(--el-border-color-lighter));
  background: var(--pwms-panel-elevated, var(--el-fill-color-blank));

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 6px;
  }

  &__value {
    font-size: 22px;
    font-weight: 600;
  }
}

.table-card {
  margin-bottom: 16px;
}

.drill-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  font-size: 13px;

  &__sep {
    color: var(--el-text-color-placeholder);
    margin: 0 2px;
  }

  &__link {
    border: none;
    background: transparent;
    padding: 0 2px;
    color: var(--el-color-primary);
    cursor: pointer;
    font: inherit;

    &.is-current,
    &:disabled {
      color: var(--el-text-color-primary);
      font-weight: 600;
      cursor: default;
    }
  }
}

.clickable-rows :deep(.el-table__row) {
  cursor: pointer;
}

.row-hint {
  font-size: 12px;
  color: var(--el-color-primary);
}

.info-card,
.env-card {
  margin-bottom: 16px;
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;

  &__tags {
    display: flex;
    gap: 8px;
  }
}

.card-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--pwms-border, var(--el-border-color-lighter));
}

.env-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.env-item {
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--pwms-panel-elevated, var(--el-fill-color-light));
  border: 1px solid var(--pwms-border, var(--el-border-color-lighter));

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 6px;
  }

  &__value {
    font-size: 22px;
    font-weight: 600;
  }
}

.stats-section {
  margin-top: 8px;

  &__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 12px;

    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
  }
}

.stats-summary {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
