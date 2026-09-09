// 展开图 → 可打印 SVG：把多面体完全展开态投影到平面，
// 输出包含面多边形、外轮廓实线、折叠棱虚线，并在每条外沿自动生成“粘贴边”（纸质模型折边）。
import * as THREE from 'three'

// 从面板 mesh 的世界坐标中取出外轮廓顶点环（三角扇按“已出现顶点”去重 → 凸多边形轮廓）
function ringOf(mesh) {
  const pos = mesh.geometry.attributes.position
  const v = new THREE.Vector3()
  const seen = new Set()
  const ring = []
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    const p = [v.x, v.y]
    const key = p[0].toFixed(3) + ',' + p[1].toFixed(3)
    if (seen.has(key)) continue
    seen.add(key)
    ring.push(p)
  }
  return ring
}

function ekey(a, b) {
  const r = p => [p[0].toFixed(3), p[1].toFixed(3)]
  const A = r(a).join(','), B = r(b).join(',')
  return A <= B ? A + '|' + B : B + '|' + A
}

function centroid(ring) {
  const c = [0, 0]
  ring.forEach(p => { c[0] += p[0]; c[1] += p[1] })
  return [c[0] / ring.length, c[1] / ring.length]
}

// 边中点指向多边形外侧的单位法向
function outwardNormal(a, b, c) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return null
  const nx = -dy / len, ny = dx / len
  const mx = (a[0] + b[0]) / 2 - c[0], my = (a[1] + b[1]) / 2 - c[1]
  return nx * mx + ny * my >= 0 ? [nx, ny] : [-nx, -ny]
}

// 展开态 → SVG 字符串
export function buildNetSVG(model) {
  model.setProgress(1)
  model.root.updateMatrixWorld(true)
  const panels = model.panelMeshes.map(ringOf)

  // 收集所有边：面板内出现 2 次的为共享边（折叠棱），出现 1 次的为外轮廓
  const counts = new Map()
  panels.forEach(ring => {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length]
      const k = ekey(a, b)
      counts.set(k, (counts.get(k) || 0) + 1)
    }
  })

  const tabPolys = [] // [a,b,right,left]
  const solidSegs = []
  panels.forEach(ring => {
    const c = centroid(ring)
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length]
      if (counts.get(ekey(a, b)) > 1) continue // 共享边 → 虚线
      solidSegs.push([a, b])
      const n = outwardNormal(a, b, c)
      if (!n) continue
      const dx = b[0] - a[0], dy = b[1] - a[1]
      const len = Math.hypot(dx, dy)
      const d0 = dx / len, d1 = dy / len
      const h = Math.max(0.5, len * 0.34)   // 粘贴边高度
      const inset = len * 0.16              // 两边内缩形成梯形
      const l = [a[0] + n[0] * h - d0 * inset, a[1] + n[1] * h - d1 * inset]
      const r = [b[0] + n[0] * h + d0 * inset, b[1] + n[1] * h + d1 * inset]
      tabPolys.push([a, b, r, l])
    }
  })

  // 汇总包围盒（含粘贴边）
  const min = [Infinity, Infinity], max = [-Infinity, -Infinity]
  const grow = (xs, ys) => {
    xs.forEach(x => { if (x < min[0]) min[0] = x; if (x > max[0]) max[0] = x })
    ys.forEach(y => { if (y < min[1]) min[1] = y; if (y > max[1]) max[1] = y })
  }
  panels.forEach(ring => grow(ring.map(p => p[0]), ring.map(p => p[1])))
  tabPolys.forEach(t => grow(t.map(p => p[0]), t.map(p => p[1])))
  const pad = 1.6
  const W = max[0] - min[0] + pad * 2
  const H = max[1] - min[1] + pad * 2

  // 世界坐标 (x,y) → svg 坐标（翻转 y 使展开图“头朝上”）
  const sx = p => (p[0] - min[0] + pad).toFixed(3)
  const sy = p => (max[1] - p[1] + pad).toFixed(3)
  const pp = p => sx(p) + ',' + sy(p)
  const seg = (a, b) => `${pp(a)} ${pp(b)}`

  const faceFill = (i) => {
    const palette = ['#e8f0fc', '#e0f4ee', '#ffe9d2', '#ece4ff', '#fde2e6', '#ddf2f4']
    return palette[i % palette.length]
  }

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}">`
  s += `<rect x="0" y="0" width="${W.toFixed(2)}" height="${H.toFixed(2)}" fill="#ffffff"/>`
  s += `<g stroke="#8aa0ba" stroke-width="0.07" stroke-linejoin="round">`
  panels.forEach((ring, i) => {
    s += `<polygon points="${ring.map(pp).join(' ')}" fill="${faceFill(i)}" stroke="none"/>`
  })
  s += `</g>`
  // 粘贴边
  s += `<g fill="#f2f6fb" stroke="#8aa0ba" stroke-width="0.1" stroke-linejoin="round">`
  tabPolys.forEach(t => {
    s += `<polygon points="${t.map(pp).join(' ')}"/>`
  })
  s += `</g>`
  // 外轮廓实线
  s += `<g stroke="#1d3352" stroke-width="0.16" fill="none" stroke-linejoin="round" stroke-linecap="round">`
  solidSegs.forEach(([a, b]) => {
    s += `<line x1="${sx(a)}" y1="${sy(a)}" x2="${sx(b)}" y2="${sy(b)}"/>`
  })
  s += `</g>`
  // 折叠棱虚线
  s += `<g stroke="#e0456b" stroke-width="0.16" fill="none" stroke-linecap="round" stroke-dasharray="0.42 0.3">`
  for (const [k, n] of counts) {
    if (n > 1) {
      const [ax, ay, bx, by] = k.split('|').flatMap(x => x.split(',').map(Number))
      s += `<line x1="${sx([ax, ay])}" y1="${sy([ax, ay])}" x2="${sx([bx, by])}" y2="${sy([bx, by])}"/>`
    }
  }
  s += `</g>`
  s += `</svg>`
  return { svg: s, width: W, height: H, panelCount: panels.length }
}
