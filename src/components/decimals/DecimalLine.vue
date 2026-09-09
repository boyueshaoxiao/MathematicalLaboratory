<template>
  <div class="dl-wrap">
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: mode === 'place' && !challenge }" @click="toFree">🖐 放一放</button>
        <button :class="{ active: challenge }" @click="toChallenge('h')">🎯 挑战定位</button>
        <button :class="{ active: mode === 'cmp' }" @click="toCompare">⚖️ 比一比</button>
      </div>
      <template v-if="challenge">
        <div class="frac-seg">
          <button :class="{ active: cType === 't' }" @click="toChallenge('t')">一位小数</button>
          <button :class="{ active: cType === 'h' }" @click="toChallenge('h')">两位小数</button>
        </div>
        <span class="frac-score">连续答对 {{ streak }} 题</span>
      </template>
      <template v-else-if="mode === 'place'">
        <label class="frac-label dl-fine">范围
          <select v-model.number="U" class="frac-select">
            <option :value="1">0 ~ 1</option>
            <option :value="2">0 ~ 2</option>
            <option :value="3">0 ~ 3</option>
          </select>
        </label>
        <label class="frac-label dl-fine">刻度
          <select v-model.number="step" class="frac-select">
            <option :value="10">0.1（一位小数）</option>
            <option :value="1">0.01（两位小数）</option>
          </select>
        </label>
      </template>
    </div>

    <!-- 数轴（放一放 / 挑战共用） -->
    <div v-if="mode === 'place' || challenge" class="dl-svgwrap">
      <svg :viewBox="`0 0 ${W} ${H}`" class="dl-svg" @pointerdown="down" @pointermove="move"
        @pointerup="up" @pointerleave="up">
        <rect x="0" y="30" :width="W" :height="60" fill="transparent" />
        <template v-if="challenge">
          <line v-for="t in targetTick" :key="'tt'" :x1="t.x" :y1="AXISY - 22" :x2="t.x" :y2="AXISY + 10"
            stroke="#ff9d2e" stroke-width="2.4" stroke-dasharray="5 4" />
        </template>
        <line v-for="tk in subTicks" :key="'s' + tk.c" :x1="xOf(tk.c)" :y1="AXISY - tk.h" :x2="xOf(tk.c)" :y2="AXISY + tk.h"
          :stroke="tk.major ? '#aab4c6' : '#dde2ec'" stroke-width="1.5" />
        <line v-for="u in unitsRange" :key="'u' + u" :x1="xOf(u * 100)" :y1="AXISY - 12"
          :x2="xOf(u * 100)" :y2="AXISY + 12" stroke="#51617a" stroke-width="2.2" />
        <line :x1="X0" :y1="AXISY" :x2="X1" :y2="AXISY" stroke="#51617a" stroke-width="2.4" stroke-linecap="round" />
        <text v-for="u in unitsRange" :key="'l' + u" :x="xOf(u * 100)" :y="AXISY + 30" text-anchor="middle" class="dl-num">{{ u }}</text>
        <path :d="`M ${X0} ${AXISY - 6} l 6 6 l -6 6`" fill="none" stroke="#51617a" stroke-width="2" />
        <path :d="`M ${X1} ${AXISY - 6} l -6 6 l 6 6`" fill="none" stroke="#51617a" stroke-width="2" />

        <template v-if="!challenge">
          <circle :cx="xOf(cents)" :cy="AXISY - 18" r="9" fill="#8b63e8" stroke="#fff" stroke-width="2.5" />
          <line :x1="xOf(cents)" :y1="AXISY - 10" :x2="xOf(cents)" :y2="AXISY + 10" stroke="#8b63e8" stroke-width="2" />
        </template>
        <circle v-else :cx="xOf(cents)" :cy="AXISY - 18" r="8" fill="#8b63e8" opacity=".35" stroke="#fff" stroke-width="2" />
      </svg>
    </div>

    <!-- 挑战反馈 -->
    <div v-if="challenge && feed" class="dl-feed" :class="{ ok: lastOk }">{{ feed }}</div>

    <!-- 挑战目标横幅 -->
    <div v-if="challenge" class="dl-task">
      <span>把</span><b>{{ fmtCents(target) }}</b><span>放到数轴上它的位置</span>
      <button v-if="done" class="frac-btn-main" @click="newTarget">下一题</button>
    </div>

    <!-- 自由：读数卡 -->
    <div v-else-if="mode === 'place'" class="dl-read">
      <div class="dl-val">{{ fmtCents(cents) }}</div>
      <div class="dl-txt">
        <div>读作：<b>{{ readCents(cents) }}</b></div>
        <div class="dl-count">{{ countText }}</div>
        <div class="dl-loc">从 0 数起，走了 <b>{{ cents }}</b> 个最小格，每格 {{ step === 10 ? '0.1' : '0.01' }}。</div>
      </div>
      <div class="dl-ctl">
        <label class="frac-label dl-fine">滑着走
          <input type="range" class="frac-slider" min="0" :max="U * 100" :step="step" v-model.number="cents" />
        </label>
        <button class="frac-btn-main ghost-b" @click="rand">🎲 随机</button>
      </div>
    </div>

    <!-- 比大小 -->
    <div v-else class="dl-cmp">
      <div class="dl-cmp-q">
        <span class="dl-a">{{ fmtCents(cmpA) }}</span>
        <span class="dl-rel" :class="cmpState">{{ cmpResultSymbol }}</span>
        <span class="dl-b">{{ fmtCents(cmpB) }}</span>
      </div>
      <svg :viewBox="`0 0 ${W} 190`" class="dl-svg">
        <line v-for="u in unitsRange" :key="'cu' + u" :x1="xOf(u * 100)" :y1="AXISY - 12"
          :x2="xOf(u * 100)" :y2="AXISY + 12" stroke="#51617a" stroke-width="2.2" />
        <line v-for="tk in subTicks" :key="'c' + tk.c" :x1="xOf(tk.c)" :y1="AXISY - tk.h" :x2="xOf(tk.c)" :y2="AXISY + tk.h"
          :stroke="tk.major ? '#aab4c6' : '#dde2ec'" stroke-width="1.5" />
        <line :x1="X0" :y1="AXISY" :x2="X1" :y2="AXISY" stroke="#51617a" stroke-width="2.4" stroke-linecap="round" />
        <text v-for="u in unitsRange" :key="'cl' + u" :x="xOf(u * 100)" :y="AXISY + 30" text-anchor="middle" class="dl-num">{{ u }}</text>
        <path :d="`M ${X0} ${AXISY - 6} l 6 6 l -6 6`" fill="none" stroke="#51617a" stroke-width="2" />
        <path :d="`M ${X1} ${AXISY - 6} l -6 6 l 6 6`" fill="none" stroke="#51617a" stroke-width="2" />
        <circle :cx="xOf(cmpA)" :cy="AXISY - 18" r="10" fill="#6d46cf" stroke="#fff" stroke-width="2.5" />
        <circle :cx="xOf(cmpB)" :cy="AXISY - 18" r="10" fill="#0e9c8f" stroke="#fff" stroke-width="2.5" />
        <text :x="xOf(cmpA)" :y="AXISY - 34" text-anchor="middle" class="dl-mk a">{{ fmtCents(cmpA) }}</text>
        <text :x="xOf(cmpB)" :y="AXISY - 56" text-anchor="middle" class="dl-mk b">{{ fmtCents(cmpB) }}</text>
      </svg>
      <div class="dl-ans">
        <button v-for="r in relations" :key="r.v" :class="['dl-relbtn', { ok: cmpDone && cmpResult === r.v, bad: cmpDone && picked === r.v && cmpResult !== r.v }]"
          @click="answerCmp(r.v)">{{ r.txt }}</button>
        <button v-if="cmpDone" class="frac-btn-main" @click="newPair">下一组</button>
      </div>
    </div>

    <p class="dl-tip">💡 越靠右的数越大：先比整数部分，再比十分位，最后比百分位——在数轴上它们一目了然。</p>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { fmtCents, readCents, splitCents, randomTenths, randomHundredths } from '../../data/decimals/decUtils.js'

const W = 760
const H = 150
const X0 = 50
const X1 = W - 50
const AXISY = 76

const mode = ref('place') // place | cmp
const challenge = ref(false)
const cType = ref('h') // 挑战：t=一位小数，h=两位小数
const U = ref(1)
const step = ref(1)
const cents = ref(25)
const done = ref(false)
const target = ref(37)
const streak = ref(0)
const feed = ref('')
const lastOk = ref(true)

let dragging = false

const targetTick = computed(() => [{ x: xOf(target.value) }])
const unitsRange = computed(() => {
  const n = mode.value === 'cmp' ? 2 : U.value
  return Array.from({ length: n + 1 }, (_, i) => i)
})
const subTicks = computed(() => {
  const arr = []
  const st = mode.value === 'cmp' ? 10 : step.value
  for (let c = st; c < (mode.value === 'cmp' ? 200 : U.value * 100); c += st) {
    if (c % 100 === 0) continue
    const major = c % 10 === 0 && st === 1
    arr.push({ c, h: major ? 7 : 4, major })
  }
  return arr
})
const countText = computed(() => {
  const { int, t, h } = splitCents(cents.value)
  const bits = []
  if (int) bits.push(`${int} 个一`)
  if (t) bits.push(`${t} 个 0.1`)
  if (h) bits.push(`${h} 个 0.01`)
  return bits.length ? bits.join(' + ') : '0'
})

const cmpA = ref(125)
const cmpB = ref(37)
const cmpState = ref('') // ok | bad | ''
const cmpDone = ref(false)
const picked = ref('')
const relations = [
  { v: '<', txt: 'A ＜ B' },
  { v: '=', txt: 'A = B' },
  { v: '>', txt: 'A ＞ B' }
]
const cmpResult = computed(() => (cmpA.value === cmpB.value ? '=' : cmpA.value > cmpB.value ? '>' : '<'))
const cmpResultSymbol = computed(() => {
  if (!cmpDone.value) return '?'
  return cmpState.value === 'ok' ? cmpResult.value : (picked.value || '?')
})

function xOf(c) {
  const max = mode.value === 'cmp' ? 200 : U.value * 100
  return X0 + (c / max) * (X1 - X0)
}
function stepAt(px) {
  const max = mode.value === 'cmp' ? 200 : U.value * 100
  const st = mode.value === 'cmp' ? 1 : step.value
  const raw = (px - X0) / (X1 - X0) * max
  const s = Math.round(raw / st) * st
  return Math.min(Math.max(s, 0), max)
}

function down(e) {
  dragging = true
  handle(e)
}
function move(e) {
  if (!dragging) return
  handle(e)
}
function handle(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width * W
  const s = stepAt(px)
  if (challenge.value) {
    if (done.value) return
    cents.value = s
    if (s === target.value) {
      done.value = true
      streak.value++
      lastOk.value = true
      feed.value = `✅ 对啦！${fmtCents(target.value)} 正好在这里。`
    } else {
      lastOk.value = false
      feed.value = s < target.value ? `↪️ 偏左了，往右再走一点（这里是 ${fmtCents(s)}）。` : `↩️ 偏右了，往左退一点（这里是 ${fmtCents(s)}）。`
    }
  } else {
    cents.value = s
  }
}
function up() { dragging = false }

function toFree() {
  mode.value = 'place'
  challenge.value = false
}
function toChallenge(t) {
  cType.value = t
  challenge.value = true
  mode.value = 'place'
  newTarget()
}
function newTarget() {
  if (cType.value === 't') {
    U.value = 2
    step.value = 10
    target.value = randomTenths(1) // 0.1 ~ 1.9
  } else {
    U.value = 1
    step.value = 1
    let t = randomHundredths(0)
    while (t % 10 === 0) t = randomHundredths(0)
    target.value = t
  }
  cents.value = Math.floor(target.value / step.value / 2) * step.value
  done.value = false
  feed.value = ''
  lastOk.value = true
}
function rand() {
  cents.value = Math.floor(Math.random() * (U.value * 100 / step.value + 1)) * step.value
}

function toCompare() {
  mode.value = 'cmp'
  challenge.value = false
  newPair()
}
function newPair() {
  cmpA.value = Math.random() < 0.5 ? randomTenths(1) : randomHundredths(1)
  if (Math.random() < 0.18) {
    cmpB.value = cmpA.value
  } else {
    cmpB.value = Math.random() < 0.5 ? randomTenths(1) : randomHundredths(1)
    if (cmpB.value === cmpA.value) cmpB.value = cmpA.value === 250 ? 137 : cmpA.value + 1
  }
  cmpDone.value = false
  picked.value = ''
  cmpState.value = ''
}
function answerCmp(r) {
  if (cmpDone.value) return
  cmpDone.value = true
  picked.value = r
  cmpState.value = r === cmpResult.value ? 'ok' : 'bad'
}

watch([U, step], () => {
  if (!challenge.value) {
    const max = U.value * 100
    cents.value = Math.min(Math.floor(cents.value / step.value) * step.value, max)
  }
})
</script>

<style scoped>
.dl-svgwrap { max-width: 760px; margin: 12px auto 0; touch-action: none; }
.dl-svg { width: 100%; height: auto; cursor: crosshair; display: block; }
.dl-num { font-size: 15px; fill: #51617a; font-weight: 700; }
.dl-feed { margin: 8px auto 0; max-width: 640px; text-align: center; font-size: 15px; font-weight: 700; color: #c25f14; min-height: 22px; }
.dl-feed.ok { color: #1f8f5f; }
.dl-task { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 6px; font-size: 16px; color: #3d2c66; flex-wrap: wrap; }
.dl-task b { font-size: 26px; color: #6d46cf; }
.dl-read { display: flex; gap: 20px; align-items: center; justify-content: center; margin-top: 10px; flex-wrap: wrap; }
.dl-val { font-size: 40px; font-weight: 900; color: #4b2d9e; }
.dl-txt { font-size: 14px; color: #4a3f6b; line-height: 1.9; }
.dl-txt b { color: #6d46cf; }
.dl-count { color: #6d46cf; font-weight: 700; }
.dl-loc { color: #8a7ba5; font-size: 12.5px; }
.dl-ctl { display: flex; gap: 10px; align-items: center; }
.dl-fine { gap: 6px; font-size: 13px; color: #526174; }
.dl-fine .frac-slider { width: 150px; }
.ghost-b { background: #fff; border: 1.5px solid #cfc9e2; color: #5c5480; }

.dl-cmp { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 6px; }
.dl-cmp-q { display: flex; align-items: center; gap: 18px; font-size: 30px; font-weight: 900; }
.dl-a { color: #6d46cf; }
.dl-b { color: #0e9c8f; }
.dl-rel { color: #8a7ba5; min-width: 40px; text-align: center; }
.dl-rel.ok { color: #1f8f5f; }
.dl-rel.bad { color: #d04848; }
.dl-mk { font-size: 14px; font-weight: 800; }
.dl-mk.a { fill: #6d46cf; }
.dl-mk.b { fill: #0e9c8f; }
.dl-ans { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: center; }
.dl-relbtn { border: 2px solid #ddd6ee; background: #fff; border-radius: 11px; padding: 10px 20px; font-size: 16px; font-weight: 800; color: #4b2d9e; cursor: pointer; }
.dl-relbtn:hover { border-color: #a88dee; }
.dl-relbtn.ok { background: #e5f7ee; border-color: #3fae7f; color: #1f7a54; }
.dl-relbtn.bad { background: #fdecec; border-color: #e06868; color: #b23a3a; }
.dl-tip { text-align: center; color: #8a7ba5; font-size: 13px; margin: 14px 0 0; }
</style>
