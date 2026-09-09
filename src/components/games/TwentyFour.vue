<template>
  <div class="tf-wrap">
    <div class="tf-head">
      <div class="tf-title">
        <span class="tf-dot">🃏</span>
        24 点
        <span class="tf-sub">用全部 4 张牌 · ＋ － × ÷ · 凑出 24</span>
      </div>
      <div class="tf-side">
        <div class="tf-diff" role="group">
          <button v-for="d in diffs" :key="d.v" class="tf-diff-btn"
            :class="{ on: diff === d.v }" @click="setDiff(d.v)">{{ d.label }}</button>
        </div>
        <div class="tf-stat">
          <span>已解 <b>{{ score }}</b></span>
          <span class="tf-streak" :class="{ hot: streak > 0 }">连对 <b>{{ streak }}</b></span>
        </div>
      </div>
    </div>

    <div class="tf-rule">每个数字只能使用一次（可先算中间结果，如 <code>6÷(1−3÷4)</code>）</div>

    <!-- 牌面 -->
    <div class="tf-cards">
      <button v-for="(c, i) in cards" :key="i" class="tf-card" :class="{ used: usedSlot(i), down: solved }"
        :disabled="usedSlot(i) || solved" @click="ins(String(c))">
        <i class="tf-suit" :class="suitCls(i)">{{ suits[i % 4] }}</i>
        <b class="tf-num" :class="numCls(c)">{{ c }}</b>
        <i v-if="usedSlot(i)" class="tf-tag">已用</i>
      </button>
    </div>

    <!-- 算式 -->
    <div class="tf-expr" :class="{ ok: is24, bad: isBad }">
      <input ref="exprEl" v-model="expr" readonly placeholder="点下面的牌和符号拼算式…"
        :class="{ ok: live.state === 'ok', bad: live.state === 'bad' }" />
      <span class="tf-prev">{{ live.label }}</span>
    </div>

    <div class="tf-pad">
      <div class="tf-op-row">
        <button class="tf-key op" @click="ins('(')">(</button>
        <button class="tf-key op" @click="ins(')')">)</button>
        <button class="tf-key op" @click="ins('/')">÷</button>
        <button class="tf-key op" @click="ins('*')">×</button>
        <button class="tf-key op" @click="ins('-')">−</button>
        <button class="tf-key op" @click="ins('+')">＋</button>
      </div>
      <div class="tf-edit-row">
        <button class="tf-key edit" @click="del()">⌫ 退格</button>
        <button class="tf-key edit" @click="clr()">✕ 清空</button>
      </div>
    </div>

    <div class="tf-actions">
      <button class="tf-act primary" :disabled="solved" @click="judge()">判定</button>
      <button class="tf-act" @click="deal()">换一组</button>
      <button class="tf-act ghost" @click="hint()">{{ hintShown ? '收起提示' : '提示' }}</button>
    </div>

    <transition name="tf-fade">
      <div v-if="msg" class="tf-msg" :class="msgCls">{{ msg }}</div>
    </transition>

    <transition name="tf-fade">
      <div v-if="hintShown" class="tf-hint">
        <span>参考算式：</span><code>{{ solution }}</code>
        <button class="tf-apply" @click="fillHint()">填入算式</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { playError, playWin } from '../../utils/sfx'

const diffs = [
  { v: 10, label: '简单 1–10' },
  { v: 13, label: '挑战 1–13' }
]
const suits = ['♠', '♥', '♣', '♦']
const diff = ref(13)

const cards = ref([])
const expr = ref('')
const solved = ref(false)
const score = ref(0)
const streak = ref(0)
const msg = ref('')
const msgOk = ref(true)
const solution = ref('')
const hintShown = ref(false)
const exprEl = ref(null)

// ---------- 解析 & 求值 ----------
function tokenize(s) {
  const toks = []
  const allowed = new Set('+*-/()'.split(''))
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) { i += 1; continue }
    if (/\d/.test(ch)) {
      const m = s.slice(i).match(/^\d+/)
      toks.push({ t: 'num', v: +m[0] })
      i += m[0].length
      continue
    }
    if (allowed.has(ch)) { toks.push({ t: ch }); i += 1; continue }
    throw new Error('bad char')
  }
  return toks
}
function parseEval(toks) {
  let p = 0
  function peek() { return toks[p] }
  function take() { return toks[p++] }
  function expr1() {
    let v = term()
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = take().t
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  function term() {
    let v = factor()
    while (peek() && (peek().t === '*' || peek().t === '/')) {
      const op = take().t
      const r = factor()
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  function factor() {
    const tk = take()
    if (!tk) throw new Error('incomplete')
    if (tk.t === 'num') return tk.v
    if (tk.t === '(') {
      const v = expr1()
      const close = take()
      if (!close || close.t !== ')') throw new Error('paren')
      return v
    }
    throw new Error('op pos')
  }
  const v = expr1()
  if (p !== toks.length) throw new Error('trailing')
  return v
}
function numTokens(toks) {
  return toks.filter(t => t.t === 'num').map(t => t.v)
}
function sameMultiset(a, b) {
  if (a.length !== b.length) return false
  const A = [...a].sort((x, y) => x - y)
  const B = [...b].sort((x, y) => x - y)
  return A.every((x, i) => x === B[i])
}

// ---------- 精确求解（有理数），用于出题与提示 ----------
function gcd(a, b) {
  while (b) { const t = a % b; a = b; b = t }
  return a || 1
}
function mk(n, d) {
  if (d === 0) return null
  if (n === 0) return { n: 0, d: 1 }
  const g = gcd(Math.abs(n), Math.abs(d))
  n /= g; d /= g
  return d < 0 ? { n: -n, d: -d } : { n, d }
}
function trySolve(arr) {
  const items = arr.map(v => ({ n: v, d: 1, s: String(v) }))
  function step(list) {
    if (list.length === 1) {
      const x = list[0]
      return Math.abs(x.n / x.d - 24) < 1e-9 ? x.s : null
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i === j) continue
        const a = list[i]
        const b = list[j]
        const rest = list.filter((_, k) => k !== i && k !== j)
        const cands = []
        const add = mk(a.n * b.d + b.n * a.d, a.d * b.d)
        const sub = mk(a.n * b.d - b.n * a.d, a.d * b.d)
        const mul = mk(a.n * b.n, a.d * b.d)
        if (add) cands.push({ ...add, s: `(${a.s}+${b.s})` })
        if (sub) cands.push({ ...sub, s: `(${a.s}-${b.s})` })
        if (mul) cands.push({ ...mul, s: `(${a.s}*${b.s})` })
        if (b.n !== 0) {
          const div = mk(a.n * b.d, a.d * b.n)
          if (div) cands.push({ ...div, s: `(${a.s}/${b.s})` })
        }
        for (const c of cands) {
          const r = step([...rest, c])
          if (r) return r
        }
      }
    }
    return null
  }
  return step(items)
}
function pretty(s) {
  return s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−')
}

// ---------- 出题 ----------
function deal() {
  const hi = diff.value
  let arr = null
  let sol = null
  for (let t = 0; t < 400; t++) {
    const a = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * hi))
    const s = trySolve(a)
    if (s) { arr = a; sol = s; break }
  }
  if (!arr) { arr = [3, 3, 8, 8]; sol = trySolve(arr) } // 8÷(3−8÷3)=24
  cards.value = arr
  solution.value = pretty(sol || '')
  expr.value = ''
  solved.value = false
  hintShown.value = false
  msg.value = ''
}

// ---------- 交互 ----------
function ins(t) {
  if (solved.value) return
  expr.value += t
  msg.value = ''
  exprEl.value?.focus()
}
function del() {
  if (solved.value) return
  expr.value = expr.value.slice(0, -1)
  msg.value = ''
}
function clr() {
  if (solved.value) return
  expr.value = ''
  msg.value = ''
}
function setDiff(v) {
  if (diff.value === v) return
  diff.value = v
  streak.value = 0
  deal()
}

const live = computed(() => {
  const s = expr.value.trim()
  if (!s) return { state: '', label: '算式预览' }
  try {
    const toks = tokenize(s)
    const vals = numTokens(toks)
    if (!vals.length) return { state: '', label: '算式预览' }
    if (!vals.every(x => cards.value.includes(x))) {
      return { state: 'bad', label: '有数字不属于这一组牌' }
    }
    if (!sameMultiset(vals, cards.value)) {
      return { state: '', label: `已用 ${vals.length} / 4 个数` }
    }
    const v = parseEval(toks)
    if (!Number.isFinite(v)) return { state: '', label: '…（存在除以 0）' }
    const vv = Math.round(v * 1e6) / 1e6
    return Math.abs(vv - 24) < 1e-6
      ? { state: 'ok', label: `= ${vv}　🎯 正好是 24，点“判定”收下！` }
      : { state: '', label: `= ${vv}` }
  } catch {
    return { state: '', label: '算式不完整…' }
  }
})
const msgCls = computed(() => (msgOk.value ? 'ok' : 'bad'))

function judge() {
  const s = expr.value.trim()
  if (!s) { msg.value = '先拼一个算式吧'; msgOk.value = false; return }
  try {
    const toks = tokenize(s)
    const vals = numTokens(toks)
    if (!sameMultiset(vals, cards.value)) {
      msg.value = '四张牌要各用一次，不能多用或漏用'
      msgOk.value = false; playError(); return
    }
    const v = parseEval(toks)
    if (!Number.isFinite(v)) {
      msg.value = '算式里有「除以 0」'
      msgOk.value = false; playError(); return
    }
    if (Math.abs(v - 24) > 1e-6) {
      msg.value = `结果是 ${Math.round(v * 1e6) / 1e6}，不是 24，再试试`
      msgOk.value = false; streak.value = 0; playError(); return
    }
    solved.value = true
    score.value += 1
    streak.value += 1
    msgOk.value = true
    msg.value = `🎉 答对了！${pretty(expr.value.trim())} = 24`
    playWin()
  } catch {
    msg.value = '算式不完整，检查括号和符号'
    msgOk.value = false; playError()
  }
}

function hint() {
  if (hintShown.value) { hintShown.value = false; return }
  if (!solution.value) { deal(); return }
  hintShown.value = true
  streak.value = 0
  msg.value = ''
}
function fillHint() {
  expr.value = solution.value.replace(/[×÷−]/g, m => (m === '×' ? '*' : m === '÷' ? '/' : '-'))
  msg.value = ''
  hintShown.value = false
  exprEl.value?.focus()
}

// ---------- 界面辅助 ----------
function usedSlot(i) {
  const val = cards.value[i]
  const toks = []
  try { toks.push(...numTokens(tokenize(expr.value))) } catch { return false }
  const pool = [...toks]
  let used = 0
  for (let k = 0; k <= i; k++) {
    if (cards.value[k] !== val) continue
    const idx = pool.findIndex(x => x === val)
    if (idx === -1) break
    pool.splice(idx, 1)
    if (k === i) used = 1
  }
  return used === 1
}
const suitCls = i => (i % 2 === 1 ? 'red' : '')
const numCls = c => {
  const a = cards.value.indexOf(c)
  const idx = a === -1 ? 0 : a
  return `c${idx % 4}`
}

deal()
</script>

<style scoped>
.tf-wrap {
  width: 100%; max-width: 640px; background: #fff;
  border-radius: 16px; padding: 20px 24px 24px;
  box-shadow: 0 8px 28px rgba(45, 90, 95, .1);
  border: 1px solid #e4edf1;
}
.tf-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.tf-title { font-size: 22px; font-weight: 900; color: #134e5b; display: flex; align-items: center; gap: 8px; }
.tf-dot { font-style: normal; }
.tf-sub { font-size: 12px; color: #7c9098; font-weight: 600; margin-left: 4px; align-self: flex-end; }
.tf-side { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.tf-diff { display: inline-flex; background: #eef5f6; border-radius: 10px; padding: 3px; }
.tf-diff-btn { border: 0; background: transparent; padding: 5px 11px; border-radius: 8px; cursor: pointer; font-weight: 700; color: #5c747d; font-size: 12px; }
.tf-diff-btn.on { background: #2bb3a2; color: #fff; box-shadow: 0 2px 6px rgba(43, 179, 162, .35); }
.tf-stat { display: flex; gap: 12px; font-size: 12px; color: #7c9098; font-weight: 600; }
.tf-stat b { color: #2bb3a2; font-size: 15px; }
.tf-streak.hot b { color: #f78c6b; }
.tf-rule { margin: 10px 0 4px; color: #9db0b6; font-size: 12px; }
.tf-rule code { background: #eef7f5; color: #15826f; padding: 1px 6px; border-radius: 6px; font-weight: 700; }

/* 牌面 */
.tf-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 12px 0 4px; }
.tf-card {
  position: relative; height: 84px; border: 1px solid #dde9ed; background: #fdfefe;
  border-radius: 12px; cursor: pointer; box-shadow: 0 3px 0 rgba(80, 130, 140, .1);
  transition: transform .12s, box-shadow .12s; user-select: none;
}
.tf-card:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(43, 179, 162, .18); }
.tf-card:active:not(:disabled) { transform: translateY(0); }
.tf-card:disabled { cursor: default; opacity: .9; }
.tf-card.used { background: #f1f5f6; border-style: dashed; }
.tf-suit { position: absolute; top: 6px; left: 8px; font-size: 14px; font-style: normal; color: #1f5c6b; }
.tf-suit.red { color: #e0534f; }
.tf-card.used .tf-suit { opacity: .3; }
.tf-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 30px; font-weight: 900; }
.tf-num.c0 { color: #0e7f74; } .tf-num.c1 { color: #e0534f; }
.tf-num.c2 { color: #2878b5; } .tf-num.c3 { color: #b5642f; }
.tf-card.used .tf-num { color: #a9b8bd; }
.tf-tag { position: absolute; right: -6px; top: -8px; background: #9db0b6; color: #fff; font-style: normal;
  font-size: 10px; padding: 2px 7px; border-radius: 8px; font-weight: 700; }

/* 算式 */
.tf-expr { position: relative; margin: 10px 0 6px; }
.tf-expr input {
  width: 100%; box-sizing: border-box; padding: 13px 14px; font-size: 20px; font-weight: 700;
  border: 2px dashed #cddde2; border-radius: 12px; background: #fbfdfe; color: #1c4652;
  outline: none; letter-spacing: .5px; font-family: inherit;
}
.tf-expr input.ok { border-style: solid; border-color: #2bb3a2; background: #eefaf7; color: #0d7f74; }
.tf-expr input.bad { border-color: #efb08a; background: #fef7f2; }
.tf-prev { display: block; margin: 5px 4px 0; font-size: 12px; color: #8aa2ab; font-weight: 600; min-height: 16px; }

/* 键盘 */
.tf-pad { margin: 10px 0 0; }
.tf-op-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.tf-key {
  border: 1px solid #dbe8ec; background: #fff; border-radius: 10px; height: 40px;
  font-size: 17px; font-weight: 800; color: #28535f; cursor: pointer; transition: background .12s;
}
.tf-key:hover:not(:disabled) { background: #eaf6f4; }
.tf-key.op { color: #0e7f74; font-size: 19px; }
.tf-edit-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
.tf-key.edit { height: 36px; font-size: 13px; color: #8aa2ab; background: #f6fafb; font-weight: 700; }

/* 操作 */
.tf-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 14px; }
.tf-act {
  border: 0; border-radius: 12px; height: 46px; font-size: 15px; font-weight: 800; cursor: pointer;
  background: #e9f3f2; color: #2c6a6a;
}
.tf-act.primary { background: linear-gradient(135deg, #2bb3a2, #1f9a8c); color: #fff; box-shadow: 0 6px 16px rgba(43, 179, 162, .3); }
.tf-act.ghost { background: transparent; color: #7c9098; border: 1px dashed #cfdfe3; }
.tf-act:disabled { opacity: .45; cursor: default; }

/* 反馈 */
.tf-msg { margin-top: 12px; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-weight: 700; }
.tf-msg.ok { background: #e6f8f3; color: #0d7f74; }
.tf-msg.bad { background: #fdf0e7; color: #c25d2c; }
.tf-hint { margin-top: 10px; background: #f6f9fa; border: 1px dashed #cfdfe3; border-radius: 10px;
  padding: 10px 12px; font-size: 13px; color: #54707b; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tf-hint code { font-size: 16px; font-weight: 900; color: #0e7f74; }
.tf-apply { margin-left: auto; border: 0; background: #2bb3a2; color: #fff; padding: 5px 12px; border-radius: 8px;
  font-weight: 700; cursor: pointer; font-size: 12px; }

.tf-fade-enter-active, .tf-fade-leave-active { transition: opacity .18s, transform .18s; }
.tf-fade-enter-from, .tf-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
