let seq = 0

export function genId(prefix = 'id'): string {
  seq += 1
  return `${prefix}-${Date.now()}-${seq}`
}

const categoryCodePrefix: Record<string, string> = {
  spare: 'SP',
  instrument: 'IN',
  tool: 'TL',
}

export function genAssetCode(category: string, existingCodes: string[]): string {
  const prefix = categoryCodePrefix[category] ?? 'AS'
  const year = new Date().getFullYear()
  const pattern = new RegExp(`^${prefix}${year}(\\d+)$`)
  let max = 0
  for (const code of existingCodes) {
    const m = code.match(pattern)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}${year}${String(max + 1).padStart(4, '0')}`
}

export function nowStr(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
