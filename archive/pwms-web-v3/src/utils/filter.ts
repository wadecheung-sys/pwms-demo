/** 关键字匹配（名称、编码等字段） */
export function matchKeyword(keyword: string, ...fields: (string | undefined)[]): boolean {
  if (!keyword.trim()) return true
  const k = keyword.trim().toLowerCase()
  return fields.some((f) => f?.toLowerCase().includes(k))
}

/** 下拉等值匹配，空值表示不过滤 */
export function matchExact<T>(value: T, expected: T | '' | null | undefined): boolean {
  if (expected === '' || expected === null || expected === undefined) return true
  return value === expected
}

/** 日期范围匹配，支持 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss */
export function matchDateRange(
  dateStr: string,
  range: [string, string] | null | undefined,
): boolean {
  if (!range || (!range[0] && !range[1])) return true
  const day = dateStr.slice(0, 10)
  if (range[0] && day < range[0]) return false
  if (range[1] && day > range[1]) return false
  return true
}

/** 从数据集中提取去重选项 */
export function uniqueOptions(
  items: string[],
  emptyLabel = '全部',
): { label: string; value: string }[] {
  const set = [...new Set(items.filter(Boolean))].sort()
  return [{ label: emptyLabel, value: '' }, ...set.map((v) => ({ label: v, value: v }))]
}
