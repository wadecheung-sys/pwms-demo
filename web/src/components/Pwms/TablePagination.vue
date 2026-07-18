<script setup lang="ts">
/**
 * 业务列表统一分页（对齐参照工程 Table 分页：total + sizes + pager）
 */
withDefaults(
  defineProps<{
    total: number
    pageSizes?: number[]
    layout?: string
    /** 无数据时隐藏分页条 */
    hideOnEmpty?: boolean
  }>(),
  {
    pageSizes: () => [10, 20, 50],
    layout: 'total, sizes, prev, pager, next',
    hideOnEmpty: true,
  },
)

const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })
</script>

<template>
  <div v-if="!hideOnEmpty || total > 0" class="table-pagination">
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="pageSizes"
      :layout="layout"
      background
    />
  </div>
</template>
