import type { QuotaFormulaType, QuotaRule } from '@/types'

/** 《电网设备备品备件配置原则》表 A-1：按 A×K% 查 a 不平均系数 */
export function resolveUnevenCoeff(ak: number): number {
  if (ak <= 1) return 1
  if (ak <= 5) return 0.9
  if (ak <= 10) return 0.8
  if (ak <= 20) return 0.7
  if (ak <= 30) return 0.6
  if (ak <= 40) return 0.5
  if (ak <= 70) return 0.4
  return 0.3
}

/**
 * 生产仓公式：N = A × (1 − K%) × α（客户补充材料第 29 页已确认）
 * 配置原则公式：N = A · K% · a · T / P
 * K 的字段单位固定为百分比，输入 1 表示 1%，不得按 1.0 比例解释。
 * 注意：生产仓公式的 A/N 为金额口径；当前函数只负责公式试算，不能直接与实物数量比较。
 */
export function calcStandardQty(
  formulaType: QuotaFormulaType,
  A: number,
  rule: Pick<QuotaRule, 'k' | 'a' | 't' | 'p'>
): number {
  const K = rule.k
  const kRatio = Math.min(100, Math.max(0, K)) / 100
  const a = rule.a > 0 ? rule.a : resolveUnevenCoeff(A * kRatio)
  let n = 0
  if (formulaType === 'production') {
    n = A * (1 - kRatio) * a
  } else {
    const T = rule.t ?? 3
    const P = rule.p ?? 20
    n = (A * kRatio * a * T) / P
  }
  return Math.max(0, Math.round((n + Number.EPSILON) * 100) / 100)
}

export function calcQuotaLimits(standardQty: number) {
  const upper = Math.ceil(standardQty * 1.2)
  const lower = Math.max(1, Math.floor(standardQty * 0.8))
  return { upperLimit: Math.max(upper, lower), lowerLimit: lower }
}
