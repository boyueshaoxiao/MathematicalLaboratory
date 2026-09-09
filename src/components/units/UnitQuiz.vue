<template>
  <div>
    <!-- 挑要练的类别 -->
    <div class="uv-set">
      <span class="uv-set-title">🚩 要练哪些：</span>
      <button v-for="c in cats" :key="c.key" class="uv-cat" :style="{ '--c': c.color }"
        :class="{ on: onKeys.includes(c.key) }" @click="toggleCat(c.key)">
        {{ c.icon }} {{ c.name }}
      </button>
      <button class="uv-mini" @click="onKeys = cats.map(c => c.key)">全选</button>
    </div>

    <!-- 计分板 -->
    <div class="uv-score">
      <span>🎯 已练 <b>{{ done }}</b> 题</span>
      <span class="ok">✓ 对 {{ okNum }}</span>
      <span class="no">✗ 错 {{ noNum }}</span>
      <span class="uv-streak">连续答对 {{ streak }} 题</span>
      <button class="uv-mini" @click="resetStat">清零</button>
    </div>

    <!-- 题目 -->
    <div class="uv-qcard">
      <div class="uv-qtext">{{ qText }}</div>
      <div class="uv-qbox">
        <input v-model="answer" class="uv-input uv-qinput" inputmode="decimal" placeholder="答案填这里"
          :disabled="checked" @keyup.enter="check" />
        <span class="uv-qunit">{{ ansText }}</span>
        <button v-if="!checked" class="uv-btn-main" @click="check">检查 ✍️</button>
        <template v-else>
          <button v-if="isOk" class="uv-btn-ok" @click="next">答对啦，下一题 ➡️</button>
          <button v-else class="uv-btn-ok" @click="next">看明白啦，再来一题 ➡️</button>
        </template>
      </div>

      <div v-if="checked" class="uv-feed" :class="isOk ? 'ok' : 'no'">
        <template v-if="isOk">🎉 太棒了，答对了！</template>
        <template v-else>哎呀，答案是 <b>{{ rightText }}</b>，不是 {{ yourText }} 哦。</template>
      </div>

      <transition name="uv-soft">
        <div v-if="checked" class="uv-explain">
          <b>💡 一步一步看：</b>
          <p v-for="(line, i) in explain" :key="i">{{ line }}</p>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { UNIT_CATEGORIES } from '../../data/units/units.js'
import { rateOne, parseNum, convert, fmtQStr, randInt, pick, reduce, cmpFrac } from '../../data/units/unitUtils.js'

const cats = UNIT_CATEGORIES
const onKeys = ref(cats.map(c => c.key))

const done = ref(0)
const okNum = ref(0)
const noNum = ref(0)
const streak = ref(0)
const answer = ref('')
const checked = ref(false)
const isOk = ref(false)
const rightFrac = ref(null)
const explain = ref([])

const q = ref(null) // { cat, from, to, vText, vFrac }
const qText = computed(() => {
  const it = q.value
  return it ? `${it.vText} ${it.from.name} =` : '加载中…'
})
const ansText = computed(() => {
  const it = q.value
  return it ? `${it.to.name}` : ''
})
const rightText = computed(() => fmtQStr(rightFrac.value, 8))
const yourText = computed(() => (parseNum(answer.value) ? fmtQStr(parseNum(answer.value), 8) : answer.value.trim() || '空'))

function toggleCat(k) {
  const arr = [...onKeys.value]
  const i = arr.indexOf(k)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(k)
  onKeys.value = arr
  if (!arr.length) onKeys.value = [cats[0].key]
}

function resetStat() {
  done.value = 0; okNum.value = 0; noNum.value = 0; streak.value = 0
}

// ---------- 出题 ----------
function sizeGap(cat, a, b) {
  if (a.pow != null && b.pow != null) return Math.abs(a.pow - b.pow)
  return Math.abs(cat.units.indexOf(a) - cat.units.indexOf(b))
}

function next() {
  checked.value = false
  isOk.value = false
  answer.value = ''
  rightFrac.value = null
  explain.value = []
  const pool = cats.filter(c => onKeys.value.includes(c.key))
  const cat = pick(pool)

  // 收集差距合适的单位对（十进制 ≤4 级；时间隔 ≤2 个单位）
  const pairs = []
  for (const a of cat.units) {
    for (const b of cat.units) {
      if (a === b) continue
      const g = sizeGap(cat, a, b)
      const ok = a.pow != null ? g >= 1 && g <= 4 : g >= 1 && g <= 2
      if (ok) pairs.push([a, b])
    }
  }
  const [from, to] = pairs.length ? pick(pairs) : pickPair(cat)

  // 从大单位到小单位：整数或带小数的源数
  const one = rateOne(from, to) // 1 from = one to
  let vFrac
  const fromIsBig = one.n > one.d
  if (fromIsBig && one.d === 1n) {
    // 源数 1~9，pow 类偶尔带小数（不超过跨的级数）
    if (from.pow != null && from.pow - to.pow >= 1 && Math.random() < 0.25) {
      const dec = randInt(1, Math.min(2, from.pow - to.pow))
      const ip = randInt(1, 9)
      vFrac = parseNum(`${ip}.${randDec(dec)}`)
    } else {
      vFrac = { n: BigInt(randInt(1, 9)), d: 1n }
    }
    rightFrac.value = convert(vFrac, from, to)
    buildExplain(from, to, vFrac, true)
  } else {
    // 从小单位到大单位：让答案正好是整数 q
    const rev = rateOne(to, from) // 1 to = rev from
    const qnum = randInt(1, 9)
    vFrac = { n: qnum * rev.n, d: rev.d }
    if (vFrac.d !== 1n) vFrac = reduce(vFrac.n, vFrac.d)
    rightFrac.value = { n: BigInt(qnum), d: 1n }
    buildExplain(from, to, vFrac, false)
  }
  q.value = { cat, from, to, vFrac, vText: fmtQStr(vFrac, 8) }
}

function pickPair(cat) {
  const u = cat.units
  const a = pick(u)
  let b = a
  while (b === a) b = pick(u)
  return [a, b]
}

function randDec(n) {
  let s = ''
  for (let i = 0; i < n; i++) s += randInt(0, 9)
  return s
}

function buildExplain(from, to, vFrac, bigToSmall) {
  const res = convert(vFrac, from, to)
  const lines = []
  const vs = fmtQStr(vFrac, 8)
  const rs = fmtQStr(res, 8)
  if (bigToSmall) {
    const one = rateOne(from, to)
    lines.push(`1 ${from.name} = ${fmtQStr(one, 8)} ${to.name}（进率 ${fmtQStr(one, 8)}）`)
    lines.push(`所以 ${vs} ${from.name}，数字要 ×${fmtQStr(one, 8)}：`)
    lines.push(`答案是 ${rs} ${to.name}。`)
  } else {
    const rev = rateOne(to, from)
    const rs2 = fmtQStr(rev, 8)
    lines.push(`先想：1 ${to.name} = ${rs2} ${from.name}（进率 ${rs2}）`)
    lines.push(`所以 ${vs} ${from.name} ÷ ${rs2} = ${rs} ${to.name}。`)
  }
  explain.value = lines
}

// ---------- 检查 ----------
function check() {
  if (checked.value || !q.value) return
  const u = parseNum(answer.value)
  done.value++
  const ok = u && cmpFrac(reduce(u.n, u.d), reduce(rightFrac.value.n, rightFrac.value.d)) === 0
  isOk.value = !!ok
  checked.value = true
  if (ok) { okNum.value++; streak.value++ } else { noNum.value++; streak.value = 0 }
}

next()
</script>

<style scoped>
.uv-set { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 12px; }
.uv-set-title { font-size: 13.5px; font-weight: 800; color: #5a6b80; margin-right: 4px; }
.uv-mini { border: 1.5px solid #dfe4ec; background: #fff; border-radius: 9px; padding: 6px 11px; font-weight: 700; color: #5a6b80; font-size: 12.5px; }
.uv-mini:hover { background: #f5f7fb; }
.uv-score { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; background: #f7fafc; border: 1px solid #e3edf4; border-radius: 12px; padding: 9px 14px; font-size: 13px; color: #5c6f84; margin-bottom: 14px; }
.uv-score b { font-size: 15px; color: #33455a; }
.uv-score .ok { color: #1f8f5f; font-weight: 700; }
.uv-score .no { color: #d04444; font-weight: 700; }
.uv-streak { color: #c2255e; font-weight: 800; }
.uv-qcard { background: #fff; border: 1.5px solid #e6e2f0; border-radius: 16px; padding: 20px; max-width: 560px; }
.uv-qtext { font-size: 24px; font-weight: 800; color: #293a50; text-align: center; margin-bottom: 12px; }
.uv-blank { color: #b47dd6; }
.uv-qbox { display: flex; align-items: center; gap: 10px; justify-content: center; flex-wrap: wrap; }
.uv-qinput { width: 150px; font-size: 24px; }
.uv-qunit { font-size: 17px; font-weight: 800; color: #40536a; }
.uv-btn-main { background: #e74d8e; border: none; color: #fff; font-weight: 800; font-size: 15px; border-radius: 10px; padding: 11px 18px; cursor: pointer; box-shadow: 0 2px 6px rgba(231,77,142,.35); }
.uv-btn-main:hover { background: #d8387c; }
.uv-btn-ok { background: #2fae7c; border: none; color: #fff; font-weight: 800; font-size: 14px; border-radius: 10px; padding: 11px 16px; cursor: pointer; }
.uv-btn-ok:hover { background: #25996c; }
.uv-explain { margin-top: 14px; background: #f3f7ff; border: 1px dashed #bcd4f5; border-radius: 12px; padding: 10px 14px; font-size: 14px; color: #41597b; line-height: 1.9; }
.uv-explain p { margin: 0; }
.uv-soft-enter-active, .uv-soft-leave-active { transition: opacity .25s; }
.uv-soft-enter-from, .uv-soft-leave-to { opacity: 0; }
</style>
