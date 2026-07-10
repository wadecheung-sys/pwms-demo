<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { ExportColumn } from '@/utils/export'
import { exportToCsv, printTable } from '@/utils/export'

const props = defineProps<{
  title: string
  filename: string
  columns: ExportColumn[]
  data: Record<string, unknown>[]
  disabled?: boolean
}>()

function handleExport() {
  if (!props.data.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  exportToCsv(props.filename, props.columns, props.data)
  ElMessage.success('导出成功')
}

function handlePrint() {
  if (!props.data.length) {
    ElMessage.warning('暂无数据可打印')
    return
  }
  printTable(props.title, props.columns, props.data)
}
</script>

<template>
  <div class="page-toolbar">
    <el-button :disabled="disabled || !data.length" @click="handleExport">
      <el-icon><Download /></el-icon> 导出
    </el-button>
    <el-button :disabled="disabled || !data.length" @click="handlePrint">
      <el-icon><Printer /></el-icon> 打印
    </el-button>
  </div>
</template>

<style scoped lang="scss">
.page-toolbar {
  display: flex;
  gap: 8px;
}
</style>
