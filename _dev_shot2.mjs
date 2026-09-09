import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9338
mkdirSync('d:/github/geometry-space-lab-unfold-v2/_tmp_chromeX', { recursive: true })
const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT,
  '--user-data-dir=d:/github/geometry-space-lab-unfold-v2/_tmp_chromeX',
  '--window-size=1600,1250', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let t
for (let i = 0; i < 40 && !t; i++) { try { const l = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); t = l.find(x => x.type === 'page') } catch { } await sleep(250) }
const ws = new WebSocket(t.webSocketDebuggerUrl)
await new Promise(r => ws.onopen = r)
let id = 0; const pend = new Map()
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } }
const cdp = (method, params = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
await cdp('Page.enable')
await cdp('Page.navigate', { url: process.argv[2] })
await sleep(3800)
const shot = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
writeFileSync('d:/github/geometry-space-lab-unfold-v2/' + process.argv[3] + '.png', Buffer.from(shot.result.data, 'base64'))
console.log('ok')
ws.close(); proc.kill()
