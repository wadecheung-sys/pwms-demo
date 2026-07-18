<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    /** 简短副标题（可选）；长说明请用 PageTip */
    subtitle?: string
  }>(),
  {},
)
</script>

<template>
  <div class="pwms-page-header">
    <div class="pwms-page-header__main">
      <h3 class="pwms-page-header__title">{{ title }}</h3>
      <p v-if="subtitle" class="pwms-page-header__subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="pwms-page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.pwms-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--pwms-border, var(--el-border-color-lighter));

  &__main {
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--pwms-text, var(--el-text-color-primary));
  }

  &__subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--pwms-text-secondary, var(--el-text-color-secondary));
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-left: auto;
  }
}
</style>
