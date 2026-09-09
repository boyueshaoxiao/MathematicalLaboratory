<template>
  <div class="mv-wrap">
    <div class="mv-grid">
      <div ref="perEl" class="mv-cell">
        <div class="mv-label">3D 自由视角 <span>可旋转 · 可缩放</span></div>
      </div>
      <div ref="topEl" class="mv-cell">
        <div class="mv-label">俯视图</div>
      </div>
      <div ref="frontEl" class="mv-cell">
        <div class="mv-label">正视图</div>
      </div>
      <div ref="sideEl" class="mv-cell">
        <div class="mv-label">侧视图</div>
      </div>
    </div>
    <div class="mv-hint">左上的 3D 视图可自由旋转观察；右侧三个视图从固定方向投影，随图形摆放实时刷新。橙色虚线是面内对角线。</div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createShapeObject, applyAppearance } from '../geometry/factory.js'

const props = defineProps({
  shapes: { type: Array, default: () => [] },
  showGrid: { type: Boolean, default: true },
  showEdges: { type: Boolean, default: true },
  transparent: { type: Boolean, default: false },
  showDiag: { type: Boolean, default: false }
})

const perEl = ref()
const topEl = ref()
const frontEl = ref()
const sideEl = ref()

const viewCells = [] // { el, cam, kind, renderer }
let scene = null
let controls = null
let rafId = 0
let disposed = false

function disposeDeep(root) {
  root.traverse(o => {
    o.geometry?.dispose?.()
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose())
      else o.material.dispose()
    }
  })
}

// 六个面的面内对角线（虚线）：俯/正/侧视图各自能看到对应投影轮廓的两条对角线
function buildDiagonalLines(box) {
  const [minX, minY, minZ] = box.min.toArray()
  const [maxX, maxY, maxZ] = box.max.toArray()
  const v = []
  const add = (a, b) => { v.push(...a, ...b) }
  // XZ 面（上下）→ 俯视图可见
  for (const [x0, z0, x1, z1] of [[minX, minZ, maxX, maxZ], [maxX, minZ, minX, maxZ]]) {
    add([x0, maxY, z0], [x1, maxY, z1])
    add([x0, minY, z0], [x1, minY, z1])
  }
  // XY 面（前后）→ 正视图可见
  for (const [x0, y0, x1, y1] of [[minX, minY, maxX, maxY], [maxX, minY, minX, maxY]]) {
    add([x0, y0, maxZ], [x1, y1, maxZ])
    add([x0, y0, minZ], [x1, y1, minZ])
  }
  // ZY 面（左右）→ 侧视图可见
  for (const [z0, y0, z1, y1] of [[minZ, minY, maxZ, maxY], [maxZ, minY, minZ, maxY]]) {
    add([maxX, y0, z0], [maxX, y1, z1])
    add([minX, y0, z0], [minX, y1, z1])
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  return new THREE.LineSegments(geo,
    new THREE.LineBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.55 }))
}

function syncObjects() {
  // 移除旧图形（保留网格）
  scene.children
    .filter(c => c.userData._kind === 'shape')
    .forEach(c => { scene.remove(c); disposeDeep(c) })

  props.shapes.forEach(s => {
    const obj = createShapeObject(s)
    const mesh = obj.children[0]
    const box = new THREE.Box3().setFromObject(mesh)
    const diag = buildDiagonalLines(box)
    diag.userData._diag = true
    obj.add(diag)
    obj.userData._kind = 'shape'
    scene.add(obj)
  })
  applyLook()
  refit()
}

function shapesBBox() {
  const box = new THREE.Box3()
  scene.children.forEach(c => { if (c.userData._kind === 'shape') box.expandByObject(c) })
  if (box.isEmpty()) box.set(new THREE.Vector3(-1.6, -1.2, -1.6), new THREE.Vector3(1.6, 1.6, 1.6))
  return box
}

function refit() {
  const sphere = shapesBBox().getBoundingSphere(new THREE.Sphere())
  const half = Math.max(1.6, sphere.radius * 1.4)
  const center = sphere.center
  for (const vc of viewCells) {
    if (vc.kind === 'per') {
      const d = half / Math.tan(THREE.MathUtils.degToRad(vc.cam.fov / 2)) * 1.15
      vc.cam.position.copy(center).addScaledVector(new THREE.Vector3(1.3, 1, 1.7).normalize(), d)
      vc.cam.near = Math.max(0.05, d / 300)
      vc.cam.far = Math.max(80, d * 20)
      vc.cam.updateProjectionMatrix()
      controls?.target.copy(center)
      continue
    }
    const w = vc.el.clientWidth || 2
    const h = vc.el.clientHeight || 2
    const aspect = w / h
    vc.cam.left = -half * aspect
    vc.cam.right = half * aspect
    vc.cam.top = half
    vc.cam.bottom = -half
    vc.cam.position.copy(center).addScaledVector(vc.cam.userData.dir, 60)
    vc.cam.updateProjectionMatrix()
  }
}

function makeOrtho(el, dir, up) {
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 500)
  cam.userData.dir = dir
  cam.up.copy(up)
  cam.position.copy(dir).multiplyScalar(60)
  cam.lookAt(0, 0, 0)
  return cam
}

function initView(el, kind, make) {
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth || 2, el.clientHeight || 2, false)
  el.appendChild(renderer.domElement)
  const cam = make()
  viewCells.push({ el, cam, kind, renderer })
}

function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf8fafd)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb3c9, 2.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(4, 6, 5)
  scene.add(sun)
  const grid = new THREE.GridHelper(18, 18, 0x90a6bd, 0xd8e1ec)
  scene.add(grid)
  grid.userData._kind = 'grid'

  initView(perEl.value, 'per', () => {
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 300)
    cam.position.set(5, 4.5, 7)
    cam.lookAt(0, 0, 0)
    return cam
  })
  const perCell = viewCells[0]
  controls = new OrbitControls(perCell.cam, perCell.renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0.5, 0)

  initView(topEl.value, 'top', () => makeOrtho(topEl.value, new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)))
  initView(frontEl.value, 'front', () => makeOrtho(frontEl.value, new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)))
  initView(sideEl.value, 'side', () => makeOrtho(sideEl.value, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)))
  applyGrid()
}

function applyGrid() {
  scene.children.forEach(c => { if (c.userData._kind === 'grid') c.visible = props.showGrid })
}

// 统一应用半透明/棱线（共享 factory.applyAppearance）+ 对角线开关
function applyLook() {
  scene.children.forEach(c => {
    if (c.userData._kind !== 'shape') return
    applyAppearance(c, { transparent: props.transparent, showEdges: props.showEdges })
    const diag = c.children.find(x => x.userData._diag)
    if (diag) diag.visible = props.showDiag
  })
}

watch(() => props.shapes, () => nextTick(syncObjects), { deep: true })
watch(() => props.showGrid, applyGrid)
watch(() => [props.showEdges, props.transparent, props.showDiag], applyLook)

function renderLoop() {
  if (disposed) return
  rafId = requestAnimationFrame(renderLoop)
  controls?.update()
  for (const vc of viewCells) vc.renderer.render(scene, vc.cam)
}

function resize() {
  for (const vc of viewCells) {
    const w = vc.el.clientWidth || 2
    const h = vc.el.clientHeight || 2
    vc.renderer.setSize(w, h, false)
    if (vc.kind === 'per') {
      vc.cam.aspect = w / h
      vc.cam.updateProjectionMatrix()
    }
  }
  refit()
}

onMounted(() => {
  initScene()
  syncObjects()
  resize()
  window.addEventListener('resize', resize)
  renderLoop()
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  for (const vc of viewCells) {
    vc.renderer.dispose()
    vc.renderer.domElement.remove()
  }
  controls?.dispose()
})
</script>
