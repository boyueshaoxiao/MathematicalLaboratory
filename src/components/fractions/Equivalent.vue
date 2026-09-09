<template>
  <div class="eq-wrap">
    <section class="eq-sec">
      <h3 class="eq-title">🌱 从一条到更多条——分数变大变样，大小不变</h3>
      <div class="eq-controls frac-ctl">
        <label class="frac-label">
          选择分数
          <select v-model.number="baseN" class="frac-select">
            <option :value="1">1</option><option :value="2">2</option><option :value="3">3</option>
          </select>/
          <select v-model.number="baseD" class="frac-select">
            <option v-for="d in DENS" :key="d" :value="d">{{ d }}</option>
          </select>
        </label>
        <span class="eq-hint">选中一个分数，下面自动生成它的等值兄弟</span>
      </div>

      <div class="eq-rows">
        <div v-for="(row, ri) in rows" :key="ri" class="eq-row" :class="{ 'eq-self': ri === 0 }">
          <div class="eq-row-lab">
            <Fraction :m="row[0]" :n="row[1]" small />
            <i v-if="ri > 0" class="eq-times">×{{ ri + 1 }}</i>
          </div>
          <FracBar :n="row[1]" :m="row[0]" :width="560" :height="40"
            :base-color="ri === 0 ? '#ffe3bd' : '#eef3fa'" />
        </div>
      </div>
      <p class="eq-find">
        每一行都涂了同样长的一段——<b>分子、分母同时乘一个相同的数（×{{ 2 }}、×{{ 3 }}…），分数大小不变</b>。
      </p>
    </section>

    <section class="eq-sec">
      <h3 class="eq-title">✂️ 约分挑战：把分数化成最简（分子分母不能再同时被整除）</h3>
      <div class="eq-quiz">
        <div class="eq-q">
          <Fraction :m="quiz[0]" :n="quiz[1]" tall />
        </div>
        <span class="eq-arrow">约分 →</span>
        <div class="eq-ans">
          <input class="frac-num-input" type="number" min="1" v-model.number="ansN" placeholder="分子" />
          <span class="eq-over">/</span>
          <input class="frac-num-input" type="number" min="1" v-model.number="ansD" placeholder="分母" />
          <span class="eq-fb" :class="{ good: solved, bad: wrong }">{{ feedback }}</span>
        </div>
        <div class="eq-actions frac-ctl">
          <button class="frac-btn-main" @click="checkAns">检查</button>
          <button @click="hint">提示</button>
          <button @click="nextQuiz">下一题</button>
        </div>
      </div>
      <p v-if="hintShown" class="eq-hint-line">
        分子和分母都能被 <b>{{ gd }}</b> 整除：分子 ÷ {{ gd }} = {{ quiz[0] / gd }}，分母 ÷ {{ gd }} = {{ quiz[1] / gd }}。
      </p>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import FracBar from './FracBar.vue'
import Fraction from './Fraction.vue'
import { simplify, equalSeries, gcd, randomReducible, FRIENDLY_DENS } from '../../data/fractions/fracUtils.js'

const DENS = FRIENDLY_DENS.slice(0, 6) // 2,3,4,5,6,8
const baseN = ref(1)
const baseD = ref(2)

const rows = computed(() => equalSeries(baseN.value, baseD.value, 5, 30))

const quiz = ref(randomReducible(20))
const ansN = ref(null)
const ansD = ref(null)
const solved = ref(false)
const wrong = ref(false)
const hintShown = ref(false)
const feedback = ref('')

const gd = computed(() => gcd(quiz.value[0], quiz.value[1]))

function checkAns() {
  if (solved.value) return
  if (!ansN.value || !ansD.value || ansN.value < 1 || ansD.value < 1) {
    feedback.value = '先填两个数字'
    return
  }
  const [en, ed] = simplify(ansN.value, ansD.value)
  const [qn, qd] = quiz.value
  if (en === qn && ed === qd) {
    solved.value = true
    feedback.value = '✅ 对了！已经不能继续约了'
  } else {
    wrong.value = true
    const [sn, sd] = simplify(qn, qd)
    feedback.value = `再想想，最简是 ${sn}/${sd}（你的答案化简后是 ${en}/${ed}）`
  }
}
function hint() {
  hintShown.value = true
  feedback.value = '试试除以最大公因数'
}
function nextQuiz() {
  quiz.value = randomReducible(20)
  ansN.value = null
  ansD.value = null
  solved.value = false
  wrong.value = false
  hintShown.value = false
  feedback.value = ''
}
</script>

<style scoped>
.eq-wrap { display: flex; flex-direction: column; gap: 26px; margin-top: 14px; }
.eq-sec { padding: 14px; border: 1px solid #eceff4; border-radius: 12px; background: #fbfcfe; }
.eq-title { margin: 0 0 12px; font-size: 16px; }
.eq-hint { font-size: 12px; color: #8b99ac; }
.eq-rows { display: flex; flex-direction: column; gap: 9px; max-width: 640px; margin: 16px auto 6px; }
.eq-row { display: flex; align-items: center; gap: 16px; }
.eq-row-lab { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 0 0 88px; }
.eq-times { font-style: normal; color: #2c6ec4; font-size: 12px; }
.eq-self .eq-row-lab { border: 2px dashed #f0943f; border-radius: 8px; padding: 4px; }
.eq-find { text-align: center; font-size: 14.5px; color: #3d4f66; max-width: 620px; margin: 14px auto 0; line-height: 1.8; }
.eq-find b { color: #c25f14; }
.eq-quiz { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; justify-content: center; }
.eq-q { padding: 8px 14px; background: #fff3e4; border-radius: 12px; }
.eq-arrow { font-size: 18px; color: #75879b; font-weight: 700; }
.eq-ans { display: flex; align-items: center; gap: 8px; }
.eq-over { font-size: 22px; font-weight: 800; color: #20364f; }
.eq-fb { font-size: 14px; min-width: 210px; }
.eq-fb.good { color: #1e7a52; }
.eq-fb.bad { color: #c75050; }
.eq-actions { flex-basis: 100%; justify-content: center; margin-top: 4px; }
.eq-hint-line { text-align: center; color: #2c6ec4; font-size: 14px; margin: 10px 0 0; }
.eq-hint-line b { font-size: 16px; }
</style>
