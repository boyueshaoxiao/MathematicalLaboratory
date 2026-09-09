// CDP 诊断：检查页面 DOM 布局、WebGL 上下文、console 错误
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
const URL = process.argv[2] || 'http://localhost:5174/?view=unfold&type=cube&pattern=crossB&p=1'

const tmp = 'd:/github/geometry-space-lab-unfold-v2/_tmp_chrome'
mkdirSync(tmp, { recursive: true })

const proc = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=' + PORT,
  '--user-data-dir=' + tmp, '--window-size=1500,940',
  '--enable-unsafe-swiftshader', '--use-angle=swiftshader',
  '--disable-gpu', 'about:blank'
], { stdio: 'ignore' })

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list')
      const list = await res.json()
      const page = list.find(t => t.type === 'page')
      if (page) return page
    } catch (e) { /* retry */ }
    await sleep(250)
  }
  throw new Error('no target')
}

const target = await getTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0
const pending = new Map()
const logs = []
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
  else if (msg.method === 'Runtime.consoleAPICalled') {
    logs.push('console: ' + msg.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300))
  } else if (msg.method === 'Log.entryAdded') {
    logs.push('log: ' + (msg.params.entry.text || '') + ' ' + (msg.params.entry.url || ''))
  } else if (msg.method === 'Runtime.exceptionThrown') {
    logs.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300))
  }
}
function cdp(method, params = {}) {
  return new Promise(resolve => {
    const mid = ++id
    pending.set(mid, resolve)
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
}
await cdp('Runtime.enable')
await cdp('Log.enable')
await cdp('Page.enable')
await cdp('Page.navigate', { url: URL })
await sleep(4000)

const evalJs = async (expr) => {
  const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r.result?.result?.value
}

const info = await evalJs(`(function(){
  const c = document.querySelector('.unfold-viewer canvas');
  const u = document.querySelector('.unfold-viewer');
  const label = document.querySelector('.progress-label');
  const slider = document.querySelector('.progress');
  let gl = null;
  try { gl = !!c && !!(c.getContext('webgl2') || c.getContext('webgl')); } catch(e) { gl = 'err:'+e.message; }
  return {
    ready: document.readyState,
    canvas: c ? { w: c.width, h: c.height, cw: c.clientWidth, ch: c.clientHeight } : null,
    viewer: u ? { cw: u.clientWidth, ch: u.clientHeight } : null,
    label: label ? label.textContent : null,
    slider: slider ? slider.value : null,
    gl
  };
})()`)
console.log('INFO', JSON.stringify(info, null, 1))
console.log('LOGS', logs.slice(0, 25).join('\n'))
ws.close()
proc.kill()
