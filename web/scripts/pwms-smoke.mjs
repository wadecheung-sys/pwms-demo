/**
 * Headless UI smoke: login + key routes, collect console errors/warnings and visibility signals.
 * Usage: node scripts/pwms-smoke.mjs [wsUrl]
 * If no wsUrl, expects Chrome already listening on 9222 with a page target.
 */
import WebSocket from 'ws'

const DEBUG_PORT = Number(process.env.CDP_PORT || 9222)
const BASE = process.env.APP_BASE || 'http://localhost:4000'

async function getWsUrl() {
  if (process.argv[2]) return process.argv[2]
  const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`).then((r) => r.json())
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('No Chrome page target')
  return page.webSocketDebuggerUrl
}

function createClient(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const logs = []
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg.result)
      pending.delete(msg.id)
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ')
      logs.push({ type: msg.params.type, text })
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push({
        type: 'exception',
        text:
          msg.params.exceptionDetails?.exception?.description ||
          msg.params.exceptionDetails?.text ||
          'unknown',
      })
    }
  })
  const ready = new Promise((r) => ws.on('open', r))
  const send = (method, params = {}) => {
    const msgId = ++id
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })
  }
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (res?.exceptionDetails) {
      return { __error: res.exceptionDetails.text || 'eval error' }
    }
    return res?.result?.value
  }
  return { ws, ready, send, evaluate, logs }
}

const routes = [
  { path: '/dashboard/analysis', expect: /经营分析|全省一张图/ },
  { path: '/warehouse/overview', expect: /生产仓|概览|仓/ },
  { path: '/spare/ledger', expect: /台账|装备|编码/ },
  { path: '/spare/inout/in-apply', expect: /入库|申请/ },
  { path: '/spare/inventory/progress', expect: /盘点|进度/ },
  { path: '/quota/results', expect: /定额|测算|缺额/ },
  { path: '/alerts/index', expect: /告警/ },
  { path: '/system/org', expect: /组织|机构/ },
]

async function main() {
  const wsUrl = await getWsUrl()
  const c = createClient(wsUrl)
  await c.ready
  await c.send('Runtime.enable')
  await c.send('Page.enable')
  await c.send('Network.enable')
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  const report = { base: BASE, checks: [], summary: {} }

  // Login
  c.logs.length = 0
  await c.send('Page.navigate', { url: `${BASE}/#/login` })
  await new Promise((r) => setTimeout(r, 3500))
  const loginText = await c.evaluate('(document.body?.innerText||"").slice(0,600)')
  const loginOk = /登录|用户名|密码/.test(loginText || '')
  const loginErrors = c.logs.filter((l) => l.type === 'error' || l.type === 'exception')
  report.checks.push({
    step: 'login-page',
    ok: loginOk && loginErrors.length === 0,
    textSample: (loginText || '').slice(0, 120),
    errors: loginErrors,
    warnings: c.logs.filter((l) => l.type === 'warning').slice(0, 5),
  })

  // Perform login
  c.logs.length = 0
  await c.evaluate(`(() => {
    const inputs = Array.from(document.querySelectorAll('input'))
    const user = inputs.find(i => i.type !== 'password' && i.type !== 'checkbox')
    const pass = inputs.find(i => i.type === 'password')
    if (!user || !pass) return false
    const set = (el, v) => {
      const proto = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      proto.set.call(el, v)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    set(user, 'admin')
    set(pass, '123456')
    const btn = Array.from(document.querySelectorAll('button')).find(b => /登录|login/i.test(b.innerText||''))
    btn && btn.click()
    return true
  })()`)
  await new Promise((r) => setTimeout(r, 4500))
  const afterLoginUrl = await c.evaluate('location.href')
  const afterLoginText = await c.evaluate('(document.body?.innerText||"").slice(0,800)')
  const loginNavOk = /dashboard\/analysis/.test(afterLoginUrl || '')
  const loginNavErrors = c.logs.filter((l) => l.type === 'error' || l.type === 'exception')
  report.checks.push({
    step: 'login-submit',
    ok: loginNavOk && loginNavErrors.length === 0 && /经营分析/.test(afterLoginText || ''),
    url: afterLoginUrl,
    textSample: (afterLoginText || '').slice(0, 160),
    errors: loginNavErrors,
    warnings: c.logs.filter((l) => l.type === 'warning' && /Failed to resolve component|Unhandled|TypeError/.test(l.text)).slice(0, 8),
  })

  for (const route of routes) {
    c.logs.length = 0
    await c.send('Page.navigate', { url: `${BASE}/#${route.path}` })
    await new Promise((r) => setTimeout(r, 3500))
    const href = await c.evaluate('location.href')
    const text = await c.evaluate('(document.body?.innerText||"").slice(0,1200)')
    const htmlLen = await c.evaluate('document.querySelector("#app")?.innerHTML?.length || 0')
    const blank =
      !text ||
      text.trim().length < 20 ||
      /app-loading/.test(await c.evaluate('document.querySelector("#app")?.innerHTML||""'))
    const visibleOk = route.expect.test(text || '') && !blank && htmlLen > 500
    const errors = c.logs.filter((l) => l.type === 'error' || l.type === 'exception')
    const resolveWarns = c.logs.filter((l) => l.type === 'warning' && /Failed to resolve component/.test(l.text))
    report.checks.push({
      step: `route:${route.path}`,
      ok: visibleOk && errors.length === 0,
      url: href,
      blank,
      htmlLen,
      textSample: (text || '').replace(/\\s+/g, ' ').slice(0, 180),
      errors,
      unresolvedComponents: [
        ...new Set(
          resolveWarns
            .map((w) => (w.text.match(/Failed to resolve component: ([\w-]+)/) || [])[1])
            .filter(Boolean),
        ),
      ],
      warningCount: c.logs.filter((l) => l.type === 'warning').length,
    })
  }

  // Layout visibility signals on dashboard
  c.logs.length = 0
  await c.send('Page.navigate', { url: `${BASE}/#/dashboard/analysis` })
  await new Promise((r) => setTimeout(r, 3000))
  const layout = await c.evaluate(`(() => {
    const style = (el) => el ? getComputedStyle(el) : null
    const sidebar = document.querySelector('.el-aside, .v-layout-menu, [class*="left-menu"], .layout-menu')
    const header = document.querySelector('.el-header, .v-tool-header, [class*="tool-header"]')
    const main = document.querySelector('.el-main, .v-layout-content, main')
    const pick = (el) => {
      if (!el) return null
      const s = style(el)
      const r = el.getBoundingClientRect()
      return {
        tag: el.tagName,
        class: el.className?.toString?.().slice(0,80),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        bg: s.backgroundColor,
        color: s.color,
      }
    }
    return {
      sidebar: pick(sidebar),
      header: pick(header),
      main: pick(main),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      htmlClass: document.documentElement.className,
    }
  })()`)
  report.checks.push({
    step: 'layout-visibility',
    ok: !!(
      layout?.sidebar &&
      layout.sidebar.w >= 60 &&
      layout?.main?.w > 200 &&
      layout?.main?.h > 100
    ),
    layout,
  })

  const failed = report.checks.filter((c) => !c.ok)
  report.summary = {
    total: report.checks.length,
    passed: report.checks.length - failed.length,
    failed: failed.length,
    failedSteps: failed.map((f) => f.step),
  }
  console.log(JSON.stringify(report, null, 2))
  c.ws.close()
  process.exit(failed.length ? 2 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
