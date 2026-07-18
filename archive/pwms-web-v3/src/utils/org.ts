import type { Organization, OrgType } from '@/types'

export const orgTypeLabels: Record<OrgType, string> = {
  division: '东北分部',
  province: '省公司',
  city: '地市公司',
  county: '县公司',
  team: '班组',
}

export const orgTypeLevel: Record<OrgType, number> = {
  division: 1,
  province: 2,
  city: 3,
  county: 4,
  team: 5,
}

export const orgTypeTagType: Record<OrgType, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  division: 'danger',
  province: 'warning',
  city: '',
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
    return parent ? '东北分部必须为顶级组织' : null
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
