import { computed } from 'vue'
import type { AssetCategory, AssetLedger, Person, WarehouseSite } from '@/types'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import {
  filterByAssetCodes,
  filterByOrgScope,
  filterWarehouses,
  getVisibleOrgIds,
  visibleAssetCodeSet,
} from '@/utils/pwms/dataScope'
import { hasPermission } from '@/utils/pwms/permission'

export function useDataScope() {
  const dataStore = useDataStore()
  const userStore = useUserStore()

  const user = computed(() => userStore.context)
  const organizations = computed(() => dataStore.organizations)

  const visibleOrgIds = computed(() => getVisibleOrgIds(user.value, organizations.value))

  const visibleOrganizations = computed(() =>
    organizations.value.filter((o) => visibleOrgIds.value.includes(o.id)),
  )

  function scopeByOrg<T extends { orgId: string }>(items: T[]): T[] {
    return filterByOrgScope(items, user.value, organizations.value)
  }

  function scopeWarehouses(sites: WarehouseSite[]): WarehouseSite[] {
    return filterWarehouses(sites, user.value, organizations.value)
  }

  function scopeLedgers(ledgers: AssetLedger[], category?: AssetCategory): AssetLedger[] {
    const scoped = scopeByOrg(ledgers)
    return category ? scoped.filter((l) => l.category === category) : scoped
  }

  function scopeLedgersByCategories(ledgers: AssetLedger[], categories: AssetCategory[]): AssetLedger[] {
    return scopeByOrg(ledgers).filter((l) => categories.includes(l.category))
  }

  function scopeByAssets<T extends { assetCode: string }>(records: T[], ledgers?: AssetLedger[]): T[] {
    const source = ledgers ?? dataStore.ledgers
    const codes = visibleAssetCodeSet(source, user.value, organizations.value)
    return filterByAssetCodes(records, codes)
  }

  function scopePersons(persons: Person[]): Person[] {
    return scopeByOrg(persons)
  }

  function can(permission: string): boolean {
    return hasPermission(user.value, permission)
  }

  function canEditLedger(): boolean {
    return can('ledger:edit')
  }

  function canEditWarehouse(): boolean {
    return can('warehouse:edit')
  }

  return {
    user,
    visibleOrgIds,
    visibleOrganizations,
    scopeByOrg,
    scopeWarehouses,
    scopeLedgers,
    scopeLedgersByCategories,
    scopeByAssets,
    scopePersons,
    can,
    canEditLedger,
    canEditWarehouse,
  }
}
