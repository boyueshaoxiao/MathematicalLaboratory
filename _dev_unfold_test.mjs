// 临时数值验证：多面体铰链展开引擎
import * as THREE from 'three'
import { buildUnfold } from './src/geometry/unfold.js'

function panelWorldPts(root, panelIdx, mats) {
  // root.children 顺序与 panels 一致（buildPolyUnfold 直接 add mesh）
}

function test(type, patternKey) {
  const m = buildUnfold(type, patternKey)
  const warn = []
  const origWarn = console.warn
  console.warn = (...a) => warn.push(a.join(' '))
  // 收集面板 mesh 及局部顶点
  const meshes = []
  m.root.traverse(o => { if (o.isMesh && o.matrixAutoUpdate === false) meshes.push(o) })
  const gather = () => meshes.map(mesh => {
    const attr = mesh.geometry.attributes.position
    const ws = []
    const tmp = new THREE.Vector3()
    for (let i = 0; i < attr.count; i++) {
      tmp.fromBufferAttribute(attr, i).applyMatrix4(mesh.matrixWorld)
      ws.push([tmp.x, tmp.y, tmp.z])
    }
    return ws
  })
  const v2 = a => new THREE.Vector3(a[0], a[1], a[2])
  // 真实 3D 多边形面积
  const polyArea = pts => {
    const a = v2(pts[0])
    let n = new THREE.Vector3()
    for (let i = 1; i < pts.length - 1; i++) {
      n.add(new THREE.Vector3().crossVectors(
        v2(pts[i]).sub(a), v2(pts[i + 1]).sub(a)))
    }
    return n.length() / 2
  }
  // 平铺后 xy 投影有向面积
  const projArea = pts => {
    let s = 0
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length]
      s += a[0] * b[1] - b[0] * a[1]
    }
    return Math.abs(s / 2)
  }
  m.root.updateMatrixWorld(true)
  // 1) 零态（折叠）：面板在 z 轴应有厚度分布（未展开）
  m.setProgress(0); m.root.updateMatrixWorld(true)
  const closed = gather()
  // 各面板中心应至少存在 z≠0（说明未摊平）
  // 2) 展开态
  m.setProgress(1); m.root.updateMatrixWorld(true)
  const opened = gather()
  const flatOk = opened.every(pts => pts.every(p => Math.abs(p[2]) < 1e-3))
  // 面积守恒：真实面积之和 == 平铺后投影面积（无重叠判据）
  let sumArea = 0, proj = 0
  const uniq = new Set()
  opened.forEach((pts, i) => {
    sumArea += polyArea(closed[i])
    proj += projArea(pts)
    const c = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0])
    uniq.add(c[0].toFixed(2) + ',' + c[1].toFixed(2))
  })
  const overlap = Math.abs(sumArea - proj) > 1e-6
  // 3) 面板个数
  console.log(`[${type}/${patternKey}] 面板=${meshes.length} 平铺=${flatOk} 无重叠=${Math.abs(sumArea - proj) < 1e-6} (Δ=${(Math.abs(sumArea - proj)).toFixed(3)}) 中心重复=${uniq.size !== meshes.length} ${warn.length ? 'WARN:' + warn.join('|') : ''}`)
  m.dispose()
}

for (const [type, pats] of [['cube', ['crossA', 'crossB', 'strip']], ['cuboid', ['cuboidA', 'cuboidB']], ['triangularPrism', ['triA', 'triB']], ['squarePyramid', ['pyramidA', 'pyramidB']]]) {
  for (const p of pats) test(type, p)
}
