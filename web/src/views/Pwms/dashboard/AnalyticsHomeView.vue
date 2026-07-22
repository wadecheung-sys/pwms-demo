<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useDataStore } from '@/stores/data'
import { useDataScope } from '@/composables/useDataScope'
import { calcWarehouseAgeDays } from '@/utils/pwms/ledgerFlags'
import { categoryLabels } from '@/types'
import PageTip from '@/components/Pwms/PageTip.vue'

const dataStore = useDataStore()
const router = useRouter()
const { scopeByOrg } = useDataScope()

const stats = computed(() => dataStore.dashboardStats)
const openAlerts = computed(() => dataStore.alerts.filter((a) => a.status === '未处理').slice(0, 6))

/** 成熟版管理端「待办」：审批/确认/盘点/退役/转仓 */
const todoItems = computed(() => {
  const items: { id: string; title: string; category: string; path: string; time: string }[] = []
  for (const b of dataStore.stockBills) {
    if (b.status === '待审批') {
      items.push({
        id: b.id,
        title: `${b.billType}审批 ${b.billNo} · ${b.assetName}`,
        category: '出入库',
        path: `/warehouse/inout/${b.billType === '入库' ? 'in' : 'out'}-approve`,
        time: b.createTime,
      })
    } else if (b.status === '待确认') {
      items.push({
        id: b.id,
        title: `${b.billType}确认 ${b.billNo} · ${b.assetName}`,
        category: '出入库',
        path: `/warehouse/inout/${b.billType === '入库' ? 'in' : 'out'}-approve`,
        time: b.approveTime || b.createTime,
      })
    }
  }
  for (const t of dataStore.transferBills) {
    if (t.status === '待审批' || t.status === '待确认') {
      items.push({
        id: t.id,
        title: `转仓${t.status === '待审批' ? '审批' : '确认'} ${t.billNo}`,
        category: '转仓',
        path: '/warehouse/inout/transfer',
        time: t.createTime,
      })
    }
  }
  for (const t of dataStore.inventoryTasks.filter((x) => !x.parentId && x.status !== '已完成')) {
    items.push({
      id: t.id,
      title: `盘点进度 ${t.taskName}`,
      category: '盘点',
      path: `/${t.category}/inventory/progress`,
      time: t.createTime,
    })
  }
  for (const r of dataStore.retirementRecords.filter((x) => x.status === '待审批')) {
    items.push({
      id: r.id,
      title: `退役审批 ${r.assetName}`,
      category: '退役',
      path: `/${r.category}/retirement`,
      time: r.createTime,
    })
  }
  return items.sort((a, b) => (a.time < b.time ? 1 : -1)).slice(0, 8)
})

const specialtyChartRef = ref<HTMLDivElement | null>(null)
const ageChartRef = ref<HTMLDivElement | null>(null)
const mapRef = ref<HTMLDivElement | null>(null)
let specialtyChart: echarts.ECharts | null = null
let ageChart: echarts.ECharts | null = null
let map: L.Map | null = null

const scopedLedgers = computed(() => scopeByOrg([...dataStore.ledgers]))

const specialtyData = computed(() => {
  const mapCount: Record<string, number> = {}
  for (const l of scopedLedgers.value) {
    const s = l.specialty || '综合'
    mapCount[s] = (mapCount[s] || 0) + l.quantity
  }
  return Object.entries(mapCount).map(([name, value]) => ({ name, value }))
})

const ageData = computed(() => {
  const buckets = [
    { name: '0-3年', value: 0 },
    { name: '3-5年', value: 0 },
    { name: '5年以上', value: 0 },
  ]
  for (const l of scopedLedgers.value) {
    const days = calcWarehouseAgeDays(l.inboundTime) ?? l.warehouseAgeDays ?? 0
    if (days < 365 * 3) buckets[0].value += l.quantity
    else if (days < 365 * 5) buckets[1].value += l.quantity
    else buckets[2].value += l.quantity
  }
  return buckets
})

const cityBubbles = computed(() => {
  const byCity: Record<
    string,
    { name: string; orgId: string; spare: number; instrument: number; tool: number; lat: number; lng: number }
  > = {}
  for (const w of dataStore.warehouseSites) {
    if (w.lat == null || w.lng == null) continue
    const org = dataStore.getOrg(w.orgId)
    let cityName = w.orgName
    let cityOrgId = w.orgId
    let cur = org
    while (cur && cur.type !== 'city' && cur.parentId) {
      cur = dataStore.getOrg(cur.parentId)
    }
    if (cur?.type === 'city') {
      cityName = cur.name
      cityOrgId = cur.id
    }
    if (!byCity[cityName]) {
      byCity[cityName] = {
        name: cityName,
        orgId: cityOrgId,
        spare: 0,
        instrument: 0,
        tool: 0,
        lat: w.lat,
        lng: w.lng,
      }
    }
  }
  for (const l of scopedLedgers.value) {
    const wh = dataStore.getWarehouseSite(l.warehouseId)
    if (!wh?.lat || !wh.lng) continue
    let cityName = wh.orgName
    let cityOrgId = wh.orgId
    let cur = dataStore.getOrg(wh.orgId)
    while (cur && cur.type !== 'city' && cur.parentId) cur = dataStore.getOrg(cur.parentId)
    if (cur?.type === 'city') {
      cityName = cur.name
      cityOrgId = cur.id
    }
    if (!byCity[cityName]) {
      byCity[cityName] = {
        name: cityName,
        orgId: cityOrgId,
        spare: 0,
        instrument: 0,
        tool: 0,
        lat: wh.lat,
        lng: wh.lng,
      }
    }
    byCity[cityName][l.category] += l.quantity
  }
  return Object.values(byCity)
})

function goCityLedger(orgId: string) {
  router.push({ path: '/spare/ledger', query: { orgId } })
}

const chartColors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#b37feb']

function isDarkMode() {
  return document.documentElement.classList.contains('dark')
}

function chartTooltipStyle() {
  if (isDarkMode()) {
    return {
      backgroundColor: '#262727',
      borderColor: '#303030',
      textStyle: { color: 'rgba(255,255,255,0.85)' },
    }
  }
  return {
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ed',
    textStyle: { color: '#303133' },
  }
}

function renderCharts() {
  if (specialtyChartRef.value) {
    specialtyChart ??= echarts.init(specialtyChartRef.value, undefined, { renderer: 'canvas' })
    const data = specialtyData.value.length
      ? specialtyData.value
      : [{ name: '暂无数据', value: 0 }]
    const labelColor = isDarkMode() ? 'rgba(255,255,255,0.55)' : '#606266'
    specialtyChart.setOption({
      color: chartColors,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        ...chartTooltipStyle(),
      },
      series: [
        {
          type: 'pie',
          radius: ['42%', '68%'],
          data,
          label: {
            formatter: '{b}\n{c}',
            color: labelColor,
          },
          emptyCircleStyle: { color: isDarkMode() ? '#303030' : '#e4e7ed' },
        },
      ],
    })
  }
  if (ageChartRef.value) {
    ageChart ??= echarts.init(ageChartRef.value, undefined, { renderer: 'canvas' })
    const labelColor = isDarkMode() ? 'rgba(255,255,255,0.55)' : '#606266'
    const axisColor = isDarkMode() ? 'rgba(255,255,255,0.25)' : '#dcdfe6'
    ageChart.setOption({
      backgroundColor: 'transparent',
      tooltip: chartTooltipStyle(),
      xAxis: {
        type: 'category',
        data: ageData.value.map((d) => d.name),
        axisLabel: { color: labelColor },
        axisLine: { lineStyle: { color: axisColor } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: labelColor },
        splitLine: { lineStyle: { color: axisColor, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: ageData.value.map((d) => d.value),
          itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 36,
        },
      ],
      grid: { left: 40, right: 16, top: 24, bottom: 32 },
    })
  }
}

function renderMap() {
  if (!mapRef.value) return
  if (!map) {
    map = L.map(mapRef.value, { zoomControl: true }).setView([30.4, 120.6], 8)
    const tileUrl = isDarkMode()
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map)
  }
  map.eachLayer((layer) => {
    if (layer instanceof L.CircleMarker) map!.removeLayer(layer)
  })
  if (!cityBubbles.value.length) return
  for (const c of cityBubbles.value) {
    const total = c.spare + c.instrument + c.tool
    const radius = Math.max(10, Math.min(36, 8 + Math.sqrt(total)))
    const marker = L.circleMarker([c.lat, c.lng], {
      radius,
      color: '#409eff',
      fillColor: '#69b1ff',
      fillOpacity: 0.75,
      weight: 2,
    })
    marker.bindPopup(
      `<div style="color:#1f1f1f"><b>${c.name}</b><br/>备品 ${c.spare}<br/>仪器 ${c.instrument}<br/>工器具 ${c.tool}<br/><small>点击气泡进入台账</small></div>`,
    )
    marker.on('click', () => goCityLedger(c.orgId))
    marker.addTo(map!)
  }
}

function onResize() {
  specialtyChart?.resize()
  ageChart?.resize()
  map?.invalidateSize()
}

onMounted(() => {
  renderCharts()
  renderMap()
  window.addEventListener('resize', onResize)
  setTimeout(() => map?.invalidateSize(), 200)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  specialtyChart?.dispose()
  ageChart?.dispose()
  map?.remove()
})

watch([specialtyData, ageData], () => renderCharts())
watch(cityBubbles, () => renderMap(), { deep: true })
</script>

<template>
  <div class="page-container analytics-home">
    <PageTip class="page-shell__tip">
      专业仓数字化管控：统计可穿透、告警可处理、分布可看图。点击下方指标或地图气泡可进入对应业务。
    </PageTip>

    <div class="hero-bar">
      <div>
        <h2>经营分析 · 全省一张图</h2>
      </div>
      <div class="hero-actions">
        <el-button type="primary" @click="router.push('/alerts')">告警中心（{{ stats.openAlerts }}）</el-button>
        <el-button @click="router.push('/quota/results')">定额缺额（{{ stats.shortageCount }}）</el-button>
      </div>
    </div>

    <div class="quick-links">
      <span class="quick-links__label">常用业务</span>
      <el-button size="small" @click="router.push('/warehouse/inout/in-apply')">入库申请</el-button>
      <el-button size="small" @click="router.push('/warehouse/inout/out-apply')">出库申请</el-button>
      <el-button size="small" @click="router.push('/warehouse/inout/transfer')">转仓调拨</el-button>
      <el-button size="small" @click="router.push('/warehouse/inout/stock-status')">在库状态</el-button>
      <el-button size="small" @click="router.push('/spare/inventory/plan')">盘点下达</el-button>
      <el-button size="small" @click="router.push('/spare/inventory/progress')">盘点进度</el-button>
      <el-button size="small" @click="router.push('/quota/params')">定额参数</el-button>
      <el-button size="small" @click="router.push('/warehouse/overview')">生产仓概览</el-button>
    </div>

    <el-row :gutter="16" class="todo-row">
      <el-col :span="24">
        <div class="panel todo-panel">
          <div class="panel-head">
            <span>待办工作台</span>
            <span class="muted">待办工作台：审批确认、转仓、盘点、退役集中处理（{{ todoItems.length }}）</span>
          </div>
          <el-table :data="todoItems" size="small" stripe max-height="220">
            <el-table-column prop="category" label="分类" width="90" />
            <el-table-column prop="title" label="待办事项" min-width="240" />
            <el-table-column prop="time" label="时间" width="160" />
            <el-table-column label="操作" width="100">
              <template #default="{ row }">
                <el-button link type="primary" @click="router.push(row.path)">处理</el-button>
              </template>
            </el-table-column>
            <template #empty><el-empty description="暂无待办" :image-size="48" /></template>
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="kpi-row">
      <el-col :xs="12" :sm="6">
        <div class="kpi" @click="router.push('/warehouse/overview')">
          <div class="kpi-label">生产仓地点</div>
          <div class="kpi-value">{{ stats.warehouseCount }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="kpi" @click="router.push('/spare/ledger')">
          <div class="kpi-label">{{ categoryLabels.spare }}</div>
          <div class="kpi-value">{{ stats.spareCount }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="kpi" @click="router.push('/instrument/ledger')">
          <div class="kpi-label">{{ categoryLabels.instrument }}</div>
          <div class="kpi-value">{{ stats.instrumentCount }}</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="kpi" @click="router.push('/tool/ledger')">
          <div class="kpi-label">{{ categoryLabels.tool }}</div>
          <div class="kpi-value">{{ stats.toolCount }}</div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :xs="24" :lg="14">
        <div class="panel map-panel">
          <div class="panel-head">
            <span>备品分布地图</span>
            <span class="muted">点击气泡可进入该地市备品台账</span>
          </div>
          <div ref="mapRef" class="map-box" />
        </div>
      </el-col>
      <el-col :xs="24" :lg="10">
        <div class="panel alert-panel">
          <div class="panel-head">
            <span>告警提示</span>
            <el-button link type="primary" @click="router.push('/alerts')">全部</el-button>
          </div>
          <div v-if="!openAlerts.length" class="empty-tip">暂无未处理告警</div>
          <div v-for="a in openAlerts" :key="a.id" class="alert-item" @click="a.routePath && router.push(a.routePath)">
            <el-tag size="small" :type="a.level === '严重' ? 'danger' : a.level === '警告' ? 'warning' : 'info'">
              {{ a.category }}
            </el-tag>
            <div class="alert-body">
              <div class="alert-title">{{ a.title }}</div>
              <div class="alert-content">{{ a.content }}</div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" style="margin-top: 16px">
      <el-col :xs="24" :md="12">
        <div class="panel">
          <div class="panel-head">专业分布</div>
          <div ref="specialtyChartRef" class="chart-box" />
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="panel">
          <div class="panel-head">库龄结构</div>
          <div ref="ageChartRef" class="chart-box" />
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.analytics-home {
  .hero-bar {
    background:
      radial-gradient(ellipse 70% 120% at 0% 0%, rgba(64, 158, 255, 0.18), transparent 55%),
      var(--pwms-panel-bg);
    border: 1px solid var(--pwms-border);
    border-radius: var(--pwms-radius);
    padding: 18px 20px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;

    h2 {
      margin: 0;
      font-size: 20px;
      color: var(--pwms-text);
      font-weight: 600;
    }
  }

  .quick-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: var(--pwms-panel-bg);
    border: 1px solid var(--pwms-border);
    border-radius: var(--pwms-radius);

    &__label {
      font-size: 13px;
      color: var(--pwms-text-secondary);
      margin-right: 4px;
    }
  }

  .kpi-row {
    margin-bottom: 16px;
  }

  .kpi {
    background: var(--pwms-panel-bg);
    border-radius: var(--pwms-radius);
    padding: 16px 18px;
    margin-bottom: 12px;
    cursor: pointer;
    border: 1px solid var(--pwms-border);
    transition: border-color var(--pwms-transition), background var(--pwms-transition);

    &:hover {
      border-color: var(--pwms-primary);
      background: var(--pwms-panel-elevated);
    }

    .kpi-label {
      color: var(--pwms-text-secondary);
      font-size: 13px;
    }
    .kpi-value {
      margin-top: 8px;
      font-size: 28px;
      font-weight: 700;
      color: var(--pwms-primary);
    }
  }

  .todo-row {
    margin-bottom: 4px;
  }

  .panel {
    background: var(--pwms-panel-bg);
    border-radius: var(--pwms-radius);
    border: 1px solid var(--pwms-border);
    padding: 12px 14px 16px;
    margin-bottom: 12px;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--pwms-text);
  }

  .muted {
    color: var(--pwms-text-secondary);
    font-size: 12px;
    font-weight: 400;
  }

  .map-box {
    height: 360px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--pwms-border);
    background: var(--pwms-panel-elevated);
  }

  .chart-box {
    height: 280px;
  }

  .alert-item {
    display: flex;
    gap: 10px;
    padding: 10px 4px;
    border-bottom: 1px solid var(--pwms-border);
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background: var(--pwms-header-hover);
    }

    &:last-child {
      border-bottom: none;
    }
  }

  .alert-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--pwms-text);
  }

  .alert-content {
    color: var(--pwms-text-secondary);
    font-size: 12px;
    margin-top: 2px;
  }

  .empty-tip {
    color: var(--pwms-text-tertiary);
    padding: 24px;
    text-align: center;
  }

  :deep(.leaflet-control-attribution) {
    background: rgba(0, 0, 0, 0.55) !important;
    color: rgba(255, 255, 255, 0.55);
    a {
      color: var(--pwms-primary);
    }
  }
}
</style>
