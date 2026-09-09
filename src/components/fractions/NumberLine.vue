<template>
  <div>
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: !challenge }" @click="modeFree">🖐 拖动：自己在数轴上放分数</button>
        <button :class="{ active: challenge }" @click="modeChallenge">🎯 挑战：把分数放到正确位置</button>
      </div>
      <span v-if="challenge" class="frac-score">连续答对 {{ streak }} 题</span>
    </div>

    <!-- 挑战目标横幅 -->
    <div v-if="challenge" class="frac-task-band">
      <span>把</span>
      <Fraction :m="targetN" :n="targetD" small />
      <span>放到数轴上它的位置（在轴上点一下）</span>
    </div>

    <!-- 数轴 -->
    <div class="nl-wrap">
      <svg :viewBox="`0 0 ${W} ${H}`" class="nl-svg" @pointerdown="down" @pointermove="move"
        @pointerup="up" @pointerleave="up">
        <!-- 点击/拖动捕获层（细轴放大成整行，方便点按） -->
        <rect x="0" y="30" :width="W" :height="70" fill="transparent" />
        <!-- 子刻度（1/n） -->
        <line v-for="(t, i) in minorTicks" :key="'a' + i" :x1="t.x" :y1="AXISY - 5" :x2="t.x" :y2="AXISY + 5"
          stroke="#c9d6e4" stroke-width="1.5" />
        <!-- 整数刻度与数字（整数恰在第 (g-1)*n 小格） -->
        <line v-for="g in U + 1" :key="'m' + g" :x1="xOf((g - 1) * n)" :y1="AXISY - 11"
          :x2="xOf((g - 1) * n)" :y2="AXISY + 11" stroke="#51617a" stroke-width="2.2" />
        <!-- 轴主线 -->
        <line :x1="X0" :y1="AXISY" :x2="X1" :y2="AXISY" stroke="#51617a" stroke-width="2.4" stroke-linecap="round" />
        <!-- 整数标签 -->
        <text v-for="g in U + 1" :key="'t' + g" :x="xOf((g - 1) * n)" :y="AXISY + 26"
          text-anchor="middle" class="nl-label">{{ g - 1 }}</text>
        <!-- 端点箭头 -->
        <path :d="`M ${X0} ${AXISY - 6} l 6 6 l -6 6`" fill="none" stroke="#51617a" stroke-width="2" />
        <path :d="`M ${X1} ${AXISY - 6} l -6 6 l 6 6`" fill="none" stroke="#51617a" stroke-width="2" />

        <!-- 尝试落点（挑战中没答对前，显示你点在哪） -->
        <g v-if="challenge && tried && !placed">
          <circle :cx="xOf(k)" :cy="AXISY - 16" r="9" fill="#ffb02e" stroke="#fff" stroke-width="2.5" />
          <line :x1="xOf(k)" :y1="AXISY - 8" :x2="xOf(k)" :y2="AXISY + 8" stroke="#ffb02e" stroke-width="2" />
        </g>
        <!-- 分数点标记（自由模式 / 挑战答对后） -->
        <template v-if="!challenge || placed">
          <circle :cx="xOf(k)" :cy="AXISY - 16" r="9" fill="#ef6b7b" stroke="#fff" stroke-width="2.5" />
          <line :x1="xOf(k)" :y1="AXISY - 8" :x2="xOf(k)" :y2="AXISY + 8" stroke="#ef6b7b" stroke-width="2" />
        </template>
      </svg>
    </div>

    <!-- 挑战反馈 -->
    <div v-if="challenge && feed" class="frac-feed" :class="{ 'is-ok': lastOk }">{{ feed }}</div>

    <!-- 读数面板 -->
    <div class="frac-readout" v-if="!challenge">
      <Fraction :m="k" :n="n" tall />
      <div class="frac-read-text">
        <p class="frac-chinese">{{ markerZh }}</p>
        <p class="frac-explain">
          从 0 到 <b>{{ U }}</b>，把 1 平均分成 <b>{{ n }}</b> 份，
          数到第 <b>{{ k }}</b> 小格（{{ kStepNote }}），就是箭头指的地方。
        </p>
      </div>
    </div>

    <!-- 自由模式控制 -->
    <div v-if="!challenge" class="frac-ctl frac-ctl-center">
      <label class="frac-label">数轴范围
        <select v-model.number="U" class="frac-select">
          <option :value="1">0 ~ 1</option>
          <option :value="2">0 ~ 2</option>
          <option :value="3">0 ~ 3</option>
        </select>
      </label>
      <label class="frac-label">
        把 1 分成 <b>{{ n }}</b> 份
        <input class="frac-slider" type="range" min="2" max="12" v-model.number="n" />
      </label>
      <label class="frac-label">
        第 <b class="frac-num">{{ k }}</b> 小格
        <input class="frac-slider" type="range" min="0" :max="U * n" v-model.number="k" />
      </label>
      <button @click="resetK">回到中间</button>
    </div>
    <div v-else class="frac-ctl frac-ctl-center">
      <button v-if="placed" class="frac-btn-main" @click="newTarget">下一题</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import Fraction from './Fraction.vue'
import { fracReadZh, simplify } from '../../data/fractions/fracUtils.js'

const W = 760
const H = 120
const X0 = 46
const X1 = W - 46
const AXISY = 62

const unitW = computed(() => (X1 - X0) / U.value)

const n = ref(4)
const U = ref(1)
const k = ref(2)

// 挑战状态
const challenge = ref(false)
const targetN = ref(1)
const targetD = ref(4)
const placed = ref(false)
const streak = ref(0)
const feed = ref('')
const tried = ref(false) // 挑战中是否点过轴（用于显示尝试落点）
const lastOk = ref(false) // 最近一次反馈是否正确
let dragging = false

function xOf(step) {
  // step = 在整条 0..U*n 上的第几步
  return X0 + step / (U.value * n.value) * (X1 - X0)
}
const minorTicks = computed(() => {
  const arr = []
  const total = U.value * n.value
  for (let s = 0; s <= total; s++) {
    const onInt = s % n.value === 0
    if (!onInt) arr.push({ x: xOf(s) })
  }
  return arr
})

function stepAt(clientX, el) {
  const rect = el.getBoundingClientRect()
  const px = ((clientX - rect.left) / rect.width) * W
  const total = U.value * n.value
  const raw = (px - X0) / (X1 - X0) * total
  const s = Math.round(Math.min(Math.max(raw, 0), total))
  return Math.min(Math.max(s, 0), total)
}

function down(e) {
  dragging = true
  move(e)
}
function move(e) {
  if (!dragging) return
  const s = stepAt(e.clientX, e.currentTarget)
  if (challenge.value) {
    if (placed.value) return
    tried.value = true
    k.value = s
    if (s === targetN.value) {
      placed.value = true
      streak.value++
      lastOk.value = true
      feed.value = `✅ 对啦！${targetN.value}/${targetD.value} 就停在这里。`
    } else {
      lastOk.value = false
      feed.value = `✏️ 这里在 ${displayAt(s)}，再看仔细～`
    }
  } else {
    k.value = s
  }
}
function up() { dragging = false }

function displayAt(s) {
  const [a, b] = simplify(s, n.value)
  return b === 1 ? `整数 ${a}` : `${s}/${n.value}`
}

const markerZh = computed(() => {
  if (k.value % n.value === 0) {
    const w = k.value / n.value
    return w === 1 ? '正好在 1，就是一个整体' : `正好在 ${w}`
  }
  const w = Math.floor(k.value / n.value)
  const r = k.value % n.value
  return w === 0 ? `${fracReadZh(k.value, n.value)}` : `${fracReadZh(r, n.value)}`
})
const kStepNote = computed(() => {
  if (k.value % n.value === 0) return '刚好是一个整数'
  const w = Math.floor(k.value / n.value)
  const r = k.value % n.value
  return w === 0 ? '还没到 1' : `越过 ${w} 又 ${r} 份`
})

function resetK() { k.value = Math.floor(U.value * n.value / 2) }

watch([n, U], () => {
  k.value = Math.min(k.value, U.value * n.value)
})

function modeFree() {
  challenge.value = false
  placed.value = false
  resetK()
}
function modeChallenge() {
  challenge.value = true
  newTarget()
}
function newTarget() {
  const UU = 2 // 挑战固定在 0~2，能容纳假分数
  U.value = UU
  targetD.value = 2 + Math.floor(Math.random() * 5) // 2~6
  n.value = targetD.value
  let tn = 1 + Math.floor(Math.random() * (UU * targetD.value - 1))
  while (tn % targetD.value === 0 && tn > 0) tn-- // 不落在整数刻度
  targetN.value = tn
  k.value = Math.floor(UU * targetD.value / 2)
  placed.value = false
  tried.value = false
  lastOk.value = false
  feed.value = ''
}
</script>

<style scoped>
.nl-wrap { max-width: 760px; margin: 10px auto 0; touch-action: none; }
.nl-svg { width: 100%; height: auto; cursor: crosshair; }
.nl-label { font-size: 16px; fill: #51617a; font-weight: 700; }
.frac-feed {
  margin: 10px auto 0; max-width: 560px; text-align: center; font-size: 16px;
  font-weight: 600; color: #e8850c; min-height: 24px; line-height: 1.6;
}
.frac-feed.is-ok { color: #19a463; }
.frac-task-band {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: #f0f7ff; border: 1px solid #d8e7fb; border-radius: 12px; padding: 9px 14px;
  font-size: 15px; color: #3d4f66;
}
.frac-readout { display: flex; gap: 26px; align-items: center; justify-content: center; margin-top: 14px; flex-wrap: wrap; }
.frac-read-text { max-width: 430px; }
.frac-read-text p { margin: 8px 0; }
.frac-chinese { font-size: 20px; color: #20364f; }
.frac-explain { font-size: 15px; line-height: 1.9; color: #4c5d72; }
.frac-explain b { color: #2c6ec4; }
.frac-ctl-center { justify-content: center; margin-top: 14px; }
.frac-select { border: 1px solid #d6dfeb; border-radius: 7px; padding: 6px 9px; background: #fff; color: #263548; }
</style>
