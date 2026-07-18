import WebSocket from 'ws'

const DEBUG_PORT = Number(process.env.CDP_PORT || 9333)
const BASE = process.env.APP_BASE || 'http://localhost:4000'

async function main() {
  const list = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`).then((r) => r.json())
  const page = list.find((t) => t.type === 'page')
  if (!page) throw new Error('No page target')
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
      const msgId = ++id
      pending.set(msgId, { resolve })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })
  const evaluate = async (expression) => {
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
  await send('Page.navigate', { url: `${BASE}/#/login` })
  await new Promise((r) => setTimeout(r, 2500))
  await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('input')];
    const user = inputs.find((i) => i.type === 'text' || !i.type) || inputs[0];
    const pass = inputs.find((i) => i.type === 'password');
    if (user) {
      user.value = 'admin';
      user.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (pass) {
      pass.value = '123456';
      pass.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const btn = [...document.querySelectorAll('button')].find((b) =>
      /登录/.test(b.textContent || '')
    );
    btn && btn.click();
    return true;
  })()`)
  await new Promise((r) => setTimeout(r, 3500))
  logs.length = 0
  await send('Page.navigate', { url: `${BASE}/#/system/org` })
  await new Promise((r) => setTimeout(r, 4000))

  const contrast = await evaluate(`(() => {
    function lum(r, g, b) {
      const a = [r, g, b].map((v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function parse(c) {
      const m = String(c).match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    }
    const bad = [];
    const nodes = [
      ...document.querySelectorAll(
        '.el-table td, .el-table th, .el-card, .el-form-item__label, h1, h2, h3, .el-button span, .el-menu-item, .v-logo, .tags-view'
      ),
    ].slice(0, 120);
    for (const el of nodes) {
      const s = getComputedStyle(el);
      const fg = parse(s.color);
      let bgEl = el;
      let bg = parse(s.backgroundColor);
      while (bgEl && (!bg || (s.backgroundColor || '').includes('0, 0, 0, 0'))) {
        bgEl = bgEl.parentElement;
        if (!bgEl) break;
        const bs = getComputedStyle(bgEl);
        bg = parse(bs.backgroundColor);
        if (bg && !(bs.backgroundColor || '').includes('0, 0, 0, 0')) break;
      }
      if (!fg || !bg) continue;
      const L1 = lum(...fg);
      const L2 = lum(...bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      if (ratio < 2.8 && el.offsetWidth > 10 && el.offsetHeight > 8) {
        bad.push({
          tag: el.tagName,
          cls: (el.className || '').toString().slice(0, 70),
          ratio: +ratio.toFixed(2),
          color: s.color,
          bg: bgEl ? getComputedStyle(bgEl).backgroundColor : s.backgroundColor,
          text: (el.innerText || '').slice(0, 36),
        });
      }
    }
    const menuItems = [...document.querySelectorAll('.el-menu-item, .el-sub-menu__title')]
      .slice(0, 8)
      .map((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          text: (el.innerText || '').slice(0, 24),
          color: s.color,
          w: Math.round(r.width),
          h: Math.round(r.height),
          visible: s.visibility,
          opacity: s.opacity,
        };
      });
    return {
      bad: bad.slice(0, 20),
      menuItems,
      htmlDark: document.documentElement.classList.contains('dark'),
      sidebarW: (() => {
        const el = document.querySelector('.layout-border__right') || document.querySelector('[class*=\"left-menu\"]');
        return el ? Math.round(el.getBoundingClientRect().width) : 0;
      })(),
      bodySnippet: (document.body.innerText || '').slice(0, 180),
    };
  })()`)

  const warns = logs.filter(
    (l) => l.type === 'warning' || l.type === 'error' || l.type === 'exception'
  )
  const uniq = [...new Map(warns.map((w) => [w.text.slice(0, 120), w])).values()]
  console.log(
    JSON.stringify(
      {
        warnCount: warns.length,
        uniqueWarns: uniq.slice(0, 20),
        contrast,
      },
      null,
      2
    )
  )
  ws.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
