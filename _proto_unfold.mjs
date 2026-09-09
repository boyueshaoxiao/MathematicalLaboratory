// 原型：验证"绕公共棱"铰链折叠算法（正方体十字展开）
import * as THREE from 'three'

const CUBE_FACES = [
  // 0:+z, 1:-z, 2:+x, 3:-x, 4:+y, 5:-y （顶点顺序保证外法线）
  { pts: [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]] },
  { pts: [[-1,1,-1],[1,1,-1],[1,-1,-1],[-1,-1,-1]] },
  { pts: [[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]] },
  { pts: [[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]] },
  { pts: [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]] },
  { pts: [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]] }
]
// 十字展开①：root=2(+x)，行 -x,-y,+x,+y，盖 +z/-z 接 root
const CROSS_A = { root: 2, tree: [[2,5],[2,4],[2,0],[2,1],[5,3]] }
const CROSS_B = { root: 2, tree: [[2,5],[2,4],[2,0],[2,1],[4,3]] }
const STRIP   = { root: 2, tree: [[2,5],[5,3],[3,4],[2,0],[3,1]] }

const V = a => new THREE.Vector3(a[0], a[1], a[2])

function faceCenter(pts) {
  const c = new THREE.Vector3()
  pts.forEach(p => c.add(V(p)))
  return c.divideScalar(pts.length)
}
function faceNormal(pts) {
  const a = V(pts[0]), b = V(pts[1]), c = V(pts[2])
  const n = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize()
  // 让法线指向体外（用面心 - 体心）
  return n
}
function bodyCenter(faces) {
  const c = new THREE.Vector3()
  faces.forEach(f => c.add(faceCenter(f.pts)))
  return c.divideScalar(faces.length)
}

function rigidToRoot(faces, rootIdx) {
  const bc = bodyCenter(faces)
  const fc = faceCenter(faces[rootIdx].pts)
  const n = faceNormal(faces[rootIdx].pts)
  if (n.dot(fc.clone().sub(bc)) < 0) throw new Error('root face normal inward')
  const q = new THREE.Quaternion().setFromUnitVectors(n.clone().normalize(), new THREE.Vector3(0,0,1))
  // scale: 让边长归一化（cube 半边长 1，目标显示 ~1.2）
  const scale = 1.1
  const out = faces.map(f => ({ pts: f.pts.map(p => {
    const v = V(p).sub(fc).applyQuaternion(q).multiplyScalar(scale)
    return [v.x, v.y, v.z]
  }) }))
  return out
}

// 求两个面板的公共棱（两个点）
function sharedEdge(aPts, bPts) {
  const shared = []
  aPts.forEach(pa => {
    const idx = bPts.findIndex(pb => pb[0]===pa[0]&&pb[1]===pa[1]&&pb[2]===pa[2])
    if (idx >= 0) shared.push(pa)
  })
  if (shared.length < 2) throw new Error('tree edge not adjacent faces: shared=' + shared.length)
  return [V(shared[0]), V(shared[1])]
}

// 绕 x 轴的 signed angle（把向量 from 转到 to，在 yz 平面）
function signedAngleX(from, to) {
  const a = new THREE.Vector3(from.x, from.y, from.z)
  const b = new THREE.Vector3(to.x, to.y, to.z)
  // 绕 x 旋转在 yz 平面：θ = atan2(a.y*b.z - a.z*b.y, a.y*b.y + a.z*b.z)
  return Math.atan2(a.y*b.z - a.z*b.y, a.y*b.y + a.z*b.z)
}

export function buildHingeModel(faces3D, pattern) {
  // 1) rigid 到 root 面 z=0
  const faces = rigidToRoot(faces3D, pattern.root)
  // 2) 建树：parent -> children
  const children = {}
  pattern.tree.forEach(([p, c]) => {
    if (children[p] === undefined) children[p] = []
    children[p].push(c)
  })
  // 3) 装配 Group 树
  const world = new THREE.Group()
  // 存储每个 hinge 的 pivot 及展开角
  const hinges = [] // {pivot, theta}
  const panels = [] // {mesh, faceIdx, matLocal(color later)}

  // local 化函数：把 rigid world 点/方向转到当前容器局部系
  function assemble(faceIdx, container, toPt, toDir, visited) {
    visited.add(faceIdx)
    // 面板 mesh：顶点 = toPt(p)
    const pts = faces[faceIdx].pts.map(p => toPt(V(p)))
    const geo = new THREE.BufferGeometry()
    const arr = []
    // 简单 fan triangulation（凸多边形）
    for (let i = 1; i < pts.length - 1; i++) {
      arr.push(...pts[0].toArray(), ...pts[i].toArray(), ...pts[i+1].toArray())
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
    container.add(mesh)
    panels.push({ mesh, faceIdx })

    for (const childIdx of (children[faceIdx] || [])) {
      if (visited.has(childIdx)) continue
      // hinge：公共棱
      const [a, b] = sharedEdge(faces[faceIdx].pts, faces[childIdx].pts)
      const aL = toPt(a), bL = toPt(b)
      const midL = aL.clone().add(bL).multiplyScalar(0.5)
      const dL = bL.clone().sub(aL).normalize()
      // 面板法线（rigid world），转到当前容器
      const nParentL = toDir(faceNormal(faces[faceIdx].pts))
      const nChildL  = toDir(faceNormal(faces[childIdx].pts))
      // pivot 两层：base 静态（position=mid + quaternion 使 local x -> dL），rot 只绕 x 动
      const pivotBase = new THREE.Group()
      pivotBase.userData.tag = `pb${faceIdx}-${childIdx}`
      pivotBase.position.copy(midL)
      pivotBase.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0), dL)
      const pivotRot = new THREE.Group()
      pivotRot.userData.tag = `pr${faceIdx}-${childIdx}`
      container.add(pivotBase)
      pivotBase.add(pivotRot)
      const childContainer = new THREE.Group()
      childContainer.userData.tag = `cc${faceIdx}-${childIdx}`
      pivotRot.add(childContainer)
      // 下一层坐标换算（相对 pivotBase 系）
      const qInv = pivotBase.quaternion.clone().invert()
      const childToPt = v => v.clone().sub(midL).applyQuaternion(qInv)
      const childToDir = v => v.clone().applyQuaternion(qInv)
      // 展开目标：child 法线 -> parent 法线（都换算到 pivot 系）
      const ncPivot = childToDir(nChildL)
      const npPivot = childToDir(nParentL)
      // theta：绕 pivot local x 从 child 法线转到 parent 法线
      let theta = signedAngleX(ncPivot, npPivot)
      // 方向校验：转 theta 后 child 法线应与 parent 法线同向（共面同侧）
      const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0), theta)
      const ncAfter = ncPivot.clone().applyQuaternion(rot)
      if (ncAfter.dot(npPivot) < 0) {
        theta = theta > 0 ? theta - Math.PI : theta + Math.PI
      }
      hinges.push({ pivot: pivotRot, theta, parent: faceIdx, child: childIdx })
      if (process.env.DEBUG) {
        const deg = t => +(t * 180 / Math.PI).toFixed(1)
        console.log(`  hinge ${faceIdx}->${childIdx}: dL=(${dL.x.toFixed(2)},${dL.y.toFixed(2)},${dL.z.toFixed(2)}) nc=(${ncPivot.x.toFixed(2)},${ncPivot.y.toFixed(2)},${ncPivot.z.toFixed(2)}) np=(${npPivot.x.toFixed(2)},${npPivot.y.toFixed(2)},${npPivot.z.toFixed(2)}) theta=${deg(theta)}`)
      }
      assemble(childIdx, childContainer, childToPt, childToDir, visited)
    }
  }

  const rootToPt = v => v.clone()
  const rootToDir = v => v.clone()
  assemble(pattern.root, world, rootToPt, rootToDir, new Set())
  return { world, hinges, panels, faces }
}

// ===== 验证 =====
const faces3D = CUBE_FACES.map(f => ({ pts: f.pts.map(p => [p[0],p[1],p[2]]) }))

for (const [name, pattern] of [['crossA', CROSS_A], ['crossB', CROSS_B], ['strip', STRIP]]) {
  const model = buildHingeModel(faces3D, pattern)
  // 零态（θ=0）应还原为 rigid 后的立体（rigid root 面 z=0）
  model.world.updateMatrixWorld(true)
  const rigid = rigidToRoot(faces3D, pattern.root)
  const c0 = faceCenter(rigid[0].pts)
  let zeroOk = true
  model.panels.forEach(pan => {
    const pos = pan.mesh.geometry.attributes.position
    const v = new THREE.Vector3()
    // 该面板中心（局部）转世界
    v.fromBufferAttribute(pos, 0)
    // 取面板原 rigid 中心比较
    const rc = faceCenter(rigid[pan.faceIdx].pts)
    // mesh 顶点(0) 是世界 rigid 顶点(0)（零态恒等），但装配时 child 顶点做了 q^-1(v-mid)。
    // 直接比较：局部(0)转世界 == rigid pts[0]？
    v.transformDirection? null : null
  })
  // 简化零态检查：计算所有面板局部顶点转世界，与 rigid 顶点集合匹配
  const worldPts = []
  model.panels.forEach(pan => {
    const attr = pan.mesh.geometry.attributes.position
    for (let i = 0; i < attr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(attr, i).applyMatrix4(pan.mesh.matrixWorld)
      worldPts.push([+v.x.toFixed(6), +v.y.toFixed(6), +v.z.toFixed(6)])
    }
  })
  const rigidPts = rigid.flatMap(f => f.pts.map(p => [p[0], p[1], p[2]]).map(p => [+(+p[0].toFixed(6)), +(+p[1].toFixed(6)), +(+p[2].toFixed(6))]))
  const key = p => p.join(',')
  const sR = new Set(rigidPts.map(key))
  const allIn = worldPts.every(p => sR.has(key(p)))
  // 展开态：暴力搜索每 hinge 的 ±θ 符号，使所有面板落回 z≈0 平面且不重叠
  const hingeCount = model.hinges.length
  let best = null
  for (let mask = 0; mask < (1 << hingeCount); mask++) {
    model.hinges.forEach((h, i) => {
      const ang = (mask & (1 << i)) ? h.theta : -h.theta
      h.pivot.rotation.set(ang, 0, 0)
    })
    model.world.updateMatrixWorld(true)
    // 面板中心（world）与法线
    const info = model.panels.map(pan => {
      const attr = pan.mesh.geometry.attributes.position
      const c = new THREE.Vector3()
      const p0 = new THREE.Vector3().fromBufferAttribute(attr, 0).applyMatrix4(pan.mesh.matrixWorld)
      const p1 = new THREE.Vector3().fromBufferAttribute(attr, 1).applyMatrix4(pan.mesh.matrixWorld)
      const p2 = new THREE.Vector3().fromBufferAttribute(attr, 2).applyMatrix4(pan.mesh.matrixWorld)
      const n = new THREE.Vector3().crossVectors(p1.clone().sub(p0), p2.clone().sub(p0)).normalize()
      for (let i = 0; i < attr.count; i++) c.add(new THREE.Vector3().fromBufferAttribute(attr, i).applyMatrix4(pan.mesh.matrixWorld))
      c.divideScalar(attr.count)
      return { faceIdx: pan.faceIdx, c, n }
    })
    const keyOf = c => c.x.toFixed(2) + ',' + c.y.toFixed(2) + ',' + c.z.toFixed(2)
    const uniqueCnt = new Set(info.map(o => keyOf(o.c))).size
    const zErr = Math.max(...info.map(o => Math.abs(o.c.z)))
    const flipErr = info.map(o => Math.min(o.n.z, -o.n.z) * -1) // 法线同向则 |n.z| 接近 1
    const normalBad = info.reduce((s, o) => s + (1 - Math.abs(o.n.z)), 0)
    const overlap = info.length - uniqueCnt
    if (best === null || (zErr < best.zErr) || (Math.abs(zErr - best.zErr) < 1e-6 && normalBad < best.normalBad)) {
      best = { mask, zErr, normalBad, overlap, info }
    }
  }
  // 应用最优组合
  model.hinges.forEach((h, i) => {
    const ang = (best.mask & (1 << i)) ? h.theta : -h.theta
    h.pivot.rotation.set(ang, 0, 0)
  })
  model.world.updateMatrixWorld(true)
  console.log(`[${name}] 零态一致=${allIn} | 展开最优符号组合 mask=${best.mask} zErr=${best.zErr.toFixed(3)} 法线误差=${best.normalBad.toFixed(3)} 中心重叠=${best.overlap}`)
  if (process.env.DEBUG) model.hinges.forEach(h => {
    const wp = h.pivot.getWorldPosition(new THREE.Vector3())
    const axis = new THREE.Vector3(1,0,0).applyQuaternion(h.pivot.getWorldQuaternion(new THREE.Quaternion()))
    console.log(`    hinge ${h.parent}->${h.child} pivot=(${wp.x.toFixed(2)},${wp.y.toFixed(2)},${wp.z.toFixed(2)}) worldAxis=(${axis.x.toFixed(2)},${axis.y.toFixed(2)},${axis.z.toFixed(2)})`)
    if (h.parent === 5) {
      // 打印 face3 mesh 世界旋转列
      const pan3 = model.panels.find(p => p.faceIdx === 3)
      const e = new THREE.Matrix4()
      pan3.mesh.updateWorldMatrix(true, false)
      e.copy(pan3.mesh.matrixWorld)
      console.log(`      face3.matrixWorld=`, e.elements.map(v=>+v.toFixed(2)).join(','))
    }
  })
  best.info.forEach(o => console.log(`    face${o.faceIdx} center=(${o.c.x.toFixed(2)},${o.c.y.toFixed(2)},${o.c.z.toFixed(2)}) normal=(${o.n.x.toFixed(2)},${o.n.y.toFixed(2)},${o.n.z.toFixed(2)})`))
}
