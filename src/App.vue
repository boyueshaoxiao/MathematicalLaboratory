<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <div class="brand">🧮 数学空间实验室</div>
        <div class="subtitle">{{ subtitle }}</div>
      </div>
      <div class="top-actions">
        <nav class="lab-tabs">
          <button :class="{ active: activeLab === 'geo' }" @click="activeLab = 'geo'">🔷 几何实验室</button>
          <button :class="{ active: activeLab === 'frac' }" @click="activeLab = 'frac'">🍕 分数实验室</button>
          <button :class="{ active: activeLab === 'area' }" @click="activeLab = 'area'">📐 面积实验室</button>
          <button :class="{ active: activeLab === 'dec' }" @click="activeLab = 'dec'">🔢 小数实验室</button>
          <button :class="{ active: activeLab === 'unit' }" @click="activeLab = 'unit'">⚖️ 单位换算</button>
          <button :class="{ active: activeLab === 'games' }" @click="activeLab = 'games'">🧩 益智游戏</button>
        </nav>
        <button v-if="activeLab === 'geo'" class="ghost" @click="resetScene">重置场景</button>
      </div>
    </header>

    <main class="workspace" :class="{
      'frac-only': activeLab !== 'geo',
      'no-inspector': activeLab === 'geo' && activeMode !== 'scene'
    }">
      <template v-if="activeLab === 'geo'">
      <aside class="sidebar">
        <section>
          <h3>几何图形</h3>
          <div v-for="group in shapeCategories" :key="group.name" class="shape-group">
            <div class="group-title">{{ group.name }}</div>
            <div class="shape-list">
              <button v-for="item in group.items" :key="item.type + item.name"
                class="shape-btn" @click="addShape(item)">
                <span>{{ item.icon }}</span><small>{{ item.name }}</small>
              </button>
            </div>
          </div>
        </section>

        <section class="tips">
          <h3>操作</h3>
          <p>🖱 拖动空白处：旋转视角</p>
          <p>🖱 滚轮：缩放</p>
          <p>➕ 点击图形：添加到场景</p>
          <p>✋ 在 3D 中直接点住几何体拖动：移动位置</p>
          <p>🎯 点击列表中的对象：选中并编辑</p>
        </section>
      </aside>

      <section class="stage">
        <div class="mode-tabs">
          <button :class="{ active: activeMode === 'scene' }" @click="activeMode = 'scene'">组合与视图</button>
          <button :class="{ active: activeMode === 'unfold' }" @click="activeMode = 'unfold'">单体展开图</button>
          <button :class="{ active: activeMode === 'threeview' }" @click="activeMode = 'threeview'">三视图挑战</button>
          <button :class="{ active: activeMode === 'paint' }" @click="activeMode = 'paint'">涂色分割</button>
          <button :class="{ active: activeMode === 'structure' }" @click="activeMode = 'structure'">结构探索</button>
          <button :class="{ active: activeMode === 'blocks' }" @click="activeMode = 'blocks'">搭积木</button>
          <button :class="{ active: activeMode === 'quiz' }" @click="activeMode = 'quiz'">展开图判断</button>
        </div>

        <template v-if="activeMode === 'scene'">
        <div class="stage-toolbar">
          <div v-if="!multiView" class="view-buttons">
            <button v-for="v in views" :key="v.key" :class="{ active: currentView === v.key }"
              @click="currentView = v.key">{{ v.name }}</button>
          </div>
          <div class="toolbar-actions">
            <button :class="{ active: multiView }" @click="multiView = !multiView">三视图 {{ multiView ? '开' : '关' }}</button>
            <template v-if="multiView">
              <button :class="{ active: showDiag }" @click="showDiag = !showDiag">对角线 {{ showDiag ? '开' : '关' }}</button>
            </template>
            <button :class="{ active: showEdges }" @click="showEdges = !showEdges">棱线 {{ showEdges ? '开' : '关' }}</button>
            <button :class="{ active: transparent }" @click="transparent = !transparent">半透明 {{ transparent ? '开' : '关' }}</button>
            <button :class="{ active: showGrid }" @click="showGrid = !showGrid">网格 {{ showGrid ? '开' : '关' }}</button>
          </div>
        </div>

        <GeometryViewer v-if="!multiView" :shapes="sceneShapes" :view="currentView"
          :show-grid="showGrid" :show-edges="showEdges" :transparent="transparent"
          @select="selectedId = $event" @move="onMoveShape" />
        <MultiView v-else :shapes="sceneShapes" :show-grid="showGrid"
          :show-edges="showEdges" :transparent="transparent" :show-diag="showDiag" />

        <div class="object-panel">
          <div class="panel-title">场景对象 <span>{{ sceneShapes.length }}</span></div>
          <div v-if="sceneShapes.length === 0" class="empty">从左侧选择图形添加到空间</div>
          <div v-for="(shape, index) in sceneShapes" :key="shape.id"
            class="object-row" :class="{ selected: selectedId === shape.id }"
            @click="selectedId = shape.id">
            <span>{{ index + 1 }}. {{ shape.name }}</span>
            <button @click.stop="removeShape(shape.id)">删除</button>
          </div>
        </div>
        </template>

        <template v-else-if="activeMode === 'unfold'">
          <UnfoldViewer />
        </template>
        <template v-else-if="activeMode === 'threeview'">
          <ThreeViewQuiz />
        </template>
        <template v-else-if="activeMode === 'paint'">
          <PaintLab />
        </template>
        <template v-else-if="activeMode === 'structure'">
          <StructureLab />
        </template>
        <template v-else-if="activeMode === 'blocks'">
          <BlockLab />
        </template>
        <template v-else>
          <CubeNetQuiz />
        </template>
      </section>

      <aside v-if="activeMode === 'scene'" class="inspector">
        <h3>对象属性</h3>
        <template v-if="selected">
          <label>名称</label>
          <input v-model="selected.name" />

          <label>位置 X / Y / Z</label>
          <div class="triple">
            <input type="number" step="0.1" v-model.number="selected.position.x" />
            <input type="number" step="0.1" v-model.number="selected.position.y" />
            <input type="number" step="0.1" v-model.number="selected.position.z" />
          </div>

          <label>旋转 X / Y / Z</label>
          <div class="triple">
            <input type="number" step="0.1" v-model.number="selected.rotation.x" />
            <input type="number" step="0.1" v-model.number="selected.rotation.y" />
            <input type="number" step="0.1" v-model.number="selected.rotation.z" />
          </div>

          <label>缩放</label>
          <input type="range" min="0.3" max="2.5" step="0.1" v-model.number="selected.scale" />

          <button class="danger" @click="removeShape(selected.id)">删除当前对象</button>
        </template>
        <div v-else class="empty inspector-empty">选择一个场景对象后编辑属性</div>

        <div class="info-card">
          <strong>建议玩法</strong>
          <p>先添加两个不同图形，再切换“前 / 后 / 左 / 右 / 上 / 下”，观察组合体从不同方向看到的形状。</p>
        </div>
      </aside>
      </template>
      <FractionLab v-else-if="activeLab === 'frac'" />
      <AreaLab v-else-if="activeLab === 'area'" />
      <DecimalLab v-else-if="activeLab === 'dec'" />
      <UnitLab v-else-if="activeLab === 'unit'" />
      <GamesLab v-else />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import GeometryViewer from './components/GeometryViewer.vue'
import MultiView from './components/MultiView.vue'
import UnfoldViewer from './components/UnfoldViewer.vue'
import CubeNetQuiz from './components/CubeNetQuiz.vue'
import ThreeViewQuiz from './components/ThreeViewQuiz.vue'
import PaintLab from './components/PaintLab.vue'
import StructureLab from './components/StructureLab.vue'
import BlockLab from './components/BlockLab.vue'
import FractionLab from './components/fractions/FractionLab.vue'
import AreaLab from './components/area/AreaLab.vue'
import DecimalLab from './components/decimals/DecimalLab.vue'
import UnitLab from './components/units/UnitLab.vue'
import GamesLab from './components/games/GamesLab.vue'
import { shapeCategories } from './data/shapes'

// 支持 URL 直达：
// 几何: ?view=unfold&type=cube&pattern=crossA&p=0.8 / ?view=quiz
// 分数: ?lab=fraction&fmod=wall (fmod 见 fractions/lessons.js 的 key)
// 面积: ?lab=area&amod=derive (amod: gallery | derive | quiz)
// 小数: ?lab=decimal&dmod=grid (dmod: intro | grid | line | addsub)
// 单位: ?lab=unit&umod=convert (umod: convert | ladder | quiz | compare)
// 益智: ?lab=games&gmod=2048 (gmod: 2048 | puzzle)
const qs = new URLSearchParams(window.location.search)
const activeLab = ref(qs.get('lab') === 'area' ? 'area'
  : qs.get('lab') === 'frac' || qs.get('lab') === 'fraction' ? 'frac'
    : qs.get('lab') === 'dec' || qs.get('lab') === 'decimal' ? 'dec'
      : qs.get('lab') === 'unit' ? 'unit' : qs.get('lab') === 'games' ? 'games' : 'geo')
const activeMode = ref(qs.get('view') === 'unfold' ? 'unfold'
  : qs.get('view') === 'threeview' ? 'threeview'
    : qs.get('view') === 'paint' ? 'paint'
      : qs.get('view') === 'structure' ? 'structure'
        : qs.get('view') === 'blocks' ? 'blocks'
          : qs.get('view') === 'quiz' ? 'quiz' : 'scene')
const subtitle = computed(() => ({
  geo: '旋转、组合、观察立体图形',
  frac: '分一分 · 拼一拼 · 动手认识分数',
  area: '量一量 · 剪一剪 · 面积公式这样来',
  dec: '一位两位要看准 · 小数分数是一家',
  unit: '大化小乘进率 · 小化大除进率',
  games: '动脑一刻 · 2048 与数字华容道'
}[activeLab.value]))
const currentView = ref('free')
const multiView = ref(false)
const showDiag = ref(false)
const showEdges = ref(true)
const transparent = ref(false)
const showGrid = ref(true)
const selectedId = ref(null)
const sceneShapes = ref([])
let nextId = 1

const views = [
  { key: 'free', name: '自由' },
  { key: 'front', name: '前' },
  { key: 'back', name: '后' },
  { key: 'left', name: '左' },
  { key: 'right', name: '右' },
  { key: 'top', name: '上' },
  { key: 'bottom', name: '下' }
]

const selected = computed(() => sceneShapes.value.find(x => x.id === selectedId.value))

function addShape(item) {
  const offset = ((sceneShapes.value.length % 5) - 2) * 1.5
  const shape = {
    id: nextId++,
    type: item.type,
    name: item.name,
    params: { ...item.defaults },
    color: [0x4f8cff, 0x55b99a, 0xffa24d, 0x9a7cff, 0xef6b7b][(nextId - 2) % 5],
    position: { x: offset, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1
  }
  sceneShapes.value.push(shape)
  selectedId.value = shape.id
  currentView.value = 'free'
}

function removeShape(id) {
  sceneShapes.value = sceneShapes.value.filter(x => x.id !== id)
  if (selectedId.value === id) selectedId.value = sceneShapes.value.at(-1)?.id ?? null
}

// 3D 中拖动几何体 → 回写坐标，右侧 X/Y/Z 输入框与场景对象列表实时同步
function onMoveShape(id, x, y, z) {
  const s = sceneShapes.value.find(s => s.id === id)
  if (!s) return
  s.position.x = x
  s.position.y = y
  s.position.z = z
}

function resetScene() {
  sceneShapes.value = []
  selectedId.value = null
  currentView.value = 'free'
}

// 快速示例：?demo=box,cuboid 会自动添加几个图形，方便演示与分享
onMounted(() => {
  const demo = qs.get('demo')
  if (!demo) return
  const all = shapeCategories.flatMap(g => g.items)
  demo.split(',').forEach(name => {
    const item = all.find(x => x.name === name || x.type === name)
    if (item) addShape(item)
  })
  if (qs.get('multi') === '1') multiView.value = true
  if (qs.get('diag') === '1') showDiag.value = true
})
</script>
