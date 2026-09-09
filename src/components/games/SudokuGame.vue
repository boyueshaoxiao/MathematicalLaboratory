<template>
  <div class="sd-wrap">
    <div class="sd-head">
      <div class="sd-title">
        <span class="sd-dot">🎲</span>
        数独
        <span class="sd-sub">每行 · 每列 · 每宫 填 1~9 且不重复</span>
      </div>
      <div class="sd-side">
        <div class="sd-diff" role="group">
          <button v-for="d in diffs" :key="d.key" class="sd-diff-btn"
            :class="{ on: dKey === d.key }" @click="setDiff(d.key)">{{ d.label }}</button>
        </div>
        <div class="sd-stat">
          <span>提示 <b>{{ hintUsed }}</b></span>
          <span>用时 <b>{{ secText }}</b></span>
        </div>
      </div>
    </div>

    <div class="sd-stage">
      <div class="sd-board">
        <button v-for="i in 81" :key="i - 1" class="sd-c" :class="cellCls(i - 1)"
          :disabled="solved" @click="pick(i - 1)">
          {{ board[i - 1] || '' }}
        </button>
      </div>

      <transition name="sd-pop">
        <div v-if="solved" class="sd-win">
          <div class="sd-win-card">
            <span class="sd-win-emoji">🎉</span>
            <h3>全部填对了！</h3>
            <p>用时 <b>{{ secText }}</b> · 使用提示 <b>{{ hintUsed }}</b> 次</p>
            <div class="sd-win-actions">
              <button class="sd-btn primary" @click="newGame()">再来一局</button>
              <button class="sd-btn" @click="changeDiff()">换难度</button>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <div class="sd-tip">{{ tipText }}</div>

    <div class="sd-numpad">
      <button v-for="v in 9" :key="v" class="sd-num" :disabled="noSel || solved" @click="input(v)">{{ v }}</button>
      <button class="sd-num erase" :disabled="noSel || solved" @click="erase()">✕</button>
    </div>

    <div class="sd-actions">
      <button class="sd-btn" @click="check()">检查</button>
      <button class="sd-btn" @click="hint()">提示</button>
      <button class="sd-btn ghost" @click="newGame()">新一局</button>
    </div>

    <transition name="sd-fade">
      <div v-if="msg" class="sd-msg" :class="{ bad: !msgOk }">{{ msg }}</div>
    </transition>
  </div>
</template>

<script setup>
import { computed, onActivated, onDeactivated, ref } from 'vue'
import { generateSudoku } from '../../utils/sudoku'
import { playError, playMove, playWin } from '../../utils/sfx'

const diffs = [
  { key: 'easy', label: '简单', given: 38 },
  { key: 'mid', label: '中等', given: 31 },
  { key: 'hard', label: '困难', given: 25 }
]
const dKey = ref('mid')

const board = ref(Array(81).fill(0))
const fixed = ref(Array(81).fill(false))
let solution = Array(81).fill(0)
const sel = ref(-1)
const solved = ref(false)
const hintUsed = ref(0)
const elapsed = ref(0)
const msg = ref('')
const msgOk = ref(true)

const secText = computed(() => {
  const s = elapsed.value
  const m = (s / 60) | 0
  const ss = (s % 60).toString().padStart(2, '0')
  return `${m}:${ss}`
})
const noSel = computed(() => sel.value < 0 || fixed.value[sel.value])

const tipText = computed(() => {
  if (solved.value) return '🎉 完成！'
  if (sel.value < 0) return '先点击或方向键选中一格'
  const r = (sel.value / 9 | 0) + 1
  const c = (sel.value % 9) + 1
  const v = board.value[sel.value]
  if (fixed.value[sel.value]) return `第 ${r} 行第 ${c} 列是提示数（${v}），不可改动`
  return `第 ${r} 行第 ${c} 列` + (v ? `（当前 ${v}）` : '（空格）')
})

// —— 冲突检测 ——
const conflicts = computed(() => {
  const fl = Array(81).fill(false)
  const lines = []
  for (let r = 0; r < 9; r++) lines.push(Array.from({ length: 9 }, (_, c) => r * 9 + c))
  for (let c = 0; c < 9; c++) lines.push(Array.from({ length: 9 }, (_, r) => r * 9 + c))
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const arr = []
      for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) arr.push((br * 3 + rr) * 9 + bc * 3 + cc)
      lines.push(arr)
    }
  }
  for (const line of lines) {
    const pos = new Map()
    for (const i of line) {
      const v = board.value[i]
      if (!v) continue
      if (!pos.has(v)) pos.set(v, [])
      pos.get(v).push(i)
    }
    for (const idxs of pos.values()) {
      if (idxs.length > 1) idxs.forEach(i => { fl[i] = true })
    }
  }
  return fl
})

function newGame() {
  const d = diffs.find(x => x.key === dKey.value) || diffs[1]
  const { solution: sol, puzzle } = generateSudoku(d.given)
  solution = sol
  board.value = puzzle
  fixed.value = puzzle.map(v => v !== 0)
  sel.value = 40
  solved.value = false
  hintUsed.value = 0
  elapsed.value = 0
  msg.value = ''
}
function changeDiff() {
  const cur = diffs.findIndex(x => x.key === dKey.value)
  dKey.value = diffs[(cur + 1) % diffs.length].key
  newGame()
}
function setDiff(k) {
  if (dKey.value === k) return
  dKey.value = k
  newGame()
}

function pick(i) {
  if (solved.value) return
  sel.value = i
  msg.value = ''
}
function move(r, c) {
  if (solved.value) return
  sel.value = ((r + 9) % 9) * 9 + ((c + 9) % 9)
}
function input(v) {
  if (solved.value) return
  const i = sel.value
  if (i < 0 || fixed.value[i]) return
  board.value[i] = v
  msg.value = ''
  afterSet()
}
function erase() {
  if (solved.value) return
  const i = sel.value
  if (i < 0 || fixed.value[i]) return
  board.value[i] = 0
  msg.value = ''
}
function check() {
  const bad = conflicts.value.filter(Boolean).length
  if (bad) {
    msg.value = `有 ${bad} 处冲突（红色标出）`
    msgOk.value = false
    playError()
  } else {
    const left = board.value.filter(v => !v).length
    msg.value = left ? `目前没有冲突，还剩 ${left} 格` : '完全正确，但……还没有点亮✨（点“新一局”？）'
    msgOk.value = true
  }
}
function hint() {
  if (solved.value) return
  const opts = []
  for (let i = 0; i < 81; i++) {
    if (!fixed.value[i] && !board.value[i]) opts.push(i)
  }
  if (!opts.length) return
  let target = sel.value
  if (target < 0 || fixed.value[target] || board.value[target]) {
    target = opts[Math.floor(Math.random() * opts.length)]
  }
  sel.value = target
  board.value[target] = solution[target]
  hintUsed.value += 1
  msg.value = `已填入第 ${(target / 9 | 0) + 1} 行第 ${(target % 9) + 1} 列`
  msgOk.value = true
  playMove()
  afterSet()
}
function afterSet() {
  if (solved.value) return
  if (!board.value.includes(0) && !conflicts.value.some(Boolean)) {
    solved.value = true
    playWin()
  }
}

// —— 键盘 ——
function onKey(e) {
  if (solved.value) return
  const k = e.key
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
    e.preventDefault()
    const r = (sel.value / 9 | 0)
    const c = sel.value % 9
    const dr = k === 'ArrowDown' ? 1 : k === 'ArrowUp' ? -1 : 0
    const dc = k === 'ArrowRight' ? 1 : k === 'ArrowLeft' ? -1 : 0
    move(r + dr, c + dc)
    return
  }
  if (/^[1-9]$/.test(k)) {
    if (sel.value >= 0 && !fixed.value[sel.value]) input(+k)
    return
  }
  if (k === 'Delete' || k === 'Backspace') {
    e.preventDefault()
    erase()
  }
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

let timer = null
function startTimer() {
  if (timer) return
  timer = setInterval(() => {
    if (!solved.value) elapsed.value += 1
  }, 1000)
}
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onActivated(() => {
  bindKb()
  startTimer()
})
onDeactivated(() => {
  unbindKb()
  stopTimer()
})

// —— 界面 ——
function sameGroup(a, b) {
  const ra = (a / 9) | 0
  const ca = a % 9
  const rb = (b / 9) | 0
  const cb = b % 9
  if (ra === rb || ca === cb) return true
  return ((ra / 3) | 0) === ((rb / 3) | 0) && ((ca / 3) | 0) === ((cb / 3) | 0)
}
function cellCls(i) {
  const s = ['sd-c']
  const r = (i / 9) | 0
  const c = i % 9
  if (r === 2 || r === 5) s.push('bb')
  if (c === 2 || c === 5) s.push('br')
  if (fixed.value[i]) s.push('fixed')
  if (solved.value) return s.join(' ')
  if (sel.value === i) s.push('sel')
  else if (sel.value >= 0) {
    const sv = board.value[sel.value]
    if (sv) {
      if (board.value[i] === sv) s.push('same')
      else if (sameGroup(i, sel.value)) s.push('peer')
    }
  }
  if (board.value[i] && conflicts.value[i]) s.push('err')
  return s.join(' ')
}

newGame()
</script>

<style scoped>
.sd-wrap {
  width: 100%; max-width: 580px; background: #fff;
  border-radius: 16px; padding: 18px 22px 22px;
  box-shadow: 0 8px 28px rgba(45, 90, 95, .1);
  border: 1px solid #e4edf1;
}
.sd-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; }
.sd-title { font-size: 21px; font-weight: 900; color: #134e5b; display: flex; align-items: center; gap: 8px; }
.sd-dot { font-style: normal; }
.sd-sub { font-size: 12px; color: #7c9098; font-weight: 600; margin-left: 2px; align-self: flex-end; }
.sd-side { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.sd-diff { display: inline-flex; background: #eef5f6; border-radius: 10px; padding: 3px; }
.sd-diff-btn { border: 0; background: transparent; padding: 5px 10px; border-radius: 8px; cursor: pointer; font-weight: 700; color: #5c747d; font-size: 12px; }
.sd-diff-btn.on { background: #2bb3a2; color: #fff; box-shadow: 0 2px 6px rgba(43, 179, 162, .35); }
.sd-stat { display: flex; gap: 12px; font-size: 12px; color: #7c9098; font-weight: 600; }
.sd-stat b { color: #2bb3a2; font-size: 14px; }

.sd-stage { position: relative; margin-top: 14px; }
.sd-board {
  display: grid; grid-template-columns: repeat(9, 1fr); gap: 0;
  width: min(100%, 430px); aspect-ratio: 1; margin: 0 auto;
  border: 2px solid #234c58; border-radius: 12px; overflow: hidden;
  background: #d8e2e6;
}
.sd-c {
  border: 0; padding: 0; background: #fff; cursor: pointer; user-select: none;
  font-size: 20px; font-weight: 700; color: #1d5a8a; font-family: inherit;
  border-right: 1px solid #dfe7ea; border-bottom: 1px solid #dfe7ea;
  transition: background .08s;
}
.sd-c.br { border-right: 3px solid #234c58; }
.sd-c.bb { border-bottom: 3px solid #234c58; }
.sd-c:hover:not(:disabled) { background: #f2f9f8; }
.sd-c.fixed { color: #1b4350; font-weight: 800; background: #f4f8f9; }
.sd-c.peer { background: #f4fbfd; }
.sd-c.same { background: #fff3cf; }
.sd-c.sel { background: #c9f0ea; box-shadow: inset 0 0 0 2px #2bb3a2; z-index: 1; position: relative; }
.sd-c.err { background: #ffe3df; color: #c0392b; }
.sd-c.err.fixed { background: #ffe3df; color: #c0392b; }
.sd-c:disabled { cursor: default; }

.sd-win { position: absolute; inset: 0; z-index: 5; display: flex; align-items: center; justify-content: center; }
.sd-win-card {
  background: rgba(255, 255, 255, .97); border-radius: 16px; padding: 22px 30px;
  text-align: center; box-shadow: 0 14px 44px rgba(24, 90, 80, .3);
  border: 1px solid #cfe9e2;
}
.sd-win-emoji { font-size: 40px; }
.sd-win-card h3 { margin: 8px 0 4px; color: #0e6f64; }
.sd-win-card p { margin: 0 0 14px; color: #6c868d; font-size: 13px; }
.sd-win-card b { color: #2bb3a2; }
.sd-win-actions { display: flex; gap: 10px; justify-content: center; }
.sd-win-actions .sd-btn { margin: 0; }

.sd-tip { text-align: center; margin: 10px 0 2px; font-size: 12px; color: #8aa2ab; font-weight: 600; min-height: 16px; }

.sd-numpad { display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; margin: 4px auto 0; width: min(100%, 430px); }
.sd-num {
  border: 1px solid #dbe8ec; background: #fff; border-radius: 10px; height: 40px;
  font-size: 17px; font-weight: 800; color: #28535f; cursor: pointer;
}
.sd-num:hover:not(:disabled) { background: #eaf6f4; }
.sd-num.erase { grid-column: span 1; color: #c0684f; background: #fdf4f0; }
.sd-num:disabled { opacity: .4; cursor: default; }

.sd-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px auto 0; width: min(100%, 430px); }
.sd-btn {
  border: 0; border-radius: 12px; height: 44px; font-size: 14px; font-weight: 800; cursor: pointer;
  background: #e9f3f2; color: #2c6a6a;
}
.sd-btn.primary { background: linear-gradient(135deg, #2bb3a2, #1f9a8c); color: #fff; box-shadow: 0 6px 16px rgba(43, 179, 162, .3); }
.sd-btn.ghost { background: transparent; color: #7c9098; border: 1px dashed #cfdfe3; }

.sd-msg { margin-top: 12px; padding: 9px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; }
.sd-msg.ok { background: #e6f8f3; color: #0d7f74; }
.sd-msg.bad { background: #fdf0e7; color: #c25d2c; }

.sd-fade-enter-active, .sd-fade-leave-active { transition: opacity .18s; }
.sd-fade-enter-from, .sd-fade-leave-to { opacity: 0; }
.sd-pop-enter-active { transition: all .22s; }
.sd-pop-enter-from { opacity: 0; transform: scale(.8); }
</style>
