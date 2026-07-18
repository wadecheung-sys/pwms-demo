import WebSocket from 'ws'
const wsUrl = process.argv[2]
const ws = new WebSocket(wsUrl)
let id = 0
const pending = new Map()
const logs = []
function send(method, params = {}) {
  const msgId = ++id
  return new Promise((resolve, reject) => {
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
}
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
await new Promise((r) => ws.on('open', r))
await send('Runtime.enable')
await send('Page.enable')
await send('Network.enable')
await send('Page.navigate', { url: 'http://localhost:4000/#/login' })
await new Promise((r) => setTimeout(r, 6000))
const title = await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })
const hasForm = await send('Runtime.evaluate', {
  expression: '!!(document.querySelector("input") || document.querySelector(".el-form") || document.querySelector("button"))',
  returnByValue: true,
})
const bodyText = await send('Runtime.evaluate', {
  expression: '(document.body?.innerText || "").slice(0, 800)',
  returnByValue: true,
})
const appChildren = await send('Runtime.evaluate', {
  expression: 'document.querySelector("#app")?.children?.length ?? -1',
  returnByValue: true,
})
// attempt login fill+click if possible
const loginResult = await send('Runtime.evaluate', {
  expression: `(() => {
    const inputs = Array.from(document.querySelectorAll('input'));
    const user = inputs.find(i => i.type === 'text' || !i.type || i.type === 'search');
    const pass = inputs.find(i => i.type === 'password');
    if (!user || !pass) return { ok: false, reason: 'no-inputs', inputCount: inputs.length };
    user.value = 'admin'; user.dispatchEvent(new Event('input', { bubbles: true }));
    pass.value = '123456'; pass.dispatchEvent(new Event('input', { bubbles: true }));
    const btn = Array.from(document.querySelectorAll('button')).find(b => /登录|login|Login/i.test(b.innerText||''));
    if (btn) btn.click();
    return { ok: true, clicked: !!btn, inputCount: inputs.length };
  })()`,
  returnByValue: true,
  awaitPromise: true,
})
await new Promise((r) => setTimeout(r, 4000))
const afterUrl = await send('Runtime.evaluate', { expression: 'location.href', returnByValue: true })
const afterText = await send('Runtime.evaluate', {
  expression: '(document.body?.innerText || "").slice(0, 500)',
  returnByValue: true,
})
const errors = logs.filter((l) => l.type === 'error' || l.type === 'exception')
const warnings = logs.filter((l) => l.type === 'warning').slice(0, 10)
console.log(JSON.stringify({
  title: title?.result?.value,
  hasForm: hasForm?.result?.value,
  appChildren: appChildren?.result?.value,
  bodyText: bodyText?.result?.value,
  loginResult: loginResult?.result?.value,
  afterUrl: afterUrl?.result?.value,
  afterText: afterText?.result?.value,
  errors,
  warnings,
  logCount: logs.length,
}, null, 2))
ws.close()
process.exit(errors.length ? 2 : 0)
