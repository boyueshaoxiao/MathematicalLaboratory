<template>
  <div>
    <!-- 操作对象选择 -->
    <div class="as-formula">
      <div class="as-op-col">
        <label class="frac-label">第一个分数</label>
        <div class="frac-ctl as-pick">
          <select v-model.number="n1" class="frac-select">
            <option v-for="d in FRIENDLY" :key="d" :value="d">{{ d }} 份</option>
          </select>
          <select v-model.number="a1" class="frac-select" :disabled="same">
            <option v-for="v in n1" :key="v" :value="v">{{ v }}</option>
          </select>
          <span class="as-hint">（取 {{ a1 }} 份）</span>
        </div>
      </div>
      <div class="as-op-sign">{{ op === 'add' ? '+' : '−' }}</div>
      <div class="as-op-col">
        <label class="frac-label">第二个分数</label>
        <div class="frac-ctl as-pick">
          <select v-model.number="n2" class="frac-select">
            <option v-for="d in FRIENDLY" :key="d" :value="d">{{ d }} 份</option>
          </select>
          <select v-model.number="a2" class="frac-select" :disabled="same">
            <option v-for="v in n2" :key="v" :value="v">{{ v }}</option>
          </select>
          <span class="as-hint">（取 {{ a2 }} 份）</span>
        </div>
      </div>
      <div class="frac-seg">
        <button :class="{ active: op === 'add' }" @click="setOp('add')">加</button>
        <button :class="{ active: op === 'sub' }" @click="setOp('sub')">减</button>
      </div>
      <button class="frac-btn-main" @click="randomize">🎲 随机一题</button>
      <span v-if="needSwap" class="as-warn">被减数不够减，已自动换了个减法方向</span>
    </div>

    <!-- 通分等式说明 -->
    <div v-if="L > n1 || L > n2" class="as-eq-line">
      <span v-if="L > n1" class="as-eq"> <Fraction :m="a1" :n="n1" small /> = <Fraction :m="p1" :n="L" small />
        <i class="as-x">×{{ L / n1 }}</i></span>
      <span v-if="L > n2" class="as-eq"> <Fraction :m="a2" :n="n2" small /> = <Fraction :m="p2" :n="L" small />
        <i class="as-x">×{{ L / n2 }}</i></span>
      <span class="as-step-tag">第 2 步：通分——换成分母相同的分数</span>
    </div>

    <!-- 可视化条 -->
    <div class="as-visual">
      <div class="as-vrow">
        <span class="as-vtag">第一个数</span>
        <FracBar :n="L" :m="p1" :width="560" :height="46" />
      </div>
      <div class="as-vrow">
        <span class="as-vtag">第二个数{{ op === 'sub' ? '（要减掉）' : '' }}</span>
        <FracBar :n="L" :m="p2" :width="560" :height="46"
          :base-color="op === 'sub' ? '#fdeaea' : '#fff3e0'" :fill-color="op === 'sub' ? '#ef6b7b' : '#55b99a'" />
      </div>
      <div class="as-vrow as-result-row" v-if="stage >= 2">
        <span class="as-vtag">结果</span>
        <FracBar :n="L" :m="r" :width="560" :height="52"
          :fill-color="op === 'add' ? '#55b99a' : '#4e9e7c'" base-color="#fff" />
      </div>
    </div>

    <!-- 步骤控制 -->
    <div class="frac-ctl frac-ctl-center">
      <button class="frac-btn-main" @click="reset">重新开始</button>
      <div class="frac-seg">
        <button :class="{ active: stage >= 0 }" @click="stage = 0">① 两个分数</button>
        <button v-if="needStep2" :class="{ active: stage >= 1 }" @click="stage = Math.max(1, stage)">② 通分</button>
        <button :class="{ active: stage >= 2 }" @click="stage = 2">③ 计算</button>
      </div>
    </div>
    <p class="as-answer" :class="{ done: stage >= 2 }">
      {{ eqLine }} <b>= {{ resultLine }}</b>
      <span v-if="stage >= 2" class="as-reason">{{ reason }}</span>
    </p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FracBar from './FracBar.vue'
import Fraction from './Fraction.vue'
import { lcm, simplify, displayFraction, fracReadZh } from '../../data/fractions/fracUtils.js'

const FRIENDLY = [2, 3, 4, 6, 8, 12]

const n1 = ref(3)
const a1 = ref(1)
const n2 = ref(4)
const a2 = ref(1)
const op = ref('add')
const stage = ref(0)
const same = computed(() => n1.value === n2.value)
const needSwap = ref(false)

// 公分母（两个分母都取最小公倍数；12 与 8 的 L=24，条上仍清晰）
const L = computed(() => lcm(n1.value, n2.value))
const p1 = computed(() => a1.value * L.value / n1.value)
const p2 = computed(() => a2.value * L.value / n2.value)
const r = computed(() => op.value === 'add' ? p1.value + p2.value : p1.value - p2.value)
const needStep2 = computed(() => !same.value)

const eqLine = computed(() => `${a1.value}/${n1.value} ${op.value === 'add' ? '+' : '−'} ${a2.value}/${n2.value}`)

const resultLine = computed(() => {
  if (stage.value < 2) return '…'
  return displayFraction(r.value, L.value)
})
const reason = computed(() => {
  const [sn, sd] = simplify(r.value, L.value)
  if (r.value === 0) return '两个数一样大，减完等于 0'
  if (same.value) return '分母相同，分子直接加减'
  if (sd === L.value) return `分子 ${op.value === 'add' ? '相加' : '相减'}：${p1.value} ${op.value === 'add' ? '+' : '−'} ${p2.value} = ${r.value}，分母还是 ${L.value}`
  return `分子 ${op.value === 'add' ? '相加' : '相减'}得 ${r.value}/${L.value}，约分后是 ${sn}/${sd}`
})

function setOp(o) {
  op.value = o
  if (o === 'sub' && a1.value * n2.value < a2.value * n1.value) swapForSub()
  stage.value = 0
}
function swapForSub() {
  needSwap.value = true
  ;[n1.value, n2.value] = [n2.value, n1.value]
  ;[a1.value, a2.value] = [a2.value, a1.value]
  setTimeout(() => { needSwap.value = false }, 2600)
}
function reset() {
  stage.value = 0
}
function randomize() {
  const ds = FRIENDLY.slice()
  const pick = () => ds[Math.floor(Math.random() * ds.length)]
  n1.value = pick()
  n2.value = pick()
  a1.value = 1 + Math.floor(Math.random() * (n1.value - 1))
  a2.value = 1 + Math.floor(Math.random() * (n2.value - 1))
  op.value = Math.random() < 0.5 ? 'add' : 'sub'
  if (op.value === 'sub' && a1.value / n1.value < a2.value / n2.value) swapForSub()
  stage.value = 0
}
</script>

<style scoped>
.as-formula { display: flex; gap: 14px; align-items: center; justify-content: center; flex-wrap: wrap; padding: 8px 0 2px; }
.as-op-col { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.as-pick { flex-wrap: nowrap; }
.as-hint { font-size: 12px; color: #8b99ac; white-space: nowrap; }
.as-op-sign { font-size: 34px; font-weight: 800; color: #c25f14; }
.as-warn { color: #e05d5d; font-size: 13px; }
.as-eq-line { display: flex; gap: 18px; align-items: center; justify-content: center; flex-wrap: wrap; margin-top: 10px; }
.as-eq { display: inline-flex; align-items: center; gap: 6px; background: #f6f9fd; border: 1px solid #e3eaf3; padding: 5px 10px; border-radius: 10px; }
.as-x { font-style: normal; font-size: 12px; color: #2c6ec4; }
.as-step-tag { font-size: 13px; color: #2c6ec4; background: #eaf2ff; padding: 4px 10px; border-radius: 20px; }
.as-visual { display: flex; flex-direction: column; gap: 12px; margin: 16px auto 6px; max-width: 640px; }
.as-vrow { display: flex; gap: 14px; align-items: center; }
.as-vrow .frac-bar-wrap { flex: 1; }
.as-vtag { flex: 0 0 96px; font-size: 13px; color: #75879b; text-align: right; }
.as-result-row { padding-top: 12px; border-top: 2px dashed #e8eef5; }
.as-answer { text-align: center; font-size: 20px; font-weight: 800; color: #44566c; margin-top: 14px; }
.as-answer b { color: #c25f14; }
.as-reason { display: block; font-size: 13.5px; font-weight: 500; color: #2f9e6e; margin-top: 6px; }
.frac-ctl-center { justify-content: center; margin-top: 14px; }
.as-pick select { padding: 6px 8px; }
</style>
