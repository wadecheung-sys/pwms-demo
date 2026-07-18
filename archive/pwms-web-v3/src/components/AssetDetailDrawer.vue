<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { AssetLifecycleEvent } from '@/types'
import { useDataStore } from '@/stores/data'

const props = defineProps<{
  assetCode: string | null
}>()

const emit = defineEmits<{ close: [] }>()

const visible = defineModel<boolean>('visible', { default: false })
const dataStore = useDataStore()
const router = useRouter()

watch(
  () => props.assetCode,
  (code) => {
    visible.value = Boolean(code)
  },
  { immediate: true },
)

watch(visible, (v) => {
  if (!v) emit('close')
})

const ledger = computed(() =>
  props.assetCode ? dataStore.getLedgerByCode(props.assetCode) : null,
)

const timeline = computed(() =>
  props.assetCode ? dataStore.getAssetLifecycle(props.assetCode) : [],
)

const stats = computed(() => {
  const code = props.assetCode
  if (!code) return { inout: 0, fault: 0, maintenance: 0 }
  return {
    inout: dataStore.inOutRecords.filter((r) => r.assetCode === code).length,
    fault: dataStore.faultRecords.filter((r) => r.assetCode === code).length,
    maintenance: dataStore.maintenanceRecords.filter((r) => r.assetCode === code).length,
  }
})

function goWarehouseLedger() {
  const item = ledger.value
  if (!item) return
  visible.value = false
  router.push({ path: `/${item.category}/ledger`, query: { warehouseId: item.warehouseId } })
}

function eventIcon(type: AssetLifecycleEvent['type']) {
  const map = { ledger: 'Document', inout: 'Sort', fault: 'Warning', maintenance: 'Tools', inventory: 'List' }
  return map[type] ?? 'InfoFilled'
}
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="ledger ? `设备详情 — ${ledger.name}` : '设备详情'"
    size="680px"
    destroy-on-close
  >
    <template v-if="ledger">
      <el-descriptions :column="2" border size="small" class="summary">
        <el-descriptions-item label="装备编码">{{ ledger.assetCode }}</el-descriptions-item>
        <el-descriptions-item label="实物ID">{{ ledger.physicalId || '—' }}</el-descriptions-item>
        <el-descriptions-item label="资产编号">{{ ledger.assetNo || '—' }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ ledger.typeName }}</el-descriptions-item>
        <el-descriptions-item label="专业分类">{{ ledger.specialty || '—' }}</el-descriptions-item>
        <el-descriptions-item label="所属组织">{{ ledger.orgName }}</el-descriptions-item>
        <el-descriptions-item label="生产仓地点" :span="2">
          <el-button link type="primary" @click="goWarehouseLedger">{{ ledger.warehouseName }}</el-button>
        </el-descriptions-item>
        <el-descriptions-item label="库区/货架/仓位">
          {{ [ledger.storageArea, ledger.shelfNo, ledger.binNo].filter(Boolean).join(' / ') || '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="保管人">{{ ledger.keeperName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="库存">{{ ledger.quantity }} {{ ledger.unit }}</el-descriptions-item>
        <el-descriptions-item label="台账状态">
          <el-tag size="small">{{ ledger.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="处置状态">{{ ledger.disposeStatus || '—' }}</el-descriptions-item>
        <el-descriptions-item label="设备状态">{{ ledger.deviceStatus || '—' }}</el-descriptions-item>
        <el-descriptions-item label="生产厂家">{{ ledger.manufacturer || '—' }}</el-descriptions-item>
        <el-descriptions-item label="规格型号">{{ ledger.model || '—' }}</el-descriptions-item>
        <el-descriptions-item label="电压等级">{{ ledger.voltageLevel || '—' }}</el-descriptions-item>
        <el-descriptions-item label="资产性质">{{ ledger.assetNature || '—' }}</el-descriptions-item>
        <el-descriptions-item label="购入日期">{{ ledger.purchaseDate }}</el-descriptions-item>
        <el-descriptions-item label="保修截止">{{ ledger.warrantyDate }}</el-descriptions-item>
        <el-descriptions-item v-if="ledger.category === 'instrument'" label="最近校验">
          {{ ledger.lastCheckDate || '—' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="ledger.category === 'instrument'" label="校验状态">
          <el-tag
            size="small"
            :type="ledger.checkDueStatus === '超期' ? 'danger' : ledger.checkDueStatus === '临期' ? 'warning' : 'success'"
          >
            {{ ledger.checkDueStatus || '—' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="ledger.category === 'spare'" label="备品来源">
          {{ ledger.spareSource || '—' }}
        </el-descriptions-item>
        <el-descriptions-item v-if="ledger.warehouseAgeDays != null" label="库龄(天)">
          {{ ledger.warehouseAgeDays }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="stat-row">
        <div class="stat-item"><span>{{ stats.inout }}</span> 出入库</div>
        <div class="stat-item"><span>{{ stats.fault }}</span> 故障</div>
        <div class="stat-item"><span>{{ stats.maintenance }}</span> 维修</div>
      </div>

      <h4 class="section-title">全生命周期时间线</h4>
      <el-empty v-if="!timeline.length" description="暂无生命周期记录" />
      <el-timeline v-else>
        <el-timeline-item
          v-for="ev in timeline"
          :key="ev.id"
          :timestamp="ev.time"
          placement="top"
        >
          <div class="timeline-card">
            <div class="timeline-head">
              <el-icon><component :is="eventIcon(ev.type)" /></el-icon>
              <strong>{{ ev.title }}</strong>
              <el-tag v-if="ev.tag" :type="ev.tagType || 'info'" size="small">{{ ev.tag }}</el-tag>
            </div>
            <p>{{ ev.description }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>
    </template>
    <el-empty v-else description="未找到该资产" />
  </el-drawer>
</template>

<style scoped lang="scss">
.summary {
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;

  .stat-item {
    flex: 1;
    background: var(--pwms-panel-elevated);
    border: 1px solid var(--pwms-border);
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    font-size: 13px;
    color: var(--pwms-text-secondary);

    span {
      display: block;
      font-size: 22px;
      font-weight: 600;
      color: var(--pwms-primary);
      margin-bottom: 4px;
    }
  }
}

.section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--pwms-text);
}

.timeline-card {
  .timeline-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    color: var(--pwms-text-secondary);
    font-size: 13px;
  }
}
</style>
