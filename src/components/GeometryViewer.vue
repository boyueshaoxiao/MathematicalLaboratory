<template>
  <div ref="container" class="viewer"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createShapeObject, applyAppearance } from '../geometry/factory'

const props = defineProps({
  shapes: { type: Array, default: () => [] },
  view: { type: String, default: 'free' },
  showGrid: { type: Boolean, default: true },
  showEdges: { type: Boolean, default: true },
  transparent: { type: Boolean, default: false }
})
const emit = defineEmits(['select', 'move'])

const container = ref()
let scene, camera, renderer, controls, animationId
let objects = new Map()

// —— 鼠标直接拖拽几何体移动 ——
const raycaster = new THREE.Raycaster()
raycaster.params.Line.threshold = 0.08 // 避免棱线“粗拾取”误选中
const _ndc = new THREE.Vector2()
const _dir = new THREE.Vector3()
const _plane = new THREE.Plane()
const _cur = new THREE.Vector3()
const _grab = new THREE.Vector3()
const _delta = new THREE.Vector3()
let drag = null
const round3 = v => Math.round(v * 1000) / 1000

const cameras = {
  front: [0, 0, 11],
  back: [0, 0, -11],
  left: [-11, 0, 0],
  right: [11, 0, 0],
  top: [0, 11, 0],
  bottom: [0, -11, 0]
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f8fc)
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000)
  camera.position.set(7, 6, 9)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x91a4bd, 2.2))
  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(5, 10, 8)
  scene.add(light)

  const grid = new THREE.GridHelper(20, 20, 0xb8c7d9, 0xd9e2ec)
  grid.userData.isGrid = true
  scene.add(grid)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)

  resize()
  animate()
}

function syncObjects() {
  const incoming = new Map(props.shapes.map(s => [s.id, s]))
  for (const [id, obj] of objects) {
    if (!incoming.has(id)) {
      scene.remove(obj)
      objects.delete(id)
    }
  }
  for (const shape of props.shapes) {
    let obj = objects.get(shape.id)
    if (!obj) {
      obj = createShapeObject(shape)
      objects.set(shape.id, obj)
      scene.add(obj)
    }
    obj.position.set(shape.position.x, shape.position.y, shape.position.z)
    obj.rotation.set(shape.rotation.x, shape.rotation.y, shape.rotation.z)
    obj.scale.setScalar(shape.scale ?? 1)
    applyAppearance(obj, { transparent: props.transparent, showEdges: props.showEdges })
  }
}

// 工具栏的“半透明 / 棱线”切换即时生效（不依赖图形数据变化）
function refreshAppearance() {
  const opts = { transparent: props.transparent, showEdges: props.showEdges }
  for (const obj of objects.values()) applyAppearance(obj, opts)
}

function setView(v) {
  if (!camera || v === 'free') return
  const target = new THREE.Vector3(...cameras[v])
  camera.position.copy(target)
  controls.target.set(0, 0, 0)
  controls.update()
}

function resize() {
  if (!renderer || !container.value) return
  const w = container.value.clientWidth || 1
  const h = container.value.clientHeight || 1
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

// —— 拾取与拖拽 ——
function toNdc(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  _ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  _ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

// 返回鼠标下被点中几何体的 id（无则 null）
function pickShape(e) {
  if (!camera || !renderer) return null
  toNdc(e)
  raycaster.setFromCamera(_ndc, camera)
  const hits = raycaster.intersectObjects(Array.from(objects.values()), true)
  for (const h of hits) {
    let o = h.object
    while (o && o.userData.shapeId == null) o = o.parent
    if (o && o.userData.shapeId != null) return o.userData.shapeId
  }
  return null
}

// 左键点中几何体 → 选中并拖拽移动
function onPointerDown(e) {
  if (e.button !== 0 || e.pointerType === 'touch') return
  const id = pickShape(e)
  if (id == null) return
  e.preventDefault()
  e.stopPropagation() // 不让 OrbitControls 把这次按下当作“旋转视角”
  const obj = objects.get(id)
  const start = obj.position.clone()
  // 拖动平面：近乎平视（前/后/左/右）用垂直屏幕的平面 → 光标水平/竖直对应世界 x/y；
  // 俯视与默认斜俯视角用地面(y 固定) → 物体在地面滑动
  const dir = camera.getWorldDirection(_dir)
  const sideView = Math.abs(dir.y) < 0.35
  const normal = sideView ? dir.clone() : _dir.set(0, 1, 0)
  _plane.setFromNormalAndCoplanarPoint(normal, start)
  toNdc(e)
  raycaster.setFromCamera(_ndc, camera)
  if (!raycaster.ray.intersectPlane(_plane, _grab)) _grab.copy(start)
  drag = { id, start: start.clone(), mode: sideView ? 'view' : 'ground', grab: _grab.clone() }
  renderer.domElement.style.cursor = 'grabbing'
  try { renderer.domElement.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  emit('select', id)
}

function onPointerMove(e) {
  if (!drag) {
    // 悬停反馈：在几何体上显示抓手光标
    if (!renderer) return
    if (!container.value.contains(e.target)) {
      renderer.domElement.style.cursor = ''
      return
    }
    if (e.buttons !== 0) return
    renderer.domElement.style.cursor = pickShape(e) != null ? 'grab' : ''
    return
  }
  toNdc(e)
  raycaster.setFromCamera(_ndc, camera)
  if (!raycaster.ray.intersectPlane(_plane, _cur)) return
  _delta.subVectors(_cur, drag.grab)
  const x = round3(drag.start.x + _delta.x)
  const y = drag.mode === 'ground' ? round3(drag.start.y) : round3(drag.start.y + _delta.y)
  const z = round3(drag.start.z + _delta.z)
  emit('move', drag.id, x, y, z)
}

function onPointerUp(e) {
  if (!drag) return
  drag = null
  renderer.domElement.style.cursor = ''
  try { renderer.domElement.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
}

function animate() {
  animationId = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
}

watch(() => props.shapes, syncObjects, { deep: true })
watch(() => props.view, setView)
watch(() => props.transparent, refreshAppearance)
watch(() => props.showEdges, refreshAppearance)
watch(() => props.showGrid, v => {
  const grid = scene?.children.find(x => x.userData.isGrid)
  if (grid) grid.visible = v
})
onMounted(() => {
  init()
  syncObjects()
  // 捕获阶段先于 OrbitControls（监听 canvas）处理按下，点中几何体时拦截为“移动”
  container.value.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
  container.value?.removeEventListener('pointerdown', onPointerDown, true)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  renderer?.dispose()
})
</script>
