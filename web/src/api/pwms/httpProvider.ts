/**
 * HTTP 模式数据提供者（对接后端时使用）。
 * 本地数据层模式下不会调用，作为 REST 契约参考。
 */
import { API } from './endpoints'
import { httpDelete, httpGet, httpPost, httpPut } from './http'
import type {
  AssetCategory,
  AssetLedger,
  AssetLifecycleEvent,
  FaultRecord,
  InOutRecord,
  InventoryTask,
  MaintenanceRecord,
} from '@/types'

export async function fetchLedgers(category?: AssetCategory) {
  const q = category ? `?category=${category}` : ''
  return httpGet<AssetLedger[]>(`${API.ledgers}${q}`)
}

export async function fetchLedgerLifecycle(assetCode: string) {
  return httpGet<AssetLifecycleEvent[]>(API.ledgerLifecycle(assetCode))
}

export async function createLedger(data: Omit<AssetLedger, 'id' | 'assetCode' | 'typeName' | 'orgName' | 'unit'>) {
  return httpPost<AssetLedger>(API.ledgers, data)
}

export async function updateLedgerRemote(id: string, data: Partial<AssetLedger>) {
  return httpPut<AssetLedger>(API.ledger(id), data)
}

export async function deleteLedgerRemote(id: string) {
  return httpDelete(API.ledger(id))
}

export async function createInOut(data: Omit<InOutRecord, 'id' | 'assetName' | 'orgName' | 'operateTime'>) {
  return httpPost<InOutRecord>(API.inOut, data)
}

export async function convertFaultRemote(
  faultId: string,
  data: Omit<MaintenanceRecord, 'id' | 'assetName' | 'category' | 'assetCode' | 'faultId'>,
) {
  return httpPost<MaintenanceRecord>(API.faultConvert(faultId), data)
}

export async function dispatchInventoryRemote(params: {
  category: AssetCategory
  taskName: string
  centerOrgId: string
  assignee: string
  deadline: string
}) {
  return httpPost<InventoryTask>(API.inventoryDispatch, params)
}

export async function fetchDashboardStats() {
  return httpGet<Record<string, number>>(API.dashboard)
}

export async function fetchFaults(category?: AssetCategory) {
  const q = category ? `?category=${category}` : ''
  return httpGet<FaultRecord[]>(`${API.faults}${q}`)
}
