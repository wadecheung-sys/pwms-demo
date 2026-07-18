import type { QuotaFormulaType, QuotaRule } from '@/types'

/** 配置原则 a 不平均系数对照（简化） */
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
 * 生产仓公式：N = A × (1 − K) × a
 * 配置原则公式：N = A · K · a · T / P  （K 以百分比含义时除以 100）
 */
export function calcStandardQty(
  formulaType: QuotaFormulaType,
  A: number,
  rule: Pick<QuotaRule, 'k' | 'a' | 't' | 'p'>,
): number {
  const K = rule.k
  const a = rule.a > 0 ? rule.a : resolveUnevenCoeff(A * (K > 1 ? K / 100 : K))
  let n = 0
  if (formulaType === 'production') {
    const kRatio = K > 1 ? K / 100 : K
    n = A * (1 - kRatio) * a
  } else {
    const kRatio = K > 1 ? K / 100 : K
    const T = rule.t ?? 3
    const P = rule.p ?? 20
    n = (A * kRatio * a * T) / P
  }
  return Math.max(0, Math.ceil(n * 100) / 100)
}

export function calcQuotaLimits(standardQty: number) {
  const upper = Math.ceil(standardQty * 1.2)
  const lower = Math.max(1, Math.floor(standardQty * 0.8))
  return { upperLimit: Math.max(upper, lower), lowerLimit: lower }
}
