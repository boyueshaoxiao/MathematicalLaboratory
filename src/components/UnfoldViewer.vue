<template>
  <div class="unfold-wrap">
    <div class="unfold-toolbar">
      <div class="unfold-selects">
        <label>
          图形
          <select v-model="selectedType">
            <option v-for="item in unfoldShapes" :key="item.type" :value="item.type">{{ item.name }}</option>
          </select>
        </label>
        <label>
          展开方式
          <select v-model="selectedPattern">
            <option v-for="item in currentPatterns" :key="item.key" :value="item.key">{{ item.name }}</option>
          </select>
        </label>
      </div>
      <div class="unfold-actions">
        <button :class="{ active: unfoldMode === 'sync' }" @click="setMode('sync')">整体展开</button>
        <button :class="{ active: unfoldMode === 'seq' }" :disabled="!supportsSeq" title="圆柱、圆锥是曲面，不支持逐棱展开"
          @click="setMode('seq')">逐棱展开</button>
        <template v-if="unfoldMode === 'seq' && supportsSeq">
          <button @click="seqStep(-1)">上一步</button>
          <button @click="seqStep(1)">下一步</button>
        </template>
        <button @click="togglePlay">{{ playing ? '暂停' : (unfoldMode === 'seq' && supportsSeq ? '逐棱播放' : '自动展开') }}</button>
        <button @click="animateTo(1)">完全展开</button>
        <button @click="animateTo(0)">折叠</button>
        <button v-if="surfaceStats" :class="{ active: showLabels }" @click="showLabels = !showLabels">面积标注 {{ showLabels ? '开' : '关' }}</button>
      </div>
    </div>

    <div class="unfold-main">
      <div ref="container" class="unfold-viewer"></div>
      <div class="unfold-side">
        <div class="unfold-title">{{ currentShape.name }} · {{ currentPattern.name }}</div>
        <p>{{ currentPattern.description }}</p>
        <div v-if="netPreview" class="preview-card">
          <strong>展开图预览</strong>
          <template v-if="netPreview.kind === 'cells'">
            <svg class="net-preview" :viewBox="netPreview.vb" :style="netPreviewSize">
              <rect v-for="(c, i) in netPreview.cells" :key="'c' + i"
                :x="c[0]" :y="c[1]" width="1" height="1" rx="0.16" class="pv-cell" />
            </svg>
            <span v-if="currentPattern.family" class="family-tag">{{ currentPattern.family }} 家族</span>
          </template>
          <svg v-else class="net-preview" :viewBox="netPreview.vb" :style="netPreviewSize">
            <polygon v-for="(pan, i) in netPreview.panels" :key="'p' + i"
              :points="pan.pts.map(p => p.join(',')).join(' ')"
              :fill="pan.fill" stroke="#2f6fe0" stroke-width="0.05" stroke-linejoin="round" />
          </svg>
        </div>

        <div v-if="unfoldMode === 'seq' && hingeCount" class="seq-card">
          <strong>逐棱观察</strong>
          <p class="seq-head">{{ seqHead }}</p>
          <p v-if="seqBody" class="seq-body">{{ seqBody }}</p>
          <div class="seq-dots">
            <span v-for="i in hingeCount" :key="i"
              :class="{ done: i <= seqInfo.finished, active: i === seqInfo.stepNo && !seqInfo.done }"></span>
          </div>
        </div>

        <label class="progress-label">
          {{ unfoldMode === 'seq' && hingeCount
            ? `展开进度：${seqInfo.done ? hingeCount : seqInfo.stepNo} / ${hingeCount} 条棱`
            : `展开程度 ${Math.round(unfoldProgress * 100)}%` }}
        </label>
        <input class="progress" type="range" min="0" max="1" step="0.005" v-model.number="unfoldProgress">
        <div class="legend">
          <span><i class="solid"></i>面</span>
          <span><i class="edge"></i>棱</span>
          <span><i class="hinge"></i>折叠连接</span>
        </div>
        <div v-if="surfaceStats" class="stat-card">
          <strong>几何信息</strong>
          <template v-if="surfaceStats.rows">
            <!-- 圆柱 / 圆锥：曲面没有平直棱，展示组成、尺寸与分项面积 -->
            <p>{{ surfaceStats.compose }}</p>
            <p v-if="dimsText" class="dims">{{ dimsText }}</p>
            <p v-for="row in surfaceStats.rows" :key="row.label">
              {{ row.label }} ≈ <b>{{ fmtArea(row.area) }}</b>
            </p>
            <p>表面积（各平面面积之和）<b>S = {{ fmtArea(surfaceStats.S) }}</b></p>
            <p class="stat-tip">{{ surfaceStats.tip }}</p>
          </template>
          <template v-else>
            <p>顶点 V = {{ surfaceStats.V }} · 棱 E = {{ surfaceStats.E }} · 面 F = {{ surfaceStats.F }}</p>
            <p>欧拉公式：V − E + F = {{ surfaceStats.V }} − {{ surfaceStats.E }} + {{ surfaceStats.F }} = {{ surfaceStats.V - surfaceStats.E + surfaceStats.F }}</p>
            <p class="euler-note">不论正方体还是棱柱、棱锥，顶点/棱/面各不相同，但闭合凸多面体恒有 V − E + F = 2 —— 这是欧拉定理。试试切换到其它图形，代入的数值会变，结果仍等于 2。</p>
            <p v-if="dimsText" class="dims">{{ dimsText }}</p>
            <p>展开图面积和 = 表面积 <b>S {{ approxBasePrism ? '≈' : '=' }} {{ fmtArea(surfaceStats.S) }}</b></p>
            <p v-if="approxBasePrism" class="approx-note">两个端面是正多边形，面积里会出现无理数（如 √3、√5），不是整数，所以标注用“≈”；四周的侧面都是长方形，面积 = 边长 × 棱长，都是整数。</p>
            <p v-if="showLabels" class="stat-tip">每个面上标注了它自己的面积（平面图形面积 = 边长 × 边长 / 底 × 高 ÷ 2）。</p>
          </template>
        </div>
        <div v-if="supportsSeq" class="export-card">
          <strong>制作与打印</strong>
          <p>把当前展开图保存为 SVG 或打印，虚线是折叠棱，小梯形是粘贴边。</p>
          <div class="export-actions">
            <button @click="exportNetSVG">导出 SVG</button>
            <button @click="printNet">打印</button>
          </div>
        </div>
        <div class="learn-card">
          <strong>观察重点</strong>
          <p>{{ learnTip }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildUnfold, UNFOLD_PATTERNS as patterns } from '../geometry/unfold.js'
import { buildNetSVG } from '../geometry/netSvg.js'
import { VALID_CUBE_NETS } from '../data/cubeQuizNets.js'

const unfoldShapes = [
  { type: 'cube', name: '正方体' },
  { type: 'cuboid', name: '长方体' },
  { type: 'triangularPrism', name: '三棱柱' },
  { type: 'pentagonalPrism', name: '五棱柱' },
  { type: 'hexagonalPrism', name: '六棱柱' },
  { type: 'cylinder', name: '圆柱' },
  { type: 'cone', name: '圆锥' },
  { type: 'triangularPyramid', name: '三棱锥' },
  { type: 'squarePyramid', name: '四棱锥' },
  { type: 'pentagonalPyramid', name: '五棱锥' },
  { type: 'hexagonalPyramid', name: '六棱锥' }
]

const selectedType = ref('cube')
const selectedPattern = ref('crossA')
const unfoldProgress = ref(0)
const playing = ref(false)
const unfoldMode = ref('sync') // sync=整体同步展开  seq=逐棱(BFS)逐步展开
const ANIM_SPEED = 0.36 // 整体模式：每秒进度增量
const SEQ_HINGE_TIME = 0.9 // 逐棱模式：每根棱展开用时(秒)
let animTarget = null // 当前动画目标进度(null 表示无方向动画)
let sceneReady = false
const showLabels = ref(true) // 每个面显示面积标注
const surfaceStats = ref(null) // 当前多面体的 V/E/F/表面积
let labelSprites = [] // 面积标注精灵（作为各面板的子对象随铰链一起运动）
const LABEL_LIFT = 0.045 // 标注相对面外法线的抬升距离

// 当前模型的铰链时序（BFS 顺序）信息
const hingeCount = ref(0)
const hingeSteps = ref([])
const seqInfo = computed(() => {
  const N = hingeCount.value
  if (!N || unfoldMode.value !== 'seq') return { N, S: 0, finished: 0, stepNo: 0, active: -1, done: false }
  const S = THREE.MathUtils.clamp(unfoldProgress.value, 0, 1) * N
  const done = S >= N - 1e-6
  const finished = Math.min(N, Math.floor(S + 1e-9))
  const active = !done && S > 1e-6 ? Math.min(N - 1, Math.floor(S)) : -1
  const stepNo = done ? N : S <= 1e-6 ? 0 : Math.min(N, Math.floor(S) + 1)
  return { N, S, finished, stepNo, active, done }
})

const seqHead = computed(() => {
  const { N, stepNo, done } = seqInfo.value
  if (!N) return ''
  if (done) return `共 ${N} 条折叠棱已全部展开`
  if (stepNo <= 0) return `还没有棱被打开，点击“下一步”开始`
  return `正在展开第 ${stepNo} / ${N} 条折叠棱`
})
const seqBody = computed(() => {
  const { active, done, S, N } = seqInfo.value
  if (done || active < 0 || !hingeSteps.value.length) return ''
  const h = hingeSteps.value[active]
  if (!h) return ''
  const frac = Math.round(((S - active) % 1) * 100)
  const dih = fmtDeg(h.startDihedralDeg)
  const cur = fmtDeg(180 - h.openAngleDeg * (1 - (S - active)))
  return `第 ${active + 1} 条棱正在翻（已完成 ${frac}%）：相连两个面的夹角从 ${dih}° 打开到 ${cur}°。`
})
function fmtDeg(d) {
  const r = Math.round(d * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}
// 面积数字：整数就显示整数(如 4)，否则保留 2 位小数(如 1.73)
// 用 2 位是为了让各面标注相加 ≈ 表面积 S，避免 1 位舍入造成累计误差
function fmtArea(a) {
  return String(Math.round(a * 100) / 100)
}

const learnTip = computed(() => {
  if (unfoldMode.value === 'seq') {
    return '逐棱模式一次只翻一条棱，黄色高亮表示当前正在折叠的连接。正方体相邻两个面的夹角是 90°，全部打开后变为 180°（共面）。'
  }
  return '拖动鼠标旋转模型，逐渐增加展开程度，观察每个面绕公共棱旋转，直到变成平面展开图。'
})

// 展开图缩略预览：正方体用六连方网格；其余多面体由引擎展开后取平面多边形
const PALETTE_HEX = [0x5b8def, 0x55b99a, 0xffa24d, 0x9a7cff, 0xef6b7b, 0x4cb9c0]

// 多边形集 → 预览数据（bbox → viewBox + 上色）
function polyNetPreview(panels) {
  const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0')
  const allPts = panels.flatMap(p => p.pts)
  const xs = allPts.map(p => p[0]), ys = allPts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = Math.max(maxX - minX, maxY - minY) * 0.08 + 0.5
  return {
    kind: 'panels',
    panels: panels.map((p, i) => ({
      pts: p.pts,
      fill: hex(PALETTE_HEX[p.color % PALETTE_HEX.length] || PALETTE_HEX[0])
    })),
    vb: [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2].join(' ')
  }
}

// 圆柱/圆锥：侧曲面与底面圆没有平直多边形，按与展开场景一致的参数生成平面图形。
// 圆盘/扇形用 72 段多边形逼近（与场景中圆盘网格分段数一致）
function curvedNetPanels(type, patternKey) {
  const N = 72
  const disk = (cx, cy, r) => {
    const pts = []
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
    }
    return pts
  }
  if (type === 'cylinder') {
    // 与 buildCylinderUnfold 一致：侧面展开为矩形，两底面圆盘平铺在矩形左右
    const r = 1.05, H = 2.2
    const W = Math.PI * 2 * r
    const gap = 0.3
    const sep = patternKey === 'cylinderB' ? 1.9 : 0
    const rect = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]]
    return [
      { pts: rect, color: 0 },
      { pts: disk(W / 2 + r + gap, sep, r), color: 1 },
      { pts: disk(-(W / 2 + r + gap), -sep, r), color: 2 }
    ]
  }
  // 圆锥：与 buildConeUnfold 一致：侧面为扇形（半径=母线），底面圆盘平铺在右侧
  const r = 1.05, h = 2.35
  const slant = Math.hypot(r, h)
  const sweep = (Math.PI * 2 * r) / slant
  const gap = 0.35
  const sep = patternKey === 'coneB' ? 1.9 : 0
  const sector = [[0, 0]]
  for (let i = 0; i <= N; i++) {
    const a = -sweep / 2 + (sweep * i) / N
    sector.push([slant * Math.cos(a), slant * Math.sin(a)])
  }
  return [
    { pts: sector, color: 0 },
    { pts: disk(slant + r + gap, sep, r), color: 1 }
  ]
}

const netPreview = computed(() => {
  const t = selectedType.value
  if (t === 'cylinder' || t === 'cone') {
    try { return polyNetPreview(curvedNetPanels(t, selectedPattern.value)) }
    catch (e) { return null }
  }
  if (t === 'cube') {
    const entry = VALID_CUBE_NETS.find(x => x.key === selectedPattern.value)
    if (!entry) return null
    const xs = entry.cells.map(c => c[0])
    const ys = entry.cells.map(c => c[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const pad = 0.55
    // 每个格子是 1×1，内容实际横跨 [minX, maxX+1]、纵跨 [minY, maxY+1]，
    // 必须用 max+1 作为内容右/下边界，否则右侧一列与最下格会落在 viewBox 之外被裁掉
    const right = maxX + 1, bottom = maxY + 1
    return {
      kind: 'cells', cells: entry.cells,
      vb: [minX - pad, minY - pad, right - minX + pad * 2, bottom - minY + pad * 2].join(' ')
    }
  }
  try {
    const m = buildUnfold(t, selectedPattern.value)
    const panels = m.flatPanels()
    m.dispose()
    return polyNetPreview(panels)
  } catch (e) { return null }
})

// 预览图尺寸：不写死宽高，而是把 viewBox 的宽高比交给浏览器（aspect-ratio），
// 配合 max-width/max-height 约束，让 SVG 始终完整贴合卡片内部，不溢出、不裁切
const netPreviewSize = computed(() => {
  const vb = netPreview.value?.vb
  if (!vb) return {}
  const p = String(vb).split(/\s+/).map(Number)
  const w = p[2], h = p[3]
  if (!w || !h) return {}
  return { aspectRatio: `${w} / ${h}` }
})

// 各立体的真实尺寸说明，方便对照面积标注心算验证
const DIMS_TEXT = {
  cube: '边长 2，每个面是 2×2 的正方形',
  cuboid: '长 2 × 宽 2 × 高 3，面的面积是 2×2=4 或 2×3=6',
  triangularPrism: '底面是边长 2 的等边三角形，棱长 3',
  pentagonalPrism: '底面是边长 2 的正五边形，棱长 3',
  hexagonalPrism: '底面是边长 2 的正六边形，棱长 3',
  triangularPyramid: '底面是等边三角形（外接圆半径 1.35），高 2.2',
  squarePyramid: '底面是 2.6×2.6 的正方形，高 2.35',
  pentagonalPyramid: '底面是正五边形（外接圆半径 1.5），高 2',
  hexagonalPyramid: '底面是正六边形（外接圆半径 1.6），高 1.85'
}
const dimsText = computed(() => surfaceStats.value?.dims || DIMS_TEXT[selectedType.value] || '')

// 端面为正多边形（等边三角形/正五边形/正六边形）的棱柱：边长、棱长都已是整数，
// 但端面面积含 √3、sin36° 等开方结果，只能用“≈”标注；侧面长方形面积是整数。
const REGULAR_BASE_PRISMS = ['triangularPrism', 'pentagonalPrism', 'hexagonalPrism']
const approxBasePrism = computed(() => REGULAR_BASE_PRISMS.includes(selectedType.value))
// 判断某个面是否是这种棱柱的端面（三角形/五边形/六边形端面，其余面是四边形）
function isBaseEndFace(meta) {
  return meta.nSides === 3 || meta.nSides === 5 || meta.nSides === 6
}

const currentPatterns = computed(() => patterns[selectedType.value] || [])
const currentPattern = computed(() =>
  currentPatterns.value.find(x => x.key === selectedPattern.value) || currentPatterns.value[0])
const currentShape = computed(() => unfoldShapes.find(x => x.type === selectedType.value))

// URL 直达：?type=cube&pattern=crossA&p=1&mode=seq（在 watcher 注册前设置，避免被重置）
try {
  const q = new URLSearchParams(window.location.search)
  const type = q.get('type')
  if (type && unfoldShapes.some(x => x.type === type)) {
    selectedType.value = type
    const list = patterns[type] || []
    const pat = q.get('pattern')
    if (list.some(x => x.key === pat)) selectedPattern.value = pat
    else if (list[0]) selectedPattern.value = list[0].key
    const p = parseFloat(q.get('p'))
    if (Number.isFinite(p)) unfoldProgress.value = THREE.MathUtils.clamp(p, 0, 1)
    const mode = q.get('mode')
    if (mode === 'seq' || mode === 'sync') unfoldMode.value = mode
  }
} catch (e) { /* ignore */ }

const container = ref()

let scene, camera, renderer, controls
let model = null // 当前展开模型（engine 返回的控制器）
let seqMarker = null // 当前正在折叠棱的中点提示标记

// ---------------- 场景初始化 ----------------

function initScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f8fc)
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setSize(container.value.clientWidth || 1, container.value.clientHeight || 1, false)
  container.value.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x94a6bd, 2.2))
  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(4, 8, 8)
  scene.add(light)

  const grid = new THREE.GridHelper(22, 22, 0xb8c7d9, 0xd9e2ec)
  grid.rotation.x = Math.PI / 2
  grid.position.z = -0.4
  scene.add(grid)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)
  controls.update()
  ensureSeqMarker()
}

// ---------------- 模型构建与相机适配 ----------------

function rebuildModel() {
  clearAreaLabels()
  model?.dispose?.()
  if (model) scene.remove(model.root)
  model = buildUnfold(selectedType.value, selectedPattern.value)
  scene.add(model.root)
  hingeCount.value = model.hingeCount ?? 0
  hingeSteps.value = model.hingeSteps ?? []
  surfaceStats.value = model.stats ?? null
  attachAreaLabels()
  applyProgress()
  fitView()
}

// 面积标注：多面体把每面面积标在面心；圆柱/圆锥把计算好的部件面积标在各部件中心（锚点随展开/卷曲逐帧更新）
function attachAreaLabels() {
  if (!model) return
  if (model.faceMeta) {
    const lift = new THREE.Vector3()
    model.faceMeta.forEach((meta, i) => {
      const panel = model.root.children[i] // 面板按面序号顺序加入 group
      if (!panel?.isMesh) return
      const endFace = approxBasePrism.value && isBaseEndFace(meta)
      const sprite = makeAreaSprite((endFace ? '≈' : '') + fmtArea(meta.area))
      lift.copy(meta.normal).multiplyScalar(LABEL_LIFT)
      sprite.position.copy(meta.center).add(lift)
      panel.add(sprite)
      sprite.visible = showLabels.value
      labelSprites.push(sprite)
    })
    return
  }
  if (model.labelAnchors?.length) {
    model.labelAnchors.forEach((anchor, i) => {
      // 曲面体标注直接放 group 顶层，位置由 animate 循环从锚点同步
      const sprite = makeAreaSprite(fmtArea(model.labelAreas?.[i] ?? 0), false)
      sprite.position.copy(anchor)
      model.root.add(sprite)
      sprite.visible = showLabels.value
      labelSprites.push(sprite)
    })
  }
}

// 每帧把标注同步到部件锚点（圆柱卷曲/圆盘移动时也贴合在部件中心）
function syncCurvedLabels() {
  if (!model?.labelAnchors || !labelSprites.length) return
  model.labelAnchors.forEach((a, i) => {
    const s = labelSprites[i]
    if (s) s.position.copy(a)
  })
}

function clearAreaLabels() {
  labelSprites.forEach(s => { s.parent?.remove?.(s) })
  labelSprites = []
}

function makeAreaSprite(text, occludable = true) {
  const canvas = document.createElement('canvas')
  const W = 180, H = 64
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, W, H)
  ctx.font = '600 42px system-ui, sans-serif'
  const tw = ctx.measureText(text).width
  const pad = 24
  const chipW = tw + pad * 2
  const chipH = H - 12
  const cx = (W - chipW) / 2
  const cy = (H - chipH) / 2
  const r = chipH / 2
  ctx.beginPath()
  ctx.moveTo(cx + r, cy)
  ctx.arcTo(cx + chipW, cy, cx + chipW, cy + chipH, r)
  ctx.arcTo(cx + chipW, cy + chipH, cx, cy + chipH, r)
  ctx.arcTo(cx, cy + chipH, cx, cy, r)
  ctx.arcTo(cx, cy, cx + chipW, cy, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.94)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(29,51,82,0.85)'
  ctx.stroke()
  ctx.fillStyle = '#20364f'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, W / 2, H / 2 + 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  // occludable=false（曲面标注）关闭深度测试：贴在网格顶点上时不会被自身面板裁掉
  const mat = new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false, depthTest: occludable
  })
  const sprite = new THREE.Sprite(mat)
  const hgt = 0.3 // 标注高度（世界单位）
  sprite.scale.set(hgt * (chipW / chipH), hgt, 1)
  sprite.renderOrder = occludable ? 10 : 11
  return sprite
}

// 高亮“当前正在折叠”的铰链：亮橙实线 + 中点提示圆点
function ensureSeqMarker() {
  if (seqMarker || !scene) return
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const cx = 64, cy = 64
  g.beginPath(); g.arc(cx, cy, 58, 0, Math.PI * 2)
  g.fillStyle = 'rgba(255,255,255,0.96)'; g.fill()
  g.beginPath(); g.arc(cx, cy, 46, 0, Math.PI * 2)
  const grad = g.createRadialGradient(cx - 12, cy - 14, 8, cx, cy, 46)
  grad.addColorStop(0, '#ffd166'); grad.addColorStop(1, '#ff8c1a')
  g.fillStyle = grad; g.fill()
  g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke()
  g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2)
  g.fillStyle = '#fff'; g.fill()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.85, 0.85, 1)
  sprite.renderOrder = 999
  sprite.visible = false
  scene.add(sprite)
  seqMarker = sprite
}

function updateSeqMarker() {
  if (!seqMarker) return
  const { active } = seqInfo.value
  if (!model || unfoldMode.value !== 'seq' || active < 0) {
    seqMarker.visible = false
    return
  }
  const line = model.hingeLineObjs[active]
  if (!line) { seqMarker.visible = false; return }
  const arr = line.geometry.attributes.position.array
  seqMarker.position.set(
    (arr[0] + arr[3]) / 2, (arr[1] + arr[4]) / 2, (arr[2] + arr[5]) / 2)
  seqMarker.visible = true
}

// 只有铰链式多面体才有 setSeqProgress；圆柱/圆锥为曲面插值，始终走整体进度
const supportsSeq = computed(() => selectedType.value !== 'cylinder' && selectedType.value !== 'cone')

// 根据模式把进度应用到引擎，并刷新铰链高亮
function applyProgress() {
  if (!model) return
  if (unfoldMode.value === 'seq' && typeof model.setSeqProgress === 'function') model.setSeqProgress(unfoldProgress.value)
  else model.setProgress?.(unfoldProgress.value)
  updateHingeHighlight()
}

// 逐棱模式：当前棱亮橙实线，其余铰链淡红虚线；整体模式全部恢复默认
function updateHingeHighlight() {
  const objs = model?.hingeLineObjs
  if (!objs) return
  const active = seqInfo.value.active
  objs.forEach((line, i) => {
    const m = line.material
    if (unfoldMode.value === 'seq' && i === active) {
      m.color.set(0xffa63d)
      m.opacity = 1
      m.dashSize = 0
    } else if (unfoldMode.value === 'seq') {
      m.color.set(0xe0456b)
      m.opacity = 0.28
      m.dashSize = 0.16
    } else {
      m.color.set(0xe0456b)
      m.opacity = 0.95
      m.dashSize = 0.16
    }
  })
}

// 依据内容包围盒摆放相机，保证折叠态与展开态都在视野内
function fitView() {
  if (!model || !camera || !container.value) return
  const size = model.netSize
  const center = model.netCenter
  const maxDim = Math.max(size.x, size.y, size.z, 0.6)
  const aspect = (container.value.clientWidth || 1) / (container.value.clientHeight || 1)
  const fovV = THREE.MathUtils.degToRad(camera.fov)
  const fovH = 2 * Math.atan(Math.tan(fovV / 2) * Math.max(aspect, 0.01))
  const half = maxDim * 0.62 + 0.6
  const dist = half / Math.tan(Math.min(fovV, fovH) / 2)
  const dir = new THREE.Vector3(0.45, 0.8, 1).normalize()
  camera.position.copy(center).addScaledVector(dir, dist)
  camera.near = Math.max(0.05, dist / 200)
  camera.far = Math.max(60, dist * 12)
  camera.updateProjectionMatrix()
  controls.target.copy(center)
  controls.update()
}

// ---------------- 播放与步进 ----------------

function setMode(m) {
  if (unfoldMode.value === m) return
  unfoldMode.value = m
  stopPlay()
  applyProgress()
}

function stopPlay() {
  playing.value = false
  animTarget = null
}

function togglePlay() {
  if (playing.value) { stopPlay(); return }
  if (unfoldProgress.value >= 0.999) unfoldProgress.value = 0
  animTarget = 1
  playing.value = true
}

// 平滑动画到目标进度（0=折叠 / 1=完全展开），中途再次点击可反向
function animateTo(target) {
  if (Math.abs(unfoldProgress.value - target) < 1e-6) return
  animTarget = target
  playing.value = true
}

// 逐棱模式手动步进（-1 / +1）
function seqStep(d) {
  if (unfoldMode.value !== 'seq') return
  const N = hingeCount.value
  if (!N) return
  const cur = Math.round(THREE.MathUtils.clamp(unfoldProgress.value, 0, 1) * N)
  unfoldProgress.value = THREE.MathUtils.clamp(cur + d, 0, N) / N
}

// 导出当前展开图为 SVG 文件
function exportNetSVG() {
  if (!model || !supportsSeq.value) return
  const prev = unfoldProgress.value
  const { svg } = buildNetSVG(model)
  unfoldProgress.value = prev // buildNetSVG 内部会置为完全展开，导出后恢复原进度
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `net_${selectedType.value}_${selectedPattern.value}.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// 打开打印窗口：先恢复展开态再按 A4 排版
function printNet() {
  if (!model || !supportsSeq.value) return
  const prev = unfoldProgress.value
  const { svg, width, height } = buildNetSVG(model)
  unfoldProgress.value = prev
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>展开图打印 · ${currentPattern.value.name}</title>
<style>
@page { size: ${width > height ? 'A4 landscape' : 'A4 portrait'}; margin: 10mm; }
body { margin: 0; font-family: system-ui, sans-serif; }
.page { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
svg { width: 100%; height: 100%; }
</style></head>
<body><div class="page">${svg}</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 120); }<\/script>
</body></html>`
  const win = window.open('', '_blank')
  if (!win) return alert('浏览器拦截了打印窗口，请允许弹窗后重试')
  win.document.open()
  win.document.write(html)
  win.document.close()
}

function resize() {
  if (!renderer || !container.value) return
  const w = container.value.clientWidth || 1
  const h = container.value.clientHeight || 1
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function animate(t) {
  requestAnimationFrame(animate)
  if (playing.value && animTarget !== null) {
    const cur = unfoldProgress.value
    const speed = unfoldMode.value === 'seq' && hingeCount.value
      ? (1 / hingeCount.value) / SEQ_HINGE_TIME
      : ANIM_SPEED
    const dir = animTarget > cur ? 1 : -1
    const next = cur + dir * speed * 0.016
    // 越过目标或到达端点时停稳
    if ((dir > 0 && next >= animTarget) || (dir < 0 && next <= animTarget)) {
      unfoldProgress.value = animTarget
      stopPlay()
    } else {
      unfoldProgress.value = next
    }
  }
  controls?.update()
  updateSeqMarker()
  syncCurvedLabels()
  renderer?.render(scene, camera)
}

watch(unfoldProgress, (v) => {
  if (!model) return
  if (unfoldMode.value === 'seq' && typeof model.setSeqProgress === 'function') model.setSeqProgress(v)
  else model.setProgress?.(v)
  updateHingeHighlight()
})
watch(showLabels, (v) => labelSprites.forEach(s => { s.visible = v }))
// 切换图形/展开方式时重建模型；图形变了先保证展开方式对该图形有效
watch(selectedType, () => {
  if (!sceneReady) return
  if (unfoldMode.value === 'seq' && !supportsSeq.value) unfoldMode.value = 'sync'
  const list = patterns[selectedType.value] || []
  if (!list.some(x => x.key === selectedPattern.value) && list[0]) {
    selectedPattern.value = list[0].key
  }
})
watch([selectedType, selectedPattern], () => {
  if (!sceneReady) return
  unfoldProgress.value = 0
  stopPlay()
  rebuildModel()
})

onMounted(() => {
  initScene()
  sceneReady = true
  resize()
  rebuildModel()
  animate()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  model?.dispose?.()
  renderer?.dispose()
  container.value?.removeChild?.(renderer.domElement)
})
</script>
