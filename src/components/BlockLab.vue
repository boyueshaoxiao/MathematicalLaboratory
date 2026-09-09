<template>
  <div class="bl-wrap">
    <div class="bl-toolbar">
      <div class="bl-seg">
        <button :class="{ active: tool === 'add' }" @click="setTool('add')">🧱 添加</button>
        <button :class="{ active: tool === 'move' }" @click="setTool('move')">✋ 移动</button>
        <button :class="{ active: tool === 'del' }" @click="setTool('del')">🗑 删除</button>
      </div>

      <div v-if="tool === 'add'" class="bl-colors">
        <button v-for="c in PALETTE" :key="c" class="bl-color" :class="{ on: color === c }"
          :style="{ background: hex(c) }" :title="'选颜色'" @click="color = c"></button>
      </div>

      <div class="bl-seg bl-views">
        <button v-for="v in VIEWS" :key="v.key" :class="{ active: view === v.key }"
          @click="goView(v.key)">{{ v.name }}</button>
      </div>

      <button class="bl-act" :disabled="!hist.length" @click="undo">↩ 撤销</button>
      <button class="bl-act bl-danger" @click="clearAll">清空</button>
    </div>

    <div class="bl-main">
      <div class="bl-stage">
        <div ref="container" class="bl-viewer"></div>
        <div class="bl-hint" v-if="hintText">{{ hintText }}</div>
      </div>

      <aside class="bl-side">
        <div class="bl-card bl-count">
          <div class="bl-count-num">{{ total }}</div>
          <div class="bl-count-txt">个小正方体</div>
        </div>

        <div class="bl-card" v-if="layerCounts.length">
          <strong>每层数量（从下往上）</strong>
          <div class="bl-layers">
            <div v-for="(c, i) in layerCounts" :key="i" class="bl-layer">
              <span>第 {{ i + 1 }} 层</span>
              <b>{{ c }}</b>
            </div>
          </div>
        </div>

        <div class="bl-card">
          <strong>快速示例</strong>
          <div class="bl-presets">
            <button v-for="p in PRESETS" :key="p.key" @click="loadPreset(p.key)">
              {{ p.name }}
            </button>
          </div>
        </div>

        <div class="bl-card bl-tip">
          <strong>🧠 怎么玩</strong>
          <ul>
            <li>🧱 添加：点地面或点已放方块的面。</li>
            <li>✋ 移动：先点一个方块选中，再点新位置。</li>
            <li>🗑 删除：点方块把它拿走，上面的会自动落下来。</li>
            <li>👁 用 前/后/左/右/上 从不同方向观察，看看到底是什么形状。</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const W = 12  // x 方向格子数（0..W-1）
const D = 12  // z 方向格子数（0..D-1）
const MAX_H = 6

const PALETTE = [0x4f8cff, 0x55b99a, 0xffa24d, 0x9a7cff, 0xef6b7b, 0x42c2c8, 0xf2c94c, 0x7fbe64]
const VIEWS = [
  { key: 'free', name: '自由' },
  { key: 'front', name: '前' },
  { key: 'back', name: '后' },
  { key: 'left', name: '左' },
  { key: 'right', name: '右' },
  { key: 'top', name: '上' },
  { key: 'bottom', name: '下' }
]
const PRESETS = [
  { key: 'stairs', name: '楼梯' },
  { key: 'pyramid', name: '金字塔' },
  { key: 'tower', name: '高塔' },
  { key: 'wall', name: '城墙' }
]
const hex = c => '#' + c.toString(16).padStart(6, '0')

const tool = ref('add')       // add | move | del
const color = ref(PALETTE[0])
const view = ref('free')
const cubes = ref([])         // [{x,y,z,color}]
const hist = ref([])          // 撤销栈
const hint = ref('点地面或方块的面，往上搭一搭！')

const container = ref()

let scene, camera, renderer, controls, animationId
let ground = null
let gridLines = null
let ghostMesh = null
let frame = null
let pointerDown = false
const cubeMeshes = []
const boxGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96)

const total = computed(() => cubes.value.length)
const layerCounts = computed(() => {
  const ys = cubes.value.map(c => c.y)
  const max = ys.length ? Math.max(...ys) + 1 : 0
  const arr = []
  for (let y = 0; y < max; y++) arr.push(ys.filter(v => v === y).length)
  return arr
})
const hintText = computed(() => {
  if (tool.value === 'move' && selCell.value) return `已选中方块，点一个新位置把它搬过去`
  return hint.value
})

const selCell = ref(null) // 移动工具选中的 {x,y,z}

const keyOf = (x, y, z) => x + ',' + y + ',' + z
const hasCube = (x, y, z) => cubes.value.some(c => c.x === x && c.y === y && c.z === z)
const inBounds = (x, y, z) =>
  Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) &&
  x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < MAX_H

// 可放位置：没越界、格子是空的，并且有支撑（在地面或下面有方块）
function canPlace(x, y, z) {
  if (!inBounds(x, y, z) || hasCube(x, y, z)) return false
  if (y === 0) return true
  return hasCube(x, y - 1, z)
}

function snapshot() { return cubes.value.map(c => ({ ...c })) }

function pushState() {
  hist.value.push(snapshot())
  if (hist.value.length > 50) hist.value.shift()
}

function applyList(list) {
  cubes.value = []
  list.forEach(c => cubes.value.push({ ...c }))
  selCell.value = null
  renderCubes()
  updateFrame()
}

// 让所有方块“落稳”：一列中间被拿走时，上面的方块整体下落
function settle(list) {
  const cols = new Map()
  list.forEach(c => {
    const k = c.x + ',' + c.z
    if (!cols.has(k)) cols.set(k, [])
    cols.get(k).push(c)
  })
  const out = []
  for (const col of cols.values()) {
    col.sort((a, b) => a.y - b.y)
    col.forEach((c, i) => { c.y = i; out.push(c) })
  }
  return out
}

function removeAt(x, y, z) {
  const i = cubes.value.findIndex(c => c.x === x && c.y === y && c.z === z)
  if (i < 0) return
  cubes.value.splice(i, 1)
  cubes.value = settle(cubes.value)
  renderCubes()
}

function addAt(x, y, z) {
  if (!canPlace(x, y, z)) return
  cubes.value.push({ x, y, z, color: color.value })
  renderCubes()
}

// 把选中的方块搬到 t 位置（先拿走并落稳，防止悬空）
function doMoveCube(t) {
  const src = selCell.value
  const cube = cubes.value.find(c => c.x === src.x && c.y === src.y && c.z === src.z)
  if (!cube) return
  if (t.x === src.x && t.y === src.y && t.z === src.z) { selCell.value = null; updateFrame(); return }
  pushState()
  removeAt(src.x, src.y, src.z)
  if (canPlace(t.x, t.y, t.z)) {
    cubes.value.push({ x: t.x, y: t.y, z: t.z, color: cube.color })
  } else {
    cubes.value.push({ x: src.x, y: src.y, z: src.z, color: cube.color })
  }
  renderCubes()
  selCell.value = null
}

function setTool(t) {
  tool.value = t
  selCell.value = null
  hint.value = t === 'add' ? '点地面或方块的面，往上搭一搭！'
    : t === 'move' ? '先点一个方块把它选中'
      : '点方块把它拿走（上面会自动落下来）'
}

function undo() {
  const last = hist.value.pop()
  if (!last) return
  applyList(last)
}

function clearAll() {
  if (!cubes.value.length) return
  pushState()
  applyList([])
  hint.value = '空空的底板，开始搭积木吧！'
  view.value = 'free'
  fitCamera()
}

// ---------- 示例结构 ----------
function buildPreset(key) {
  const list = []
  const push = (x, y, z) => list.push({ x, y, z, color: PALETTE[y % PALETTE.length] })
  if (key === 'stairs') {
    // 楼梯：从右往左一级级升高（站在 +z 看最明显）
    for (let x = 0; x < 4; x++)
      for (let y = 0; y <= x; y++)
        for (let z = 1; z <= 2; z++) push(x, y, z)
  } else if (key === 'pyramid') {
    // 金字塔：一层比一层小一圈
    for (let y = 0; y < 3; y++)
      for (let x = y; x < 5 - y; x++)
        for (let z = y; z < 5 - y; z++) push(x, y, z)
  } else if (key === 'tower') {
    // 高塔：2×2 柱子 + 塔尖
    for (let y = 0; y < 5; y++)
      for (let x = 2; x < 4; x++)
        for (let z = 2; z < 4; z++) push(x, y, z)
    push(3, 5, 3)
  } else if (key === 'wall') {
    // 城墙：两段墙 + 顶上的小垛口
    for (let z = 1; z <= 4; z++) { push(1, 0, z); push(4, 0, z) }
    for (let z = 2; z <= 3; z++) { push(1, 1, z); push(4, 1, z); push(2, 1, z); push(3, 1, z) }
  }
  return list
}

function loadPreset(key) {
  pushState()
  const list = settle(buildPreset(key))
  applyList(list)
  hint.value = PRESETS.find(p => p.key === key)?.name + '搭好啦，试着数一数用了几个小正方体？'
  view.value = 'free'
  fitCamera()
}

// ---------- Three.js 场景 ----------
const raycaster = new THREE.Raycaster()
raycaster.params.Line.threshold = 0.1
const _ndc = new THREE.Vector2()

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f8fc)
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 300)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x93a5be, 2.6))
  const light = new THREE.DirectionalLight(0xffffff, 2.4)
  light.position.set(8, 14, 10)
  scene.add(light)
  const light2 = new THREE.DirectionalLight(0xbfd4ff, 0.9)
  light2.position.set(-8, 6, -8)
  scene.add(light2)

  // 底板（用于点选落点）
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(W / 2, 0, D / 2)
  scene.add(ground)

  // 格子线
  gridLines = new THREE.LineSegments(
    buildGridGeo(),
    new THREE.LineBasicMaterial({ color: 0xb9c8dc, transparent: true, opacity: 0.85 })
  )
  gridLines.position.y = 0.004
  scene.add(gridLines)

  // 幽灵方块（预览落点）
  ghostMesh = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({
    transparent: true, opacity: 0.45, depthWrite: false
  }))
  ghostMesh.visible = false
  scene.add(ghostMesh)

  // 选中框
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.06, 1.06, 1.06))
  frame = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff9d2e }))
  frame.visible = false
  scene.add(frame)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }

  resize()
  animate()
}

function buildGridGeo() {
  const pts = []
  for (let i = 0; i <= W; i++) { pts.push(i, 0, 0, i, 0, D) }
  for (let j = 0; j <= D; j++) { pts.push(0, 0, j, W, 0, j) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

function renderCubes() {
  // 移除旧的方块（释放材质，避免反复编辑后堆积）
  cubeMeshes.forEach(m => {
    scene.remove(m)
    m.material?.dispose?.()
  })
  cubeMeshes.length = 0

  cubes.value.forEach(c => {
    const mesh = new THREE.Mesh(boxGeo,
      new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.42, metalness: 0.03 }))
    mesh.position.set(c.x + 0.5, c.y + 0.5, c.z + 0.5)
    mesh.userData = { x: c.x, y: c.y, z: c.z }
    scene.add(mesh)
    cubeMeshes.push(mesh)
  })
  updateFrame()
}

function updateFrame() {
  if (!frame) return
  const s = selCell.value
  if (s) {
    frame.position.set(s.x + 0.5, s.y + 0.5, s.z + 0.5)
    frame.visible = true
  } else {
    frame.visible = false
  }
}

function currentBounds() {
  let minX = 0, maxX = W, minZ = 0, maxZ = D, maxY = 0
  if (cubes.value.length) {
    minX = Math.min(...cubes.value.map(c => c.x))
    maxX = Math.max(...cubes.value.map(c => c.x)) + 1
    minZ = Math.min(...cubes.value.map(c => c.z))
    maxZ = Math.max(...cubes.value.map(c => c.z)) + 1
    maxY = Math.max(...cubes.value.map(c => c.y)) + 1
  }
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const cy = maxY / 2
  return { cx, cy, cz, r: Math.max(maxX - minX, maxZ - minZ, maxY, 3) }
}

function setCamPos(pos, up) {
  camera.position.set(pos[0], pos[1], pos[2])
  camera.up.set(up[0], up[1], up[2])
  controls.target.set(pos[3], pos[4], pos[5])
  controls.update()
}

function goView(key) {
  view.value = key
  const b = currentBounds()
  const R = b.r * 2.2 + 3
  const t = [b.cx, b.cy, b.cz]
  if (key === 'free') {
    camera.up.set(0, 1, 0)
    const dir = new THREE.Vector3(1.15, 0.85, 1.15).normalize()
    camera.position.set(b.cx + dir.x * R, b.cy + dir.y * R, b.cz + dir.z * R)
    controls.target.set(b.cx, b.cy - Math.max(0.9, b.r * 0.22), b.cz)
    controls.update()
    return
  }
  const map = {
    front:  { pos: [b.cx, b.cy, b.cz + R], up: [0, 1, 0] },
    back:   { pos: [b.cx, b.cy, b.cz - R], up: [0, 1, 0] },
    left:   { pos: [b.cx - R, b.cy, b.cz], up: [0, 1, 0] },
    right:  { pos: [b.cx + R, b.cy, b.cz], up: [0, 1, 0] },
    top:    { pos: [b.cx, b.cy + R, b.cz], up: [0, 0, -1] },
    bottom: { pos: [b.cx, b.cy - R, b.cz], up: [0, 0, 1] }
  }
  const c = map[key]
  setCamPos(c.pos.concat(t), c.up)
}

function fitCamera() {
  const b = currentBounds()
  const R = b.r * 2.7 + 3.4
  const dir = new THREE.Vector3(1.15, 0.85, 1.15).normalize()
  camera.up.set(0, 1, 0)
  camera.position.set(b.cx + dir.x * R, b.cy + dir.y * R, b.cz + dir.z * R)
  controls.target.set(b.cx, b.cy - Math.max(0.9, b.r * 0.22), b.cz)
  controls.update()
}

// ---------- 拾取与编辑 ----------
const cubeMeshesHit = () => cubeMeshes
function sig(v) { return v > 0.3 ? 1 : v < -0.3 ? -1 : 0 }

// 解析鼠标指向的可放格子
function resolveTarget(ndc) {
  raycaster.setFromCamera(ndc, camera)
  const hits = raycaster.intersectObjects(cubeMeshesHit(), false)
  if (hits.length) {
    const m = hits[0].object
    const c = m.userData
    const n = hits[0].face?.normal
    if (!n) return null
    const x = c.x + sig(n.x), y = c.y + sig(n.y), z = c.z + sig(n.z)
    return canPlace(x, y, z) ? { x, y, z } : null
  }
  const g = raycaster.intersectObject(ground, false)
  if (!g.length) return null
  const p = g[0].point
  const x = Math.floor(p.x), z = Math.floor(p.z)
  return canPlace(x, 0, z) ? { x, y: 0, z } : null
}

let downPos = null

function onDown(e) {
  downPos = [e.clientX, e.clientY]
  pointerDown = true
}
function onMove(e) {
  if (pointerDown) return
  const rect = renderer.domElement.getBoundingClientRect()
  _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  if (tool.value === 'del') return
  if (tool.value === 'move' && !selCell.value) return
  const t = resolveTarget(_ndc)
  ghostMesh.visible = !!t
  if (t) {
    ghostMesh.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5)
    ghostMesh.material.color.setHex(
      tool.value === 'move' ? (cubes.value.find(c =>
        c.x === selCell.value.x && c.y === selCell.value.y && c.z === selCell.value.z)?.color ?? color.value) : color.value
    )
  }
}
function onUp(e) {
  pointerDown = false
  ghostMesh.visible = false
  if (!downPos) return
  if (Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 6) { downPos = null; return }
  downPos = null

  const rect = renderer.domElement.getBoundingClientRect()
  _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(_ndc, camera)

  if (tool.value === 'del') {
    const hits = raycaster.intersectObjects(cubeMeshesHit(), false)
    if (!hits.length) return
    const c = hits[0].object.userData
    pushState()
    removeAt(c.x, c.y, c.z)
    return
  }

  if (tool.value === 'move') {
    const hits = raycaster.intersectObjects(cubeMeshesHit(), false)
    if (!selCell.value) {
      // 先选中一个方块
      if (!hits.length) return
      const c = hits[0].object.userData
      selCell.value = { x: c.x, y: c.y, z: c.z }
      updateFrame()
      return
    }
    // 已有选中
    if (hits.length) {
      const c = hits[0].object.userData
      const same = c.x === selCell.value.x && c.y === selCell.value.y && c.z === selCell.value.z
      if (same) { selCell.value = null; updateFrame(); return }  // 点自己 = 取消
      // 点其它方块：若它的外面有空位 → 把选中的搬过去（可堆叠/并排）
      const t = resolveTarget(_ndc)
      if (t) { doMoveCube(t); return }
      // 没空位就换成点中的这个方块
      selCell.value = { x: c.x, y: c.y, z: c.z }
      updateFrame()
      return
    }
    const t = resolveTarget(_ndc)
    if (!t) return
    doMoveCube(t)
    return
  }

  // 添加
  const t = resolveTarget(_ndc)
  if (!t) return
  pushState()
  addAt(t.x, t.y, t.z)
  hint.value = total.value + ' 个啦！继续搭，或者点右侧「快速示例」换着玩。'
}

watch(tool, () => {
  selCell.value = null
  ghostMesh && (ghostMesh.visible = false)
  updateFrame()
})
watch(color, () => { if (ghostMesh) ghostMesh.material.color.setHex(color.value) })

function resize() {
  if (!renderer || !container.value) return
  const w = container.value.clientWidth || 1
  const h = container.value.clientHeight || 1
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
}

function disposeCubes() {
  cubeMeshes.forEach(m => {
    scene.remove(m)
    if (!Array.isArray(m.material)) m.material.dispose()
  })
  cubeMeshes.length = 0
}

onMounted(() => {
  init()
  renderCubes()
  fitCamera()
  loadPreset('stairs')
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointermove', onMove)
  renderer.domElement.addEventListener('pointerup', onUp)
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  disposeCubes()
  scene?.remove(ground)
  scene?.remove(gridLines)
  scene?.remove(ghostMesh)
  scene?.remove(frame)
  renderer?.domElement.removeEventListener('pointerdown', onDown)
  renderer?.domElement.removeEventListener('pointermove', onMove)
  renderer?.domElement.removeEventListener('pointerup', onUp)
  window.removeEventListener('resize', resize)
  boxGeo.dispose()
  renderer?.dispose()
})
</script>

<style scoped>
.bl-wrap { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: #f5f8fc; overflow: hidden; }
.bl-toolbar { flex: 0 0 auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 8px 12px; background: #fff; border-bottom: 1px solid #e5ebf2; }
.bl-seg { display: inline-flex; border: 1px solid #d6dfeb; border-radius: 9px; overflow: hidden; background: #f6f9fc; }
.bl-seg button { border: 0; background: transparent; padding: 7px 12px; font-size: 13px; color: #526174; cursor: pointer; }
.bl-seg button + button { border-left: 1px solid #e2e9f1; }
.bl-seg button.active { background: #3e7fe8; color: #fff; font-weight: 700; }
.bl-colors { display: flex; gap: 4px; align-items: center; }
.bl-color { width: 21px; height: 21px; border-radius: 6px; border: 2px solid #fff; box-shadow: 0 0 0 1px #ccd8e6; cursor: pointer; }
.bl-color.on { box-shadow: 0 0 0 2px #3e7fe8; transform: scale(1.1); }
.bl-act { border: 1px solid #d5dfec; background: #fff; border-radius: 8px; padding: 7px 12px; font-size: 13px; color: #526174; cursor: pointer; }
.bl-act:disabled { opacity: .45; cursor: default; }
.bl-danger { color: #c75050; }
.bl-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 260px; overflow: hidden; }
.bl-stage { position: relative; min-width: 0; min-height: 0; }
.bl-viewer { position: absolute; inset: 0; }
.bl-viewer canvas { display: block; width: 100%; height: 100%; }
.bl-hint { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; color: #fff; background: rgba(45, 90, 160, .86); padding: 7px 16px; border-radius: 99px; white-space: nowrap; max-width: 90%; overflow: hidden; text-overflow: ellipsis; }
.bl-side { padding: 14px; background: #fff; border-left: 1px solid #e1e8f0; overflow: auto; }
.bl-card { margin-bottom: 14px; padding: 13px; border-radius: 11px; background: #f4f8fc; border: 1px solid #e0e9f3; }
.bl-card strong { display: block; font-size: 13px; margin-bottom: 9px; }
.bl-count { display: flex; align-items: baseline; gap: 8px; background: #eef4ff; border-color: #d4e3fb; }
.bl-count-num { font-size: 34px; font-weight: 800; color: #2f6fe0; line-height: 1; }
.bl-count-txt { font-size: 13px; color: #526174; }
.bl-layers { display: flex; flex-direction: column; gap: 4px; }
.bl-layer { display: flex; justify-content: space-between; font-size: 12px; color: #5a6b80; padding: 3px 8px; background: #fff; border-radius: 6px; }
.bl-layer b { color: #2f6fe0; }
.bl-presets { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.bl-presets button { border: 1px solid #cfe0f5; background: #fff; color: #2f6fe0; border-radius: 8px; padding: 8px 4px; font-size: 12px; font-weight: 700; cursor: pointer; }
.bl-presets button:hover { background: #eaf2ff; }
.bl-tip ul { margin: 0; padding-left: 16px; }
.bl-tip li { font-size: 12px; color: #4d5f75; line-height: 1.75; }
@media (max-width: 900px) { .bl-main { grid-template-columns: 1fr; } }
</style>
