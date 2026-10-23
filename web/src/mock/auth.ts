import type { DataScope } from '@/types'

/** 系统登录账号 */
export interface SystemAccount {
  username: string
  personId: string
  dataScope: DataScope
}

export const systemAccounts: SystemAccount[] = [
  { username: 'admin', personId: 'p-1', dataScope: 'all' },
  { username: 'ln_province', personId: 'p-2', dataScope: 'org_and_children' },
  { username: 'sy_city', personId: 'p-3', dataScope: 'org_and_children' },
  { username: 'hp_county', personId: 'p-8', dataScope: 'org_and_children' },
  { username: 'keeper01', personId: 'p-4', dataScope: 'org_only' }
]

// 仅用于静态演示的密码校验，不能替代服务端鉴权。明文密码不进入仓库和构建产物。
const PASSWORD_SALT = '64a8a1dccddaf772c61b3d5ee2572248'
const PASSWORD_HASH = '1efae6939b7a46ea3d65575b01115c206094ede052eca6ce40882abf8b764eef'

export async function verifyPassword(password: string): Promise<boolean> {
  if (!password) return false
  if (!globalThis.crypto?.subtle) {
    throw new Error('请通过 HTTPS 访问系统；本地预览请使用 localhost')
  }
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits'
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(PASSWORD_SALT), iterations: 210000 },
    key,
    256
  )
  const hash = Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  )
  return hash === PASSWORD_HASH
}

// 密码轮换后让旧演示会话失效；这不是服务端签发的安全令牌。
export function getDemoToken(username: string): string {
  return `token-${username}-${PASSWORD_HASH.slice(0, 16)}`
}

export function isCurrentDemoSession(username: string, token?: string): boolean {
  return (
    systemAccounts.some((account) => account.username === username) &&
    token === getDemoToken(username)
  )
}
