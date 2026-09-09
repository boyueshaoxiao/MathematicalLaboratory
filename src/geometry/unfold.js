// 展开图引擎：立体 ⇄ 平面展开图的真实铰链折叠
//
// 多面体（正方体/长方体/三棱柱/四棱锥）：
//   展开 = 每个面绕"与父面共享的棱"旋转一个二面角。
//   正运动学：α(t)=0 时为原始立体姿态；α(t)=开角时该面与其父面共面（平铺）。
//   每帧沿“根→本面”路径逐层应用铰链旋转得到世界矩阵。
//
// 圆柱/圆锥（曲面）：侧面网格顶点在“平面展开态 ⇄ 卷曲立体态”之间插值，
//   底面圆在“展开位置 ⇄ 立体端面”之间做位置/朝向插值。

import * as THREE from 'three'

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

export const FACE_COLORS = [0x5b8def, 0x55b99a, 0xffa24d, 0x9a7cff, 0xef6b7b, 0x4cb9c0]

function pt(corners, i) { return corners[i] }

function newellNormal(pts) {
  const n = new THREE.Vector3()
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length]
    n.x += (a[1] - b[1]) * (a[2] + b[2])
    n.y += (a[2] - b[2]) * (a[0] + b[0])
    n.z += (a[0] - b[0]) * (a[1] + b[1])
  }
  return n.normalize()
}

// 确保每个面按“外法线朝外”绕序，并记录面心与外法线
function normalizeOutward(corners, faces) {
  const bodyCenter = new THREE.Vector3()
  faces.forEach(f => {
    const c = new THREE.Vector3()
    f.idx.forEach(i => c.add(new THREE.Vector3(...pt(corners, i))))
    c.divideScalar(f.idx.length)
    f.center = c
    bodyCenter.add(c)
  })
  bodyCenter.divideScalar(faces.length)
  faces.forEach(f => {
    const pts = f.idx.map(i => pt(corners, i))
    const n = newellNormal(pts)
    if (n.dot(f.center.clone().sub(bodyCenter)) < 0) f.idx = f.idx.slice().reverse()
    const pts2 = f.idx.map(i => pt(corners, i))
    f.normal = newellNormal(pts2)
  })
}

// ---------------------------------------------------------------------------
// 多面体定义（corner 由各面共享引用，公共棱即可按“共同顶点”求取）
// ---------------------------------------------------------------------------

function boxData(hx, hy, hz) {
  const corners = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz],
    [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]
  ]
  // 0:+z  1:-z  2:+x  3:-x  4:+y  5:-y
  const faces = [
    { idx: [4, 5, 6, 7] }, { idx: [3, 2, 1, 0] }, { idx: [1, 2, 6, 5] },
    { idx: [0, 4, 7, 3] }, { idx: [7, 6, 2, 3] }, { idx: [0, 1, 5, 4] }
  ]
  normalizeOutward(corners, faces)
  return { corners, faces }
}

// 三棱柱：三角形截面位于 XY 平面、沿 Z 拉伸 L
function triPrismData(R, L) {
  const c = R * Math.cos(Math.PI / 6)
  const s = R * Math.sin(Math.PI / 6)
  const corners = [
    [0, R, -L / 2], [-c, -s, -L / 2], [c, -s, -L / 2],
    [0, R, L / 2], [-c, -s, L / 2], [c, -s, L / 2]
  ]
  // 0:下底三角  1:上底三角  2:侧面(t0-t1)  3:侧面(t1-t2)  4:侧面(t2-t0)
  const faces = [
    { idx: [0, 1, 2] }, { idx: [3, 5, 4] },
    { idx: [0, 1, 4, 3] }, { idx: [1, 2, 5, 4] }, { idx: [2, 0, 3, 5] }
  ]
  normalizeOutward(corners, faces)
  return { corners, faces }
}

// 四棱锥：底面在 y=0（XZ 平面）、顶点 +y
function pyramidData(halfBase, H) {
  const corners = [
    [-halfBase, 0, -halfBase], [halfBase, 0, -halfBase],
    [halfBase, 0, halfBase], [-halfBase, 0, halfBase],
    [0, H, 0]
  ]
  // 0:底面  1:前  2:右  3:后  4:左
  const faces = [
    { idx: [0, 1, 2, 3] }, { idx: [0, 1, 4] }, { idx: [1, 2, 4] },
    { idx: [2, 3, 4] }, { idx: [3, 0, 4] }
  ]
  normalizeOutward(corners, faces)
  return { corners, faces }
}

// 三棱锥（正三棱锥）：等边三角形底面在 y=0（XZ 平面、外接圆半径 R）、顶点 +y
function tetraData(R, H) {
  const corners = []
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 6 + (i * Math.PI * 2) / 3
    corners.push([R * Math.cos(a), 0, R * Math.sin(a)])
  }
  corners.push([0, H, 0])
  // 0:底面  1:侧面(底边 0-1)  2:侧面(底边 1-2)  3:侧面(底边 2-0)
  const faces = [
    { idx: [0, 1, 2] }, { idx: [0, 1, 3] }, { idx: [1, 2, 3] }, { idx: [2, 0, 3] }
  ]
  normalizeOutward(corners, faces)
  return { corners, faces }
}

// 正 n 棱柱：正 n 边形底面在 y=-L/2、上底面在 y=L/2，面序号 0=下底、1..n=侧面、n+1=上底
function nGonPrismData(n, R, L) {
  const corners = []
  for (let half = -1; half <= 1; half += 2) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n
      corners.push([R * Math.cos(a), (half * L) / 2, R * Math.sin(a)])
    }
  }
  const faces = []
  faces.push({ idx: Array.from({ length: n }, (_, i) => i) }) // 0 下底面
  for (let j = 0; j < n; j++) { // 1..n 侧面：下底棱 (j,j+1) 与上底棱 (n+j,n+j+1)
    const b0 = j, b1 = (j + 1) % n
    faces.push({ idx: [b0, b1, n + b1, n + b0] })
  }
  faces.push({ // n+1 上底面（反向绕序）
    idx: Array.from({ length: n }, (_, i) => 2 * n - 1 - i)
  })
  normalizeOutward(corners, faces)
  return { corners, faces }
}

// 正 n 棱锥：正 n 边形底面在 y=0、顶点 +y，面序号 0=底面、1..n=侧面
function nGonPyramidData(n, R, H) {
  const corners = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n
    corners.push([R * Math.cos(a), 0, R * Math.sin(a)])
  }
  corners.push([0, H, 0])
  const faces = [{ idx: Array.from({ length: n }, (_, i) => i) }]
  for (let j = 0; j < n; j++) {
    faces.push({ idx: [j, (j + 1) % n, n] })
  }
  normalizeOutward(corners, faces)
  return { corners, faces }
}

export function buildPolyData(type) {
  switch (type) {
    case 'cube': return boxData(1, 1, 1)
    case 'cuboid': return boxData(1, 1, 1.5)
    // 棱柱边长都取整数，方便小学生用整数做面积计算：
    // 三棱柱底面是边长 2 的等边三角形、棱长 3；
    // 五棱柱底面是边长 2 的正五边形（外接圆半径 ≈1.70）、棱长 3；
    // 六棱柱底面是边长 2 的正六边形（正六边形半径 = 边长 = 2）、棱长 3。
    case 'triangularPrism': return triPrismData(2 / Math.sqrt(3), 3)
    case 'pentagonalPrism': return nGonPrismData(5, 1 / Math.sin(Math.PI / 5), 3)
    case 'hexagonalPrism': return nGonPrismData(6, 2, 3)
    case 'triangularPyramid': return tetraData(1.35, 2.2)
    case 'squarePyramid': return pyramidData(1.3, 2.35)
    case 'pentagonalPyramid': return nGonPyramidData(5, 1.5, 2.0)
    case 'hexagonalPyramid': return nGonPyramidData(6, 1.6, 1.85)
    default: return boxData(1, 1, 1)
  }
}

// 每种图形 × 展开方式的铰链树 { root, tree:[[parent,child]...] }
export const PATTERNS = {
  // 正方体共 11 种本质不同展开图（枚举 384 棵生成树按 48 自同构去重后得到）
  cube: {
    crossA:   { root: 2, tree: [[2, 5], [2, 4], [2, 0], [2, 1], [5, 3]] },
    strip:    { root: 2, tree: [[2, 5], [5, 3], [3, 4], [2, 0], [3, 1]] },
    cubeNet1: { root: 0, tree: [[0, 2], [0, 3], [0, 4], [2, 1], [2, 5]] },
    cubeNet2: { root: 0, tree: [[0, 2], [0, 3], [0, 4], [2, 1], [3, 5]] },
    cubeNet3: { root: 0, tree: [[0, 2], [0, 3], [0, 4], [4, 1], [1, 5]] },
    cubeNet4: { root: 0, tree: [[0, 2], [0, 3], [0, 4], [2, 5], [4, 1]] },
    cubeNet5: { root: 0, tree: [[0, 2], [0, 3], [0, 4], [2, 5], [5, 1]] },
    cubeNet6: { root: 0, tree: [[0, 2], [0, 3], [2, 1], [3, 5], [1, 4]] },
    cubeNet7: { root: 0, tree: [[0, 2], [0, 3], [2, 4], [4, 1], [1, 5]] },
    cubeNet8: { root: 0, tree: [[0, 2], [0, 3], [2, 4], [3, 5], [4, 1]] },
    cubeNet9: { root: 0, tree: [[0, 2], [0, 4], [2, 5], [5, 1], [1, 3]] }
  },
  cuboid: {
    cuboidA: { root: 2, tree: [[2, 5], [2, 4], [2, 0], [2, 1], [5, 3]] },
    cuboidB: { root: 2, tree: [[2, 5], [5, 3], [3, 4], [2, 0], [3, 1]] }
  },
  triangularPrism: {
    triA: { root: 2, tree: [[2, 3], [3, 4], [2, 0], [2, 1]] },
    triB: { root: 2, tree: [[2, 3], [3, 4], [2, 0], [3, 1]] }
  },
  pentagonalPrism: {
    prismA: { root: 1, tree: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 0]] },
    prismB: { root: 1, tree: [[1, 2], [2, 3], [3, 4], [4, 5], [1, 0], [1, 6]] }
  },
  hexagonalPrism: {
    prismA: { root: 1, tree: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [1, 0]] },
    prismB: { root: 1, tree: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [1, 0], [1, 7]] }
  },
  squarePyramid: {
    pyramidA: { root: 0, tree: [[0, 1], [0, 2], [0, 3], [0, 4]] },
    pyramidB: { root: 0, tree: [[0, 1], [0, 3], [0, 4], [1, 2]] }
  },
  triangularPyramid: {
    tetraA: { root: 0, tree: [[0, 1], [0, 2], [0, 3]] },
    tetraB: { root: 0, tree: [[0, 1], [0, 2], [1, 3]] }
  },
  pentagonalPyramid: {
    starA: { root: 0, tree: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5]] },
    chainB: { root: 0, tree: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5]] }
  },
  hexagonalPyramid: {
    starA: { root: 0, tree: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]] },
    chainB: { root: 0, tree: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 6]] }
  }
}

// ---------------------------------------------------------------------------
// 多面体铰链展开模型
// ---------------------------------------------------------------------------

// 刚体旋转平移：把 root 面送入 z=0 平面、外法线朝 +z
function rigidToRoot(corners, faces, rootIdx) {
  const fc = faces[rootIdx].center
  const n = faces[rootIdx].normal
  const q = new THREE.Quaternion().setFromUnitVectors(n.clone().normalize(), new THREE.Vector3(0, 0, 1))
  corners.forEach(c => {
    const v = new THREE.Vector3(c[0] - fc.x, c[1] - fc.y, c[2] - fc.z).applyQuaternion(q)
    c[0] = v.x; c[1] = v.y; c[2] = v.z
  })
  faces.forEach(f => {
    const pts = f.idx.map(i => pt(corners, i))
    f.normal = newellNormal(pts)
  })
}

// 两面的共同顶点（即公共棱的两个端点）
function sharedEdge(fa, fb) {
  const s = []
  fa.forEach(i => { if (fb.includes(i)) s.push(i) })
  return s
}

// 绕棱轴从 child 外法线转到 parent 外法线的有向角（把 child 展开到 parent 平面）
function hingeOpenAngle(axis, nChild, nParent) {
  const cross = new THREE.Vector3().crossVectors(nChild, nParent)
  const ang = Math.atan2(cross.dot(axis), nChild.dot(nParent))
  return ang
}

// 绕“过点 p0、方向 axis”的轴旋转 angle 的 4x4 矩阵（T·R·T⁻¹）
function rotAboutLine(p0, axis, angle) {
  const q = new THREE.Quaternion().setFromAxisAngle(axis.clone().normalize(), angle)
  const t1 = new THREE.Matrix4().makeTranslation(p0.x, p0.y, p0.z)
  const r = new THREE.Matrix4().makeRotationFromQuaternion(q)
  const t0 = new THREE.Matrix4().makeTranslation(-p0.x, -p0.y, -p0.z)
  return t1.multiply(r).multiply(t0) // 先 t0（平移到原点）→ r → t1（移回）
}

// 面板材质
function panelMat(color) {
  return new THREE.MeshStandardMaterial({
    color, side: THREE.DoubleSide, roughness: 0.62, metalness: 0.03
  })
}

// 多面体平面面板：每面为单一朝向的平面三角扇，用平面着色避免色差
function panelFlatMat(color) {
  return new THREE.MeshStandardMaterial({
    color, side: THREE.DoubleSide, roughness: 0.62, metalness: 0.03, flatShading: true
  })
}

export function buildPolyUnfold(type, patternKey) {
  const data = buildPolyData(type)
  const { corners, faces } = data
  const pat = PATTERNS[type]?.[patternKey]
  if (!pat) throw new Error('未知展开方式: ' + type + '/' + patternKey)

  rigidToRoot(corners, faces, pat.root)

  const childrenMap = {}
  const parentOf = {}
  pat.tree.forEach(([p, c]) => {
    (childrenMap[p] ||= []).push(c)
    parentOf[c] = p
  })

  // 铰链：共享棱两端 + 展开开角
  const hingeWorld = pat.tree.map(([p, c]) => {
    const [a, b] = sharedEdge(faces[p].idx, faces[c].idx)
    const pa = pt(corners, a), pb = pt(corners, b)
    const axis = new THREE.Vector3().subVectors(
      new THREE.Vector3(...pb), new THREE.Vector3(...pa)).normalize()
    const openAngle = hingeOpenAngle(axis, faces[c].normal, faces[p].normal)
    return {
      parent: p, child: c, openAngle,
      pa: new THREE.Vector3(...pa), pb: new THREE.Vector3(...pb)
    }
  })
  if (typeof window === 'undefined' && process.env.DEBUG_UNFOLD) {
    hingeWorld.forEach(h => console.log('DBG hinge', h.parent, '->', h.child, 'openAngle=', h.openAngle, 'pa=', h.pa.toArray().map(x=>+x.toFixed(2)), 'pb=', h.pb.toArray().map(x=>+x.toFixed(2))))
  }

  // 逐步演示顺序：从根面做 BFS，保证每个铰链都在其父铰链“打开”之后才展开；
  // 同一时刻只有最靠前的一根铰链在旋转，观感像逐面翻开。
  const hingeSeq = []
  const depthOf = {}
  const seqPosOf = {}
  {
    const queue = [pat.root]
    depthOf[pat.root] = 0
    while (queue.length) {
      const p = queue.shift()
      for (const c of (childrenMap[p] || [])) {
        depthOf[c] = (depthOf[p] ?? 0) + 1
        hingeSeq.push(c)
        seqPosOf[c] = hingeSeq.length - 1
        queue.push(c)
      }
    }
  }
  // 每根铰链的“当前两面夹角”：闭合时 = 180°-开角（立体内部二面角），完全平铺时 = 180°
  // 开角取幅值（hingeOpenAngle 返回有向角，可能出现负值；旋转方向由 setProgress 用带号 openAngle 决定）
  const hingeSteps = hingeSeq.map((child, i) => {
    const h = hingeWorld.find(x => x.child === child)
    const openDeg = (Math.abs(h.openAngle) * 180) / Math.PI
    return {
      index: i, child, depth: depthOf[child],
      openAngleDeg: openDeg,
      startDihedralDeg: 180 - openDeg
    }
  })
  const N_HINGES = hingeSeq.length

  const group = new THREE.Group()

  // 面板 mesh：几何顶点 = rigid 坐标，每帧替换 matrix
  const panels = faces.map((f, i) => {
    const pts = f.idx.map(ci => new THREE.Vector3(...pt(corners, ci)))
    const arr = []
    for (let k = 1; k < pts.length - 1; k++) {
      arr.push(...pts[0].toArray(), ...pts[k].toArray(), ...pts[k + 1].toArray())
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    geo.computeVertexNormals()
    geo.computeBoundingSphere()
    const mesh = new THREE.Mesh(geo, panelFlatMat(FACE_COLORS[i % FACE_COLORS.length]))
    mesh.matrixAutoUpdate = false
    // 棱线（本面轮廓）
    const edgeArr = []
    pts.forEach(p => edgeArr.push(...p.toArray()))
    edgeArr.push(...pts[0].toArray())
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeArr, 3))
    const edge = new THREE.Line(edgeGeo, new THREE.LineBasicMaterial({
      color: 0x1d3352, transparent: true, opacity: 0.8
    }))
    mesh.add(edge)
    group.add(mesh)
    return { face: i, mesh, pts }
  })

  // 铰链（折叠棱）红色虚线，逐帧更新端点；顺序与 hingeSeq 一致，便于按步骤高亮
  const hingeLines = hingeSeq.map(child => {
    const h = hingeWorld.find(x => x.child === child)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3))
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({
      color: 0xe0456b, dashSize: 0.16, gapSize: 0.1, transparent: true, opacity: 0.95
    }))
    line.userData.hingeIndex = hingeSeq.indexOf(child)
    group.add(line)
    return { hinge: h, child, geo, line }
  })

  const alphas = {}
  const mats = {}
  const IDENT = new THREE.Matrix4()

  function computePoses() {
    mats[pat.root] = IDENT
    const stack = [pat.root]
    while (stack.length) {
      const p = stack.pop()
      const mP = mats[p]
      for (const c of (childrenMap[p] || [])) {
        const hw = hingeWorld.find(h => h.child === c)
        if (!hw) continue
        const aW = hw.pa.clone().applyMatrix4(mP)
        const bW = hw.pb.clone().applyMatrix4(mP)
        const axis = bW.clone().sub(aW)
        const p0 = aW.clone().add(bW).multiplyScalar(0.5)
        const m = rotAboutLine(p0, axis, alphas[c] ?? 0)
        mats[c] = new THREE.Matrix4().multiplyMatrices(m, mP)
        stack.push(c)
      }
    }
  }

  function updateHingeLines() {
    hingeLines.forEach(({ hinge, geo, line }) => {
      const mP = mats[hinge.parent] || IDENT
      const aW = hinge.pa.clone().applyMatrix4(mP)
      const bW = hinge.pb.clone().applyMatrix4(mP)
      const arr = geo.attributes.position.array
      arr[0] = aW.x; arr[1] = aW.y; arr[2] = aW.z
      arr[3] = bW.x; arr[4] = bW.y; arr[5] = bW.z
      geo.attributes.position.needsUpdate = true
      line.computeLineDistances()
    })
  }

  function syncPose() {
    computePoses()
    panels.forEach(pan => {
      pan.mesh.matrix.copy(mats[pan.face] || IDENT)
      pan.mesh.matrixWorldNeedsUpdate = true
    })
    updateHingeLines()
  }

  // 整体同步展开：所有铰链按同一比例 t∈[0,1] 打开
  function setProgress(t) {
    const k = THREE.MathUtils.clamp(t, 0, 1)
    hingeWorld.forEach(h => { alphas[h.child] = h.openAngle * k })
    syncPose()
  }

  // 逐步展开：x∈[0,1] 映射到铰链时序 S∈[0,N]，
  // 第 i 根铰链在 S∈(i, i+1) 期间旋转，之前的全部到位，之后的保持闭合
  function setSeqProgress(x) {
    const S = THREE.MathUtils.clamp(x, 0, 1) * N_HINGES
    hingeSeq.forEach((child, i) => {
      const frac = THREE.MathUtils.clamp(S - i, 0, 1)
      const h = hingeWorld.find(hw => hw.child === child)
      alphas[child] = h.openAngle * frac
    })
    syncPose()
  }

  // 包围盒（供相机自适应），覆盖折叠态与展开态
  function boundsAt(k) {
    setProgress(k)
    group.updateMatrixWorld(true)
    const bb = new THREE.Box3()
    panels.forEach(pan => {
      pan.pts.forEach(p => bb.expandByPoint(p.clone().applyMatrix4(mats[pan.face] || IDENT)))
    })
    return bb
  }
  const bbNet = boundsAt(1)
  // 展开态自检：全部平铺 z≈0
  let flatErr = 0
  panels.forEach(pan => {
    pan.pts.forEach(p => {
      const w = p.clone().applyMatrix4(mats[pan.face] || IDENT)
      flatErr = Math.max(flatErr, Math.abs(w.z))
    })
  })
  if (flatErr > 1e-3) console.warn('[unfold] 展开态未完全平铺 z偏差=', flatErr)
  const bbClosed = boundsAt(0)
  bbNet.union(bbClosed)
  const bbCenter = bbNet.getCenter(new THREE.Vector3())
  const bbSize = bbNet.getSize(new THREE.Vector3())
  setProgress(0)

  // 每个面的局部几何信息（面积 / 面心 / 外法线），供面积标注使用
  const faceMeta = panels.map(pan => {
    const pts = pan.pts
    const center = new THREE.Vector3()
    pts.forEach(p => center.add(p))
    center.divideScalar(pts.length)
    let area = 0
    for (let k = 1; k < pts.length - 1; k++) {
      area += new THREE.Vector3().crossVectors(
        pts[k].clone().sub(pts[0]), pts[k + 1].clone().sub(pts[0])).length() / 2
    }
    const normal = newellNormal(pts.map(p => [p.x, p.y, p.z]))
    return { area, center, normal, nSides: pts.length }
  })
  // 欧拉统计：顶点数 = 角点数；棱数 = 各面边数之和 / 2
  const E = Math.round(faces.reduce((s, f) => s + f.idx.length, 0) / 2)
  const stats = {
    V: corners.length, E, F: faces.length,
    S: faceMeta.reduce((s, m) => s + m.area, 0)
  }

  function dispose() {
    group.traverse(o => {
      o.geometry?.dispose?.()
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
        else o.material.dispose()
      }
    })
  }

  // 完全展开后各面在平面上的多边形（用于缩略预览）
  function flatPanels() {
    setProgress(1)
    group.updateMatrixWorld(true)
    const out = panels.map((pan) => ({
      pts: pan.pts.map((p) => {
        const w = p.clone().applyMatrix4(mats[pan.face] || IDENT)
        return [Math.round(w.x * 1000) / 1000, Math.round(w.y * 1000) / 1000]
      }),
      color: pan.face
    }))
    setProgress(0)
    return out
  }

  return {
    root: group, setProgress, setSeqProgress, dispose, type, patternKey,
    netCenter: bbCenter, netSize: bbSize,
    faceMeta, stats, flatPanels,
    isPoly: true,
    panelMeshes: panels.map(p => p.mesh),
    hingeLineObjs: hingeLines.map(h => h.line),
    hingeSteps, // 逐步演示时的顺序与二面角信息
    hingeCount: N_HINGES
  }
}

// ---------------------------------------------------------------------------
// 圆柱 / 圆锥：曲面网格逐帧变形
// ---------------------------------------------------------------------------

function makeDiskGeo(r, segments) {
  return new THREE.CircleGeometry(r, segments)
}

function smooth01(t) { return t * t * (3 - 2 * t) }

// 动态曲线工具：按顶点序号取样网格顶点坐标更新折线
function makeCurve(count) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3))
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
    color: 0x1d3352, transparent: true, opacity: 0.85
  }))
  return { geo, line }
}

function copyGridRow(target, src, rowLen, rowIdx, n) {
  // src: Float32Array 每顶点3分量，行数未知；直接线性数组，rowIdx*n3 .. rowIdx*n3+n*3
  for (let i = 0; i < n * 3; i++) target[i] = src[rowIdx * 3 + i]
}

function ringOutline(arr, r, n) {
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    arr[i * 3] = r * Math.cos(a)
    arr[i * 3 + 1] = r * Math.sin(a)
    arr[i * 3 + 2] = 0
  }
}

// 圆柱：半径 r、高 H。侧面展开为矩形（宽=周长），卷曲为整圆。
export function buildCylinderUnfold(patternKey) {
  const r = 1.05, H = 2.2
  const W = Math.PI * 2 * r
  const ws = 80, hs = 4
  const nv = (ws + 1) * (hs + 1)
  const verts = new Float32Array(nv * 3)
  const sideGeo = new THREE.BufferGeometry()
  sideGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  const idx = []
  for (let j = 0; j < hs; j++) {
    for (let i = 0; i < ws; i++) {
      const a = j * (ws + 1) + i
      idx.push(a, a + 1, a + ws + 1, a + ws + 1, a + 1, a + ws + 2)
    }
  }
  sideGeo.setIndex(idx)
  const side = new THREE.Mesh(sideGeo, panelMat(FACE_COLORS[0]))
  const group = new THREE.Group()
  group.add(side)

  // 边框线（两 rim + 两直边）：沿网格顶点取样
  const border = {
    top: makeCurve(ws + 1),      // j=0 行
    bottom: makeCurve(ws + 1),   // j=hs 行
    left: makeCurve(hs + 1),     // i=0 列
    right: makeCurve(hs + 1)     // i=ws 列
  }
  group.add(border.top.line, border.bottom.line, border.left.line, border.right.line)

  function updateBorders() {
    const col = (i) => {
      const out = []
      for (let j = 0; j <= hs; j++) {
        const o = (j * (ws + 1) + i) * 3
        out.push(verts[o], verts[o + 1], verts[o + 2])
      }
      return out
    }
    const setArr = (curve, data) => {
      curve.geo.attributes.position.array.set(data)
      curve.geo.attributes.position.needsUpdate = true
    }
    // 顶行 j=0（倒序保证连线顺序无关紧要，Line 按数组顺序画）
    setArr(border.top, Array.from(verts.slice(0, (ws + 1) * 3)))
    setArr(border.bottom, Array.from(verts.slice(hs * (ws + 1) * 3, (hs + 1) * (ws + 1) * 3)))
    setArr(border.left, col(0))
    setArr(border.right, col(ws))
  }

  // 两个底面圆
  const c1 = new THREE.Mesh(makeDiskGeo(r, 72), panelMat(FACE_COLORS[1]))
  const c2 = new THREE.Mesh(makeDiskGeo(r, 72), panelMat(FACE_COLORS[2]))
  ;[c1, c2].forEach(mesh => {
    const ring = new THREE.BufferGeometry()
    ring.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((72 + 1) * 3), 3))
    ringOutline(ring.attributes.position.array, r, 72)
    ring.attributes.position.needsUpdate = true
    const line = new THREE.Line(ring, new THREE.LineBasicMaterial({ color: 0x1d3352, transparent: true, opacity: 0.85 }))
    mesh.add(line)
    group.add(mesh)
  })

  const AXIS_X = new THREE.Vector3(1, 0, 0)
  const gap = 0.3
  const sep = patternKey === 'cylinderB' ? 1.9 : 0
  // 平铺(1)：圆分列矩形两侧；立体(0)：两圆盖在卷成的筒的两端
  const netPoses = [
    { p: new THREE.Vector3(W / 2 + r + gap, sep, 0), q: new THREE.Quaternion() },
    { p: new THREE.Vector3(-(W / 2 + r + gap), -sep, 0), q: new THREE.Quaternion() }
  ]
  const solidPoses = [
    { p: new THREE.Vector3(0, H / 2, r), q: new THREE.Quaternion().setFromAxisAngle(AXIS_X, -Math.PI / 2) },
    { p: new THREE.Vector3(0, -H / 2, r), q: new THREE.Quaternion().setFromAxisAngle(AXIS_X, Math.PI / 2) }
  ]
  const v = new THREE.Vector3(), qq = new THREE.Quaternion()
  const discs = [c1, c2]

  // 面积标注锚点：0=侧面中部(跟随网格顶点)  1/2=两个圆盘中心，setProgress 每帧更新
  const labelAnchors = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]

  function setProgress(t) {
    const k = THREE.MathUtils.clamp(t, 0, 1)
    // 侧面：k=1 全平；k=0 卷成整圆。bend = (1-k)*2π
    const bend = (1 - k) * Math.PI * 2
    const R = bend > 1e-4 ? W / bend : 0
    for (let j = 0; j <= hs; j++) {
      const y = -H / 2 + (j / hs) * H
      for (let i = 0; i <= ws; i++) {
        const u = (i / ws) * W
        const o = (j * (ws + 1) + i) * 3
        if (bend < 1e-4) {
          verts[o] = u - W / 2
          verts[o + 1] = y
          verts[o + 2] = 0
        } else {
          const ang = (u / W) * bend - bend / 2
          verts[o] = R * Math.sin(ang)
          verts[o + 1] = y
          verts[o + 2] = R * (Math.cos(ang) - Math.cos(bend / 2))
        }
      }
    }
    sideGeo.attributes.position.needsUpdate = true
    sideGeo.computeVertexNormals()
    sideGeo.computeBoundingSphere()
    updateBorders()
    // 圆盘位姿插值
    const s = smooth01(k)
    discs.forEach((mesh, i) => {
      v.lerpVectors(solidPoses[i].p, netPoses[i].p, s)
      mesh.position.copy(v)
      qq.slerpQuaternions(solidPoses[i].q, netPoses[i].q, s)
      mesh.quaternion.copy(qq)
    })
    // 面积标注锚点跟随部件当前位置（侧面取中部网格顶点，圆盘取圆心）
    const oMid = ((hs >> 1) * (ws + 1) + (ws >> 1)) * 3
    labelAnchors[0].set(verts[oMid], verts[oMid + 1], verts[oMid + 2])
    labelAnchors[1].copy(c1.position)
    labelAnchors[2].copy(c2.position)
  }

  function boundsBoth() {
    setProgress(0); group.updateMatrixWorld(true)
    const bb = new THREE.Box3().setFromObject(group)
    setProgress(1); group.updateMatrixWorld(true)
    bb.union(new THREE.Box3().setFromObject(group))
    setProgress(0)
    return { c: bb.getCenter(new THREE.Vector3()), s: bb.getSize(new THREE.Vector3()) }
  }
  const fit = boundsBoth()

  function dispose() {
    group.traverse(o => {
      o.geometry?.dispose?.()
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
        else o.material.dispose()
      }
    })
  }

  // 表面积统计：圆柱 = 侧面积 2πrh + 两个底面积 2πr²
  const rnd = (x, d) => { const p = 10 ** d; return String(Math.round(x * p) / p) }
  const areaSide = 2 * Math.PI * r * H
  const areaBase = Math.PI * r * r
  const S = areaSide + 2 * areaBase
  const stats = {
    S,
    compose: '1 个矩形侧面 + 2 个圆形底面',
    dims: `底面半径 r = ${rnd(r, 2)}，高 h = ${rnd(H, 2)}；底面周长 = 2πr ≈ ${rnd(2 * Math.PI * r, 2)}，侧面矩形 = 周长 × 高`,
    rows: [
      { label: '侧面(矩形，宽 = 底面周长)：S侧 = 2πrh', area: areaSide },
      { label: '底面(每个圆)：S底 = πr²', area: areaBase },
      { label: '两个底面合计：2 × πr²', area: 2 * areaBase }
    ],
    tip: '把侧面沿一条高剪开摊平是矩形（长 = 底面周长，宽 = 高），算出各平面图形面积再相加。'
  }

  return {
    root: group, setProgress, dispose, type: 'cylinder', patternKey,
    netCenter: fit.c, netSize: fit.s,
    stats,
    labelAnchors, labelAreas: [areaSide, areaBase, areaBase]
  }
}

// 圆锥：底面半径 r、高 h。侧面展开为扇形（半径=母线、圆心角=2πr/母线）
export function buildConeUnfold(patternKey) {
  const r = 1.05, h = 2.35
  const slant = Math.sqrt(r * r + h * h)
  const sweep = (2 * Math.PI * r) / slant
  const rs = 32, as = 64
  const group = new THREE.Group()
  const nv = (rs + 1) * (as + 1)

  // 缓存两套端点：flat[k=1] 与 solid[k=0]
  const flat = new Float32Array(nv * 3)
  const solid = new Float32Array(nv * 3)
  const arr = new Float32Array(nv * 3)
  for (let a = 0; a <= as; a++) {
    for (let rr = 0; rr <= rs; rr++) {
      const f = rr / rs
      const ang = (a / as - 0.5) * sweep
      const o = (a * (rs + 1) + rr) * 3
      // 平面展开：顶点在原点，扇形沿 +x 展开（z 使用扇形平面 = y=0）
      flat[o] = f * slant * Math.cos(ang)
      flat[o + 1] = 0
      flat[o + 2] = f * slant * Math.sin(ang)
      // 立体：顶点为锥面点，轴向 +y（顶点在上、底面在 y=0）
      const azm = (ang / sweep) * Math.PI * 2
      solid[o] = r * f * Math.cos(azm)
      solid[o + 1] = h * (1 - f)
      solid[o + 2] = r * f * Math.sin(azm)
    }
  }
  const sideGeo = new THREE.BufferGeometry()
  sideGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
  const idx = []
  for (let a = 0; a < as; a++) {
    for (let rr = 0; rr < rs; rr++) {
      const p0 = a * (rs + 1) + rr
      idx.push(p0, p0 + 1, p0 + rs + 1, p0 + rs + 1, p0 + 1, p0 + rs + 2)
    }
  }
  sideGeo.setIndex(idx)
  const side = new THREE.Mesh(sideGeo, panelMat(FACE_COLORS[0]))
  group.add(side)

  // 边框：外弧 + 两条径向边（扇形边界），立体时外弧=底面圆周、两径向边重合为接缝
  const outer = makeCurve(as + 1)     // a=0..as 行 rr=rs
  const seamA = makeCurve(rs + 1)     // a=0 列 rr=0..rs
  const seamB = makeCurve(rs + 1)     // a=as 列 rr=0..rs
  group.add(outer.line, seamA.line, seamB.line)

  function updateBorders() {
    const oa = outer.geo.attributes.position.array
    for (let a = 0; a <= as; a++) {
      const o = (a * (rs + 1) + rs) * 3
      oa[a * 3] = arr[o]; oa[a * 3 + 1] = arr[o + 1]; oa[a * 3 + 2] = arr[o + 2]
    }
    const sa = seamA.geo.attributes.position.array
    const sb = seamB.geo.attributes.position.array
    for (let rr = 0; rr <= rs; rr++) {
      const o0 = (0 * (rs + 1) + rr) * 3
      const o1 = (as * (rs + 1) + rr) * 3
      sa[rr * 3] = arr[o0]; sa[rr * 3 + 1] = arr[o0 + 1]; sa[rr * 3 + 2] = arr[o0 + 2]
      sb[rr * 3] = arr[o1]; sb[rr * 3 + 1] = arr[o1 + 1]; sb[rr * 3 + 2] = arr[o1 + 2]
    }
    ;[outer, seamA, seamB].forEach(c => { c.geo.attributes.position.needsUpdate = true })
  }

  // 底面圆
  const base = new THREE.Mesh(makeDiskGeo(r, 72), panelMat(FACE_COLORS[1]))
  const ring = new THREE.BufferGeometry()
  ring.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((72 + 1) * 3), 3))
  ringOutline(ring.attributes.position.array, r, 72)
  const line = new THREE.Line(ring, new THREE.LineBasicMaterial({ color: 0x1d3352, transparent: true, opacity: 0.85 }))
  base.add(line)
  group.add(base)

  const AXIS_X = new THREE.Vector3(1, 0, 0)
  const gap = 0.35
  const netP = new THREE.Vector3(slant + r + gap, patternKey === 'coneB' ? -1.9 : 0, 0)
  const solidP = new THREE.Vector3(0, 0, 0)
  const netQ = new THREE.Quaternion()
  const solidQ = new THREE.Quaternion().setFromAxisAngle(AXIS_X, Math.PI / 2) // 法线 -y
  const v = new THREE.Vector3(), qq = new THREE.Quaternion()

  // 面积标注锚点：0=扇形中部(跟随网格顶点)  1=底面圆心
  const labelAnchors = [new THREE.Vector3(), new THREE.Vector3()]

  function setProgress(t) {
    const k = THREE.MathUtils.clamp(t, 0, 1)
    for (let i = 0; i < arr.length; i++) arr[i] = flat[i] * k + solid[i] * (1 - k)
    sideGeo.attributes.position.needsUpdate = true
    sideGeo.computeVertexNormals()
    sideGeo.computeBoundingSphere()
    updateBorders()
    const s = smooth01(k)
    v.lerpVectors(solidP, netP, s)
    base.position.copy(v)
    qq.slerpQuaternions(solidQ, netQ, s)
    base.quaternion.copy(qq)
    // 面积标注锚点跟随部件当前位置（扇形取中部网格顶点，底面取圆心）
    const oMid = ((as >> 1) * (rs + 1) + (rs >> 1)) * 3
    labelAnchors[0].set(arr[oMid], arr[oMid + 1], arr[oMid + 2])
    labelAnchors[1].copy(base.position)
  }

  function boundsBoth() {
    setProgress(0); group.updateMatrixWorld(true)
    const bb = new THREE.Box3().setFromObject(group)
    setProgress(1); group.updateMatrixWorld(true)
    bb.union(new THREE.Box3().setFromObject(group))
    setProgress(0)
    return { c: bb.getCenter(new THREE.Vector3()), s: bb.getSize(new THREE.Vector3()) }
  }
  const fit = boundsBoth()

  function dispose() {
    group.traverse(o => {
      o.geometry?.dispose?.()
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
        else o.material.dispose()
      }
    })
  }

  // 表面积统计：圆锥 = 侧面积 πrl + 底面积 πr²（l 为母线长）
  const rnd = (x, d) => { const p = 10 ** d; return String(Math.round(x * p) / p) }
  const areaSide = Math.PI * r * slant
  const areaBase = Math.PI * r * r
  const S = areaSide + areaBase
  const stats = {
    S,
    compose: '1 个扇形侧面 + 1 个圆形底面',
    dims: `底面半径 r = ${rnd(r, 2)}，高 h = ${rnd(h, 2)}；母线 l = √(r²+h²) ≈ ${rnd(slant, 3)}，侧面扇形半径 = 母线长`,
    rows: [
      { label: '侧面(扇形，半径 = 母线 l)：S侧 = πrl', area: areaSide },
      { label: '底面(圆)：S底 = πr²', area: areaBase }
    ],
    tip: '把侧面沿一条母线剪开展平是扇形（半径 = 母线 l，弧长 = 底面周长），算出扇形与底圆面积再相加。'
  }

  return {
    root: group, setProgress, dispose, type: 'cone', patternKey,
    netCenter: fit.c, netSize: fit.s,
    stats,
    labelAnchors, labelAreas: [areaSide, areaBase]
  }
}

// ---------------------------------------------------------------------------
// 统一入口 & 图案清单
// ---------------------------------------------------------------------------

export function buildUnfold(type, patternKey) {
  if (type === 'cylinder') return buildCylinderUnfold(patternKey)
  if (type === 'cone') return buildConeUnfold(patternKey)
  return buildPolyUnfold(type, patternKey)
}

export const UNFOLD_PATTERNS = {
  cube: [
    { key: 'crossA', name: '十字展开', family: '1-4-1', description: '像十字：中间四个面连成一排，上下各接一个面，是最经典的展开图。' },
    { key: 'strip', name: '长条展开', family: '1-4-1', description: '像一条小蛇：四个侧面首尾相连，两个底面分挂在两侧。' },
    { key: 'cubeNet1', name: '1-4-1 型①', family: '1-4-1', description: '中间一排四个面，上下两个面都不在正中间（1-4-1 家族的一种）。' },
    { key: 'cubeNet2', name: '1-4-1 型②', family: '1-4-1', description: '中间一排四个面，上面接最左边、下面接左边第二个面。' },
    { key: 'cubeNet3', name: '1-4-1 型③', family: '1-4-1', description: '像台阶：四个面一竖列到底，左侧挂一个、下面再接一个。' },
    { key: 'cubeNet4', name: '2-3-1 型①', family: '2-3-1', description: '上排两个、中排三个、下排一个，像一级楼梯（2-3-1 家族）。' },
    { key: 'cubeNet5', name: '2-3-1 型②', family: '2-3-1', description: '2-3-1 家族：两格、三格、一格斜着错开排列。' },
    { key: 'cubeNet6', name: '1-4-1 型④', family: '1-4-1', description: '中间一排四个面，上、下两个面分别挂在最右和最左。' },
    { key: 'cubeNet7', name: '3-3 型', family: '3-3', description: '上下两排各三个面，像两节楼梯对拼。' },
    { key: 'cubeNet8', name: '2-3-1 型③', family: '2-3-1', description: '2-3-1 家族：从两格到三格再到一格，层层错位。' },
    { key: 'cubeNet9', name: '2-2-2 型', family: '2-2-2', description: '三排每排两个面，斜着错开排列，像锯齿。' }
  ],
  cuboid: [
    { key: 'cuboidA', name: '标准展开', description: '六个矩形面组成展开图，长、宽、高保持真实比例关系。' },
    { key: 'cuboidB', name: '另一种展开', description: '改变上下底面的连接位置，比较不同展开图。' }
  ],
  triangularPrism: [
    { key: 'triA', name: '三棱柱展开', description: '两个三角形底面与三个矩形侧面组成展开图。' },
    { key: 'triB', name: '另一种展开', description: '改变三角形底面与侧面的连接位置。' }
  ],
  pentagonalPrism: [
    { key: 'prismA', name: '单排展开', description: '五个矩形侧面连成一排，上下两个五边形底面分接两端。' },
    { key: 'prismB', name: '两端开合', description: '上下底面都接到主侧面两侧，观察五棱柱另一种展开形式。' }
  ],
  hexagonalPrism: [
    { key: 'prismA', name: '单排展开', description: '六个矩形侧面连成一排，上下两个六边形底面分接两端。' },
    { key: 'prismB', name: '两端开合', description: '上下底面都接到主侧面两侧，观察六棱柱另一种展开形式。' }
  ],
  cylinder: [
    { key: 'cylinderA', name: '侧面+两底面', description: '圆柱展开后是一个长方形和两个圆。' },
    { key: 'cylinderB', name: '分离观察', description: '将两个圆底面拉开，便于观察圆柱由哪些平面组成。' }
  ],
  cone: [
    { key: 'coneA', name: '扇形+圆', description: '圆锥展开后，侧面成为扇形，底面是圆。' },
    { key: 'coneB', name: '分离观察', description: '将圆底面与扇形侧面稍微分离。' }
  ],
  squarePyramid: [
    { key: 'pyramidA', name: '四棱锥展开', description: '一个正方形底面连接四个三角形侧面。' },
    { key: 'pyramidB', name: '旋转展开', description: '改变三角形的展开方向，观察另一种展开形式。' }
  ],
  triangularPyramid: [
    { key: 'tetraA', name: '三棱锥展开', description: '一个三角形底面连接三个三角形侧面，共四个三角形面。' },
    { key: 'tetraB', name: '绕棱旋转展开', description: '改变其中一个侧面的展开方向，观察不同的展开形式。' }
  ],
  pentagonalPyramid: [
    { key: 'starA', name: '底面居中展开', description: '五边形底面在中间，五个三角形侧面围绕底面展开。' },
    { key: 'chainB', name: '绕棱链式展开', description: '其中两个三角形侧面绕斜棱连在一起，形成链式展开。' }
  ],
  hexagonalPyramid: [
    { key: 'starA', name: '底面居中展开', description: '六边形底面在中间，六个三角形侧面围绕底面展开。' },
    { key: 'chainB', name: '绕棱链式展开', description: '其中两个三角形侧面绕斜棱连在一起，形成链式展开。' }
  ]
}
