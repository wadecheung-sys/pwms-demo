/** 智慧仓环境监测数据 */
export interface SmartWarehouseEnv {
  temperature: number
  humidity: number
  /** true=烟感正常，false=告警 */
  smokeNormal: boolean
  updatedAt: string
}

export const smartWarehouseEnvMap: Record<string, SmartWarehouseEnv> = {
  'ws-1': { temperature: 22.5, humidity: 48, smokeNormal: true, updatedAt: '2026-07-12 14:30:00' },
  'ws-3': { temperature: 23.1, humidity: 52, smokeNormal: true, updatedAt: '2026-07-12 14:28:00' },
  'ws-8': { temperature: 21.8, humidity: 45, smokeNormal: true, updatedAt: '2026-07-12 14:32:00' },
}

export function getSmartWarehouseEnv(warehouseId: string): SmartWarehouseEnv | null {
  return smartWarehouseEnvMap[warehouseId] ?? null
}
