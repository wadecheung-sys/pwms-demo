import { ref, type Ref } from 'vue'

export function useTableFilter<T extends Record<string, unknown>>(
  defaults: T,
  predicate: (item: unknown, filters: T) => boolean,
) {
  const draft = ref({ ...defaults }) as Ref<T>
  const applied = ref({ ...defaults }) as Ref<T>

  function search() {
    applied.value = { ...draft.value }
  }

  function reset() {
    draft.value = { ...defaults }
    applied.value = { ...defaults }
  }

  function filterList<S>(list: S[]): S[] {
    return list.filter((item) => predicate(item, applied.value))
  }

  const resultCount = ref(0)

  function filterListWithCount<S>(list: S[]): S[] {
    const result = filterList(list)
    resultCount.value = result.length
    return result
  }

  return { draft, applied, search, reset, filterList, filterListWithCount, resultCount }
}
