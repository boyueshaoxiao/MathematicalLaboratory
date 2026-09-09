<template>
  <div class="dg-wrap">
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: shape === 'bar' }" @click="pickShape('bar')">▬ 一条 = 0.1</button>
        <button :class="{ active: shape === 'square' }" @click="pickShape('square')">▦ 一格 = 0.01</button>
      </div>
      <div class="frac-seg">
        <button :class="{ active: !quizMode }" @click="quizMode = false">🖐 自由涂</button>
        <button :class="{ active: quizMode }" @click="startQuiz">🎯 照着涂</button>
      </div>
    </div>

    <div class="dg-board">
      <div class="dg-left">
        <!-- 长条：1 被分成 10 格，一格 = 0.1 -->
        <div v-if="shape === 'bar'" class="dg-cells dg-cells-bar">
          <button v-for="i in 10" :key="i" class="dg-cell" :class="{ on: filled[i - 1] }"
            @click="tap(i - 1)">{{ fmtCents(i * 10) }}</button>
        </div>
        <!-- 大方格：1 被分成 100 格，一格 = 0.01 -->
        <div v-else class="dg-cells dg-cells-square">
          <button v-for="i in 100" :key="i" class="dg-cell" :class="{ on: filled[i - 1] }"
            @click="tap(i - 1)"></button>
        </div>
        <div class="dg-legend">
          把 1 平均分成 <b>{{ total }} 份</b>，每份是 <b>{{ unitTxt }}</b> —— 点一点把它涂出来。
        </div>
      </div>

      <aside class="dg-panel">
        <template v-if="!quizMode">
          <div class="dg-count">
            <span class="dg-num">{{ count }}</span><span class="dg-unit">/ {{ total }} 格</span>
          </div>
          <div class="dg-eq" v-if="count">
            {{ count }} 格 = <b class="dg-violet">{{ fracRaw }}</b>
            <span v-if="fracRaw !== fracSimplified">（约分：{{ fracSimplified }}）</span>
            = <b class="dg-violet">{{ fmtCents(cents) }}</b>
          </div>
          <div class="dg-read" v-if="count">读作：{{ readCents(cents) }}</div>
          <div class="dg-tip-card" v-else>点一下格子开始吧！数一格，填一格。</div>
          <div class="dg-btns">
            <button class="frac-btn-main" @click="clearFilled">🧹 清空</button>
          </div>
        </template>

        <template v-else>
          <div class="dg-goal">
            <span>请涂出</span>
            <b class="dg-goal-num">{{ fmtCents(target) }}</b>
          </div>
          <div class="dg-prog">
            已涂 <b>{{ count }}</b> / {{ needText }}
          </div>
          <div class="dg-feed" :class="{ ok: answered && lastOk }">{{ feed }}</div>
          <button v-if="answered" class="frac-btn-main" @click="newTarget">下一题</button>
          <button v-else class="frac-btn-main ghost-b" @click="clearFilled">重新开始</button>
        </template>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { fmtCents, readCents, randomHundredths, randomTenths, fracTextOfCents } from '../../data/decimals/decUtils.js'

const shape = ref('bar') // bar: 10 格（一位小数）；square: 100 格（两位小数）
const quizMode = ref(false)
const filled = ref(new Array(10).fill(false))

const total = computed(() => (shape.value === 'bar' ? 10 : 100))
const unitTxt = computed(() => (shape.value === 'bar' ? '0.1' : '0.01'))
const count = computed(() => filled.value.reduce((s, v) => s + (v ? 1 : 0), 0))
const cents = computed(() => (shape.value === 'bar' ? count.value * 10 : count.value))
const fracRaw = computed(() => `${count.value}/${total.value}`)
const fracSimplified = computed(() => fracTextOfCents(cents.value))

const target = ref(30)
const answered = ref(false)
const lastOk = ref(true)
const feed = ref('')
const needText = computed(() => {
  const need = target.value / (shape.value === 'bar' ? 10 : 1)
  if (answered.value) return `目标 ${fmtCents(target.value)} 已达成`
  if (count.value > need) return `目标 ${need} 格（多涂了 ${count.value - need} 格，点回去）`
  return `还需 ${need - count.value} 格（一共 ${need} 格）`
})

function syncFilled() {
  const t = total.value
  if (filled.value.length !== t) filled.value = new Array(t).fill(false)
}
function clearFilled() {
  filled.value = new Array(total.value).fill(false)
}

function tap(i) {
  if (quizMode.value && answered.value) return
  filled.value[i] = !filled.value[i]
  if (quizMode.value) checkQuiz()
}

function genTarget() {
  if (shape.value === 'bar') {
    // 一位小数：0.1 ~ 0.9（计数单位是 0.1）
    return randomTenths(0)
  }
  // 两位小数：0.05 ~ 0.99，避免整十分（用 0.01 作单位更好数）
  let c = randomHundredths(0)
  while (c % 10 === 0) c = randomHundredths(0)
  return c
}

function newTarget() {
  target.value = genTarget()
  clearFilled()
  answered.value = false
  feed.value = ''
  lastOk.value = true
}

function startQuiz() {
  quizMode.value = true
  newTarget()
}

function checkQuiz() {
  const need = target.value / (shape.value === 'bar' ? 10 : 1)
  if (count.value === need && need > 0) {
    answered.value = true
    lastOk.value = true
    feed.value = `✅ 涂对了！${count.value} 格 = ${fracRaw.value} = ${fmtCents(target.value)}，读作 ${readCents(target.value)}。`
  } else if (count.value > need) {
    lastOk.value = false
    feed.value = `⚠️ 多涂了 ${count.value - need} 格，点回去一些。`
  }
}

function pickShape(s) {
  shape.value = s
  if (quizMode.value) newTarget()
  else clearFilled()
}

watch([shape, total], () => { if (!quizMode.value) syncFilled() })
</script>

<style scoped>
.dg-board { display: flex; gap: 22px; align-items: flex-start; padding: 14px 6px 4px; flex-wrap: wrap; }
.dg-left { flex: 1 1 460px; min-width: 300px; }
.dg-cells { display: flex; gap: 5px; background: #fdfdff; border: 1px solid #e3ddf1; border-radius: 12px; padding: 8px; }
.dg-cells-bar { flex-wrap: nowrap; }
.dg-cells-bar .dg-cell { flex: 1; }
.dg-cells-square { display: grid; grid-template-columns: repeat(10, 1fr); }
.dg-cell {
  aspect-ratio: 1; border: 0; border-radius: 4px; background: #edeff4; cursor: pointer; transition: transform .06s;
  font-size: 11px; color: #b7a9dd; font-weight: 700;
}
.dg-cells-bar .dg-cell { aspect-ratio: auto; height: 30px; font-size: 12px; color: #9b8dc6; }
.dg-cell:hover { background: #e4def8; }
.dg-cell.on { background: #8b63e8; box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .16); color: #fff; }
.dg-cells-bar .dg-cell.on { background: #8b63e8; }
.dg-legend { font-size: 12.5px; color: #6d5f94; margin-top: 8px; padding-left: 4px; }
.dg-legend b { color: #6d46cf; }
.dg-panel { width: 250px; flex: 0 0 auto; background: #faf8ff; border: 1px solid #e6defa; border-radius: 14px; padding: 14px; }
.dg-count { display: flex; align-items: baseline; gap: 8px; }
.dg-num { font-size: 40px; font-weight: 900; color: #6d46cf; line-height: 1; }
.dg-unit { font-size: 13px; color: #7d6aa6; }
.dg-eq { margin: 12px 0 4px; font-size: 15px; line-height: 1.9; color: #443a63; }
.dg-violet { color: #6d46cf; font-size: 18px; }
.dg-read { font-size: 15px; font-weight: 700; color: #443a63; }
.dg-tip-card { font-size: 13.5px; color: #8b7cab; line-height: 1.7; margin-top: 10px; }
.dg-btns { display: flex; gap: 8px; margin-top: 14px; }
.dg-goal { font-size: 16px; color: #443a63; display: flex; align-items: baseline; gap: 8px; }
.dg-goal-num { font-size: 34px; color: #6d46cf; font-weight: 900; }
.dg-prog { margin: 10px 0 6px; font-size: 14px; color: #6d5f94; }
.dg-prog b { color: #b3540e; }
.dg-feed { font-size: 13.5px; color: #c25f14; min-height: 40px; line-height: 1.7; font-weight: 600; }
.dg-feed.ok { color: #1f8f5f; }
.ghost-b { background: #fff; border: 1.5px solid #d7d0ea; color: #5c5480; }
</style>
