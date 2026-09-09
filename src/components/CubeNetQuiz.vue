<template>
  <div class="quiz-wrap">
    <div class="quiz-topbar">
      <div class="quiz-selects">
        <label class="quiz-shape">
          立体
          <select v-model="shape">
            <option v-for="s in QUIZ_SHAPES" :key="s.type" :value="s.type">{{ s.name }}</option>
          </select>
        </label>
        <button v-for="m in filterModes" :key="m.key" :class="{ active: filter === m.key }"
          @click="restart(m.key)">{{ m.name }}</button>
      </div>
      <div class="quiz-score">
        <span class="ok">答对 {{ correct }}</span>
        <span class="no">答错 {{ wrong }}</span>
        <button @click="restart()">重新开始</button>
      </div>
    </div>

    <div class="quiz-main">
      <div class="quiz-board">
        <div class="quiz-question">
          <span class="qnum">第 {{ index + 1 }} 题</span>
          <span>{{ questionText }}</span>
        </div>

        <svg class="quiz-net" :viewBox="viewBox">
          <template v-if="current.kind !== 'cells'">
            <polygon v-for="(pan, i) in visualPanels" :key="'p' + i"
              :points="pan.pts" :fill="pan.fill" stroke="#2f6fe0" stroke-width="0.06" stroke-linejoin="round" />
            <text v-for="(pan, i) in visualPanels" :key="'pt' + i"
              :x="pan.x" :y="pan.y + 0.2" class="q-cell-no">{{ i + 1 }}</text>
          </template>
          <template v-else>
            <rect v-for="(c, i) in current.cells" :key="'c' + i"
              :x="c[0]" :y="c[1]" width="1" height="1" rx="0.15" class="q-cell" />
            <text v-for="(c, i) in current.cells" :key="'t' + i"
              :x="c[0] + 0.5" :y="c[1] + 0.63" class="q-cell-no">{{ i + 1 }}</text>
          </template>
        </svg>

        <transition name="fade">
          <div v-if="!answered" class="quiz-answer">
            <button class="big yes" @click="submit(true)">能折成{{ shapeName }}</button>
            <button class="big no" @click="submit(false)">不能折成{{ shapeName }}</button>
          </div>
          <div v-else class="quiz-result" :class="right ? 'is-right' : 'is-wrong'">
            <div class="result-title">{{ right ? '回答正确！' : '回答错误…' }}</div>
            <p>{{ explainText }}</p>
            <div class="result-actions">
              <a v-if="current.valid && current.patternKey" class="demo-link"
                :href="'?view=unfold&type=' + shape + '&pattern=' + current.patternKey">👉 在 3D 中折一折</a>
              <button @click="next()">下一题</button>
            </div>
          </div>
        </transition>
      </div>

      <aside class="quiz-side">
        <div class="quiz-tip-card">
          <strong>💡 怎么判断？</strong>
          <ul>
            <li v-for="(t, i) in tipList" :key="i">{{ t }}</li>
          </ul>
        </div>
        <div class="quiz-tip-card">
          <strong>🧩 小知识</strong>
          <p>{{ factText }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { QUIZ_SHAPES, buildDeck } from '../data/quizBuilder.js'

const PALETTE = ['#5b8def', '#55b99a', '#ffa24d', '#9a7cff', '#ef6b7b', '#4cb9c0']
const FACE_COUNT = {
  cube: 6, cuboid: 6, triangularPrism: 5, pentagonalPrism: 7,
  hexagonalPrism: 8, squarePyramid: 5, triangularPyramid: 4
}
const isCubeShape = (t) => t === 'cube'
const currentShape = computed(() => QUIZ_SHAPES.find(s => s.type === shape.value) || QUIZ_SHAPES[0])
const shapeName = computed(() => currentShape.value.name)

const filterModes = [
  { key: 'mix', name: '混合题' },
  { key: 'valid', name: '只看能折的' },
  { key: 'invalid', name: '只看不能折的' }
]
const shape = ref('cube')
const filter = ref('mix')
const deck = ref([])
const index = ref(0)
const answered = ref(false)
const right = ref(false)
const correct = ref(0)
const wrong = ref(0)

function restart(mode) {
  filter.value = mode || filter.value
  deck.value = buildDeck(shape.value, filter.value)
  index.value = 0
  answered.value = false
  correct.value = 0
  wrong.value = 0
}

const current = computed(() => deck.value[index.value] || { kind: 'cells', cells: [], valid: false })

const currentPts = computed(() => {
  const c = current.value
  if (c.kind === 'cells') return c.cells.map(q => [q[0], q[1]])
  return (c.panels || []).flatMap(p => p.pts)
})

const viewBox = computed(() => {
  const pts = currentPts.value
  if (!pts.length) return '0 0 1 1'
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const isCell = current.value.kind === 'cells'
  const pad = isCell ? 0.9 : Math.max(maxX - minX, maxY - minY) * 0.12 + 0.8
  // 格子是 1×1，内容实际横跨 [minX, maxX+1]、纵跨 [minY, maxY+1]，须用 max+1 作为内容右/下边界，
  // 否则最右列与最下行会落在 viewBox 之外被裁掉；多边形的 pts 已是真实顶点坐标，无需 +1
  const right = isCell ? maxX + 1 : maxX
  const bottom = isCell ? maxY + 1 : maxY
  return [minX - pad, minY - pad, right - minX + pad * 2, bottom - minY + pad * 2].join(' ')
})

const visualPanels = computed(() =>
  (current.value.panels || []).map((p, i) => {
    const n = p.pts.length
    let x = 0, y = 0
    p.pts.forEach(q => { x += q[0]; y += q[1] })
    x /= n; y /= n
    return { pts: p.pts.map(q => q.join(',')).join(' '), x, y, fill: PALETTE[i % PALETTE.length] }
  }))

const questionText = computed(() => {
  const name = shapeName.value
  return current.value.kind === 'cells'
    ? `下面这张由 6 个小正方形拼成的图形，能折成一个${name}吗？`
    : `下面这些平面图形组成的展开图，能折成一个${name}吗？`
})

const tipList = computed(() => {
  const name = shapeName.value
  if (isCubeShape(shape.value)) {
    return [
      '想想把纸“折起来”：哪几个面会围成一个正方体？',
      '正方体有 6 个面，展开后 6 个小正方形必须连成一片。',
      '如果折的时候有两个面挤在同一个位置，说明它不是展开图。',
      '正方体一共有 11 种不同的展开图，多试几次就能记住它们。'
    ]
  }
  return [
    `先找找哪个图形是${name}的“底面”，再想侧面怎么围上去。`,
    `数一数：${name}一共有 ${FACE_COUNT[shape.value] ?? '?'} 个面，展开图里的平面图形应该也是这么多个。`,
    '展开图的所有面必须连成一片；只要有一块和整体断开了，就折不成。',
    '把图想象成纸板：折的时候，每一对相邻面都要沿着公共边折起来。'
  ]
})

const factText = computed(() => {
  const name = shapeName.value
  if (isCubeShape(shape.value)) {
    return '6 个正方形拼成的图形叫“六连方”。自由六连方一共有 35 种，其中只有 11 种能折成正方体。'
  }
  return `把${name}沿棱“剪开”铺平就得到它的展开图。同一个立体可以有很多种不同的展开图，但它们都由同样的一批面组成。`
})

const explainText = computed(() => {
  const v = current.value.valid
  const name = shapeName.value
  if (isCubeShape(shape.value)) {
    if (right.value) return v
      ? '对！这一张正是正方体 11 种展开图之一，把外围的面竖起来就能围成一个正方体。'
      : '对！这一张不能折成正方体——折的时候会有两个面挤在一起或留下空洞。'
    return v
      ? '再试试：这一张其实可以折成正方体。想象把中间的面当作底面，其它面一片一片竖起来。'
      : '再试试：这一张不能折成正方体，它是迷惑选项，看起来很像但折不起来。'
  }
  if (v) {
    return right.value
      ? `对！这些面正好组成${name}的一个展开图：折起来后每一对相邻面都沿棱合拢，不多不少围成${name}。`
      : `再试试：这些面其实可以折成${name}。挑一块当底面，其它面沿着公共边一片一片折起来。`
  }
  return right.value
    ? `对！它不能折成${name}——图中有一块与其它面断开了，缺了它就不能把${name}的每个面都围出来。`
    : `再试试：它不能折成${name}，因为有一块平面图形和整体没有连在一起。`
})

function submit(answer) {
  if (answered.value) return
  answered.value = true
  right.value = answer === current.value.valid
  if (right.value) correct.value++
  else wrong.value++
}

function next() {
  if (index.value >= deck.value.length - 1) restart()
  else {
    index.value++
    answered.value = false
  }
}

watch(shape, () => restart())
restart('mix')
</script>
