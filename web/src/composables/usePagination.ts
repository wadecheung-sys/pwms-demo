import { computed, ref, unref, watch, type ComputedRef, type Ref } from 'vue'

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
    const maxPage = Math.max(1, Math.ceil(t / pageSize.value))
    if (currentPage.value > maxPage) currentPage.value = maxPage
  })

  return { currentPage, pageSize, total, pageData }
}
