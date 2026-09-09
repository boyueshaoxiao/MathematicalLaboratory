<template>
  <div>
    <div class="frac-task-band aq-band">
      <span>求这个<b> {{ qShape.name }}</b>的面积。</span>
      <span class="aq-unit">（长度单位：cm，面积单位：cm²）</span>
    </div>

    <div class="area-grid aq-grid">
      <div class="aq-svg">
        <AreaShape :kind="q.key" :p="q.params" :fill="fill" />
      </div>
      <div class="aq-side">
        <p class="aq-q">
          请你算一算：它的面积是多少？
          <template v-if="hint"> <span class="aq-hint">💡 {{ hint }}</span></template>
        </p>
        <div class="aq-opts">
          <button v-for="(o, i) in options" :key="i" class="aq-opt"
            :class="{ good: okIndex === i, bad: badIndex === i }" :disabled="answered" @click="pick(i)">
            {{ fmtArea(o) }} <small>cm²</small>
          </button>
        </div>
        <transition name="ad-fade">
          <div v-if="answered" class="aq-fb">
            <template v-if="okIndex > -1 && badIndex === -1">
              <b class="frac-good">✅ 正确！</b>
              <span class="aq-cal">{{ calTxt }} = <b>{{ fmtArea(ans) }}</b> cm²</span>
            </template>
            <template v-else>
              <b class="frac-bad">再想一想</b>
              <span class="aq-cal">{{ hintTxt }}</span>
            </template>
          </div>
        </transition>
        <div class="aq-foot">
          <span class="aq-score">得分 {{ streak }} / {{ total }}</span>
          <button v-if="answered" class="frac-btn-main" @click="next">下一题 ➡️</button>
          <button v-else class="frac-btn-main ghost-dis" disabled>先选一个答案</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AreaShape from './AreaShape.vue'
import { randomAreaQuiz, makeOptions, shapeByKey, fmtArea, hintFor } from '../../data/area/areaUtils.js'

const q = ref(randomAreaQuiz())
const qShape = computed(() => shapeByKey(q.value.key))
const params = computed(() => q.value.params)
const ans = computed(() => qShape.value.compute(params.value))
const options = ref([])
const answered = ref(false)
const okIndex = ref(-1)
const badIndex = ref(-1)
const hint = ref('')
const streak = ref(0)
const total = ref(0)
const fill = computed(() => ({
  square: '#bfe0ff', rect: '#ffe0b8', para: '#c8e6d2', tri: '#ffd9d9', trap: '#dcd6ff', circle: '#ffe9a8'
}[q.value.key]))

function newQ() {
  q.value = randomAreaQuiz()
  options.value = makeOptions(q.value)
  answered.value = false
  okIndex.value = -1
  badIndex.value = -1
  hint.value = ''
}
newQ()

function pick(i) {
  if (answered.value) return
  answered.value = true
  total.value++
  const right = Math.abs(options.value[i] - ans.value) < 1e-6
  if (right) {
    okIndex.value = i
    streak.value++
  } else {
    badIndex.value = i
    const ri = options.value.findIndex(o => Math.abs(o - ans.value) < 1e-6)
    okIndex.value = ri
    hint.value = hintFor(q.value.key)
  }
}
function next() { newQ() }

const V = k => params.value[k]
const calTxt = computed(() => {
  const k = q.value.key
  const p = params.value
  if (k === 'square') return `${p.a} × ${p.a}`
  if (k === 'rect') return `${p.a} × ${p.b}`
  if (k === 'para') return `${p.a} × ${p.h}`
  if (k === 'tri') return `${p.a} × ${p.h} ÷ 2`
  if (k === 'trap') return `(${p.a} + ${p.b}) × ${p.h} ÷ 2`
  return `π × ${p.r} × ${p.r}`
})
const hintTxt = computed(() => hintFor(q.value.key))
</script>

<style scoped>
.aq-band { justify-content: center; }
.aq-band b { color: #c25f14; }
.aq-unit { color: #7d8b9c; font-size: 12px; }
.aq-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(260px, .9fr); gap: 12px; padding: 12px; align-items: start; }
.aq-svg { display: flex; justify-content: center; }
.aq-q { font-size: 15px; color: #3d4f66; line-height: 1.8; margin: 4px 0 10px; }
.aq-hint { color: #b8540e; font-size: 13px; }
.aq-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.aq-opt {
  border: 1.5px solid #d5dfec; background: #fff; border-radius: 11px; padding: 10px 6px;
  font-size: 21px; font-weight: 800; color: #20364f; cursor: pointer;
}
.aq-opt small { font-size: 12px; color: #7d8b9c; font-weight: 700; }
.aq-opt:hover { border-color: #f0943f; }
.aq-opt:disabled { cursor: default; }
.aq-opt.good { background: #e7f6ee; border-color: #2f9e6e; color: #1e7a52; }
.aq-opt.bad { background: #fdeaea; border-color: #e05d5d; color: #c75050; }
.aq-fb { background: #f4f7fb; border-radius: 10px; padding: 8px 12px; margin-top: 10px; font-size: 13.5px; line-height: 1.9; }
.aq-cal { display: inline; color: #44566c; margin-left: 8px; }
.aq-cal b { color: #2c6ec4; }
.aq-foot { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.aq-score { font-size: 14px; font-weight: 800; color: #2c6ec4; }
.ghost-dis { opacity: .5; cursor: not-allowed !important; }
.ad-fade-enter-active, .ad-fade-leave-active { transition: opacity .25s; }
.ad-fade-enter-from, .ad-fade-leave-to { opacity: 0; }
@media (max-width: 800px) { .aq-grid { grid-template-columns: 1fr; } }
</style>
