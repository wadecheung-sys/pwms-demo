<script setup lang="ts">
/**
 * 页面壳：PageTip 在卡片外（可单独配置/删除），主体内容在 page-panel 卡片内。
 */
import { useSlots } from 'vue'
import PageTip from './PageTip.vue'

withDefaults(
  defineProps<{
    /** 提示正文；不传且无 tip 插槽则不渲染提示 */
    tip?: string
    tipType?: 'info' | 'success' | 'warning'
    /** 是否显示提示（便于按路由/配置开关） */
    showTip?: boolean
  }>(),
  {
    tipType: 'info',
    showTip: true,
  },
)

const slots = useSlots()
</script>

<template>
  <div class="page-container">
    <PageTip
      v-if="showTip && (tip || !!slots.tip)"
      class="page-shell__tip"
      :type="tipType"
      :content="tip"
    >
      <slot name="tip">{{ tip }}</slot>
    </PageTip>
    <slot name="above" />
    <div class="page-panel">
      <slot />
    </div>
  </div>
</template>
