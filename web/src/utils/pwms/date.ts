/** 日期工具：工作日推算（跳过周六日，演示不做法定节假日） */

function parseDate(input: Date | string): Date {
  if (input instanceof Date) return new Date(input.getTime())
  const d = new Date(String(input).replace(/-/g, '/').slice(0, 10))
  return d
}

function formatDateOnly(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 自起始日（不含当天）起向后推 N 个工作日，返回 YYYY-MM-DD */
export function addWorkingDays(from: Date | string, days: number): string {
  const d = parseDate(from)
  let left = Math.max(0, days)
  while (left > 0) {
    d.setDate(d.getDate() + 1)
    const wd = d.getDay()
    if (wd !== 0 && wd !== 6) left -= 1
  }
  return formatDateOnly(d)
}

export function todayDateOnly(now = new Date()): string {
  return formatDateOnly(now)
}

/** deadline（YYYY-MM-DD）是否已早于今天 */
export function isDateBeforeToday(deadline?: string, now = new Date()): boolean {
  if (!deadline) return false
  return deadline.slice(0, 10) < todayDateOnly(now)
}
