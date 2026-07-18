import { computed, ref, unref, watch, type ComputedRef, type Ref } from 'vue'

/** 业务列表默认每页条数选项（与 TablePagination 一致） */
export const PWMS_PAGE_SIZES = [10, 20, 50] as const

export function usePagination<T>(source: Ref<T[]> | ComputedRef<T[]>, defaultPageSize = 10) {
  const currentPage = ref(1)
  const pageSize = ref(defaultPageSize)

  const total = computed(() => unref(source).length)

  const pageData = computed(() => {
    const list = unref(source)
    const start = (currentPage.value - 1) * pageSize.value
    return list.slice(start, start + pageSize.value)
  })

  watch(source, () => {
    currentPage.value = 1
  })

  watch(total, (t) => {
    const maxPage = Math.max(1, Math.ceil(t / pageSize.value) || 1)
    if (currentPage.value > maxPage) currentPage.value = maxPage
  })

  return { currentPage, pageSize, total, pageData }
}
