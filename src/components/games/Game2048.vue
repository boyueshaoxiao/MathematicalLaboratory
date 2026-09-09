<template>
  <div class="g2048">
    <div class="g2048-top">
      <div class="g2048-name">
        <b>2048</b>
        <span>相同数字撞一撞，合成更大的数</span>
      </div>
      <div class="g2048-stat">
        <div class="g2048-chip"><small>得分</small><strong>{{ score }}</strong></div>
        <div class="g2048-chip"><small>最高</small><strong>{{ best }}</strong></div>
        <button class="g2048-new" @click="newGame">新一局</button>
      </div>
    </div>

    <div class="g2048-stage" @touchstart.passive="onTouchStart" @touchend.prevent="onTouchEnd">
      <div class="g2048-board">
        <div v-for="i in cellCount" :key="'s' + i" class="g2048-slot"
          :style="{ left: pct((i - 1) % N), top: pct(((i - 1) / N) | 0) }"></div>
        <div v-for="t in tiles" :key="t.id" class="g2048-tile"
          :style="{ left: pct(t.c), top: pct(t.r), width: pct(1), height: pct(1) }">
          <div class="g2048-inner" :class="[
            'tv' + Math.min(t.val, 8192),
            t.val >= 1000 ? 'tl4' : t.val >= 128 ? 'tl3' : '',
            { 'is-new': t.fresh, 'is-merge': t.merged }
          ]">{{ t.val }}</div>
        </div>
      </div>

      <div v-if="showWin" class="g2048-mask">
        <div class="g2048-card">
          <div class="g2048-big">🎉 到达 2048！</div>
          <p>太厉害了！还能继续挑战更大数字吗？</p>
          <div class="g2048-actions">
            <button @click="showWin = false">继续挑战</button>
            <button class="ghost2048" @click="newGame">再来一局</button>
          </div>
        </div>
      </div>
      <div v-else-if="showOver" class="g2048-mask">
        <div class="g2048-card">
          <div class="g2048-big">😵 没有空位了</div>
          <p>本局得分 <b>{{ score }}</b>，试试打破纪录吧！</p>
          <div class="g2048-actions">
            <button @click="newGame">再来一局</button>
          </div>
        </div>
      </div>
    </div>

    <div class="g2048-pad">
      <button @click="move('up')">▲</button>
      <button @click="move('left')">◀</button>
      <button @click="move('down')">▼</button>
      <button @click="move('right')">▶</button>
    </div>
    <p class="g2048-hint">键盘方向键 / 滑动屏幕也可以移动</p>
  </div>
</template>

<script setup>
import { onActivated, onDeactivated, ref } from 'vue'
import { playMerge, playWin } from '../../utils/sfx'

const N = 4
const cellCount = N * N
let uid = 1

const tiles = ref([])
const score = ref(0)
const best = ref(Number(localStorage.getItem('g2048-best') || 0))
const showWin = ref(false)
const showOver = ref(false)
const winAnnounced = ref(false)

const pct = n => (n * 100 / N) + '%'

function emptyPositions() {
  const used = new Set(tiles.value.map(t => t.r * N + t.c))
  const list = []
  for (let i = 0; i < cellCount; i++) {
    if (!used.has(i)) list.push([(i / N) | 0, i % N])
  }
  return list
}

function spawn() {
  const cells = emptyPositions()
  if (!cells.length) return
  const p = cells[(Math.random() * cells.length) | 0]
  tiles.value.push({ id: uid++, val: Math.random() < 0.9 ? 2 : 4, r: p[0], c: p[1], fresh: true, merged: false })
}

function newGame() {
  tiles.value = []
  score.value = 0
  showWin.value = false
  showOver.value = false
  winAnnounced.value = false
  spawn()
  spawn()
}

// 合并的方向：axis 决定沿着行(c)还是列(r)走，rev 决定从末端反向收拢
function move(dir) {
  if (showWin.value || showOver.value) return
  const axis = (dir === 'left' || dir === 'right') ? 'c' : 'r'
  const rev = dir === 'right' || dir === 'down'
  const groups = {}
  for (const t of tiles.value) {
    const key = axis === 'c' ? t.r : t.c
    ;(groups[key] ||= []).push(t)
  }

  const drop = new Set()
  let moved = false
  let gain = 0
  for (let k = 0; k < N; k++) {
    const line = (groups[k] || []).slice()
    line.sort((a, b) => (axis === 'c' ? a.c - b.c : a.r - b.r))
    if (rev) line.reverse()
    let pos = rev ? N - 1 : 0
    const step = rev ? -1 : 1
    let i = 0
    while (i < line.length) {
      const cur = line[i]
      const nxt = line[i + 1]
      const sameCell = axis === 'c' ? cur.c !== pos : cur.r !== pos
      if (nxt && nxt.val === cur.val) {
        if (sameCell) moved = true
        if (axis === 'c') cur.c = pos
        else cur.r = pos
        cur.val *= 2
        cur.merged = true
        drop.add(nxt.id)
        gain += cur.val
        playMerge()
        i += 2
      } else {
        if (sameCell) moved = true
        if (axis === 'c') cur.c = pos
        else cur.r = pos
        i += 1
      }
      pos += step
    }
  }
  if (drop.size) moved = true
  if (!moved) return

  tiles.value = tiles.value
    .filter(t => !drop.has(t.id))
    .map(t => (t.merged ? t : { ...t, merged: false }))
  score.value += gain
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('g2048-best', String(best.value))
  }
  spawn()

  // 合并动画结束后清掉标记，保证下次还能重新触发
  setTimeout(() => {
    for (const t of tiles.value) t.merged = false
  }, 240)

  if (!winAnnounced.value && tiles.value.some(t => t.val >= 2048)) {
    winAnnounced.value = true
    playWin()
    showWin.value = true
    return
  }
  if (emptyPositions().length === 0 && !mergePossible()) {
    showOver.value = true
  }
}

function mergePossible() {
  for (const t of tiles.value) {
    const r = t.r, c = t.c
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      const near = tiles.value.find(x => x.r === r + dr && x.c === c + dc)
      if (near && near.val === t.val) return true
    }
  }
  return false
}

/* —— 键盘 —— */
let kbOn = false
function onKey(e) {
  const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }
  const d = map[e.key]
  if (!d) return
  e.preventDefault()
  move(d)
}
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
onActivated(bindKb)
onDeactivated(unbindKb)

/* —— 触摸滑动 —— */
let touch = null
function onTouchStart(e) {
  touch = e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
}
function onTouchEnd(e) {
  if (!touch || !e.changedTouches[0]) return
  const dx = e.changedTouches[0].clientX - touch.x
  const dy = e.changedTouches[0].clientY - touch.y
  touch = null
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
  else move(dy > 0 ? 'down' : 'up')
}

newGame()
</script>

<style scoped>
.g2048 {
  display: flex; flex-direction: column; align-items: center;
  width: min(480px, 100%);
}
.g2048-top {
  width: 100%; display: flex; align-items: center;
  justify-content: space-between; gap: 12px; margin-bottom: 14px;
}
.g2048-name b { font-size: 30px; color: #1e6e64; letter-spacing: 1px; }
.g2048-name span { display: block; font-size: 12px; color: #6c8290; margin-top: 2px; }
.g2048-stat { display: flex; align-items: stretch; gap: 8px; }
.g2048-chip {
  background: #fff; border: 1px solid #dce8e5; border-radius: 10px;
  padding: 4px 12px; text-align: center; min-width: 62px;
}
.g2048-chip small { display: block; font-size: 10px; color: #88a09c; }
.g2048-chip strong { font-size: 18px; color: #175a52; }
.g2048-new, .g2048-actions button {
  border: 0; background: linear-gradient(160deg, #37b3a0, #1b9385);
  color: #fff; font-weight: 800; border-radius: 10px; padding: 0 16px;
  font-size: 13px; cursor: pointer;
}
.g2048-new:hover, .g2048-actions button:hover { filter: brightness(1.06); }
.g2048-stage { position: relative; width: 100%; }
.g2048-board {
  position: relative; width: 100%; aspect-ratio: 1 / 1;
  background: #b8aaa0; border-radius: 14px; padding: 0;
  box-shadow: 0 10px 24px rgba(70, 90, 100, .18);
  overflow: hidden;
}
.g2048-slot {
  position: absolute; width: 25%; height: 25%;
  box-sizing: border-box; padding: 6px;
  background: transparent;
}
.g2048-slot::after {
  content: ''; display: block; width: 100%; height: 100%;
  background: rgba(220, 205, 195, .62); border-radius: 8px;
}
.g2048-tile {
  position: absolute; transition: left .11s ease, top .11s ease;
  padding: 6px; box-sizing: border-box;
}
.g2048-inner {
  width: 100%; height: 100%; display: flex; align-items: center;
  justify-content: center; border-radius: 8px; font-weight: 800;
  font-size: 32px; user-select: none;
  background: #eee4da; color: #776e65;
}
.g2048-inner.is-new { animation: g2048-pop .18s ease; }
.g2048-inner.is-merge { animation: g2048-merge .22s ease; }
@keyframes g2048-pop {
  0% { transform: scale(0); }
  80% { transform: scale(1.12); }
  100% { transform: scale(1); }
}
@keyframes g2048-merge {
  0% { transform: scale(1); }
  50% { transform: scale(1.22); }
  100% { transform: scale(1); }
}
.tv2 { background: #eee4da; color: #776e65; }
.tv4 { background: #ede0c8; color: #776e65; }
.tv8 { background: #f2b179; color: #fff; }
.tv16 { background: #f59563; color: #fff; }
.tv32 { background: #f67c5f; color: #fff; }
.tv64 { background: #f65e3b; color: #fff; }
.tv128 { background: #edcf72; color: #fff; }
.tv256 { background: #edcc61; color: #fff; }
.tv512 { background: #edc850; color: #fff; }
.tv1024 { background: #edc53f; color: #fff; }
.tv2048 { background: #edc22e; color: #fff; }
.tv4096 { background: #3d93b9; color: #fff; }
.tv8192 { background: #3f7cc0; color: #fff; }
.tl3 { font-size: 26px; }
.tl4 { font-size: 22px; }

.g2048-mask {
  position: absolute; inset: 0; z-index: 5;
  display: flex; align-items: center; justify-content: center;
  background: rgba(70, 66, 60, .42); border-radius: 14px;
  backdrop-filter: blur(2px);
}
.g2048-card {
  background: #fff; border-radius: 16px; padding: 24px 26px;
  text-align: center; width: min(300px, 86%);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .2);
}
.g2048-big { font-size: 20px; font-weight: 800; color: #243b50; }
.g2048-card p { font-size: 13px; color: #64778c; line-height: 1.6; }
.g2048-card b { color: #1b9385; }
.g2048-actions { display: flex; gap: 10px; justify-content: center; }
.g2048-actions button { padding: 10px 18px; }
.ghost2048 {
  background: #eaf3f1 !important; color: #1b9385 !important;
}

.g2048-pad {
  display: grid; grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(2, 40px); gap: 6px; margin-top: 14px;
}
.g2048-pad button {
  border: 1px solid #d5e3e0; background: #fff; color: #1b9385;
  font-size: 16px; border-radius: 9px; cursor: pointer;
}
.g2048-pad button:nth-child(1) { grid-column: 2; }
.g2048-pad button:nth-child(2) { grid-column: 1; }
.g2048-pad button:nth-child(3) { grid-column: 2; }
.g2048-pad button:nth-child(4) { grid-column: 3; }
.g2048-pad button:active { background: #dff1ed; }
.g2048-hint { font-size: 12px; color: #86a09b; margin-top: 10px; }

@media (max-width: 560px) {
  .g2048 { width: 100%; }
  .g2048-name span { display: none; }
}
</style>
