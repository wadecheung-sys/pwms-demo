import WebSocket from 'ws'

const DEBUG_PORT = Number(process.env.CDP_PORT || 9445)
const BASE = 'http://localhost:4000'

async function main() {
  const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`).then((r) => r.json())
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg.result)
      pending.delete(msg.id)
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
  await send('Page.navigate', { url: `${BASE}/#/login` })
  await new Promise((r) => setTimeout(r, 2500))
  await ev(`(() => {
    const inputs = [...document.querySelectorAll('input')];
    const user = inputs.find((i) => i.type === 'text' || !i.type) || inputs[0];
    const pass = inputs.find((i) => i.type === 'password');
    if (user) { user.value = 'admin'; user.dispatchEvent(new Event('input', { bubbles: true })); }
    if (pass) { pass.value = '123456'; pass.dispatchEvent(new Event('input', { bubbles: true })); }
    const btn = [...document.querySelectorAll('button')].find((b) => /登录/.test(b.textContent || ''));
    btn && btn.click();
    return true;
  })()`)
  await new Promise((r) => setTimeout(r, 3500))
  const before = await ev(`(() => {
    const raw = localStorage.getItem('permission');
    const obj = raw ? JSON.parse(raw) : null;
    return {
      keys: obj ? Object.keys(obj) : [],
      isAddRouters: obj && obj.isAddRouters,
      addLen: obj && obj.addRouters && obj.addRouters.length,
      routersLen: obj && obj.routers && obj.routers.length,
      rawHead: (raw || '').slice(0, 500),
    };
  })()`)
  console.log('BEFORE_RELOAD', JSON.stringify(before, null, 2))
  await send('Page.reload', { ignoreCache: true })
  await new Promise((r) => setTimeout(r, 4000))
  const after = await ev(`(() => {
    const raw = localStorage.getItem('permission');
    const obj = raw ? JSON.parse(raw) : null;
    return {
      keys: obj ? Object.keys(obj) : [],
      isAddRouters: obj && obj.isAddRouters,
      blank: !(document.body.innerText || '').trim(),
      text: (document.body.innerText || '').slice(0, 100),
    };
  })()`)
  console.log('AFTER_RELOAD', JSON.stringify(after, null, 2))
  ws.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
