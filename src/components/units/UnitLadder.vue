<template>
  <div>
    <div class="uv-cats" style="margin-bottom:14px">
      <button v-for="cat in cats" :key="cat.key" class="uv-cat" :style="{ '--c': cat.color }"
        :class="{ on: cat.key === catKey }" @click="changeCat(cat.key)">
        {{ cat.icon }} {{ cat.name }}
      </button>
    </div>

    <!-- 起点 / 终点选择 -->
    <div class="uv-pair">
      <label class="uv-pair-label">从
        <select v-model="fromKey" class="uv-sel">
          <option v-for="u in cat.units" :key="u.key" :value="u.key">{{ u.name }}</option>
        </select>
      </label>
      <span class="uv-arrow">⬇</span>
      <label class="uv-pair-label">到
        <select v-model="toKey" class="uv-sel">
          <option v-for="u in cat.units" :key="u.key" :value="u.key">{{ u.name }}</option>
        </select>
      </label>
      <button class="uv-mini" @click="quickPick">🎲 换一对</button>
    </div>

    <!-- 十进制阶梯：每个 10 的幂一行 -->
    <div v-if="isPow" class="uv-lad">
      <div v-for="row in rows" :key="row.p" class="uv-rung"
        :class="[row.units.length ? '' : 'uv-rung-empty', inBand(row.p) ? 'uv-band' : '']">
        <div class="uv-exp">10<sup>{{ row.p }}</sup></div>
        <div class="uv-cells">
          <button v-for="u in row.units" :key="u.key" class="uv-unit"
            :class="{ on: isFrom(u), hot: isTo(u) }" @click="tapUnit(u.key)">
            {{ u.name }}
          </button>
        </div>
        <div class="uv-step-mark">{{ row.units.length ? '' : '·' }}</div>
      </div>
    </div>

    <!-- 时间链：60 / 24 / 7 进制 -->
    <div v-else class="uv-lad uv-lad-time">
      <div v-for="(u, i) in timeChain" :key="u.key" class="uv-time-row" :class="{ 'uv-band': inBand(sizeOf(u)) }">
        <div class="uv-cells">
          <button class="uv-unit" :class="{ on: isFrom(u), hot: isTo(u) }" @click="tapUnit(u.key)">
            {{ u.name }}
          </button>
        </div>
        <div v-if="i < timeChain.length - 1" class="uv-time-arrow">
          ×{{ timeFactor(i) }} <small>↓</small>
        </div>
      </div>
    </div>

    <div class="uv-tap-hint">💡 也可以直接点阶梯上的单位：先点一个当「从」，再点一个当「到」。</div>

    <!-- 讲解 -->
    <div class="uv-summary">
      <div class="uv-eq" style="justify-content:flex-start">
        1 {{ bigU.name }} =
        <span class="uv-num-big blue">{{ eqSmall }}</span> {{ smallU.name }}
      </div>
      <p class="uv-summary-line">{{ summary1 }}</p>
      <p class="uv-summary-line">{{ summary2 }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { UNIT_CATEGORIES, CAT_DEFAULT, unitByKey } from '../../data/units/units.js'
import { rateOne, tenStepGap, fmtQStr, randInt, pick, pow10Text } from '../../data/units/unitUtils.js'

const cats = UNIT_CATEGORIES
const catKey = ref('length')
const cat = computed(() => cats.find(c => c.key === catKey.value))
const isPow = computed(() => cat.value.units.some(u => u.pow != null))

const fromKey = ref('m')
const toKey = ref('cm')
const fromUnit = computed(() => unitByKey(cat.value, fromKey.value))
const toUnit = computed(() => unitByKey(cat.value, toKey.value))

// 大小：pow 高的大；时间类按单位表顺序（已按从小到大排）
function sizeOf(u) {
  if (u.pow != null) return u.pow
  return cat.value.units.indexOf(u)
}
const bigU = computed(() => (sizeOf(fromUnit.value) >= sizeOf(toUnit.value) ? fromUnit.value : toUnit.value))
const smallU = computed(() => (bigU.value === fromUnit.value ? toUnit.value : fromUnit.value))

const gapLevels = computed(() => Math.abs(sizeOf(fromUnit.value) - sizeOf(toUnit.value)))

// ---- 十进制阶梯的行：从大到小，每个 10 的幂一行 ----
const rows = computed(() => {
  const pows = cat.value.units.map(u => u.pow).filter(p => p != null)
  const minP = Math.min(...pows)
  const maxP = Math.max(...pows)
  const list = []
  for (let p = minP; p <= maxP; p++) {
    list.push({ p, units: cat.value.units.filter(u => u.pow === p) })
  }
  return list.reverse()
})

const loP = computed(() => Math.min(sizeOf(fromUnit.value), sizeOf(toUnit.value)))
const hiP = computed(() => Math.max(sizeOf(fromUnit.value), sizeOf(toUnit.value)))
function inBand(v) {
  return v >= loP.value && v <= hiP.value
}
function isFrom(u) { return u.key === fromKey.value }
function isTo(u) { return u.key === toKey.value }

// 时间链：大到小
const timeChain = computed(() => [...cat.value.units].reverse())
function timeFactor(i) {
  const upper = timeChain.value[i]
  const lower = timeChain.value[i + 1]
  const r = rateOne(upper, lower)
  return fmtQStr(r)
}

// 两段式点选：第一下点「从」，第二下点「到」
const tapFrom = ref(false)
function tapUnit(k) {
  if (!tapFrom.value) {
    if (k === toKey.value) return // 起点不能和终点重复
    fromKey.value = k
    tapFrom.value = true
  } else {
    if (k === fromKey.value) return
    toKey.value = k
    tapFrom.value = false
  }
}

function quickPick() {
  const units = cat.value.units
  const from = units[randInt(0, units.length - 1)]
  let to = from
  while (to === from) to = units[randInt(0, units.length - 1)]
  fromKey.value = from.key
  toKey.value = to.key
  tapFrom.value = false
}

// 别让两个下拉选到同一个单位
watch(fromKey, v => { if (v === toKey.value) avoidSame(true) })
watch(toKey, v => { if (v === fromKey.value) avoidSame(false) })
function avoidSame(moveTo) {
  const other = cat.value.units.find(u => u.key !== (moveTo ? toKey.value : fromKey.value))
  if (other) (moveTo ? fromKey : toKey).value = other.key
}

const eqSmall = computed(() => fmtQStr(rateOne(bigU.value, smallU.value)))

const summary1 = computed(() => {
  const n = gapLevels.value
  const dirDesc = fromKey.value === bigU.value.key
    ? `把 ${fromUnit.value.name} 换成（更小的）${toUnit.value.name}`
    : `把 ${fromUnit.value.name} 换成（更大的）${toUnit.value.name}`
  if (isPow.value) {
    const gap = Math.abs(tenStepGap(bigU.value, smallU.value).power)
    const multi = pow10Text(gap)
    const move = fromKey.value === bigU.value.key ? `×${multi}` : `÷${multi}`
    return `${dirDesc}：${n} 级台阶，一共 ${move}。`
  }
  const r = rateOne(fromUnit.value, toUnit.value)
  const move = r.d === 1n ? `×${r.n}` : `÷${r.d}`
  return `${dirDesc}：跨 ${n} 个单位，换算系数是 ${move}。`
})

const summary2 = computed(() => {
  return `记住规律：同样多的东西，用 ${smallU.value.name} 数，数字更大；用 ${bigU.value.name} 数，数字更小——数字大，单位小；数字小，单位大。`
})

// 切换类别时给出合适的默认一对
function changeCat(key) {
  catKey.value = key
  const d = CAT_DEFAULT[key]
  fromKey.value = d.from
  toKey.value = d.to
  tapFrom.value = false
}
</script>

<style scoped>
.uv-pair { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.uv-pair-label { font-size: 14px; font-weight: 800; color: #52647a; display: flex; align-items: center; gap: 7px; }
.uv-sel { border: 1.5px solid #d5dfec; border-radius: 9px; padding: 7px 10px; font: inherit; font-weight: 800; color: #20364f; background: #fff; }
.uv-arrow { color: #c2255e; font-weight: 900; }
.uv-mini { border: 1.5px solid #e6dfd0; background: #fff; border-radius: 9px; padding: 7px 12px; font-weight: 700; color: #6a5b85; }
.uv-mini:hover { background: #faf6ef; }
.uv-lad { margin: 6px auto 0; max-width: 640px; }
.uv-rung { display: grid; grid-template-columns: 64px 1fr 10px; gap: 8px; align-items: center; padding: 5px 8px; border-radius: 9px; }
.uv-rung-empty { opacity: .5; }
.uv-band { background: #fdeef4; }
.uv-exp { font-size: 11px; color: #b78fc2; text-align: right; font-weight: 700; }
.uv-cells { display: flex; gap: 6px; flex-wrap: wrap; min-height: 34px; align-items: center; }
.uv-step-mark { color: #d3b7c4; font-size: 12px; text-align: center; }
.uv-lad-time { max-width: 360px; }
.uv-time-row { padding: 3px 8px; border-radius: 9px; }
.uv-time-arrow { padding-left: 16px; font-size: 13px; color: #9a6a8f; font-weight: 800; }
.uv-time-arrow small { color: #c9b0c4; }
.uv-unit.on { border-color: #d6689f; background: #fff0f7; color: #b13d76; }
.uv-unit.hot { border-color: #ef5f9b; background: #ffd9ea; color: #a0235e; box-shadow: 0 0 0 3px #ffe3ef; }
.uv-tap-hint { margin: 10px 0 0; font-size: 12px; color: #98a3b3; }
.uv-summary { margin-top: 18px; background: #f2faff; border: 1px solid #d3e5fa; border-radius: 14px; padding: 12px 16px; }
.uv-summary-line { margin: 8px 0 0; font-size: 14px; color: #46586e; line-height: 1.8; }
</style>
