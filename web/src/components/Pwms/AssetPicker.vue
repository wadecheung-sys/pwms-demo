<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDataStore } from '@/stores/data'
import type { AssetLedger } from '@/types'

const props = withDefaults(
  defineProps<{
    options: AssetLedger[]
    disabled?: boolean
    showStock?: boolean
    placeholder?: string
  }>(),
  {
    disabled: false,
    showStock: false,
    placeholder: '可按名称、单位、仓库、地点或保管人查询',
  },
)

const emit = defineEmits<{ change: [value: string] }>()
const model = defineModel<string>({ default: '' })
const dataStore = useDataStore()
const keyword = ref('')
const orgId = ref('')
const warehouseId = ref('')
const keeper = ref('')
const location = ref('')

const warehouseLocation = (item: AssetLedger) =>
  dataStore.getWarehouseSite(item.warehouseId)?.location || ''

const orgOptions = computed(() => {
  const map = new Map<string, string>()
  for (const item of props.options) map.set(item.orgId, item.orgName)
  return [...map].map(([value, label]) => ({ value, label }))
})

const warehouseOptions = computed(() => {
  const map = new Map<string, string>()
  for (const item of props.options) {
    if (!orgId.value || item.orgId === orgId.value) map.set(item.warehouseId, item.warehouseName)
  }
  return [...map].map(([value, label]) => ({ value, label }))
})

const keeperOptions = computed(() =>
  [...new Set(props.options.map((item) => item.keeperName).filter(Boolean))].map((value) => ({
    value: value!,
    label: value!,
  })),
)

const filteredOptions = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  const locationQuery = location.value.trim().toLowerCase()
  return props.options.filter((item) => {
    const itemLocation = warehouseLocation(item)
    if (
      orgId.value &&
      !dataStore.getOrgDescendantIdsFrom(orgId.value, true).includes(item.orgId)
    ) return false
    if (warehouseId.value && item.warehouseId !== warehouseId.value) return false
    if (keeper.value && item.keeperName !== keeper.value) return false
    if (locationQuery && !itemLocation.toLowerCase().includes(locationQuery)) return false
    if (!query) return true
    return [
      item.name,
      item.assetCode,
      item.physicalId,
      item.assetNo,
      item.model,
      item.typeName,
      item.orgName,
      item.warehouseName,
      itemLocation,
      item.keeperName,
    ].some((value) => value?.toLowerCase().includes(query))
  })
})

const selected = computed(() => props.options.find((item) => item.assetCode === model.value))

function optionLabel(item: AssetLedger) {
  const modelText = item.model ? ` / ${item.model}` : ''
  return `${item.name}${modelText} — ${item.warehouseName}`
}

function resetLocator() {
  keyword.value = ''
  orgId.value = ''
  warehouseId.value = ''
  keeper.value = ''
  location.value = ''
}

function onChange(value: string) {
  emit('change', value)
}

function filterByKeyword(value: string) {
  keyword.value = value
}

watch(orgId, () => {
  if (warehouseId.value && !warehouseOptions.value.some((item) => item.value === warehouseId.value)) {
    warehouseId.value = ''
  }
})
</script>

<template>
  <div class="asset-picker">
    <el-select
      v-model="model"
      filterable
      :filter-method="filterByKeyword"
      :disabled="disabled"
      :placeholder="placeholder"
      popper-class="pwms-asset-picker-dropdown"
      style="width: 100%"
      @change="onChange"
    >
      <el-option
        v-for="item in filteredOptions"
        :key="item.assetCode"
        :label="optionLabel(item)"
        :value="item.assetCode"
      >
        <div class="asset-option__title">
          <strong>{{ item.name }}</strong>
          <span>{{ item.model || '无型号' }}</span>
          <el-tag v-if="showStock" size="small" type="info">库存 {{ item.quantity }}</el-tag>
        </div>
        <div class="asset-option__meta">
          {{ item.orgName }} · {{ item.warehouseName }} · {{ warehouseLocation(item) || '地点未维护' }} ·
          保管人 {{ item.keeperName || '未维护' }} · {{ item.assetCode }}
        </div>
      </el-option>
    </el-select>

    <div v-if="!disabled" class="asset-locator">
      <el-select v-model="orgId" clearable filterable placeholder="按单位定位">
        <el-option v-for="item in orgOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="warehouseId" clearable filterable placeholder="按仓库定位">
        <el-option v-for="item in warehouseOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-select v-model="keeper" clearable filterable placeholder="按保管人定位">
        <el-option v-for="item in keeperOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <el-input v-model="location" clearable placeholder="按坐落位置定位" />
      <el-button link type="primary" class="asset-locator__reset" @click="resetLocator">清除定位</el-button>
    </div>

    <div v-if="selected" class="selected-asset">
      已选：{{ selected.name }} · {{ selected.orgName }} · {{ selected.warehouseName }} ·
      {{ warehouseLocation(selected) || '地点未维护' }} · 保管人 {{ selected.keeperName || '未维护' }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.asset-picker {
  width: 100%;
}

.asset-locator {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;

  &__reset {
    justify-self: start;
  }
}

.selected-asset {
  margin-top: 7px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}
</style>

<style lang="scss">
.pwms-asset-picker-dropdown {
  .el-select-dropdown__item {
    height: auto;
    min-height: 52px;
    padding-top: 7px;
    padding-bottom: 7px;
    line-height: 1.4;
  }

  .asset-option__title {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .asset-option__meta {
    margin-top: 3px;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
