import { PATTERNS, buildUnfold } from './src/geometry/unfold.js'
import * as THREE from 'three'
const TF = []
for (let r = 0; r < 4; r++) {
  TF.push(r === 0 ? c => [c[0], c[1]] : r === 1 ? c => [-c[1], c[0]] : r === 2 ? c => [-c[0], -c[1]] : c => [c[1], -c[0]])
}
for (let r = 0; r < 4; r++) { const f = TF[r]; TF.push(c => { const [x, y] = f(c); return [x, -y] }) }
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
const tmp = '__t'
PATTERNS.cube[tmp] = { root: 2, tree: [[2,5],[2,4],[2,0],[2,1],[5,3]] }
const m = buildUnfold('cube', tmp)
m.setProgress(1)
m.root.updateMatrixWorld(true)
const centers = m.faceMeta.map((meta, i) => new THREE.Vector3(meta.center.x, meta.center.y, meta.center.z).applyMatrix4(m.panelMeshes[i].matrixWorld))
const pos = { 2: [0, 0] }
const childOf = { 2: [5, 4, 0, 1], 5: [3] }
const q = [2]
while (q.length) {
  const p = q.shift()
  for (const c of (childOf[p] || [])) {
    pos[c] = [pos[p][0] + Math.round((centers[c].x - centers[p].x) / 2.3), pos[p][1] + Math.round((centers[c].y - centers[p].y) / 2.3)]
    q.push(c)
  }
}
console.log('pos', JSON.stringify(pos))
console.log('norm', JSON.stringify(norm2D(Object.values(pos))))
delete PATTERNS.cube[tmp]
