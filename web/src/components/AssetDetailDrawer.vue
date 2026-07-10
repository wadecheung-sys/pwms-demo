<script setup lang="ts">
import { computed } from 'vue'
import type { AssetLifecycleEvent } from '@/types'
import { useDataStore } from '@/stores/data'

const props = defineProps<{
  assetCode: string | null
}>()

const visible = defineModel<boolean>('visible', { default: false })
const dataStore = useDataStore()

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
        <el-descriptions-item label="资产编码">{{ ledger.assetCode }}</el-descriptions-item>
        <el-descriptions-item label="设备类型">{{ ledger.typeName }}</el-descriptions-item>
        <el-descriptions-item label="所属组织">{{ ledger.orgName }}</el-descriptions-item>
        <el-descriptions-item label="库位">{{ ledger.warehouseName }}</el-descriptions-item>
        <el-descriptions-item label="库存">{{ ledger.quantity }} {{ ledger.unit }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small">{{ ledger.status }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="生产厂家">{{ ledger.manufacturer || '-' }}</el-descriptions-item>
        <el-descriptions-item label="规格型号">{{ ledger.model || '-' }}</el-descriptions-item>
        <el-descriptions-item label="购入日期">{{ ledger.purchaseDate }}</el-descriptions-item>
        <el-descriptions-item label="保修截止">{{ ledger.warrantyDate }}</el-descriptions-item>
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
    background: #fafafa;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    font-size: 13px;
    color: #8c8c8c;

    span {
      display: block;
      font-size: 22px;
      font-weight: 600;
      color: #1677ff;
      margin-bottom: 4px;
    }
  }
}

.section-title {
  margin: 0 0 16px;
  font-size: 14px;
  font-weight: 600;
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
    color: #595959;
    font-size: 13px;
  }
}
</style>
