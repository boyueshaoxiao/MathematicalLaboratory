<template>
  <div class="tq-wrap">
    <div class="tq-topbar">
      <div class="tq-selects">
        <button v-for="m in filterModes" :key="m.key" :class="{ active: filter === m.key }"
          @click="restart(m.key)">{{ m.name }}</button>
      </div>
      <div class="tq-info">
        <span class="tq-diff" :class="difficulty">{{ difficulty === 'easy' ? '热身' : '挑战' }}</span>
        <span class="ok">答对 {{ correct }}</span>
        <span class="no">答错 {{ wrong }}</span>
        <button @click="restart()">换一题</button>
      </div>
    </div>

    <div class="tq-main">
      <section class="tq-board">
        <div class="tq-question">
          <span class="qnum">第 {{ index + 1 }} 题</span>
          <span>下面每个小方块上的数，表示这里叠了几个小正方体。<b>从{{ dirName }}看</b>是哪个图形？</span>
        </div>

        <div class="tq-stage">
          <div class="tq-map-card">
            <div class="tq-card-title">从上面看到的图形</div>
            <div class="tq-mapbox">
              <table class="tq-map">
                <tr v-for="(row, ri) in mapCells" :key="'r' + ri">
                  <td v-for="(v, ci) in row" :key="'c' + ci"
                    class="tq-cell" :class="v ? 'ht' + v : ''">{{ v || '' }}</td>
                </tr>
              </table>
              <div class="tq-front-arrow">前 ↓</div>
            </div>
            <div class="tq-map-legend">
              <span>数 = 叠了几个小正方体</span>
            </div>
          </div>

          <div class="tq-options">
            <button v-for="(opt, i) in options" :key="opt.key + '_' + i"
              class="tq-opt" :class="answerStateClass(opt)"
              :disabled="answered" @click="choose(opt)">
              <span class="tq-opt-label">{{ '甲乙丙丁'[i] }}</span>
              <svg :viewBox="viewBox(opt)" class="tq-svg">
                <rect v-for="(c, k) in opt.cells" :key="'o' + k"
                  :x="c[0]" :y="c[1]" width="1" height="1" class="tq-blk" />
              </svg>
            </button>
          </div>
        </div>

        <transition name="fade">
          <div v-if="answered" class="tq-result" :class="right ? 'is-right' : 'is-wrong'">
            <div class="result-title">{{ right ? '回答正确！' : '再看一看…' }}</div>
            <p>{{ resultText }}</p>
            <div class="tq-both">
              <div class="tq-both-item">
                <div>从前面看</div>
                <svg :viewBox="viewBox(frontFig)" class="tq-svg-sm">
                  <rect v-for="(c, k) in frontFig.cells" :key="'f' + k" :x="c[0]" :y="c[1]" width="1" height="1" class="tq-blk sm" />
                </svg>
              </div>
              <div class="tq-both-item">
                <div>从右面看</div>
                <svg :viewBox="viewBox(rightFig)" class="tq-svg-sm">
                  <rect v-for="(c, k) in rightFig.cells" :key="'r' + k" :x="c[0]" :y="c[1]" width="1" height="1" class="tq-blk sm" />
                </svg>
              </div>
            </div>
            <p class="tq-explain">{{ explainText }}</p>
            <button @click="next()">下一题</button>
          </div>
        </transition>
      </section>

      <aside class="tq-side">
        <div class="tq-tip">
          <strong>💡 怎么看？</strong>
          <ul>
            <li>先看“从上面”的图：每个格子里的数 = 这一格叠了几层小方块。</li>
            <li><b>从前面看</b>：每个横向位置只看得见<b>最高的一摞</b>，后面的矮摞被挡住。</li>
            <li><b>从右面看</b>：每一排（前后方向）只看得见<b>最高的那摞</b>。</li>
            <li>把它们连起来，就是看到的“图形轮廓”。</li>
          </ul>
        </div>
        <div class="tq-tip tq-warm">
          <strong>🧩 记住口诀</strong>
          <p>“高个子挡矮个子，前面看列、右面看排。”</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const filterModes = [
  { key: 'mix', name: '混合' },
  { key: 'front', name: '只练前面' },
  { key: 'right', name: '只练右面' }
]
const filter = ref('mix')
const index = ref(0)
const answered = ref(false)
const right = ref(false)
const correct = ref(0)
const wrong = ref(0)

// —— 随机生成“标高平面图”：5×5 格子、随机连通脚印、每格 1~3 层 ——
const ROWS = 5
const COLS = 5

function randomMap() {
  // 随机游走生成连通脚印
  let sx = 1 + Math.floor(Math.random() * 3)
  let sy = 1 + Math.floor(Math.random() * 3)
  const cells = [[sx, sy]]
  const set = new Set([sx + ',' + sy])
  const target = 6 + Math.floor(Math.random() * 3) // 6~8 格
  let guard = 0
  while (cells.length < target && guard++ < 200) {
    const [cx, cy] = cells[Math.floor(Math.random() * cells.length)]
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]]
    const d = dirs[Math.floor(Math.random() * dirs.length)]
    const nx = cx + d[0], ny = cy + d[1]
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue
    if (set.has(nx + ',' + ny)) continue
    cells.push([nx, ny]); set.add(nx + ',' + ny)
  }
  // 标高度：以 1 为主，部分 2/3；保证至少有 1 个 ≥2
  let hasTall = false
  const heights = cells.map(([x, y]) => {
    const r = Math.random()
    let h = 1
    if (r > 0.55) h = 2
    if (r > 0.86) h = 3
    if (h >= 2) hasTall = true
    return { x, y, h }
  })
  if (!hasTall) {
    heights[Math.floor(Math.random() * heights.length)].h = 2
  }
  const map = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  heights.forEach(({ x, y, h }) => { map[y][x] = h })
  return map
}

// 从前面看：每一列（横向 x 位置）取最高层数
function frontView(map) {
  const cols = []
  for (let x = 0; x < COLS; x++) {
    let m = 0
    for (let y = 0; y < ROWS; y++) m = Math.max(m, map[y][x])
    if (m > 0) cols.push(m)
  }
  return heightsToFig(cols)
}

// 从右面看：每一排（y 前后）取最高层数（输出时让近排在左，便于数数）
function rightView(map) {
  const rows = []
  for (let y = ROWS - 1; y >= 0; y--) {
    let m = 0
    for (let x = 0; x < COLS; x++) m = Math.max(m, map[y][x])
    if (m > 0) rows.push(m)
  }
  return heightsToFig(rows)
}

// 高度列 → 归一化后的 {cells:[[c,r]…], w, h, key}
function heightsToFig(cols) {
  const maxH = Math.max(...cols)
  const cells = []
  cols.forEach((h, c) => {
    for (let r = 0; r < h; r++) cells.push([c, maxH - 1 - r]) // 底部对齐
  })
  const key = cells.map(p => p.join(',')).sort().join('|')
  return { cells, w: cols.length, h: maxH, key }
}

// 将图形做小扰动生成干扰项（保证与正解不同）
function mutateFig(fig) {
  const base = { ...fig, cells: fig.cells.map(p => p.slice()) }
  for (let attempt = 0; attempt < 12; attempt++) {
    const cells = base.cells.map(p => p.slice())
    const idx = Math.floor(Math.random() * cells.length)
    const [c, r] = cells[idx]
    const pick = Math.random()
    let nc, nr
    if (pick < 0.5) { nc = c + (Math.random() < 0.5 ? 1 : -1); nr = r }
    else { nc = c; nr = r + (Math.random() < 0.5 ? 1 : -1) }
    // 移动到空位
    const ok = cells.every(p => !(p[0] === nc && p[1] === nr))
    const inBox = nr >= 0 && nc >= 0
    if (!ok || !inBox) continue
    cells[idx] = [nc, nr]
    const out = { cells, w: Math.max(...cells.map(p => p[0])) + 1, h: Math.max(...cells.map(p => p[1])) + 1 }
    out.key = cells.map(p => p.join(',')).sort().join('|')
    if (out.key !== fig.key) return out
  }
  return null
}

function figCells(fig) {
  const cs = fig.cells.map(p => p.slice())
  const minX = Math.min(...cs.map(p => p[0]))
  const minY = Math.min(...cs.map(p => p[1]))
  return {
    ...fig,
    cells: cs.map(p => [p[0] - minX, p[1] - minY]),
    w: Math.max(...cs.map(p => p[0] - minX)) + 1,
    h: Math.max(...cs.map(p => p[1] - minY)) + 1
  }
}

// —— 当前题 ——
const map = ref(randomMap())
const dir = ref('front') // front | right
const chosenKey = ref('')

const dirName = computed(() => dir.value === 'front' ? '前面' : '右面')
const difficulty = computed(() => {
  const flat = map.value.flat().filter(Boolean)
  return flat.length >= 7 || flat.some(v => v >= 3) ? 'hard' : 'easy'
})

const frontFig = computed(() => figCells(frontView(map.value)))
const rightFig = computed(() => figCells(rightView(map.value)))
const currentFig = computed(() => dir.value === 'front' ? frontFig.value : rightFig.value)

const options = ref([])

function buildOptions() {
  const figs = [currentFig.value]
  // 干扰项：先生成若干张不同的随机图取同方向视图
  const extras = []
  while (extras.length < 8) extras.push(randomMap())
  const pool = extras.map(m => figCells(dir.value === 'front' ? frontView(m) : rightView(m)))
  const seen = new Set([currentFig.value.key])
  const picks = []
  for (const p of pool) {
    if (!seen.has(p.key)) { seen.add(p.key); picks.push(p) }
    if (picks.length >= 3) break
  }
  let guard = 0
  while (picks.length < 3 && guard++ < 30) {
    const m = mutateFig(picks.length ? picks[0] : currentFig.value)
    if (m && !seen.has(m.key)) { seen.add(m.key); picks.push(m) }
  }
  // 打乱
  const all = [...figs, ...picks]
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[all[i], all[j]] = [all[j], all[i]]
  }
  options.value = all
}

function newQuestion() {
  map.value = randomMap()
  dir.value = Math.random() < 0.5 ? 'front' : 'right'
  if (filter.value === 'front') dir.value = 'front'
  if (filter.value === 'right') dir.value = 'right'
  answered.value = false
  chosenKey.value = ''
  index.value++
  buildOptions()
}

const correctLabel = computed(() => '甲乙丙丁'[options.value.findIndex(o => o.key === currentFig.value.key)])
const resultText = computed(() => right.value
  ? '你是从最高的一摞入手判断的，很棒！'
  : `正确答案是“${correctLabel.value}”（第 ${options.value.findIndex(o => o.key === currentFig.value.key) + 1} 个）。`)

function choose(opt) {
  if (answered.value) return
  answered.value = true
  chosenKey.value = opt.key
  const ok = opt.key === currentFig.value.key
  right.value = ok
  ok ? correct.value++ : wrong.value++
}

function answerStateClass(opt) {
  if (!answered.value) return {}
  if (opt.key === currentFig.value.key) return { 'is-right': true }
  if (opt.key === chosenKey.value) return { 'is-wrong': true }
  return { 'is-dim': true }
}

const explainText = computed(() => {
  const from = dir.value === 'front' ? '前面' : '右面'
  const method = dir.value === 'front' ? '每一列取最高的那摞' : '每一排取最高的那摞'
  return `从${from}看，${method}，所以最高的图形有${currentFig.value.h}层、由${currentFig.value.cells.length}个小方格组成。`
})

function restart(mode) {
  filter.value = mode || filter.value
  correct.value = 0; wrong.value = 0; index.value = 0
  newQuestion()
}

function next() { newQuestion() }

function viewBox(fig) {
  const w = Math.max(fig.w, 1)
  const h = Math.max(fig.h, 1)
  return `-0.25 -0.25 ${w + 0.5} ${h + 0.5}`
}

const mapCells = computed(() => {
  // 裁剪掉全空的边缘，让图更紧凑
  const m = map.value
  let r0 = 0, r1 = ROWS - 1, c0 = 0, c1 = COLS - 1
  while (r0 < ROWS - 1 && m[r0].every(v => !v)) r0++
  while (r1 > 0 && m[r1].every(v => !v)) r1--
  const colEmpty = c => m.every(row => !row[c])
  while (c0 < COLS - 1 && colEmpty(c0)) c0++
  while (c1 > 0 && colEmpty(c1)) c1--
  return m.slice(r0, r1 + 1).map(row => row.slice(c0, c1 + 1))
})

// 初始题
newQuestion()
</script>

<style scoped>
.tq-wrap { flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; background: #f5f8fc; overflow: hidden; }
.tq-topbar { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding: 10px 14px; background: #fff; border-bottom: 1px solid #e5ebf2; }
.tq-selects { display: flex; gap: 6px; }
.tq-selects button { border: 1px solid #d6dfeb; background: #fff; border-radius: 8px; padding: 7px 13px; cursor: pointer; font-size: 13px; color: #40536a; }
.tq-selects button.active { border-color: #3e7fe8; color: #fff; background: #3e7fe8; }
.tq-info { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; }
.tq-diff { padding: 3px 10px; border-radius: 99px; font-size: 11px; }
.tq-diff.easy { background: #e7f7ee; color: #2e9e6b; }
.tq-diff.hard { background: #fff0e3; color: #e0862e; }
.tq-info .ok { color: #2e9e6b; }
.tq-info .no { color: #e05d5d; }
.tq-info button { border: 1px solid #d6dfeb; background: #f8fafc; border-radius: 7px; padding: 6px 11px; font-size: 12px; color: #526174; }
.tq-main { flex: 1; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 250px; overflow: hidden; }
.tq-board { min-width: 0; display: flex; flex-direction: column; align-items: center; padding: 20px 16px 16px; overflow: auto; gap: 14px; }
.tq-question { font-size: 15.5px; font-weight: 600; color: #20364f; text-align: center; max-width: 560px; line-height: 1.7; }
.tq-question .qnum { font-size: 12px; font-weight: 700; color: #2f6fe0; background: #e8f0ff; border-radius: 99px; padding: 4px 12px; margin-right: 6px; }
.tq-question b { color: #e0862e; }
.tq-stage { display: flex; align-items: flex-start; gap: 22px; flex-wrap: wrap; justify-content: center; }
.tq-map-card { background: #fff; border: 1px solid #d9e4f0; border-radius: 14px; padding: 14px 16px; box-shadow: 0 6px 18px rgba(45, 80, 130, .08); text-align: center; }
.tq-card-title { font-size: 13px; font-weight: 800; color: #20364f; margin-bottom: 10px; }
.tq-mapbox { display: inline-block; position: relative; padding-bottom: 22px; }
.tq-map { border-collapse: collapse; }
.tq-cell { width: 40px; height: 40px; border: 1px solid #d7e2ef; text-align: center; font-weight: 800; font-size: 17px; color: #5f7490; background: #f6f9fd; }
.tq-cell.ht1 { background: #dceafe; color: #2f6bb5; }
.tq-cell.ht2 { background: #9ec8f6; color: #fff; }
.tq-cell.ht3 { background: #4f8cf0; color: #fff; }
.tq-front-arrow { position: absolute; left: 0; right: 0; bottom: 2px; text-align: center; color: #e05d5d; font-weight: 800; font-size: 13px; letter-spacing: 2px; }
.tq-map-legend { font-size: 11.5px; color: #7a8ba1; margin-top: 2px; }
.tq-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 430px; }
.tq-opt { position: relative; background: #fff; border: 2px solid #d9e4f0; border-radius: 13px; padding: 10px; cursor: pointer; transition: transform .12s, border-color .12s; }
.tq-opt:hover { transform: translateY(-2px); border-color: #8bb2e8; }
.tq-opt-label { position: absolute; top: 6px; left: 8px; font-size: 12px; font-weight: 800; color: #8b99ac; }
.tq-svg { width: 88px; height: auto; display: block; margin: 0 auto; }
.tq-svg-sm { width: 120px; height: auto; display: block; }
.tq-blk { fill: #b7d4ff; stroke: #2f6fe0; stroke-width: .06; stroke-linejoin: round; }
.tq-blk.sm { fill: #cfe2fb; }
.tq-opt.is-right { border-color: #2e9e6b; background: #ecf9f1; }
.tq-opt.is-right .tq-blk { fill: #6fc9a0; stroke: #1e7a52; }
.tq-opt.is-wrong { border-color: #e05d5d; background: #fff0ee; }
.tq-opt.is-wrong .tq-blk { fill: #f1a5a0; stroke: #c75050; }
.tq-opt.is-dim { opacity: .5; }
.tq-result { max-width: 520px; padding: 14px 20px; border-radius: 12px; font-size: 13.5px; text-align: center; line-height: 1.8; }
.tq-result.is-right { background: #ecf9f1; border: 1px solid #bfe5cd; color: #1f6b47; }
.tq-result.is-wrong { background: #fff0ee; border: 1px solid #f3c8c4; color: #8c3b36; }
.tq-result .result-title { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
.tq-result p { margin: 8px 0; }
.tq-result button { border: 0; border-radius: 8px; padding: 9px 22px; font-size: 13px; font-weight: 700; cursor: pointer; background: #3e7fe8; color: #fff; }
.tq-both { display: flex; justify-content: center; gap: 24px; margin: 4px 0; }
.tq-both-item { font-size: 12.5px; font-weight: 800; color: #40536a; }
.tq-explain { font-size: 12.5px; color: inherit; opacity: .9; }
.tq-side { padding: 18px; background: #fff; border-left: 1px solid #e1e8f0; overflow: auto; }
.tq-tip { margin-bottom: 14px; padding: 13px; border-radius: 10px; background: #f4f8fc; border: 1px solid #dfeaf6; font-size: 13px; line-height: 1.8; color: #4d5f75; }
.tq-tip strong { display: block; margin-bottom: 6px; }
.tq-tip ul { margin: 0; padding-left: 18px; }
.tq-tip li { margin: 5px 0; }
.tq-tip b { color: #2f6fe0; }
.tq-tip p { margin: 0; }
.tq-warm { background: #fff8ef; border-color: #f2e2c6; }
.fade-enter-active, .fade-leave-active { transition: opacity .18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 900px) {
  .tq-main { grid-template-columns: 1fr; }
  .tq-side { border-left: 0; border-top: 1px solid #e1e8f0; }
}
</style>
