import type { DataScope } from '@/types'

/** 系统登录账号 */
export interface SystemAccount {
  username: string
  password: string
  personId: string
  dataScope: DataScope
}

export const systemAccounts: SystemAccount[] = [
  { username: 'admin', password: '123456', personId: 'p-1', dataScope: 'all' },
  { username: 'ln_province', password: '123456', personId: 'p-2', dataScope: 'org_and_children' },
  { username: 'sy_city', password: '123456', personId: 'p-3', dataScope: 'org_and_children' },
  { username: 'hp_county', password: '123456', personId: 'p-8', dataScope: 'org_and_children' },
  { username: 'keeper01', password: '123456', personId: 'p-4', dataScope: 'org_only' },
]
