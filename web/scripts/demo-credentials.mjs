import { existsSync, readFileSync } from 'node:fs'

// 测试凭据从环境变量或被 Git 忽略的本地文件读取，禁止硬编码到脚本中。
const credentialFile = new URL('../../.secrets/pwms-login.json', import.meta.url)
const local =
  !process.env.PWMS_DEMO_PASSWORD && existsSync(credentialFile)
    ? JSON.parse(readFileSync(credentialFile, 'utf8'))
    : {}

export const demoPassword = process.env.PWMS_DEMO_PASSWORD || local.password
if (!demoPassword) {
  throw new Error('请设置 PWMS_DEMO_PASSWORD，或提供本地 .secrets/pwms-login.json')
}
