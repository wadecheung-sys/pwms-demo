import type { Organization, OrgType, WarehouseSite } from '@/types'

export const orgTypeLabels: Record<OrgType, string> = {
  division: '分部',
  province: '省公司',
  city: '地市公司',
  county: '县公司',
  team: '供电所',
}

export const orgTypeLevel: Record<OrgType, number> = {
  division: 1,
  province: 2,
  city: 3,
  county: 4,
  team: 5,
}

export const orgTypeTagType: Record<OrgType, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  division: 'danger',
  province: 'warning',
  city: 'primary',
  county: 'success',
  team: 'info',
}

export interface OrgTreeNode extends Organization {
  children: OrgTreeNode[]
}

export function levelFromType(type: OrgType): number {
  return orgTypeLevel[type]
}

export function allowedParentTypes(childType: OrgType): OrgType[] | null {
  switch (childType) {
    case 'division':
      return null
    case 'province':
      return ['division']
    case 'city':
      return ['province']
    case 'county':
      return ['city']
    case 'team':
      return ['county', 'city']
    default:
      return []
  }
}

export function validateOrgHierarchy(childType: OrgType, parent: Organization | null): string | null {
  if (childType === 'division') {
    return parent ? '分部必须为顶级组织' : null
  }
  if (!parent) return '请选择上级组织'
  const allowed = allowedParentTypes(childType)
  if (!allowed?.includes(parent.type)) {
    return `「${orgTypeLabels[childType]}」的上级应为 ${allowed!.map((t) => orgTypeLabels[t]).join('或')}`
  }
  return null
}

export function buildOrgTree(orgs: Organization[], parentId: string | null = null): OrgTreeNode[] {
  return orgs
    .filter((o) => o.parentId === parentId)
    .sort((a, b) => a.code.localeCompare(b.code, 'zh-CN'))
    .map((o) => ({
      ...o,
      children: buildOrgTree(orgs, o.id),
    }))
}

export function getOrgChildren(orgs: Organization[], parentId: string): Organization[] {
  return orgs.filter((o) => o.parentId === parentId)
}

export function getOrgDescendantIds(orgs: Organization[], rootId: string, includeSelf = true): string[] {
  const ids: string[] = includeSelf ? [rootId] : []
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    for (const child of orgs.filter((o) => o.parentId === id)) {
      ids.push(child.id)
      stack.push(child.id)
    }
  }
  return ids
}

export function getOrgAncestorIds(orgs: Organization[], orgId: string, includeSelf = true): string[] {
  const ids: string[] = includeSelf ? [orgId] : []
  let current = orgs.find((o) => o.id === orgId)
  while (current?.parentId) {
    ids.unshift(current.parentId)
    current = orgs.find((o) => o.id === current!.parentId)
  }
  return ids
}

export function isInventoryCenterOrg(org: Organization): boolean {
  return org.type === 'province' || org.type === 'city'
}

export function formatOrgOptionLabel(org: Organization): string {
  const indent = org.level > 1 ? `${'　'.repeat(org.level - 1)}` : ''
  return `${indent}${org.name}`
}

export function getValidParentOptions(
  orgs: Organization[],
  childType: OrgType,
  editingId: string | null,
): Organization[] {
  const excludeIds = editingId ? getOrgDescendantIds(orgs, editingId, true) : []
  const allowed = allowedParentTypes(childType)
  if (allowed === null) return []
  return orgs.filter((o) => allowed.includes(o.type) && !excludeIds.includes(o.id))
}

/** 由仓室所属 orgId 推导 地市 / 县 / 供电所 三列展示名 */
export function resolveOrgAffiliation(
  orgs: Organization[],
  orgId: string,
): { cityOrgName: string; countyOrgName: string; stationOrgName: string } {
  const chain: Organization[] = []
  let cur = orgs.find((o) => o.id === orgId)
  while (cur) {
    chain.unshift(cur)
    cur = cur.parentId ? orgs.find((o) => o.id === cur!.parentId) : undefined
  }
  const city = chain.find((o) => o.type === 'city')
  const county = chain.find((o) => o.type === 'county')
  const station = chain.find((o) => o.type === 'team')
  return {
    cityOrgName: city?.name || '—',
    countyOrgName: county?.name || '—',
    stationOrgName: station?.name || (county || city ? '—' : chain.at(-1)?.name || '—'),
  }
}

export function enrichWarehouseAffiliation(orgs: Organization[], site: WarehouseSite) {
  return { ...site, ...resolveOrgAffiliation(orgs, site.orgId) }
}

/** 统计用：仓室挂靠组织层级（市/县/所） */
export function warehouseOrgTier(orgs: Organization[], orgId: string): 'province' | 'city' | 'county' | 'station' {
  const org = orgs.find((o) => o.id === orgId)
  if (!org) return 'station'
  if (org.type === 'province') return 'province'
  if (org.type === 'city') return 'city'
  if (org.type === 'county') return 'county'
  return 'station'
}
