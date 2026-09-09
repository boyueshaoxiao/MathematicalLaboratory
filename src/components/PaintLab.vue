<template>
  <div class="pl-wrap">
    <div class="pl-toolbar">
      <div class="pl-seg">
        <button :class="{ active: tab === 'explore' }" @click="tab = 'explore'">🔍 探索</button>
        <button :class="{ active: tab === 'challenge' }" @click="tab = 'challenge'">🎯 挑战</button>
      </div>
      <label class="pl-ctl" v-if="tab === 'explore'">
        边长
        <select v-model.number="n">
          <option v-for="i in [2, 3, 4, 5, 6]" :key="i" :value="i">{{ i }} × {{ i }} × {{ i }}</option>
        </select>
      </label>
      <label class="pl-ctl" v-if="tab === 'explore'">
        拆开空隙
        <input type="range" min="0" max="1" step="0.05" v-model.number="gap" />
      </label>
      <label class="pl-ctl" v-if="tab === 'explore'">
        <input type="checkbox" v-model="rotate" /> 自动旋转
      </label>
      <div v-if="tab === 'explore'" class="pl-sum">
        共 <b>{{ total }}</b> 个小正方体
      </div>
    </div>

    <div class="pl-main">
      <div class="pl-viewer-wrap">
        <div ref="container" class="pl-viewer"></div>
        <div class="pl-legend">
          <button v-for="c in classLegend" :key="c.cls"
            class="pl-lg" :class="{ on: highlight === c.cls || highlight === 'all' }"
            @click="toggleClass(c.cls)">
            <i :style="{ background: c.color }"></i>{{ c.name }}
          </button>
          <button class="pl-lg" :class="{ on: highlight === 'all' }" @click="highlight = 'all'">
            <i style="background:linear-gradient(90deg,#8fd0c2,#c9d6e4,#f0b3a8,#ffd9a0)"></i>全部
          </button>
        </div>
        <div class="pl-hint">🖱 拖动旋转 · 滚轮缩放</div>
      </div>

      <aside class="pl-side">
        <template v-if="tab === 'explore'">
          <div class="pl-card">
            <strong>表面涂上颜色，再切成小正方体：</strong>
            <table class="pl-table">
              <tr v-for="c in classLegend" :key="c.cls" :class="{ picked: highlight === c.cls }"
                @click="highlight = c.cls">
                <td><i class="pl-sq" :style="{ background: c.color }"></i></td>
                <td>{{ c.name }}</td>
                <td class="pl-num">{{ countOf(c.cls) }}</td>
              </tr>
            </table>
            <p class="pl-formula">{{ formula }}</p>
          </div>
          <div class="pl-card pl-tip">
            <strong>🧠 数的时候怎么想？</strong>
            <ul>
              <li>把大正方体想象成<b>剥洋葱</b>：最外面一层才“沾得到颜料”。</li>
              <li>最外面一层按位置分成：<b>角</b>、<b>棱</b>、<b>面</b>三种。</li>
              <li>再往里的都涂不到，它们组成了更小的正方体。</li>
            </ul>
          </div>
        </template>

        <template v-else>
          <div class="pl-card pl-q">
            <div class="pl-q-head">
              <span class="qnum">第 {{ index + 1 }} 题</span>
              <span class="ok">答对 {{ correct }}</span>
              <span class="no">答错 {{ wrong }}</span>
            </div>
            <p class="pl-q-text">
              把一个 <b>{{ quizN }}×{{ quizN }}×{{ quizN }}</b> 的大正方体每个面都涂上红色，
              再切成小正方体。<b>{{ askLabel }}</b>的小正方体有几个？
            </p>
            <div class="pl-opts">
              <button v-for="op in options" :key="op" class="pl-opt"
                :class="answered ? optState(op) : ''" :disabled="answered" @click="choose(op)">
                {{ op }}
              </button>
            </div>
            <transition name="fade">
              <div v-if="answered" class="pl-qresult" :class="right ? 'is-right' : 'is-wrong'">
                <div class="result-title">{{ right ? '答对啦！' : '答案：' + askCount }}</div>
                <p>{{ quizFormula }}</p>
                <button @click="next()">下一题</button>
              </div>
            </transition>
          </div>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const tab = ref('explore')
const n = ref(3)
const gap = ref(0.12)
const rotate = ref(true)
const highlight = ref('all')

// 每个小立方体“有几面被涂色”：在边界几轴即涂几面
const CLASS_COLOR = ['#aebccb', '#7fc4ef', '#59c49b', '#f2786b']
const CLASS_NAME = ['0 面（最里面）', '1 面（面中心）', '2 面（棱上）', '3 面（角上）']
const clsOf = (i, N) => (i === 0 ? 1 : 0) + (i === N - 1 ? 1 : 0)
function cubeClass(x, y, z, N) { return clsOf(x, N) + clsOf(y, N) + clsOf(z, N) }
function countFor(cls, N) {
  if (cls === 3) return 8
  if (cls === 2) return 12 * (N - 2)
  if (cls === 1) return 6 * (N - 2) * (N - 2)
  return Math.max(0, N - 2) ** 3
}
const countOf = cls => countFor(cls, n.value)
const total = computed(() => n.value ** 3)
const classLegend = computed(() => [3, 2, 1, 0].map(cls => ({
  cls,
  color: CLASS_COLOR[cls],
  name: CLASS_NAME[cls]
})))
function textFormula(N) {
  return `N=${N}：角上 3 面 → 8 个；棱上 2 面 → 12×(N−2)=${12 * (N - 2)} 个；面上 1 面 → 6×(N−2)²=${6 * (N - 2) ** 2} 个；里面 0 面 → (N−2)³=${Math.max(0, N - 2) ** 3} 个`
}
const formula = computed(() => textFormula(n.value))

function toggleClass(cls) {
  highlight.value = highlight.value === cls ? 'all' : cls
}

// ---------------- 3D 场景 ----------------
const container = ref()
let scene, camera, renderer, controls, animationId
let cubeGroup = null
let ground = null
const mats = { normal: [], dim: [] }

function makeMat(color, dim) {
  return new THREE.MeshStandardMaterial({
    color, roughness: 0.5, metalness: 0.05, transparent: true,
    opacity: dim ? 0.16 : 1, depthWrite: !dim
  })
}

function rebuild() {
  if (!scene || !cubeGroup) return
  while (cubeGroup.children.length) {
    const c = cubeGroup.children.pop()
    c.geometry?.dispose?.()
  }
  mats.normal.forEach(m => m.dispose())
  mats.dim.forEach(m => m.dispose())
  mats.normal = []; mats.dim = []
  const N = n.value
  const spacing = 1 + gap.value
  const box = new THREE.BoxGeometry(0.96, 0.96, 0.96)
  const off = (N - 1) * spacing / 2
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      for (let z = 0; z < N; z++) {
        const cls = cubeClass(x, y, z, N)
        const mesh = new THREE.Mesh(box,
          makeMat(CLASS_COLOR[cls], false))
        mesh.position.set(x * spacing - off, y * spacing, z * spacing - off)
        mesh.userData.cls = cls
        mesh.userData.idx = mats.normal.length
        cubeGroup.add(mesh)
        mats.normal.push(mesh.material)
        mats.dim.push(makeMat(CLASS_COLOR[cls], true))
      }
    }
  }
  applyHighlight()
  fitCamera()
}

function applyHighlight() {
  if (!cubeGroup) return
  const sel = highlight.value
  cubeGroup.children.forEach(mesh => {
    const idx = mesh.userData.idx
    if (sel === 'all' || mesh.userData.cls === sel) {
      mesh.material = mats.normal[idx]
      mesh.material.opacity = 1
    } else {
      mesh.material = mats.dim[idx]
    }
  })
}

function fitCamera() {
  const N = n.value
  const spacing = 1 + gap.value
  const cy = (N - 1) * spacing / 2 // 模型堆叠的中心高度（y 从地面 0 起）
  const half = ((N - 1) * spacing + 1) / 2 // 模型包围盒半宽
  // 依据包围盒大小估算相机到模型中心的距离
  const R = half * 5.4 + 2.2
  const dir = new THREE.Vector3(0.6, 0.85, 0.72).normalize()
  camera.position.set(dir.x * R, cy + dir.y * R, dir.z * R)
  controls.target.set(0, cy - half * 0.22, 0)
  controls.update()
}

function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f8fc)
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.value.appendChild(renderer.domElement)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x91a4bd, 2.0))
  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(5, 10, 8)
  scene.add(light)
  const grid = new THREE.GridHelper(14, 14, 0xb8c7d9, 0xd9e2ec)
  scene.add(grid)
  cubeGroup = new THREE.Group()
  scene.add(cubeGroup)
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
  if (cubeGroup && rotate.value) cubeGroup.rotation.y += 0.004
  renderer?.render(scene, camera)
}

watch(n, rebuild)
watch(gap, rebuild)
watch(highlight, applyHighlight)

// ---------------- 挑战题 ----------------
const challengeN = ref(3)
const askCls = ref(3)
const options = ref([])
const correct = ref(0)
const wrong = ref(0)
const index = ref(0)
const answered = ref(false)
const right = ref(false)
const picked = ref(null)

const quizN = computed(() => challengeN.value)
const askCount = computed(() => countFor(askCls.value, challengeN.value))
const askLabel = computed(() => CLASS_NAME[askCls.value])
const quizFormula = computed(() => textFormula(challengeN.value))

function newChallenge() {
  const N = 3 + Math.floor(Math.random() * 3) // 3~5
  challengeN.value = N
  const choices = [3, 2, 1, 0].filter(cls => countFor(cls, N) > 0)
  askCls.value = choices[Math.floor(Math.random() * choices.length)]
  const ans = countFor(askCls.value, N)
  // 生成互不相同的干扰项
  const candidates = new Set([ans])
  let guard = 0
  while (candidates.size < 4 && guard++ < 200) {
    const r = 1 + Math.floor(Math.random() * (N ** 3))
    candidates.add(r)
  }
  options.value = Array.from(candidates).sort(() => Math.random() - 0.5)
  answered.value = false
  right.value = false
  picked.value = null
  index.value++
}

function choose(op) {
  if (answered.value) return
  answered.value = true
  picked.value = op
  right.value = op === askCount.value
  right.value ? correct.value++ : wrong.value++
}

function optState(op) {
  if (op === askCount.value) return 'is-right'
  if (op === picked.value) return 'is-wrong'
  return 'is-dim'
}

function next() {
  newChallenge()
  n.value = challengeN.value
  highlight.value = 'all'
}

onMounted(() => {
  init()
  rebuild()
  newChallenge()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', resize)
  renderer?.dispose()
})
</script>

<style scoped>
.pl-wrap { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: #f5f8fc; overflow: hidden; }
.pl-toolbar { flex: 0 0 auto; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 9px 14px; background: #fff; border-bottom: 1px solid #e5ebf2; }
.pl-seg { display: inline-flex; border: 1px solid #d5dfec; border-radius: 9px; overflow: hidden; }
.pl-seg button { border: 0; background: #fff; padding: 7px 16px; cursor: pointer; font-size: 13px; color: #4a5b70; font-weight: 700; }
.pl-seg button.active { background: #eef4ff; color: #2867d8; }
.pl-ctl { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #526174; }
.pl-ctl select { border: 1px solid #d6dfeb; border-radius: 7px; padding: 6px 8px; background: #fff; }
.pl-ctl input[type=range] { width: 130px; }
.pl-sum { font-size: 13px; color: #4a5b70; font-weight: 700; margin-left: auto; }
.pl-sum b { color: #2f6fe0; }
.pl-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 300px; overflow: hidden; }
.pl-viewer-wrap { position: relative; min-width: 0; min-height: 0; }
.pl-viewer { position: absolute; inset: 0; }
.pl-viewer canvas { display: block; width: 100%; height: 100%; }
.pl-legend { position: absolute; top: 12px; left: 12px; display: flex; flex-wrap: wrap; gap: 6px; max-width: 92%; }
.pl-lg { border: 1px solid #dbe3ee; background: rgba(255, 255, 255, .94); border-radius: 99px; padding: 5px 10px; font-size: 12px; color: #40536a; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.pl-lg i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.pl-lg.on { border-color: #3e7fe8; color: #2f6fe0; background: #edf4ff; font-weight: 700; }
.pl-hint { position: absolute; bottom: 10px; left: 14px; font-size: 12px; color: #7b899a; background: rgba(255, 255, 255, .8); padding: 3px 9px; border-radius: 7px; }
.pl-side { padding: 16px; background: #fff; border-left: 1px solid #e1e8f0; overflow: auto; }
.pl-card { padding: 14px; border-radius: 11px; background: #f4f8fc; border: 1px solid #e0e9f3; margin-bottom: 14px; font-size: 13px; }
.pl-card strong { display: block; margin-bottom: 8px; color: #20364f; }
.pl-table { width: 100%; border-collapse: collapse; }
.pl-table tr { cursor: pointer; border-top: 1px solid #e5ecf4; }
.pl-table tr:hover { background: #fff; }
.pl-table tr.picked { background: #e8f1ff; }
.pl-table td { padding: 7px 4px; }
.pl-sq { display: inline-block; width: 14px; height: 14px; border-radius: 3px; vertical-align: -2px; }
.pl-num { text-align: right; font-weight: 800; color: #2f6fe0; font-size: 15px; }
.pl-formula { margin: 9px 0 0; font-size: 12px; line-height: 1.8; color: #5a6b80; background: #fff; border-radius: 7px; padding: 8px 10px; }
.pl-tip ul { margin: 6px 0 0; padding-left: 17px; line-height: 1.9; }
.pl-tip li { margin: 3px 0; }
.pl-tip b { color: #2f6fe0; }
.pl-q { background: #fff; border: 1px solid #dfe7f0; }
.pl-q-head { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 13px; }
.pl-q-head .qnum { font-size: 12px; font-weight: 700; color: #2f6fe0; background: #e8f0ff; border-radius: 99px; padding: 3px 11px; }
.pl-q-head .ok { color: #2e9e6b; }
.pl-q-head .no { color: #e05d5d; }
.pl-q-head .ok, .pl-q-head .no { margin-left: auto; }
.pl-q-text { font-size: 14px; line-height: 1.9; color: #40536a; }
.pl-q-text b { color: #d2691e; }
.pl-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.pl-opt { border: 2px solid #dbe3ee; background: #f8fafc; border-radius: 11px; padding: 11px 0; font-size: 19px; font-weight: 800; color: #20364f; cursor: pointer; }
.pl-opt:hover:not(:disabled) { border-color: #8bb2e8; background: #f1f6ff; }
.pl-opt.is-right { border-color: #2e9e6b; background: #e7f7ee; color: #1e7a52; }
.pl-opt.is-wrong { border-color: #e05d5d; background: #fff0ee; color: #c75050; }
.pl-opt.is-dim { opacity: .45; }
.pl-qresult { margin-top: 12px; padding: 11px 13px; border-radius: 10px; font-size: 13px; line-height: 1.8; }
.pl-qresult.is-right { background: #ecf9f1; border: 1px solid #bfe5cd; color: #1f6b47; }
.pl-qresult.is-wrong { background: #fff0ee; border: 1px solid #f3c8c4; color: #8c3b36; }
.pl-qresult .result-title { font-weight: 800; font-size: 14px; }
.pl-qresult button { border: 0; background: #3e7fe8; color: #fff; border-radius: 8px; padding: 8px 18px; font-weight: 700; margin-top: 6px; cursor: pointer; }
.fade-enter-active, .fade-leave-active { transition: opacity .18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 900px) { .pl-main { grid-template-columns: 1fr; } }
</style>
