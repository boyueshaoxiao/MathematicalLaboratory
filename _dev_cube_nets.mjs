// 11 种正方体展开图：枚举+去重 → 用引擎展开到平面取格点坐标
// 输出 1) PATTERNS 字面量  2) src/data/cubeQuizNets.js（11 有效 + 24 无效六连方）
import { PATTERNS, buildPolyData, buildUnfold } from './src/geometry/unfold.js'
import { writeFileSync } from 'node:fs'
import * as THREE from 'three'

const { corners, faces } = buildPolyData('cube')
const FACES = faces.map(f => f.idx.slice())
const CV = corners.map(c => new THREE.Vector3(c[0], c[1], c[2]))
const FC = FACES.map((f, i) => {
  const v = new THREE.Vector3()
  f.forEach(ci => v.add(CV[ci]))
  return v.divideScalar(f.length)
})

const ADJ = Array.from({ length: 6 }, () => [])
for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
  if (FACES[i].filter(c => FACES[j].includes(c)).length === 2) { ADJ[i].push(j); ADJ[j].push(i) }
}

function permArr(arr) {
  if (arr.length <= 1) return [arr]
  const out = []
  for (let i = 0; i < arr.length; i++)
    for (const r of permArr(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([arr[i], ...r])
  return out
}
const AUTOS = new Set()
for (const p of permArr([0, 1, 2])) {
  for (let m = 0; m < 8; m++) {
    const s = [m & 1 ? -1 : 1, m & 2 ? -1 : 1, m & 4 ? -1 : 1]
    const map = FACES.map(face => {
      const set = face.map(ci => {
        const v = [0, 0, 0]
        p.forEach((src, dst) => { v[dst] = s[dst] * corners[ci][src] })
        return v.join(',')
      }).sort().join('|')
      for (let i = 0; i < 6; i++) {
        if (FACES[i].map(ci => corners[ci].join(',')).sort().join('|') === set) return i
      }
      return -1
    })
    if (!map.includes(-1)) AUTOS.add(JSON.stringify(map))
  }
}
function canonTree(tree) {
  const s = tree.map(e => e.slice().sort((a, b) => a - b).join(','))
  let best = null
  for (const raw of AUTOS) {
    const a = JSON.parse(raw)
    const m = s.map(e => {
      const [x, y] = e.split(',').map(Number)
      return [a[x], a[y]].sort((u, v) => u - v).join(',')
    }).sort().join('|')
    if (best === null || m < best) best = m
  }
  return best
}

const edgeList = []
for (let i = 0; i < 6; i++) for (const j of ADJ[i]) if (i < j) edgeList.push([i, j])
const trees = []
;(function dfs(start, chosen) {
  if (chosen.length === 5) {
    const adjT = Array.from({ length: 6 }, () => [])
    chosen.forEach(([a, b]) => { adjT[a].push(b); adjT[b].push(a) })
    const seen = new Set([chosen[0][0]]); const q = [chosen[0][0]]
    while (q.length) { const v = q.pop(); for (const w of adjT[v]) if (!seen.has(w)) { seen.add(w); q.push(w) } }
    if (seen.size === 6) trees.push(chosen.slice())
    return
  }
  for (let e = start; e < edgeList.length; e++) { chosen.push(edgeList[e]); dfs(e + 1, chosen); chosen.pop() }
})(0, [])

const EXISTING = {}
for (const k of Object.keys(PATTERNS.cube)) EXISTING[k] = PATTERNS.cube[k].tree.map(([a, b]) => [a, b])
const existCanon = {}
for (const k of Object.keys(EXISTING)) existCanon[k] = canonTree(EXISTING[k])

const groups = new Map()
for (const t of trees) { const k = canonTree(t); if (!groups.has(k)) groups.set(k, t) }
console.log('spanning trees =', trees.length, ' unique nets =', groups.size)

function orient(root, tree) {
  const adjT = {}
  tree.forEach(([a, b]) => { (adjT[a] ||= []).push(b); (adjT[b] ||= []).push(a) })
  const edges = []
  const seen = new Set([root]); const q = [root]
  while (q.length) {
    const p = q.shift()
    for (const c of (adjT[p] || [])) if (!seen.has(c)) { seen.add(c); edges.push([p, c]); q.push(c) }
  }
  return edges
}
function chooseRoot(tree) {
  const deg = {}
  tree.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1 })
  let best = 0, bd = -1
  for (let i = 0; i < 6; i++) if ((deg[i] || 0) > bd) { bd = deg[i] || 0; best = i }
  return best
}

// 用引擎把展开图铺平，再由面中心投影取格点（网格间距 = 正方体棱长 2.3）
function engineCells(root, tree) {
  const tmp = '__tmp_cells'
  PATTERNS.cube[tmp] = { root, tree }
  const m = buildUnfold('cube', tmp)
  m.setProgress(1)
  m.root.updateMatrixWorld(true)
  const centers = m.faceMeta.map((meta, i) =>
    new THREE.Vector3(meta.center.x, meta.center.y, meta.center.z).applyMatrix4(m.panelMeshes[i].matrixWorld))
  delete PATTERNS.cube[tmp]
  m.dispose()
  const pos = { [root]: [0, 0] }
  const childOf = {}
  tree.forEach(([p, c]) => { (childOf[p] ||= []).push(c) })
  const q = [root]
  while (q.length) {
    const p = q.shift()
    for (const c of (childOf[p] || [])) {
      const dx = Math.round((centers[c].x - centers[p].x) / 2.3)
      const dy = Math.round((centers[c].y - centers[p].y) / 2.3)
      pos[c] = [pos[p][0] + dx, pos[p][1] + dy]
      q.push(c)
    }
  }
  return pos
}

// 2D 规范键
const TF = []
for (let r = 0; r < 4; r++) {
  const fn = r === 0 ? c => [c[0], c[1]] : r === 1 ? c => [-c[1], c[0]] : r === 2 ? c => [-c[0], -c[1]] : c => [c[1], -c[0]]
  TF.push(fn)
}
for (let r = 0; r < 4; r++) {
  const f = TF[r]
  TF.push(c => { const [x, y] = f(c); return [x, -y] })
}
function canon2D(cells) {
  let best = null
  for (const f of TF) {
    const t = cells.map(f)
    const minx = Math.min(...t.map(c => c[0])), miny = Math.min(...t.map(c => c[1]))
    const str = t.map(c => [c[0] - minx, c[1] - miny].join(',')).sort().join('|')
    if (best === null || str < best) best = str
  }
  return best
}
function norm2D(cells) {
  let best = null
  for (const f of TF) {
    const t = cells.map(f)
    const minx = Math.min(...t.map(c => c[0])), miny = Math.min(...t.map(c => c[1]))
    const arr = t.map(c => [c[0] - minx, c[1] - miny]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const str = JSON.stringify(arr)
    if (best === null || str < best) best = { arr, str }
  }
  return best.arr
}

const nets = []
for (const [canon, tree] of groups) {
  const existing = Object.entries(existCanon).find(([, c]) => c === canon)
  if (existing) {
    const [key] = existing
    nets.push({ kind: 'existing', key, root: PATTERNS.cube[key].root, tree: PATTERNS.cube[key].tree.slice(), canon })
    continue
  }
  const root = chooseRoot(tree)
  nets.push({ kind: 'new', key: null, root, tree: orient(root, tree), canon })
}
nets.sort((a, b) => (a.canon < b.canon ? -1 : 1))
let num = 0
for (const net of nets) if (net.kind === 'new') net.key = 'cubeNet' + (++num)

function describe(net) {
  const pos = engineCells(net.root, net.tree)
  const cells = Object.values(pos)
  if (cells.length !== 6 || new Set(cells.map(c => c.join(','))).size !== 6) throw new Error('cells 异常 ' + net.key)
  const byRow = {}
  cells.forEach(([x, y]) => { (byRow[y] ||= []).push(x) })
  const rowPat = Object.values(byRow).map(r => r.length).sort((a, b) => b - a).join('-')
  const minx = Math.min(...cells.map(c => c[0])), maxx = Math.max(...cells.map(c => c[0]))
  const miny = Math.min(...cells.map(c => c[1])), maxy = Math.max(...cells.map(c => c[1]))
  const ascii = []
  for (let yy = maxy; yy >= miny; yy--) {
    let row = ''
    for (let xx = minx; xx <= maxx; xx++) row += cells.some(c => c[0] === xx && c[1] === yy) ? '██' : '··'
    ascii.push(row)
  }
  return { cells: norm2D(cells), rowPat, ascii, raw: cells }
}

// 展开平铺自检（z 偏差）
function flatZ(net) {
  const tmp = '__tmp_z'
  PATTERNS.cube[tmp] = { root: net.root, tree: net.tree }
  const m = buildUnfold('cube', tmp)
  m.setProgress(1)
  m.root.updateMatrixWorld(true)
  let z = 0
  m.panelMeshes.forEach(mesh => {
    const pos = mesh.geometry.attributes.position
    const v = new THREE.Vector3()
    for (let k = 0; k < pos.count; k++) { v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld); z = Math.max(z, Math.abs(v.z)) }
  })
  delete PATTERNS.cube[tmp]
  m.dispose()
  return z
}

console.log('== 11 种展开图 ==')
for (const net of nets) {
  const d = describe(net)
  const z = flatZ(net)
  console.log(`\n${net.key} ${net.kind} row=${d.rowPat} z=${z.toExponential(2)} tree=${JSON.stringify(net.tree)}`)
  d.ascii.forEach(g => console.log('   ' + g))
}

// 全部自由六连方
const allHex = []
{
  const queue = [{ cells: [[0, 0]] }]
  const seenSets = new Set()
  while (queue.length) {
    const { cells } = queue.shift()
    const k = canon2D(cells)
    if (seenSets.has(k)) continue
    seenSets.add(k)
    if (cells.length === 6) { allHex.push(cells.slice()); continue }
    const set = new Set(cells.map(c => c.join(',')))
    const tried = new Set()
    for (const c of cells) {
      for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = c[0] + d[0], ny = c[1] + d[1]
        if (set.has(nx + ',' + ny) || tried.has(nx + ',' + ny)) continue
        tried.add(nx + ',' + ny)
        queue.push({ cells: cells.concat([[nx, ny]]) })
      }
    }
  }
}
console.log('自由六连方 =', allHex.length, '(应为 35)')

const validKeys = new Set()
for (const net of nets) validKeys.add(canon2D(describe(net).raw))
const invalid = allHex.filter(c => !validKeys.has(canon2D(c)))
console.log('有效 =', validKeys.size, ' 无效 =', invalid.length, '(应为 11 / 24)')

const validRows = []
for (const net of nets) {
  const raw = Object.values(engineCells(net.root, net.tree))
  const byRow = {}
  raw.forEach(([x, y]) => { (byRow[y] ||= []).push(x) })
  const rowPat = Object.values(byRow).map(r => r.length).sort((a, b) => b - a).join('-')
  validRows.push(`  { key: '${net.key}', row: '${rowPat}', cells: ${JSON.stringify(norm2D(raw))} }`)
}
const invalidRows = invalid.map(cells => `  ${JSON.stringify(norm2D(cells))}`)
writeFileSync('src/data/cubeQuizNets.js',
`// 由 _dev_cube_nets.mjs 生成：11 种正方体展开图 + 24 个“非展开图”六连方（规范形网格坐标）
export const VALID_CUBE_NETS = [
${validRows.join(',\n')}
]

export const INVALID_HEXOMINOES = [
${invalidRows.join(',\n')}
]
`)
console.log('written src/data/cubeQuizNets.js')
