<template>
  <div>
    <!-- 选大类 -->
    <div class="uv-cats" style="margin-bottom:14px">
      <button v-for="cat in cats" :key="cat.key" class="uv-cat" :style="{ '--c': cat.color }"
        :class="{ on: cat.key === catKey }" @click="setCat(cat.key)">
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>

    <!-- 双单位面板 -->
    <div class="uv-board">
      <div class="uv-panel" :class="{ focus: src === 'A' }" @click="src = 'A'">
        <div class="uv-panel-title">📥 输入</div>
        <div class="uv-unit-row">
          <button v-for="u in cat.units" :key="u.key" class="uv-unit"
            :class="{ on: u.key === aKey }" @click="setA(u.key)">
            {{ u.name }}
          </button>
        </div>
        <input class="uv-input" v-model="tA" inputmode="decimal" placeholder="填一个数"
          @input="onInput('A')" />
      </div>

      <div class="uv-swap" @click="swap" title="交换两个单位">⇄</div>

      <div class="uv-panel uv-panel-result" :class="{ focus: src === 'B' }" @click="src = 'B'">
        <div class="uv-panel-title">📤 结果</div>
        <div class="uv-unit-row">
          <button v-for="u in cat.units" :key="u.key" class="uv-unit"
            :class="{ on: u.key === bKey }" @click="setB(u.key)">
            {{ u.name }}
          </button>
        </div>
        <input class="uv-input" v-model="tB" inputmode="decimal" placeholder="也可以在这边输入"
          @input="onInput('B')" />
      </div>
    </div>

    <!-- 换算结果 -->
    <div class="uv-eq" style="margin-top:16px">
      <template v-if="resA && resB">
        <span>{{ shownA }} {{ aUnit.name }}</span>
        <span style="color:#8a98ab">=</span>
        <span class="uv-num-big">{{ shownB }}</span>
        <span>{{ bUnit.name }}</span>
      </template>
      <span v-else class="uv-hint">在上方任意一边填一个数，这里会马上换算～</span>
    </div>

    <!-- 进率放大镜 -->
    <div v-if="resA && resB" class="uv-mag">
      <div class="uv-mag-title">🔍 进率放大镜</div>
      <div class="uv-mag-row">
        <span class="uv-mag-one">1 {{ aUnit.name }} = {{ oneText }} {{ bUnit.name }}</span>
        <template v-if="gap != null">
          <span v-for="i in pillCount" :key="i" class="uv-pill">{{ pillLabel }}</span>
          <span v-if="gapMore" class="uv-pill-note">…还有 {{ gapMore }} 级</span>
        </template>
        <span v-else class="uv-pill-note">{{ timeRuleText }}</span>
      </div>
      <div class="uv-mag-text">{{ ruleText }}</div>
    </div>

    <!-- 生活参照物 -->
    <div v-if="lifeRef" class="uv-card" style="margin-top:14px">
      <b>👀 感觉一下{{ feelVerb }}：</b>
      大约 {{ lifeRef.countText }} {{ lifeRef.obj }}
    </div>
    <div v-else-if="feelNote" class="uv-card" style="margin-top:14px">
      <b>👀 小知识：</b>{{ feelNote }}
    </div>
    <div v-else-if="resA && resB" class="uv-card uv-card-note" style="margin-top:14px">
      💡 {{ cat.desc }}
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { UNIT_CATEGORIES, CAT_DEFAULT, unitByKey } from '../../data/units/units.js'
import { parseNum, convert, rateOne, tenStepGap, fmtQStr, pickRef } from '../../data/units/unitUtils.js'

const cats = UNIT_CATEGORIES
const catKey = ref('length')
const cat = computed(() => cats.find(c => c.key === catKey.value))

const aKey = ref(CAT_DEFAULT.length.from)
const bKey = ref(CAT_DEFAULT.length.to)
const tA = ref('1')
const tB = ref('')
const src = ref('A') // 正在输入哪一边
const resA = ref(null) // 输入侧换算前的值
const resB = ref(null) // 换算结果

const aUnit = computed(() => unitByKey(cat.value, aKey.value))
const bUnit = computed(() => unitByKey(cat.value, bKey.value))

function setCat(key) {
  catKey.value = key
  const d = CAT_DEFAULT[key]
  aKey.value = d.from
  bKey.value = d.to
  tA.value = '1'
  src.value = 'A'
  sync()
}

function setA(k) {
  if (k === bKey.value) bKey.value = aKey.value
  aKey.value = k
  sync()
}
function setB(k) {
  if (k === aKey.value) aKey.value = bKey.value
  bKey.value = k
  sync()
}

function swap() {
  const k = aKey.value
  aKey.value = bKey.value
  bKey.value = k
  const s = tA.value
  tA.value = tB.value || '1'
  tB.value = s === '1' && !tB.value ? '' : s
  src.value = 'A'
  sync()
}

function onInput() {
  sync()
}

// 以正在输入的一边为准，换算另一边的数字
function sync() {
  const fromUnit = src.value === 'A' ? aUnit.value : bUnit.value
  const toUnit = src.value === 'A' ? bUnit.value : aUnit.value
  const raw = src.value === 'A' ? tA.value : tB.value
  const q = parseNum(raw)
  const outQ = q ? convert(q, fromUnit, toUnit) : null
  if (src.value === 'A') {
    resA.value = q
    resB.value = outQ
    tB.value = outQ ? fmtQStr(outQ, 10) : ''
  } else {
    resB.value = q
    resA.value = outQ
    tA.value = outQ ? fmtQStr(outQ, 10) : ''
  }
}

const shownA = computed(() => (src.value === 'A' ? (tA.value.trim() || '0') : fmtQStr(resA.value, 10)))
const shownB = computed(() => (src.value === 'B' ? (tB.value.trim() || '0') : fmtQStr(resB.value, 10)))

// 两个单位之间一次跨几级 ×/÷10
const gap = computed(() => {
  const g = tenStepGap(aUnit.value, bUnit.value)
  return g ? g.power : null
})
const bigToSmall = computed(() => gap.value != null && gap.value > 0)
const pillLabel = computed(() => (bigToSmall.value ? '×10' : '÷10'))
const pillCount = computed(() => (gap.value == null ? 0 : Math.min(Math.abs(gap.value), 8)))
const gapMore = computed(() => (gap.value == null ? 0 : Math.max(0, Math.abs(gap.value) - 8)))

const oneText = computed(() => fmtQStr(rateOne(aUnit.value, bUnit.value), 10))

const powText = v => (v === 1 ? '10' : v === 2 ? '100' : v === 3 ? '1000' : `10 的 ${v} 次方`)

// 时间等非十进制：直接说进率是乘/除多少
const timeRuleText = computed(() => {
  const r = rateOne(aUnit.value, bUnit.value)
  const { n, d } = r
  if (d === 1n) return `进率是 ×${n}：从 ${aUnit.value.name} 换成 ${bUnit.value.name}，数字乘 ${n}`
  return `进率是 ÷${d}：从 ${aUnit.value.name} 换成 ${bUnit.value.name}，数字除以 ${d}`
})

const ruleText = computed(() => {
  if (gap.value == null) return timeRuleText.value
  const v = Math.abs(gap.value)
  if (bigToSmall.value) {
    return `把大的 ${aUnit.value.name} 换成小的 ${bUnit.value.name}，数字要 ×进率（${powText(v)}）。${pillCount.value} 次×10 合起来就是 ×${powText(v)}。`
  }
  return `把小的 ${aUnit.value.name} 换成大的 ${bUnit.value.name}，数字要 ÷进率（缩小到 1/${powText(v)}）。`
})

// 生活参照物：在“数量最接近一个常见物体”的那一侧找参照
const fracNum = q => Number(q.n) / Number(q.d)

const lifeRef = computed(() => {
  if (!resA.value || !resB.value) return null
  const cands = []
  const pa = pickRef(fracNum(resA.value), aUnit.value)
  const pb = pickRef(fracNum(resB.value), bUnit.value)
  if (pa) cands.push({ ...pa, unit: aUnit.value })
  if (pb) cands.push({ ...pb, unit: bUnit.value })
  if (!cands.length) return null
  cands.sort((x, y) => Math.abs(Math.log10(x.count)) - Math.abs(Math.log10(y.count)))
  return cands[0]
})

const feelVerb = computed(() => {
  const k = lifeRef.value?.unit?.key || bUnit.value.key
  if (['cm2', 'dm2', 'm2', 'hm2', 'km2', 'cm3', 'ml', 'dm3', 'l', 'm3'].includes(k)) return '有多少'
  if (['g', 'kg', 't'].includes(k)) return '有多重'
  if (catKey.value === 'time') return '有多久'
  if (catKey.value === 'money') return '能买多少东西'
  return '有多长'
})

const feelNote = computed(() => bUnit.value.feel || '')

sync()
</script>

<style scoped>
.uv-board { display: flex; gap: 12px; align-items: stretch; flex-wrap: wrap; }
.uv-panel { flex: 1 1 340px; border: 1.5px solid #e3e8f0; background: #fff; border-radius: 16px; padding: 14px; transition: .15s; }
.uv-panel.focus { border-color: #ef9cc4; box-shadow: 0 0 0 3px #fde9f2; }
.uv-panel-title { font-size: 12px; color: #98a4b5; font-weight: 800; margin-bottom: 9px; letter-spacing: .5px; }
.uv-unit-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
.uv-swap {
  align-self: center; flex: 0 0 auto; width: 46px; height: 46px; border-radius: 50%;
  background: #ffeaf3; border: 2px solid #f4a9cb; color: #c2255e; font-size: 22px;
  display: flex; align-items: center; justify-content: center; cursor: pointer; user-select: none;
}
.uv-swap:hover { background: #ffd9e9; transform: rotate(180deg); transition: .2s; }
.uv-hint { color: #a3adba; font-weight: 600; }
.uv-mag { margin-top: 14px; background: #f4f8ff; border: 1px solid #d9e7fb; border-radius: 14px; padding: 12px 14px; }
.uv-mag-title { font-size: 12px; color: #6d85a8; font-weight: 800; margin-bottom: 7px; }
.uv-mag-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.uv-mag-one { font-size: 14.5px; font-weight: 800; color: #2c5595; margin-right: 6px; }
.uv-pill {
  background: #fff; border: 1.5px solid #a9c7f2; color: #2f6fe0; border-radius: 8px;
  padding: 3px 8px; font-weight: 900; font-size: 12px;
}
.uv-pill-note { font-size: 12px; color: #8b99ac; }
.uv-mag-text { margin-top: 7px; font-size: 13px; color: #4d5f75; line-height: 1.7; }
.uv-card-note { background: #f6f9ff; border-color: #dbe6f8; color: #4d6180; }
</style>
