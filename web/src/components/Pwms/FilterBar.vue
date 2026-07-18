<script setup lang="ts">
export interface FilterFieldOption {
  label: string
  value: string
}

export interface FilterField {
  key: string
  type: 'input' | 'select' | 'date-range'
  placeholder?: string
  options?: FilterFieldOption[]
  width?: string
}

const props = defineProps<{
  fields: FilterField[]
  modelValue: Record<string, unknown>
  resultCount?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  search: []
  reset: []
}>()

function updateField(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function fieldWidth(field: FilterField) {
  return field.width ?? (field.type === 'date-range' ? '260px' : '160px')
}
</script>

<template>
  <div class="filter-bar-wrap">
    <div class="filter-bar">
      <template v-for="field in fields" :key="field.key">
        <el-input
          v-if="field.type === 'input'"
          :model-value="String(modelValue[field.key] ?? '')"
          :placeholder="field.placeholder"
          clearable
          :style="{ width: fieldWidth(field) }"
          @update:model-value="updateField(field.key, $event)"
          @keyup.enter="emit('search')"
        />
        <el-select
          v-else-if="field.type === 'select'"
          :model-value="String(modelValue[field.key] ?? '')"
          :placeholder="field.placeholder ?? '请选择'"
          clearable
          :style="{ width: fieldWidth(field) }"
          @update:model-value="updateField(field.key, $event ?? '')"
        >
          <el-option
            v-for="opt in field.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
        <el-date-picker
          v-else
          :model-value="(modelValue[field.key] as [string, string] | undefined) || undefined"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          :style="{ width: fieldWidth(field) }"
          @update:model-value="updateField(field.key, $event)"
        />
      </template>
      <el-button type="primary" @click="emit('search')">
        <el-icon><Search /></el-icon> 查询
      </el-button>
      <el-button @click="emit('reset')">重置</el-button>
    </div>
    <div v-if="resultCount !== undefined" class="filter-result">共 {{ resultCount }} 条记录</div>
  </div>
</template>

<style scoped lang="scss">
.filter-bar-wrap {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--pwms-border, var(--el-border-color-lighter));
  border-radius: 8px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-result {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
  font-size: 13px;
  color: var(--pwms-text-secondary, var(--el-text-color-secondary));
}
</style>
