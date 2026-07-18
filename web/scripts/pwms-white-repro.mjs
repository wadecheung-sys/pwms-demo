import WebSocket from 'ws'

const DEBUG_PORT = Number(process.env.CDP_PORT || 9444)
const BASE = process.env.APP_BASE || 'http://localhost:4000'

async function main() {
  const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`).then((r) => r.json())
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('No page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const logs = []
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg.result)
      pending.delete(msg.id)
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push({
        type: msg.params.type,
        text: (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '),
      })
    } else if (msg.method === 'Runtime.exceptionThrown') {
      logs.push({
        type: 'exception',
        text:
          msg.params.exceptionDetails?.exception?.description ||
          msg.params.exceptionDetails?.text ||
          '?',
      })
    }
  })
  await new Promise((r) => ws.on('open', r))
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const i = ++id
      pending.set(i, { resolve })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  const ev = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    return res?.result?.value
  }

  await send('Runtime.enable')
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  // Case 1: cold open dashboard (no auth)
  await send('Page.navigate', { url: `${BASE}/#/dashboard/analysis` })
  await new Promise((r) => setTimeout(r, 3500))
  const cold = await ev(`({
    hash: location.hash,
    text: (document.body.innerText||'').slice(0,180),
    htmlLen: document.body.innerHTML.length,
    appLen: (document.querySelector('#app')?.innerHTML||'').length,
    blank: !(document.body.innerText||'').trim()
  })`)
  console.log('COLD', JSON.stringify({ cold, errors: logs.filter(l=>l.type==='exception'||l.type==='error').slice(0,8) }, null, 2))

  // Case 2: login then go dashboard
  logs.length = 0
  await send('Page.navigate', { url: `${BASE}/#/login` })
  await new Promise((r) => setTimeout(r, 2500))
  await ev(`(() => {
    const inputs = [...document.querySelectorAll('input')];
    const user = inputs.find(i => i.type==='text' || !i.type) || inputs[0];
    const pass = inputs.find(i => i.type==='password');
    if (user) { user.value='admin'; user.dispatchEvent(new Event('input',{bubbles:true})); }
    if (pass) { pass.value='123456'; pass.dispatchEvent(new Event('input',{bubbles:true})); }
    const btn = [...document.querySelectorAll('button')].find(b => /登录/.test(b.textContent||''));
    btn && btn.click();
    return true;
  })()`)
  await new Promise((r) => setTimeout(r, 4000))
  const afterLogin = await ev(`({
    hash: location.hash,
    text: (document.body.innerText||'').slice(0,180),
    htmlLen: document.body.innerHTML.length,
    blank: !(document.body.innerText||'').trim()
  })`)
  console.log('AFTER_LOGIN', JSON.stringify({ afterLogin, errors: logs.filter(l=>l.type==='exception'||l.type==='error').slice(0,8) }, null, 2))

  // Case 3: hard reload (persist session)
  logs.length = 0
  await send('Page.reload', { ignoreCache: true })
  await new Promise((r) => setTimeout(r, 4500))
  const afterReload = await ev(`({
    hash: location.hash,
    text: (document.body.innerText||'').slice(0,200),
    htmlLen: document.body.innerHTML.length,
    appLen: (document.querySelector('#app')?.innerHTML||'').length,
    blank: !(document.body.innerText||'').trim(),
    matched: (window.__vue_router_matched || null)
  })`)
  const state = await ev(`(() => {
    try {
      const keys = Object.keys(localStorage);
      const pinia = {};
      for (const k of keys) {
        if (/user|permission|app|pwms/i.test(k)) pinia[k] = (localStorage.getItem(k)||'').slice(0,300);
      }
      return { keys, pinia, routeNames: (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ ? 'devtools' : 'none') };
    } catch (e) { return { err: String(e) }; }
  })()`)
  console.log('AFTER_RELOAD', JSON.stringify({ afterReload, state, errors: logs.filter(l=>l.type==='exception'||l.type==='error'||l.type==='warning').slice(0,15) }, null, 2))
  ws.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
