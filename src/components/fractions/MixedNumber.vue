<template>
  <div>
    <!-- 模式切换 -->
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: mode === 'explore' }" @click="mode = 'explore'">🔍 读一读：看图认识假分数</button>
        <button :class="{ active: mode === 'quiz' }" @click="startQuiz">🎯 考一考</button>
      </div>
      <span v-if="mode === 'quiz'" class="frac-score">答对 {{ streak }} 题</span>
    </div>

    <!-- 挑战题目横幅 -->
    <div v-if="mode === 'quiz'" class="frac-task-band">
      <template v-if="quizDir === 0">
        <span>假分数</span>
        <Fraction :m="quizM" :n="quizN" small />
        <span>里的 {{ quizM }} 份能凑成几个整体？读作下面哪个带分数？</span>
      </template>
      <template v-else>
        <span class="mixed-chip">
          <b v-if="quizQ > 0">{{ quizQ }}</b><Fraction :m="quizR" :n="quizN" small />
        </span>
        <span>写成假分数是下面哪个？</span>
      </template>
    </div>

    <!-- 图形区：整圆 + 部分圆 -->
    <div class="frac-figure mixed-fig">
      <div v-for="idx in q" :key="'w' + idx" class="mixed-cell">
        <FracPie :n="n" :m="n" :size="150" fill-color="#55b99a" base-color="#e8f4ef" />
        <span class="mixed-tag">1</span>
      </div>
      <div v-if="r > 0" class="mixed-cell">
        <FracPie :n="n" :m="r" :size="150" />
        <span class="mixed-tag">{{ r }}/{{ n }}</span>
      </div>
    </div>

    <!-- 挑战选项 -->
    <div v-if="mode === 'quiz'" class="frac-ctl frac-ctl-center mixed-opts">
      <button v-for="(o, i) in options" :key="i" class="mixed-opt"
        :class="{ 'mixed-opt-good': okIndex === i, 'mixed-opt-bad': badIndex === i }"
        :disabled="answered" @click="pick(i)">
        <template v-if="quizDir === 0">
          <span v-if="o.q > 0">{{ o.q }} 又 </span><Fraction :m="o.r" :n="n" small />
        </template>
        <Fraction v-else :m="o.m" :n="n" small />
      </button>
    </div>
    <p v-if="mode === 'quiz'" class="mixed-fb" :class="{ good: answered && okIndex > -1 }">{{ feedback }}</p>
    <button v-if="answered" class="frac-btn-main mixed-next" @click="nextQuiz">下一题</button>

    <!-- 探索模式输入与读数 -->
    <template v-if="mode === 'explore'">
      <div class="frac-toolbar">
        <div class="frac-seg">
          <button :class="{ active: dir === 0 }" @click="setDir(0)">数一数：能凑成几个“1”</button>
          <button :class="{ active: dir === 1 }" @click="setDir(1)">合并：把它们合起来是多少</button>
        </div>
      </div>

      <div v-if="dir === 0" class="frac-ctl frac-ctl-center">
        <label class="frac-label">每份是
          <select v-model.number="n" class="frac-select">
            <option v-for="d in DENS" :key="d" :value="d">{{ d }} 分之一</option>
          </select>
        </label>
        <label class="frac-label">有这样的
          <input class="frac-slider" type="range" min="1" :max="n * 3" v-model.number="m" />
          <b class="frac-num">{{ m }}</b> 份（分子）
        </label>
      </div>
      <div v-else class="frac-ctl frac-ctl-center">
        <label class="frac-label">整体“1”有
          <input class="frac-slider" type="range" min="0" max="3" v-model.number="q" /> <b class="frac-num">{{ q }}</b> 个
        </label>
        <label class="frac-label">每份是
          <select v-model.number="n" class="frac-select">
            <option v-for="d in DENS" :key="d" :value="d">{{ d }} 分之一</option>
          </select>
        </label>
        <label class="frac-label">还有
          <input class="frac-slider" type="range" min="0" :max="n - 1" v-model.number="r" /> <b class="frac-num">{{ r }}</b> 份
        </label>
      </div>

      <div class="mixed-read">
        <template v-if="dir === 0">
          <span class="mixed-big">假分数</span>
          <Fraction :m="m" :n="n" tall />
          <span class="mixed-arr">=</span>
          <template v-if="wholeQ > 0 && wholeR === 0">
            <span class="mixed-whole">{{ wholeQ }}</span>
          </template>
          <template v-else>
            <span v-if="wholeQ > 0" class="mixed-whole">{{ wholeQ }} 又</span>
            <Fraction v-if="wholeR > 0" :m="wholeR" :n="n" tall />
            <span v-if="wholeQ === 0" class="mixed-big">（不足 1 个整体）</span>
          </template>
        </template>
        <template v-else>
          <span v-if="q > 0" class="mixed-whole">{{ q }} 又</span>
          <Fraction v-if="r > 0" :m="r" :n="n" tall />
          <span v-if="q === 0 && r > 0" class="mixed-big">（不足 1 个整体）</span>
          <span class="mixed-arr">合起来 =</span>
          <Fraction :m="combinedM" :n="n" tall />
        </template>
        <p class="mixed-zh">{{ readZh }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import FracPie from './FracPie.vue'
import Fraction from './Fraction.vue'
import { fracReadZh, mixedReadZh } from '../../data/fractions/fracUtils.js'

const DENS = [2, 3, 4, 5, 6, 8]
const mode = ref('explore')
const dir = ref(0)

// 探索：方向0 由 m/n 驱动；方向1 由 q、r、n 驱动
const n = ref(4)
const m = ref(6)
const q = ref(1)
const r = ref(2)

const wholeQ = computed(() => Math.floor(m.value / n.value))
const wholeR = computed(() => m.value % n.value)
const combinedM = computed(() => q.value * n.value + r.value)

const displayQ = computed(() => dir.value === 0 ? wholeQ.value : q.value)
const displayR = computed(() => dir.value === 0 ? wholeR.value : r.value)
const readZh = computed(() => {
  if (displayQ.value === 0 && displayR.value === 0) return '还没有取任何一份'
  if (displayR.value === 0) return `正好 ${displayQ.value} 个整体，没有剩余的份`
  if (displayQ.value === 0) return `还没有凑成 1 个整体，读作：${fracReadZh(displayR.value, n.value)}`
  const mixed = dir.value === 0
    ? mixedReadZh(wholeQ.value, wholeR.value, n.value)
    : mixedReadZh(q.value, r.value, n.value)
  return dir.value === 0
    ? `读作：${mixed}，也就是 ${fracReadZh(m.value, n.value)}`
    : `读作：${mixed}。假分数写出来是 ${combinedM.value}/${n.value}`
})

function setDir(d) { dir.value = d }

// 挑战
const quizDir = ref(0)
const quizN = ref(4)
const quizM = ref(6) // 假分数分子
const quizQ = ref(1)
const quizR = ref(2)
const options = ref([])
const answered = ref(false)
const okIndex = ref(-1)
const badIndex = ref(-1)
const streak = ref(0)
const feedback = ref('')

function startQuiz() {
  mode.value = 'quiz'
  nextQuiz()
}
function newQuiz() {
  quizDir.value = Math.random() < 0.5 ? 0 : 1
  quizN.value = DENS[Math.floor(Math.random() * DENS.length)]
  if (quizDir.value === 0) {
    quizM.value = quizN.value + 1 + Math.floor(Math.random() * (quizN.value * 2 - 1))
    quizQ.value = Math.floor(quizM.value / quizN.value)
    quizR.value = quizM.value % quizN.value
    // 答案：q 又 r/n；干扰：q 偏移 / r 偏移（保证范围内）
    const set = new Set([`${quizQ.value}-${quizR.value}`])
    const cand = []
    for (const dq of [1, -1, 0]) {
      for (const dr of [0, 1, -1]) {
        if (!dq && !dr) continue
        const nq = quizQ.value + dq
        const nr = quizR.value + dr
        if (nq >= 1 && nr >= 1 && nr < quizN.value) cand.push(`${nq}-${nr}`)
      }
    }
    while (cand.length && set.size < 4) {
      const s = cand.splice(Math.floor(Math.random() * cand.length), 1)[0]
      if (!set.has(s)) set.add(s)
    }
    options.value = shuffle([...set]).map(s => {
      const [qq, rr] = s.split('-').map(Number)
      return { q: qq, r: rr }
    })
  } else {
    quizQ.value = 1 + Math.floor(Math.random() * 3)
    quizR.value = 1 + Math.floor(Math.random() * (quizN.value - 1))
    quizM.value = quizQ.value * quizN.value + quizR.value
    const set = new Set([quizM.value])
    const cand = [quizM.value + quizN.value, quizM.value - quizN.value, quizM.value + 1, quizM.value - 1,
      quizQ.value * quizN.value, (quizQ.value + 1) * quizN.value + quizR.value]
    for (const c of cand) if (c > quizN.value && c <= quizN.value * 4) set.add(c)
    options.value = shuffle([...set]).map(x => ({ m: x }))
  }
}
function shuffle(a) { return a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]) }

function pick(i) {
  if (answered.value) return
  const o = options.value[i]
  const right = quizDir.value === 0
    ? (o.q === quizQ.value && o.r === quizR.value)
    : (o.m === quizM.value)
  answered.value = true
  if (right) {
    okIndex.value = i
    streak.value++
    feedback.value = '✅ 答对了！'
  } else {
    badIndex.value = i
    const rightIdx = options.value.findIndex(o2 => quizDir.value === 0
      ? o2.q === quizQ.value && o2.r === quizR.value
      : o2.m === quizM.value)
    okIndex.value = rightIdx
    feedback.value = '✏️ 再数一数：这个才是对的'
  }
}
function nextQuiz() {
  answered.value = false
  okIndex.value = -1
  badIndex.value = -1
  feedback.value = ''
  newQuiz()
}

watch([n], () => {
  if (dir.value === 0 && m.value > n.value * 3) m.value = n.value * 3
  if (dir.value === 1 && r.value >= n.value) r.value = n.value - 1
})
</script>

<style scoped>
.mixed-chip { display: inline-flex; align-items: center; gap: 4px; }
.mixed-chip b { font-size: 20px; }
.mixed-fig { gap: 34px; }
.mixed-cell { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.mixed-tag { font-size: 14px; color: #526174; font-weight: 800; }
.mixed-opts { margin-top: 16px; }
.mixed-opt {
  border: 1.5px solid #d5dfec; background: #fff; border-radius: 12px; padding: 8px 16px;
  font-size: 16px; font-weight: 800; color: #20364f; cursor: pointer;
}
.mixed-opt:hover { border-color: #f0943f; }
.mixed-opt:disabled { cursor: default; }
.mixed-opt-good { background: #e7f6ee; border-color: #2f9e6e; }
.mixed-opt-bad { background: #fdeaea; border-color: #e05d5d; }
.mixed-fb { text-align: center; font-size: 15px; margin: 12px 0 0; }
.mixed-fb.good { color: #1e7a52; font-weight: 800; }
.mixed-next { display: block; margin: 14px auto 0; }
.mixed-read { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; margin-top: 16px; }
.mixed-whole { font-size: 26px; font-weight: 800; color: #20364f; }
.mixed-arr { font-size: 24px; font-weight: 800; color: #c25f14; }
.mixed-zh { flex-basis: 100%; text-align: center; font-size: 16px; color: #44566c; margin: 6px 0 0; }
.frac-ctl-center { justify-content: center; margin-top: 12px; }
</style>
