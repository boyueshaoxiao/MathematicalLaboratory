<template>
  <div class="spz">
    <div class="spz-top">
      <div class="spz-sizes">
        <button v-for="s in sizes" :key="s.n" :class="{ on: s.n === size }"
          @click="setSize(s.n)">{{ s.label }}</button>
      </div>
      <div class="spz-meta">
        <div class="spz-chip"><small>步数</small><strong>{{ moves }}</strong></div>
        <div class="spz-chip"><small>用时</small><strong>{{ timeText }}</strong></div>
        <button class="spz-new" @click="newGame">重新打乱</button>
      </div>
    </div>

    <div class="spz-stage">
      <div class="spz-board" :style="{ '--n': size }">
        <button v-for="(v, i) in cells" :key="i" class="spz-cell"
          :class="{ 'is-blank': v === 0 }"
          :style="v === 0 ? {} : { background: cellBg(v), color: cellFg(v) }"
          @click="tap(i)">
          <template v-if="v !== 0">{{ v }}</template>
        </button>
      </div>

      <div v-if="solved" class="spz-mask">
        <div v-if="bits.length" class="spz-boom" aria-hidden="true">
          <i v-for="b in bits" :key="b.id" :style="{
            left: b.left + '%',
            width: b.size + 'px',
            height: b.size * 0.62 + 'px',
            background: b.color,
            animationDelay: b.delay + 'ms',
            animationDuration: b.dur + 'ms'
          }" />
        </div>
        <div class="spz-card">
          <div class="spz-win">🎉 挑战成功！</div>
          <p>共用了 <b>{{ moves }}</b> 步，耗时 <b>{{ timeText }}</b></p>
          <div class="spz-actions">
            <button @click="newGame">再来一局</button>
          </div>
        </div>
      </div>
    </div>

    <p class="spz-hint">点击与空格相邻的数字，把它滑进空格；目标是按 1 → {{ total - 1 }} 排好</p>
  </div>
</template>

<script setup>
import { computed, onActivated, onDeactivated, ref, watch } from 'vue'
import { playMove, playWin } from '../../utils/sfx'

const sizes = [
  { n: 3, label: '3×3 · 8 子' },
  { n: 4, label: '4×4 · 15 子' }
]

const size = ref(4)
const cells = ref([])
const moves = ref(0)
const secs = ref(0)
const total = computed(() => size.value * size.value)

let timer = null
let running = false

const blankIdx = computed(() => cells.value.indexOf(0))
const solved = computed(() => {
  const a = cells.value
  if (!a.length) return false
  for (let i = 0; i < a.length - 1; i++) if (a[i] !== i + 1) return false
  return a[a.length - 1] === 0
})
const timeText = computed(() => {
  const m = (secs.value / 60) | 0
  const s = secs.value % 60
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
})

function solvedArr() {
  return Array.from({ length: size.value * size.value }, (_, i) => (i + 1) % (size.value * size.value))
}

// 从“已完成”状态随机走若干步来打乱 —— 保证一定可还原
function scramble() {
  let a = solvedArr()
  let b = a.length - 1
  const n = size.value
  let rounds = 0
  do {
    a = solvedArr()
    b = a.length - 1
    for (let s = 0; s < n * n * 70; s++) {
      const r = (b / n) | 0
      const c = b % n
      const opts = []
      if (r > 0) opts.push(b - n)
      if (r < n - 1) opts.push(b + n)
      if (c > 0) opts.push(b - 1)
      if (c < n - 1) opts.push(b + 1)
      const nb = opts[(Math.random() * opts.length) | 0]
      ;[a[b], a[nb]] = [a[nb], a[b]]
      b = nb
    }
    rounds++
  } while (rounds < 3 && isOrdered(a))
  cells.value = a
}

function isOrdered(a) {
  for (let i = 0; i < a.length - 1; i++) if (a[i] !== i + 1) return false
  return true
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
  running = false
}
function startTimer() {
  if (running || solved.value) return
  running = true
  timer = setInterval(() => { secs.value += 1 }, 1000)
}

function newGame() {
  stopTimer()
  moves.value = 0
  secs.value = 0
  scramble()
}

function setSize(n) {
  if (size.value === n) return
  size.value = n
  newGame()
}

function tap(i) {
  if (solved.value) return
  const b = blankIdx.value
  const sameLine = (i / size.value | 0) === (b / size.value | 0) && Math.abs(i - b) === 1
  const sameCol = (i - b) % size.value === 0 && Math.abs(i - b) === size.value
  if (!sameLine && !sameCol) return
  const arr = cells.value.slice()
  ;[arr[i], arr[b]] = [arr[b], arr[i]]
  cells.value = arr
  moves.value += 1
  playMove()
  if (moves.value === 1) startTimer()
  if (solved.value) stopTimer()
}

function onKey(e) {
  const b = blankIdx.value
  const n = size.value
  const map = {
    ArrowUp: b >= n ? b - n : -1,
    ArrowDown: b < n * n - n ? b + n : -1,
    ArrowLeft: b % n > 0 ? b - 1 : -1,
    ArrowRight: b % n < n - 1 ? b + 1 : -1
  }
  const t = map[e.key]
  if (t === undefined || t < 0) return
  e.preventDefault()
  tap(t)
}

let kbOn = false
function bindKb() {
  if (kbOn) return
  window.addEventListener('keydown', onKey)
  kbOn = true
}
function unbindKb() {
  if (!kbOn) return
  window.removeEventListener('keydown', onKey)
  kbOn = false
}
onActivated(() => {
  bindKb()
  if (moves.value > 0 && !solved.value) startTimer()
})
onDeactivated(() => {
  unbindKb()
  stopTimer()
})

// —— 胜利特效：彩带 ——
const bits = ref([])
const BOOM_COLORS = ['#ffd166', '#ef476f', '#06d6a0', '#118ab2', '#f78c6b', '#ff6b6b', '#a78bfa', '#2ec4b6']
function makeBoom() {
  bits.value = Array.from({ length: 52 }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 6 + Math.random() * 7,
    delay: Math.random() * 320,
    dur: 1100 + Math.random() * 1000,
    color: BOOM_COLORS[id % BOOM_COLORS.length]
  }))
}
watch(solved, v => {
  if (!v) {
    bits.value = []
    return
  }
  playWin()
  makeBoom()
})

const cellBg = v => {
  const t = (v - 1) / Math.max(1, size.value * size.value - 2)
  return `hsl(168 ${40 + t * 30}% ${86 - t * 26}%)`
}
const cellFg = v => {
  const t = (v - 1) / Math.max(1, size.value * size.value - 2)
  return t > 0.45 ? '#ffffff' : '#134e46'
}

newGame()
</script>

<style scoped>
.spz {
  display: flex; flex-direction: column; align-items: center;
  width: min(480px, 100%);
}
.spz-top {
  width: 100%; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; margin-bottom: 14px;
  flex-wrap: wrap;
}
.spz-sizes { display: flex; gap: 7px; }
.spz-sizes button {
  border: 1px solid #d4e3df; background: #fff; color: #2b5f58;
  border-radius: 9px; padding: 7px 13px; font-size: 12px;
  font-weight: 700; cursor: pointer;
}
.spz-sizes button.on { background: #1f9485; border-color: #1f9485; color: #fff; }
.spz-meta { display: flex; align-items: stretch; gap: 8px; }
.spz-chip {
  background: #fff; border: 1px solid #dce8e5; border-radius: 10px;
  padding: 4px 12px; text-align: center; min-width: 60px;
}
.spz-chip small { display: block; font-size: 10px; color: #88a09c; }
.spz-chip strong { font-size: 17px; color: #175a52; }
.spz-new {
  border: 0; background: linear-gradient(160deg, #37b3a0, #1b9385);
  color: #fff; font-weight: 800; border-radius: 10px; padding: 0 14px;
  font-size: 13px; cursor: pointer;
}
.spz-new:hover { filter: brightness(1.06); }
.spz-stage { position: relative; width: 100%; }
.spz-board {
  position: relative; width: 100%; aspect-ratio: 1 / 1;
  display: grid; grid-template-columns: repeat(var(--n), 1fr);
  grid-template-rows: repeat(var(--n), 1fr);
  gap: 7px; background: #a9d6cd; padding: 7px; box-sizing: border-box;
  border-radius: 14px; box-shadow: 0 10px 24px rgba(70, 90, 100, .16);
}
.spz-cell {
  border: 0; border-radius: 10px; cursor: pointer;
  font-size: 30px; font-weight: 800; min-width: 0;
  transition: transform .12s ease, background .15s;
  background: #fff;
}
.spz-cell:not(.is-blank):hover { transform: scale(1.05); }
.spz-cell.is-blank { background: rgba(255, 255, 255, .25); cursor: default; }
.spz-cell.is-blank:hover { transform: none; }

.spz-mask {
  position: absolute; inset: 0; z-index: 5;
  display: flex; align-items: center; justify-content: center;
  background: rgba(40, 90, 80, .42); border-radius: 14px;
  backdrop-filter: blur(2px);
}
.spz-boom {
  position: absolute; inset: 0; overflow: hidden;
  pointer-events: none; z-index: 6;
}
.spz-boom i {
  position: absolute; top: -14px; border-radius: 2px;
  opacity: 0; animation-name: spz-fall; animation-timing-function: linear;
  animation-iteration-count: 1; animation-fill-mode: forwards;
}
@keyframes spz-fall {
  0% { opacity: 1; transform: translate3d(0, -8px, 0) rotate(0deg); }
  20% { transform: translate3d(0, 90px, 0) rotate(160deg); }
  100% { opacity: 0; transform: translate3d(0, 540px, 0) rotate(580deg); }
}
.spz-card {
  background: #fff; border-radius: 16px; padding: 24px 28px;
  text-align: center; width: min(300px, 86%);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .2);
}
.spz-win { font-size: 21px; font-weight: 800; color: #175a52; }
.spz-card p { font-size: 14px; color: #64778c; }
.spz-card b { color: #1b9385; }
.spz-actions button {
  border: 0; background: linear-gradient(160deg, #37b3a0, #1b9385);
  color: #fff; font-weight: 800; border-radius: 10px;
  padding: 10px 22px; font-size: 14px; cursor: pointer;
}
.spz-hint { font-size: 12.5px; color: #7d9a95; margin-top: 12px; text-align: center; }
@media (max-width: 560px) {
  .spz { width: 100%; }
  .spz-cell { font-size: 24px; }
}
</style>
