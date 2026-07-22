<script setup lang="ts">
import { computed, ref } from 'vue'

export interface FilterFieldOption {
  label: string
  value: string
}

export interface FilterField {
  key: string
  type: 'input' | 'select' | 'date-range'
  placeholder?: string
  /** 可选标签，展开时更易扫读 */
  label?: string
  options?: FilterFieldOption[]
  width?: string
}

const props = withDefaults(
  defineProps<{
    fields: FilterField[]
    modelValue: Record<string, unknown>
    resultCount?: number
    /** 筛选项过多时默认折叠为一行，可展开 */
    collapsible?: boolean
  }>(),
  {
    collapsible: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
  search: []
  reset: []
}>()

const expanded = ref(false)

function updateField(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function fieldWidth(field: FilterField) {
  return field.width ?? (field.type === 'date-range' ? '260px' : '160px')
}

function isActiveValue(value: unknown) {
  if (value == null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  return true
}

const activeFilterCount = computed(
  () => props.fields.filter((f) => isActiveValue(props.modelValue[f.key])).length,
)

const showExpand = computed(() => props.collapsible && props.fields.length > 3)
</script>

<template>
  <div class="filter-bar-wrap">
    <div class="filter-bar-row">
      <div class="filter-bar-fields" :class="{ 'is-collapsed': showExpand && !expanded }">
        <div v-for="field in fields" :key="field.key" class="filter-field">
          <span v-if="field.label && expanded" class="filter-field__label">{{ field.label }}</span>
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
            filterable
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
        </div>
      </div>
      <div class="filter-bar-ops">
        <el-button type="primary" @click="emit('search')">
          <el-icon><Search /></el-icon> 查询
        </el-button>
        <el-button @click="emit('reset')">重置</el-button>
        <el-button v-if="showExpand" text type="primary" @click="expanded = !expanded">
          {{ expanded ? '收起' : '展开' }}
          <el-badge
            v-if="!expanded && activeFilterCount > 0"
            :value="activeFilterCount"
            class="expand-badge"
          />
        </el-button>
      </div>
    </div>
    <div v-if="resultCount !== undefined" class="filter-result">
      共 {{ resultCount }} 条记录
      <span v-if="!expanded && activeFilterCount > 0 && showExpand" class="filter-result__hint">
        · 已选 {{ activeFilterCount }} 项条件（可展开查看）
      </span>
    </div>
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

.filter-bar-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.filter-bar-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;

  &.is-collapsed {
    max-height: 32px;
    overflow: hidden;
  }
}

.filter-field {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
}

.filter-bar-ops {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 8px;
  padding-top: 0;
}

.expand-badge {
  margin-left: 4px;
}

.filter-result {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--el-border-color-lighter);
  font-size: 13px;
  color: var(--pwms-text-secondary, var(--el-text-color-secondary));

  &__hint {
    color: var(--el-color-primary);
  }
}
</style>
