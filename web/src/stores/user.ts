import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { systemAccounts, verifyPassword, getDemoToken, isCurrentDemoSession } from '@/mock/auth'
import { useDataStore } from '@/stores/data'
import type { DataScope, OrgType, UserContext } from '@/types'
import { orgTypeLabels } from '@/utils/pwms/org'

const STORAGE_KEY = 'pwms_user_context'

function emptyContext(): UserContext {
  return {
    token: '',
    username: '',
    displayName: '',
    personId: '',
    orgId: '',
    orgName: '',
    orgType: 'team',
    roleId: '',
    roleName: '',
    permissions: [],
    dataScope: 'org_only'
  }
}

function loadContext(): UserContext | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const context = JSON.parse(raw) as UserContext
    if (!isCurrentDemoSession(context.username, context.token)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return context
  } catch {
    return null
  }
}

function saveContext(ctx: UserContext | null) {
  if (!ctx?.token) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx))
}

function resolveContext(username: string): UserContext | null {
  const account = systemAccounts.find((a) => a.username === username)
  if (!account) return null

  const dataStore = useDataStore()
  const person = dataStore.persons.find((p) => p.id === account.personId)
  if (!person) return null

  const role = dataStore.roles.find((r) => r.id === person.roleId)
  const org = dataStore.organizations.find((o) => o.id === person.orgId)

  return {
    token: getDemoToken(account.username),
    username: account.username,
    displayName: person.name,
    personId: person.id,
    orgId: person.orgId,
    orgName: person.orgName || org?.name || '',
    orgType: (org?.type ?? 'team') as OrgType,
    roleId: person.roleId,
    roleName: person.roleName || role?.name || '',
    permissions: role?.permissions ?? [],
    dataScope: account.dataScope as DataScope
  }
}

/** 按当前业务主数据刷新会话中的组织/角色/权限（人员或角色变更后调用） */
function refreshFromMasterData(ctx: UserContext): UserContext {
  if (!ctx.token || !ctx.personId) return ctx
  const dataStore = useDataStore()
  const person = dataStore.persons.find((p) => p.id === ctx.personId)
  if (!person) return ctx
  const role = dataStore.roles.find((r) => r.id === person.roleId)
  const org = dataStore.organizations.find((o) => o.id === person.orgId)
  return {
    ...ctx,
    displayName: person.name,
    orgId: person.orgId,
    orgName: person.orgName || org?.name || ctx.orgName,
    orgType: (org?.type ?? ctx.orgType) as OrgType,
    roleId: person.roleId,
    roleName: person.roleName || role?.name || ctx.roleName,
    permissions: role?.permissions ?? ctx.permissions
  }
}

export const useUserStore = defineStore('pwms-user', () => {
  const context = ref<UserContext>(loadContext() ?? emptyContext())

  const token = computed(() => context.value.token || null)
  const username = computed(() => context.value.username)
  const displayName = computed(() => context.value.displayName)
  const orgLabel = computed(() => {
    if (!context.value.orgName) return ''
    return `${orgTypeLabels[context.value.orgType]} · ${context.value.orgName}`
  })

  async function login(user: string, password: string): Promise<boolean> {
    if (!systemAccounts.some((account) => account.username === user)) return false
    if (!(await verifyPassword(password))) return false
    const resolved = resolveContext(user)
    if (!resolved) return false
    context.value = resolved
    saveContext(resolved)
    return true
  }

  function logout() {
    context.value = emptyContext()
    saveContext(null)
  }

  function isLoggedIn() {
    return !!context.value.token
  }

  /** 同步主数据变更到当前登录会话 */
  function syncSession() {
    if (!context.value.token) return
    const next = refreshFromMasterData(context.value)
    context.value = next
    saveContext(next)
  }

  /**
   * 与壳层登录态对齐。
   * Cursor/Edge 等不同浏览器各自有 localStorage：壳层 user 已恢复但业务会话缺失时，
   * 页面会按空 orgId + org_only 过滤，表现为「看不到模拟数据」。
   */
  function ensureAlignedWithShell(shellUsername?: string, shellToken?: string) {
    if (!shellUsername || !isCurrentDemoSession(shellUsername, shellToken)) return false
    if (context.value.token && context.value.username === shellUsername) {
      syncSession()
      return true
    }
    const resolved = resolveContext(shellUsername)
    if (!resolved) return false
    context.value = resolved
    saveContext(resolved)
    return true
  }

  return {
    context,
    token,
    username,
    displayName,
    orgLabel,
    login,
    logout,
    isLoggedIn,
    syncSession,
    ensureAlignedWithShell
  }
})
