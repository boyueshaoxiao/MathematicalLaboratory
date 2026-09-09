<template>
  <div class="st-wrap">
    <div class="st-toolbar">
      <label class="st-ctl">观察
        <select v-model="shape" @change="rebuildAll">
          <option v-for="s in SHAPES" :key="s.type" :value="s.type">{{ s.name }}</option>
        </select>
      </label>
      <div class="st-steps">
        <span v-for="(s, i) in steps" :key="i" class="st-step" :class="{ on: phase === i, done: phase > i }"
          @click="gotoStep(i)">
          {{ s }}
        </span>
      </div>
      <button class="st-again" @click="rebuildAll">重新数</button>
    </div>

    <div class="st-main">
      <div class="st-viewer-wrap">
        <div ref="container" class="st-viewer"></div>
        <div class="st-hint" v-if="phase < 3">点一点图中{{ phase === 0 ? '的每个面' : phase === 1 ? '的每条棱' : '的每个顶点' }}，把它点亮！</div>
        <div class="st-hint" v-else>🎉 全部找到了！</div>
      </div>

      <aside class="st-side">
        <template v-if="phase < 3">
          <div class="st-target">
            <div class="st-icon">{{ phase === 0 ? '▦' : phase === 1 ? '｜' : '●' }}</div>
            <div>
              <div class="st-tt">{{ steps[phase] }}</div>
              <div class="st-progress">
                <span class="bar"><i :style="{ width: progressPct + '%' }"></i></span>
                <b>{{ pickedCount }} / {{ targetCount }}</b>
              </div>
            </div>
          </div>
          <button class="st-main-btn" :disabled="!phaseDone" @click="nextPhase">
            {{ phaseDone ? '完成，下一步 →' : '继续找…' }}
          </button>
          <p class="st-note" v-if="phase === 0">面：平平的表面，摸一摸正方体就能数清楚。</p>
          <p class="st-note" v-else-if="phase === 1">棱：两个面相交的边。数的时候按方向一组一组数，不容易漏。</p>
          <p class="st-note" v-else>顶点：三条棱相交的“角尖尖”。</p>
        </template>

        <template v-else>
          <div class="st-result">
            <strong>数出来啦！</strong>
            <table class="st-table">
              <tr><td>面（F）</td><td class="num">{{ F }}</td></tr>
              <tr><td>顶点（V）</td><td class="num">{{ V }}</td></tr>
              <tr><td>棱（E）</td><td class="num">{{ E }}</td></tr>
            </table>
            <div class="st-euler">
              面 + 顶点 − 棱<br />
              <span>{{ F }} + {{ V }} − {{ E }} = <b>{{ F + V - E }}</b></span>
            </div>
            <p class="st-euler-note">任意凸多面体都满足：<b>面 + 顶点 − 棱 = 2</b>，这就是欧拉公式。</p>
            <p class="st-euler-note2">试试换成其它图形，这个等式每次都成立哦！</p>
            <button class="st-main-btn" @click="shape = 'cube'; rebuildAll()">再试一次</button>
          </div>
        </template>

        <div class="st-tip">
          <strong>🧠 小知识</strong>
          <ul>
            <li>“面”平平的，用手摸得到。</li>
            <li>“棱”是两个面碰在一起的边。</li>
            <li>“顶点”是尖尖的角，几条棱碰在一起。</li>
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
import { buildPolyData } from '../geometry/unfold'

const SHAPES = [
  { type: 'cube', name: '正方体' },
  { type: 'cuboid', name: '长方体' },
  { type: 'triangularPrism', name: '三棱柱' },
  { type: 'pentagonalPrism', name: '五棱柱' },
  { type: 'hexagonalPrism', name: '六棱柱' },
  { type: 'triangularPyramid', name: '三棱锥' },
  { type: 'squarePyramid', name: '四棱锥' },
  { type: 'pentagonalPyramid', name: '五棱锥' },
  { type: 'hexagonalPyramid', name: '六棱锥' }
]
const steps = ['数一数 面', '数一数 棱', '数一数 顶点']

const shape = ref('cube')
const phase = ref(0)
const picked = ref([])

const container = ref()
let scene, camera, renderer, controls, animationId
let root = null
const meshes = { face: [], edge: [], vertex: [] }
const dataRef = { corners: [], faces: [], V: 0, E: 0, F: 0 }

const targetCount = computed(() => [dataRef.F, dataRef.E, dataRef.V][phase.value] ?? 0)
const pickedCount = computed(() => picked.value.length)
const phaseDone = computed(() => picked.value.length >= targetCount.value)
const progressPct = computed(() => targetCount.value ? Math.round(pickedCount.value / targetCount.value * 100) : 0)
const V = computed(() => dataRef.V)
const E = computed(() => dataRef.E)
const F = computed(() => dataRef.F)

const FACE_COLORS = [0x8fb6f2, 0x9ed6c0, 0xffc9a0, 0xc5b3f0, 0xf5b0b0, 0x9edbe0, 0xd3c9a8, 0xb0c8f5]

function buildGeometry(type) {
  const d = buildPolyData(type)
  dataRef.corners = d.corners
  dataRef.faces = d.faces
  dataRef.F = d.faces.length
  dataRef.E = d.faces.reduce((s, f) => s + f.idx.length, 0) / 2
  dataRef.V = d.corners.length
}

function clearRoot() {
  if (root) {
    scene.remove(root)
    root.traverse(o => {
      o.geometry?.dispose?.()
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material.dispose() }
    })
    root = null
  }
  meshes.face = []; meshes.edge = []; meshes.vertex = []
}

function rebuildAll() {
  clearRoot()
  buildGeometry(shape.value)
  root = new THREE.Group()
  scene.add(root)
  const { corners, faces } = dataRef

  // —— 面：每个逻辑面独立 mesh，便于点选 ——
  const fmat = []
  faces.forEach((f, i) => {
    const color = FACE_COLORS[i % FACE_COLORS.length]
    const base = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.62, metalness: 0.02 })
    const lit = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffa000, emissiveIntensity: 0.5, side: THREE.DoubleSide })
    fmat.push([base, lit])
    const pts = f.idx.map(ci => new THREE.Vector3(...corners[ci]))
    const arr = []
    for (let k = 1; k < pts.length - 1; k++) {
      arr.push(...pts[0].toArray(), ...pts[k].toArray(), ...pts[k + 1].toArray())
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    geo.computeVertexNormals()
    const mesh = new THREE.Mesh(geo, base)
    mesh.userData = { kind: 'face', i, base, lit }
    root.add(mesh)
    meshes.face.push(mesh)
  })

  // —— 棱：按“角点对”去重，一条棱一根线 ——
  const edgeMap = new Map()
  faces.forEach(f => {
    f.idx.forEach((a, k) => {
      const b = f.idx[(k + 1) % f.idx.length]
      const key = a < b ? a + '-' + b : b + '-' + a
      if (!edgeMap.has(key)) edgeMap.set(key, [a, b])
    })
  })
  let ei = 0
  for (const [key, [a, b]] of edgeMap) {
    const arr = [...corners[a], ...corners[b]]
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x263a55, transparent: true, opacity: 0.55 }))
    line.userData = { kind: 'edge', i: ei }
    root.add(line)
    meshes.edge.push(line)
    ei++
  }

  // —— 顶点：小球体（沿“体心→角点”方向略微外移，像小圆球，方便点选）——
  const cent = new THREE.Vector3()
  corners.forEach(c => cent.add(new THREE.Vector3(...c)))
  cent.divideScalar(corners.length)
  const ball = new THREE.SphereGeometry(0.12, 16, 12)
  corners.forEach((c, vi) => {
    const dir = new THREE.Vector3(...c).sub(cent)
    const len = dir.length() || 1
    const pos = new THREE.Vector3(...c).addScaledVector(dir.divideScalar(len), 0.05)
    const mesh = new THREE.Mesh(ball,
      new THREE.MeshStandardMaterial({ color: 0x7a5cf0, emissive: 0x4a2ce0, emissiveIntensity: 0.35 }))
    mesh.position.copy(pos)
    mesh.userData = { kind: 'vertex', i: vi }
    root.add(mesh)
    meshes.vertex.push(mesh)
  })

  phase.value = 0
  resetPhase()
  fitCamera()
}

function resetPhase() {
  picked.value = []
  applyStyle()
}

function nextPhase() {
  phase.value = Math.min(3, phase.value + 1)
  picked.value = []
  applyStyle()
}

// 顶部步骤标签可直接点击跳转（面/棱/顶点任选其一练习）
function gotoStep(i) {
  if (i === phase.value) return
  phase.value = i
  picked.value = []
  busy = false
  applyStyle()
}

watch(phase, () => {
  picked.value = []
  applyStyle()
})

function applyStyle() {
  if (!root) return
  const p = phase.value
  meshes.face.forEach(m => {
    m.visible = true
    if (p === 0) {
      const sel = picked.value.includes(m.userData.i)
      m.material = sel ? m.userData.lit : m.userData.base
    } else {
      m.material = m.userData.base
      m.material.transparent = true
      m.material.opacity = 0.3
    }
  })
  meshes.edge.forEach(m => {
    if (p === 1) {
      m.visible = true
      const sel = picked.value.includes(m.userData.i)
      m.material.color.setHex(sel ? 0xff6b3d : 0x1d3352)
      m.material.opacity = sel ? 1 : 0.5
    } else {
      m.material.color.setHex(0x1d3352)
      m.material.opacity = 0.55
    }
  })
  meshes.vertex.forEach(m => {
    m.visible = p === 2
    if (p === 2) {
      const sel = picked.value.includes(m.userData.i)
      m.material.color.setHex(sel ? 0xff8b3d : 0x7a5cf0)
    }
  })
}

function fitCamera() {
  const d = dataRef.corners
  const xs = d.map(c => c[0]); const ys = d.map(c => c[1]); const zs = d.map(c => c[2])
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs))
  const dist = size * 4.6 + 0.8
  camera.position.set(cx + dist * 0.72, cy + dist * 0.55, cz + dist * 0.9)
  controls.target.set(cx, cy - size * 0.18, cz)
  controls.update()
}

// —— 点选 ——
const raycaster = new THREE.Raycaster()
raycaster.params.Line.threshold = 0.1
const _ndc = new THREE.Vector2()
let downPos = null
let busy = false

function onDown(e) {
  downPos = [e.clientX, e.clientY]
}
function onUp(e) {
  if (phase.value >= 3) return
  if (!downPos || Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]) > 5) { downPos = null; return }
  downPos = null
  const rect = renderer.domElement.getBoundingClientRect()
  _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(_ndc, camera)
  const list = phase.value === 0 ? meshes.face : phase.value === 1 ? meshes.edge : meshes.vertex
  const hits = raycaster.intersectObjects(list, false)
  if (!hits.length) return
  let obj = hits[0].object
  const kind = obj.userData.kind
  if (kind !== ['face', 'edge', 'vertex'][phase.value]) return
  const i = obj.userData.i
  if (busy) return
  busy = true
  setTimeout(() => { busy = false }, 30)
  togglePick(i)
  applyStyle()
}

function togglePick(i) {
  const idx = picked.value.indexOf(i)
  if (idx >= 0) picked.value.splice(idx, 1)
  else picked.value.push(i)
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f8fc)
  camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.value.appendChild(renderer.domElement)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x91a4bd, 2.4))
  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(5, 10, 8)
  scene.add(light)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  resize()
  animate()
}

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

onMounted(() => {
  init()
  rebuildAll()
  renderer.domElement.addEventListener('pointerdown', onDown)
  renderer.domElement.addEventListener('pointerup', onUp)
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  clearRoot()
  renderer?.domElement.removeEventListener('pointerdown', onDown)
  renderer?.domElement.removeEventListener('pointerup', onUp)
  window.removeEventListener('resize', resize)
  renderer?.dispose()
})
</script>

<style scoped>
.st-wrap { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: #f5f8fc; overflow: hidden; }
.st-toolbar { flex: 0 0 auto; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 9px 14px; background: #fff; border-bottom: 1px solid #e5ebf2; }
.st-ctl { display: flex; align-items: center; gap: 7px; font-size: 13px; color: #526174; }
.st-ctl select { border: 1px solid #d6dfeb; border-radius: 7px; padding: 6px 8px; background: #fff; color: #263548; }
.st-steps { display: flex; gap: 6px; flex-wrap: wrap; }
.st-step { font-size: 12px; color: #98a5b5; padding: 4px 10px; border-radius: 99px; background: #f0f4f9; border: 1px solid #e2e9f1; cursor: pointer; transition: transform .12s; }
.st-step:hover { transform: translateY(-1px); }
.st-step.on { color: #fff; background: #3e7fe8; border-color: #3e7fe8; font-weight: 700; }
.st-step.done { color: #2e9e6b; background: #e7f7ee; border-color: #bfe5cd; }
.st-again { margin-left: auto; border: 1px solid #d5dfec; background: #fff; border-radius: 7px; padding: 6px 12px; font-size: 12px; color: #526174; cursor: pointer; }
.st-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 280px; overflow: hidden; }
.st-viewer-wrap { position: relative; min-width: 0; min-height: 0; }
.st-viewer { position: absolute; inset: 0; }
.st-viewer canvas { display: block; width: 100%; height: 100%; }
.st-hint { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); font-size: 13px; font-weight: 700; color: #fff; background: rgba(45, 90, 160, .85); padding: 7px 16px; border-radius: 99px; white-space: nowrap; }
.st-side { padding: 16px; background: #fff; border-left: 1px solid #e1e8f0; overflow: auto; }
.st-target { display: flex; align-items: center; gap: 13px; padding: 12px; border-radius: 11px; background: #f4f8fc; border: 1px solid #e0e9f3; }
.st-icon { width: 44px; height: 44px; border-radius: 10px; background: #e8f0ff; color: #2f6fe0; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.st-tt { font-weight: 800; font-size: 14px; }
.st-progress { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.st-progress .bar { width: 130px; height: 9px; background: #e6ecf4; border-radius: 99px; overflow: hidden; display: block; }
.st-progress .bar i { display: block; height: 100%; background: #3e7fe8; border-radius: 99px; transition: width .2s; }
.st-progress b { color: #2f6fe0; font-size: 14px; }
.st-main-btn { margin-top: 12px; width: 100%; border: 0; background: #3e7fe8; color: #fff; border-radius: 10px; padding: 11px 0; font-size: 14px; font-weight: 800; cursor: pointer; }
.st-main-btn:disabled { background: #c4d3e8; cursor: default; }
.st-note { font-size: 12.5px; color: #5a6b80; line-height: 1.8; margin: 10px 2px; }
.st-result { padding: 14px; border-radius: 12px; background: #fffbea; border: 1px solid #f2e0bb; }
.st-result strong { font-size: 15px; }
.st-table { width: 100%; margin: 10px 0; border-collapse: collapse; }
.st-table td { padding: 7px 10px; font-size: 13.5px; border-bottom: 1px dashed #ead9b0; }
.st-table .num { text-align: right; font-weight: 800; color: #b06a1e; font-size: 17px; }
.st-euler { text-align: center; font-size: 13px; color: #5a4a2a; line-height: 1.9; padding: 8px; background: #fff; border-radius: 9px; }
.st-euler span { font-size: 17px; font-weight: 800; color: #c25f14; }
.st-euler b { color: #2e9e6b; }
.st-euler-note { font-size: 12.5px; color: #8a6a35; line-height: 1.8; }
.st-euler-note2 { font-size: 12px; color: #a08a5a; }
.st-tip { margin-top: 15px; padding: 12px; border-radius: 10px; background: #f4f8fc; border: 1px solid #dfeaf6; font-size: 12.5px; line-height: 1.8; color: #4d5f75; }
.st-tip strong { display: block; margin-bottom: 6px; }
.st-tip ul { margin: 0; padding-left: 17px; }
@media (max-width: 900px) { .st-main { grid-template-columns: 1fr; } }
</style>
