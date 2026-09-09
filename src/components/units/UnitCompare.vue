<template>
  <div>
    <!-- 选一个大类来比 -->
    <div class="uv-cats" style="margin-bottom:14px">
      <button v-for="c in cats" :key="c.key" class="uv-cat" :style="{ '--c': c.color }"
        :class="{ on: c.key === catKey }" @click="changeCat(c.key)">
        {{ c.icon }} {{ c.name }}
      </button>
    </div>

    <!-- 对局 -->
    <div class="uv-cmpcard">
      <div class="uv-cmphead">👀 比一比，填 > = 还是 <</div>
      <div class="uv-cmp">
        <div class="uv-qty">{{ leftText }}</div>
        <div class="uv-ops">
          <button v-for="op in ['>', '=', '<']" :key="op" class="uv-op" :class="opState(op)"
            :disabled="judged" @click="choose(op)">
            {{ op }}
          </button>
        </div>
        <div class="uv-qty">{{ rightText }}</div>
      </div>
      <div class="uv-feed" :class="judged ? (isOk ? 'ok' : 'no') : ''">
        <template v-if="!judged">中间该填哪个符号？点一下试试。</template>
        <template v-else-if="isOk">🎉 对啦，中间应填 {{ correctSign }}！</template>
        <template v-else>唉，中间应填 {{ correctSign }}，对照下面的讲解再想想～</template>
      </div>

      <transition name="uv-soft">
        <div v-if="judged" class="uv-explain">
          <b>💡 讲解：</b>
          <p v-for="(line, i) in explainLines" :key="i">{{ line }}</p>
        </div>
      </transition>

      <div v-if="judged" class="uv-nextrow">
        <button class="uv-btn-ok" @click="next">再来一组 ➡️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { UNIT_CATEGORIES } from '../../data/units/units.js'
import { rateOne, convert, fmtQStr, randInt, pick, cmpFrac } from '../../data/units/unitUtils.js'

const cats = UNIT_CATEGORIES
const catKey = ref('length')
const cat = computed(() => cats.find(c => c.key === catKey.value))

const L = ref(null) // { val: 字符串数字, unit }
const R = ref(null)
const judged = ref(false)
const picked = ref('')

const leftText = computed(() => (L.value ? `${fmtQStr(L.value.val, 8)} ${L.value.unit.name}` : ''))
const rightText = computed(() => (R.value ? `${fmtQStr(R.value.val, 8)} ${R.value.unit.name}` : ''))

// 单位的“大小”：pow 类的看幂，时间类按单位表顺序（已从小到大排）
function size(u) {
  return u.pow != null ? u.pow : cat.value.units.indexOf(u)
}

// 以“最小单位”为同一把尺子比较两边
function anchorUnit() {
  let min = cat.value.units[0]
  for (const u of cat.value.units) {
    if (size(u) < size(min)) min = u
  }
  return min
}

const correctSign = computed(() => {
  if (!L.value || !R.value) return ''
  const c = cmpFrac(
    convert(L.value.val, L.value.unit, anchorUnit()),
    convert(R.value.val, R.value.unit, anchorUnit())
  )
  return c > 0 ? '>' : c < 0 ? '<' : '='
})
const isOk = computed(() => judged.value && picked.value === correctSign.value)

const explainLines = computed(() => {
  if (!L.value || !R.value) return []
  const ls = fmtQStr(L.value.val, 8)
  const rs = fmtQStr(R.value.val, 8)
  const inRight = fmtQStr(convert(L.value.val, L.value.unit, R.value.unit), 8)
  return [
    `${ls} ${L.value.unit.name} = ${inRight} ${R.value.unit.name}`,
    `再和 ${rs} ${R.value.unit.name} 比大小，所以应填「${correctSign.value}」。`
  ]
})

function opState(op) {
  if (!judged.value) return ''
  if (op === correctSign.value) return 'right'
  if (op === picked.value) return 'wrong'
  return 'dim'
}

function choose(op) {
  if (judged.value) return
  picked.value = op
  judged.value = true
}

function next() {
  judged.value = false
  picked.value = ''
  roll()
}

function changeCat(k) {
  catKey.value = k
  next()
}

// ---------- 出题 ----------
// 1 个大单位 = R 个小单位（要求是整数），返回 R；不匹配返回 0
function rateOf(big, small) {
  const r = rateOne(big, small)
  return r.d === 1n ? Number(r.n) : 0
}

function roll() {
  const units = cat.value.units
  // 选一大一小两个单位（差的级数 ≤3；时间隔 ≤2 个单位），进率是整数
  const cands = []
  for (const a of units) {
    for (const b of units) {
      if (a === b) continue
      const g = Math.abs(size(a) - size(b))
      const okGap = a.pow != null ? g >= 1 && g <= 3 : g >= 1 && g <= 2
      if (!okGap) continue
      const hi = size(a) > size(b) ? a : b
      const lo = hi === a ? b : a
      const rate = rateOf(hi, lo)
      if (rate >= 2) cands.push([hi, lo, rate])
    }
  }
  const [big, small, rate] = cands.length ? pick(cands) : [units[0], units[units.length - 1], 0]

  // 约 1/5 会出“正好相等”的题：q 个大单位 = q×rate 个小单位
  const equal = rate >= 2 && Math.random() < 0.22
  const q = randInt(1, 12)
  let smallVal, bigVal
  if (equal) {
    smallVal = q * rate
    bigVal = q
  } else {
    smallVal = q * rate + randInt(1, Math.max(1, rate - 1))   // 略多一点点
    bigVal = randInt(Math.max(1, q - 2), q + 2)
  }

  const frac = v => ({ n: BigInt(v), d: 1n })
  // 左右随机摆，避免总是一边更大
  if (Math.random() < 0.5) {
    L.value = { val: frac(smallVal), unit: small }
    R.value = { val: frac(bigVal), unit: big }
  } else {
    L.value = { val: frac(bigVal), unit: big }
    R.value = { val: frac(smallVal), unit: small }
  }
}

roll()
</script>

<style scoped>
.uv-cmpcard { background: #fff; border: 1.5px solid #e6e2f0; border-radius: 16px; padding: 18px 16px; max-width: 640px; }
.uv-cmphead { font-size: 13px; font-weight: 800; color: #8b7a9c; margin-bottom: 12px; }
.uv-cmp { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }
.uv-qty { background: #f6f1fb; border: 1.5px solid #e3d4f0; color: #4a2f6b; border-radius: 14px; padding: 16px 20px; font-size: 22px; font-weight: 900; min-width: 100px; text-align: center; }
.uv-ops { display: flex; gap: 8px; }
.uv-op {
  width: 46px; height: 46px; border-radius: 50%; border: 2px solid #cbb7df; background: #fff;
  font-size: 20px; font-weight: 900; color: #7a55d8; cursor: pointer; transition: .1s;
}
.uv-op:not(:disabled):hover { background: #f2e9fb; transform: scale(1.06); }
.uv-op.right { background: #dff5e9; border-color: #2fae7c; color: #1f8f5f; }
.uv-op.wrong { background: #ffe1e1; border-color: #e2605a; color: #c22d28; }
.uv-op.dim { opacity: .45; }
.uv-op:disabled { cursor: default; }
.uv-explain { margin-top: 12px; background: #f3f7ff; border: 1px dashed #bcd4f5; border-radius: 12px; padding: 10px 14px; font-size: 14px; color: #41597b; line-height: 1.9; }
.uv-explain p { margin: 0; }
.uv-nextrow { margin-top: 12px; display: flex; justify-content: center; }
.uv-btn-ok { background: #2fae7c; border: none; color: #fff; font-weight: 800; font-size: 14px; border-radius: 10px; padding: 11px 16px; cursor: pointer; }
.uv-btn-ok:hover { background: #25996c; }
.uv-soft-enter-active, .uv-soft-leave-active { transition: opacity .25s; }
.uv-soft-enter-from, .uv-soft-leave-to { opacity: 0; }
</style>
