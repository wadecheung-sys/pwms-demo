import type { Organization, UserContext, WarehouseSite } from '@/types'
import { getOrgDescendantIds } from '@/utils/pwms/org'

type OrgScoped = { orgId: string }

export function getVisibleOrgIds(user: UserContext, organizations: Organization[]): string[] {
  if (user.dataScope === 'all') return organizations.map((o) => o.id)
  if (!user.orgId) return []
  if (user.dataScope === 'org_only') return [user.orgId]
  return getOrgDescendantIds(organizations, user.orgId, true)
}

export function isOrgVisible(orgId: string, user: UserContext, organizations: Organization[]): boolean {
  return getVisibleOrgIds(user, organizations).includes(orgId)
}

export function filterByOrgScope<T extends OrgScoped>(
  items: T[],
  user: UserContext,
  organizations: Organization[],
): T[] {
  if (user.dataScope === 'all') return items
  const visible = new Set(getVisibleOrgIds(user, organizations))
  return items.filter((item) => visible.has(item.orgId))
}

export function filterWarehouses(
  sites: WarehouseSite[],
  user: UserContext,
  organizations: Organization[],
): WarehouseSite[] {
  return filterByOrgScope(sites, user, organizations)
}

export function filterByAssetCodes<T extends { assetCode: string }>(
  records: T[],
  visibleAssetCodes: Set<string>,
): T[] {
  return records.filter((r) => visibleAssetCodes.has(r.assetCode))
}

export function visibleAssetCodeSet<T extends OrgScoped & { assetCode: string }>(
  ledgers: T[],
  user: UserContext,
  organizations: Organization[],
): Set<string> {
  return new Set(filterByOrgScope(ledgers, user, organizations).map((l) => l.assetCode))
}
