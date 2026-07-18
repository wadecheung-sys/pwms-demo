<script setup lang="ts">
import { Icon } from '@/components/Icon'

withDefaults(
  defineProps<{
    /** 提示正文；也可用默认插槽 */
    content?: string
    /** info | success | warning */
    type?: 'info' | 'success' | 'warning'
    /** 是否显示左侧图标 */
    showIcon?: boolean
  }>(),
  {
    type: 'info',
    showIcon: true,
  },
)

const iconMap = {
  info: 'vi-ant-design:info-circle-filled',
  success: 'vi-ant-design:check-circle-filled',
  warning: 'vi-ant-design:warning-filled',
} as const
</script>

<template>
  <div class="pwms-page-tip" :class="`is-${type}`" role="note">
    <Icon v-if="showIcon" class="pwms-page-tip__icon" :icon="iconMap[type]" :size="16" />
    <div class="pwms-page-tip__text">
      <slot>{{ content }}</slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
.pwms-page-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: var(--pwms-radius, 8px);
  border: 1px solid transparent;
  line-height: 1.55;
  font-size: 13px;

  &:first-child {
    margin-top: 0;
  }

  &__icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  &__text {
    min-width: 0;
    flex: 1;
    color: var(--pwms-text-secondary, var(--el-text-color-secondary));

    :deep(strong) {
      color: var(--pwms-text, var(--el-text-color-primary));
      font-weight: 600;
    }
  }

  &.is-info {
    background: var(--el-color-primary-light-9, var(--pwms-primary-soft));
    border-color: var(--el-color-primary-light-7, rgba(64, 158, 255, 0.35));

    .pwms-page-tip__icon {
      color: var(--el-color-primary);
    }
  }

  &.is-success {
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-7);

    .pwms-page-tip__icon {
      color: var(--el-color-success);
    }
  }

  &.is-warning {
    background: var(--el-color-warning-light-9);
    border-color: var(--el-color-warning-light-7);

    .pwms-page-tip__icon {
      color: var(--el-color-warning);
    }
  }
}
</style>
