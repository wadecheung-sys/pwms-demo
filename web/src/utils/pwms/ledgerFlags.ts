import type {
  AssetLedger,
  CheckCycleSetting,
  CheckDueStatus,
  CheckRecord,
} from '@/types'

const MS_DAY = 24 * 60 * 60 * 1000

/** 临期窗口：剩余天数 ≤ 该值视为临期 */
export const DUE_WARN_DAYS = 30

export function parseDateOnly(value?: string): Date | null {
  if (!value) return null
  const raw = value.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(`${raw}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function calcWarehouseAgeDays(inboundTime?: string, now = new Date()): number | undefined {
  if (!inboundTime) return undefined
  const d = new Date(inboundTime.replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) {
    const only = parseDateOnly(inboundTime)
    if (!only) return undefined
    return Math.max(0, Math.floor((now.getTime() - only.getTime()) / MS_DAY))
  }
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / MS_DAY))
}

export function calcDueStatus(
  lastCheckDate: string | undefined,
  cycleDays: number,
  now = new Date(),
  warnDays = DUE_WARN_DAYS,
): CheckDueStatus {
  if (!lastCheckDate || !cycleDays || cycleDays <= 0) return '未校验'
  const last = parseDateOnly(lastCheckDate)
  if (!last) return '未校验'
  const due = new Date(last.getTime() + cycleDays * MS_DAY)
  const daysLeft = Math.floor((due.getTime() - now.getTime()) / MS_DAY)
  if (daysLeft < 0) return '超期'
  if (daysLeft <= warnDays) return '临期'
  return '正常'
}

export function nextDueDateFrom(lastCheckDate: string, cycleDays: number): string {
  const last = parseDateOnly(lastCheckDate) || new Date()
  const due = new Date(last.getTime() + Math.max(1, cycleDays) * MS_DAY)
  const y = due.getFullYear()
  const m = String(due.getMonth() + 1).padStart(2, '0')
  const d = String(due.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function findCycleSetting(
  settings: CheckCycleSetting[],
  ledger: Pick<AssetLedger, 'category' | 'typeName'>,
): CheckCycleSetting | undefined {
  const kind = ledger.category === 'spare' ? 'trial' : 'calibration'
  return (
    settings.find(
      (s) => s.category === ledger.category && s.typeName === ledger.typeName && s.checkKind === kind,
    ) || settings.find((s) => s.category === ledger.category && s.typeName === ledger.typeName)
  )
}

/** 按周期配置刷新试验/检定到期状态；不合格结果强制超期 */
export function applyDueFromCycles(
  ledger: AssetLedger,
  settings: CheckCycleSetting[],
  opts?: { forceFail?: boolean; now?: Date },
): void {
  if (ledger.status === '报废' || ledger.disposeStatus === '已报废') return
  const setting = findCycleSetting(settings, ledger)
  const now = opts?.now ?? new Date()
  if (opts?.forceFail) {
    if (ledger.category === 'spare') ledger.trialDueStatus = '超期'
    else ledger.checkDueStatus = '超期'
    return
  }
  if (!setting) return
  const status = calcDueStatus(ledger.lastCheckDate, setting.cycleDays, now)
  if (ledger.category === 'spare') ledger.trialDueStatus = status
  else ledger.checkDueStatus = status
}

export function isCheckQualified(ledger: AssetLedger): boolean {
  if (ledger.category === 'spare') {
    const s = ledger.trialDueStatus || ledger.checkDueStatus
    return !s || (s !== '超期' && s !== '未校验')
  }
  return !ledger.checkDueStatus || (ledger.checkDueStatus !== '超期' && ledger.checkDueStatus !== '未校验')
}

/**
 * 统一维护在库/可用/处置展示语义与在库时长。
 */
export function syncLedgerOperationalFlags(ledger: AssetLedger): void {
  const age = calcWarehouseAgeDays(ledger.inboundTime)
  if (age != null) ledger.warehouseAgeDays = age

  if (ledger.status === '报废' || ledger.disposeStatus === '已报废') {
    ledger.inStock = false
    ledger.usable = false
    ledger.disposeStatus = '已报废'
    return
  }

  const overdue = ledger.checkDueStatus === '超期' || ledger.trialDueStatus === '超期'

  if (ledger.quantity > 0 && ledger.status === '在库') {
    ledger.inStock = true
    ledger.usable = !overdue
    ledger.disposeStatus = '在库'
    return
  }

  if (ledger.status === '维修中') {
    ledger.inStock = false
    ledger.usable = false
    ledger.disposeStatus = '占用'
    return
  }

  ledger.inStock = false
  ledger.usable = false
  ledger.disposeStatus = '占用'
}

export function refreshLedgersDueAndFlags(
  ledgers: AssetLedger[],
  settings: CheckCycleSetting[],
): void {
  for (const ledger of ledgers) {
    applyDueFromCycles(ledger, settings)
    syncLedgerOperationalFlags(ledger)
  }
}

export function resolveNextDueForCheck(
  item: Pick<CheckRecord, 'category' | 'checkDate' | 'checkKind' | 'nextDueDate'>,
  typeName: string,
  settings: CheckCycleSetting[],
): string {
  if (item.nextDueDate) return item.nextDueDate
  const setting = settings.find(
    (s) =>
      s.category === item.category &&
      s.typeName === typeName &&
      s.checkKind === item.checkKind,
  )
  if (setting) return nextDueDateFrom(item.checkDate, setting.cycleDays)
  return nextDueDateFrom(item.checkDate, 365)
}
