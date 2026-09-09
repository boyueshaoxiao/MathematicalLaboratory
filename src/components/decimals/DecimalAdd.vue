<template>
  <div class="da-wrap">
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: !quiz }" @click="quiz = false">🧮 看一看</button>
        <button :class="{ active: quiz }" @click="startQuiz">🎯 考一考</button>
      </div>
      <span v-if="quiz" class="frac-score">连续答对 {{ streak }} 题</span>
    </div>

    <!-- ============ 看一看 ============ -->
    <template v-if="!quiz">
      <div class="frac-ctl da-ctl">
        <div class="frac-seg">
          <button :class="{ active: op === '+' }" @click="setOp('+')">加 ＋</button>
          <button :class="{ active: op === '-' }" @click="setOp('-')">减 －</button>
        </div>
        <button class="frac-btn-main ghost-b" @click="roll">🎲 换一组</button>
      </div>

      <div class="da-eq">
        <span class="da-n a">{{ fmtCents(aCents) }}</span>
        <span class="da-op">{{ op === '+' ? '＋' : '－' }}</span>
        <span class="da-n b">{{ fmtCents(bCents) }}</span>
        <span class="da-op">＝</span>
        <span class="da-res">{{ fmtCents(res) }}</span>
      </div>

      <div class="da-sliders">
        <label class="frac-label da-slide">
          <span class="da-ke a"></span> 数 A
          <input type="range" class="frac-slider" min="5" :max="aMax" step="1" v-model.number="aCents" />
          <b class="da-mini">{{ fmtCents(aCents) }}</b>
        </label>
        <label class="frac-label da-slide">
          <span class="da-ke b"></span> 数 {{ op === '-' ? 'B（要减去）' : 'B' }}
          <input type="range" class="frac-slider" min="5" :max="bMax" step="1" v-model.number="bCents" />
          <b class="da-mini">{{ fmtCents(bCents) }}</b>
        </label>
      </div>

      <div class="da-vis">
        <div class="da-segrow">
          <div class="da-bar" :style="{ width: px(res) + 'px' }">
            <template v-if="op === '+'">
              <i class="da-part a" :style="{ width: px(aCents) + 'px' }"></i>
              <i class="da-part b" :style="{ left: px(aCents) + 'px', width: px(bCents) + 'px' }"></i>
            </template>
            <template v-else>
              <i class="da-part a" :style="{ width: px(aCents) + 'px' }"></i>
              <i class="da-cut" :style="{ left: px(res) + 'px', width: px(bCents) + 'px' }"></i>
            </template>
          </div>
        </div>
        <div class="da-key">
          <span><i class="da-ke a"></i> A = {{ fmtCents(aCents) }}（{{ aLenTxt }}）</span>
          <span v-if="op === '+'"><i class="da-ke b"></i> B = {{ fmtCents(bCents) }}（{{ bLenTxt }}）</span>
          <span v-else><i class="da-ke cut"></i> 斜纹是被减掉的 B = {{ fmtCents(bCents) }}</span>
        </div>
      </div>

      <div class="da-tip" v-if="op === '-'">
        看 A 这根长条：实心是 <b>{{ fmtCents(aCents) }} - {{ fmtCents(bCents) }} = {{ fmtCents(res) }}</b>，右端斜纹就是要“剪掉”的部分。
      </div>
      <div class="da-tip" v-else>
        A、B 首尾相接：整段长度正好是 {{ fmtCents(res) }} —— 把计数单位对齐相加，就是小数加法的意义。
      </div>
    </template>

    <!-- ============ 考一考 ============ -->
    <template v-else>
      <div class="da-q">
        <div class="da-qeq">
          <span class="da-n a">{{ fmtCents(qA) }}</span>
          <span class="da-op">{{ qOp === '+' ? '＋' : '－' }}</span>
          <span class="da-n b">{{ fmtCents(qB) }}</span>
          <span class="da-op">＝</span><span class="da-qmark">？</span>
        </div>

        <div v-if="answered" class="da-board">
          <div class="da-cols">
            <div v-for="c in quizCols" :key="c.k" class="da-col" :class="{ dot: c.dot }">
              <div class="da-h">{{ c.label }}</div>
              <div class="da-carry" v-if="c.carry && c.carry > 0">进{{ c.carry }}</div>
              <div class="da-da">{{ c.a }}</div>
              <div class="da-db"><span class="da-sign">{{ qOp === '+' ? '+' : '−' }}</span>{{ c.b }}</div>
              <div class="da-line"></div>
              <div class="da-dr">{{ c.res }}</div>
            </div>
          </div>
          <div class="da-note">{{ methodNote }}</div>
        </div>

        <div class="da-opts">
          <button v-for="o in options" :key="o" class="da-opt"
            :class="{ good: answered && o === qRes, bad: answered && picked === o && o !== qRes }"
            @click="choose(o)">{{ fmtCents(o) }}</button>
        </div>
        <div class="da-feed" :class="{ ok: answered && picked === qRes }">{{ feed }}</div>
        <button v-if="answered" class="frac-btn-main da-next" @click="nextQuiz">下一题</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { fmtCents, splitCents, randomTenths, randomHundredths, shuffle } from '../../data/decimals/decUtils.js'

const quiz = ref(false)
const op = ref('+')
const aCents = ref(275)
const bCents = ref(85)

const aMax = 400
const bMax = computed(() => (op.value === '-' ? aCents.value : 400))
const res = computed(() => (op.value === '+' ? aCents.value + bCents.value : aCents.value - bCents.value))

const px = c => Math.max(10, Math.round(c * 0.7))

const aLenTxt = computed(() => lenTxt(aCents.value))
const bLenTxt = computed(() => lenTxt(bCents.value))
function lenTxt(c) {
  const { int, t, h } = splitCents(c)
  const bits = []
  if (int) bits.push(`${int} 个一`)
  if (t) bits.push(`${t} 个 0.1`)
  if (h) bits.push(`${h} 个 0.01`)
  return bits.length ? bits.join(' + ') : '0'
}

function setOp(o) {
  op.value = o
  if (o === '-' && bCents.value > aCents.value) bCents.value = aCents.value
}
function roll() {
  aCents.value = 25 + Math.floor(Math.random() * 376)
  if (op.value === '-') {
    bCents.value = 5 + Math.floor(Math.random() * (aCents.value - 4))
  } else {
    bCents.value = 5 + Math.floor(Math.random() * 396)
  }
}
watch(aCents, v => {
  if (op.value === '-' && bCents.value > v) bCents.value = v
})

// ------- 挑战出题（a、b 小于 10；减法保证每一位都够减，无退位） -------
const qOp = ref('+')
const qA = ref(0)
const qB = ref(0)
const qRes = computed(() => (qOp.value === '+' ? qA.value + qB.value : qA.value - qB.value))
const options = ref([])
const answered = ref(false)
const picked = ref(null)
const streak = ref(0)
const feed = ref('')
const quizCols = ref([])
const methodNote = ref('')

function genNum() {
  const style = Math.random() < 0.5 ? randomTenths(3) : randomHundredths(3)
  if (style % 100 === 0) return style + 10 // 避免整数
  return style
}

function makeQuiz() {
  qOp.value = Math.random() < 0.5 ? '+' : '-'
  if (qOp.value === '+') {
    let guard = 0
    do {
      qA.value = genNum()
      qB.value = genNum()
      guard++
    } while ((qA.value + qB.value >= 1000 || Math.floor((qA.value + qB.value) / 100) > 9) && guard < 50)
  } else {
    // 从低到高逐位生成，保证 a 的每一位不小于 b
    const Bi = Math.floor(Math.random() * 3)
    const Bt = 1 + Math.floor(Math.random() * 9)
    const Bh = Math.floor(Math.random() * 10)
    let ai = Bi + 1 + Math.floor(Math.random() * (3 - Bi))
    let at = Bt + Math.floor(Math.random() * (10 - Bt))
    let ah = Bh + Math.floor(Math.random() * (10 - Bh))
    qB.value = Bi * 100 + Bt * 10 + Bh
    qA.value = ai * 100 + at * 10 + ah
  }
  answered.value = false
  picked.value = null
  feed.value = ''
  options.value = makeOptions(qRes.value)
}

function makeOptions(ans) {
  const set = new Set([ans])
  let guard = 0
  while (set.size < 4 && guard < 300) {
    const off = -60 + Math.floor(Math.random() * 121)
    const v = ans + off
    if (v > 0 && v < 1000) set.add(v)
    guard++
  }
  let i = 1
  while (set.size < 4) {
    const v = Math.max(1, ans - i++ * 37)
    if (v > 0 && v < 1000) set.add(v)
    if (set.size === 3) set.add(Math.min(999, ans + i * 53))
  }
  return shuffle([...set])
}

function nextQuiz() {
  makeQuiz()
}
function startQuiz() {
  quiz.value = true
  makeQuiz()
}

function choose(o) {
  if (answered.value) return
  answered.value = true
  picked.value = o
  const ok = o === qRes.value
  if (ok) streak.value++
  else streak.value = 0
  buildExplain(ok)
}

function buildExplain(ok) {
  const A = splitCents(qA.value)
  const B = splitCents(qB.value)
  if (qOp.value === '+') {
    const hs = A.h + B.h
    const hc = Math.floor(hs / 10)
    const hd = hs % 10
    const ts = A.t + B.t + hc
    const tc = Math.floor(ts / 10)
    const td = ts % 10
    const id = A.int + B.int + tc
    quizCols.value = [
      { k: 'i', label: '个位', carry: tc, a: A.int, b: B.int, res: id, dot: false },
      { k: 'dot', label: '', carry: '', a: '.', b: '.', res: '.', dot: true },
      { k: 't', label: '十分位', carry: hc, a: A.t, b: B.t, res: td, dot: false },
      { k: 'h', label: '百分位', carry: 0, a: A.h, b: B.h, res: hd, dot: false }
    ]
    methodNote.value = hc || tc
      ? '小数点对齐，从最右一位加起；某一位满 10 个计数单位，就向左边进 1。'
      : '小数点对齐，从最右一位加起，这一题每一位都没有进位。'
  } else {
    quizCols.value = [
      { k: 'i', label: '个位', carry: '', a: A.int, b: B.int, res: A.int - B.int, dot: false },
      { k: 'dot', label: '', carry: '', a: '.', b: '.', res: '.', dot: true },
      { k: 't', label: '十分位', carry: '', a: A.t, b: B.t, res: A.t - B.t, dot: false },
      { k: 'h', label: '百分位', carry: '', a: A.h, b: B.h, res: A.h - B.h, dot: false }
    ]
    methodNote.value = '小数点对齐，从最右一位减起：每位的数都够减，直接相减就行。'
  }

  if (ok) {
    feed.value = `✅ 对！${fmtCents(qA.value)} ${qOp.value === '+' ? '＋' : '－'} ${fmtCents(qB.value)} ＝ ${fmtCents(qRes.value)}。`
  } else {
    feed.value = `✏️ 再按列算一算，正确答案是 ${fmtCents(qRes.value)}。`
  }
}
</script>

<style scoped>
.da-ctl { justify-content: center; margin-top: 4px; }
.ghost-b { background: #fff; border: 1.5px solid #cfc9e2; color: #5c5480; }
.da-eq { display: flex; align-items: baseline; justify-content: center; gap: 12px; margin: 18px 0 6px; flex-wrap: wrap; font-size: 20px; color: #7d6aa6; }
.da-n { font-size: 40px; font-weight: 900; }
.da-n.a { color: #6d46cf; }
.da-n.b { color: #0e9c8f; }
.da-res { font-size: 52px; font-weight: 900; color: #b3540e; }
.da-op { font-size: 26px; }
.da-sliders { display: flex; flex-direction: column; gap: 6px; max-width: 560px; margin: 12px auto 0; }
.da-slide { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #5c5480; width: 100%; }
.da-slide .frac-slider { flex: 1; width: auto; }
.da-mini { color: #6d46cf; font-weight: 800; min-width: 46px; text-align: center; font-size: 16px; }
.da-vis { display: flex; flex-direction: column; align-items: center; margin-top: 12px; }
.da-segrow { width: 100%; overflow-x: auto; display: flex; justify-content: center; }
.da-bar { position: relative; height: 44px; border-radius: 9px; overflow: hidden; background: #eceef4; min-width: 12px; }
.da-part { position: absolute; top: 0; bottom: 0; left: 0; height: 100%; display: block; }
.da-part.a { background: linear-gradient(180deg, #9b7df0, #6d46cf); }
.da-part.b { background: linear-gradient(180deg, #43c4b4, #0e9c8f); }
.da-cut {
  position: absolute; top: 0; bottom: 0; height: 100%; opacity: .5;
  background: repeating-linear-gradient(-45deg, #c9d0dd 0 6px, #8a93a5 6px 10px);
}
.da-key { display: flex; gap: 18px; flex-wrap: wrap; justify-content: center; margin-top: 8px; font-size: 13px; color: #5c5480; }
.da-ke { display: inline-block; width: 14px; height: 12px; border-radius: 3px; vertical-align: -1px; margin-right: 5px; }
.da-ke.a { background: #7a5bd8; }
.da-ke.b { background: #15a89b; }
.da-ke.cut { background: repeating-linear-gradient(-45deg, #c9d0dd 0 4px, #8a93a5 4px 7px); }
.da-tip { text-align: center; font-size: 13.5px; color: #6d5f94; margin: 12px auto 0; max-width: 640px; line-height: 1.8; }
.da-tip b { color: #b3540e; }

.da-q { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.da-qeq { display: flex; align-items: baseline; gap: 10px; font-size: 30px; font-weight: 900; margin-top: 4px; }
.da-qmark { color: #b3540e; }
.da-board { background: #faf8ff; border: 1px solid #e6defa; border-radius: 14px; padding: 12px 18px; }
.da-cols { display: flex; }
.da-col { width: 74px; text-align: center; position: relative; }
.da-col.dot { width: 30px; }
.da-h { font-size: 12px; color: #8d7fb8; font-weight: 800; margin-bottom: 4px; }
.da-carry { font-size: 12px; color: #d2691e; font-weight: 800; height: 16px; }
.da-da, .da-db, .da-dr { font-size: 21px; font-weight: 800; color: #2f2a4a; height: 28px; display: flex; justify-content: center; align-items: center; }
.da-db { color: #0e9c8f; }
.da-sign { margin-right: 5px; font-size: 16px; }
.da-line { height: 2px; background: #2f2a4a; margin: 4px 0; }
.da-dr { color: #b3540e; height: 34px; }
.da-note { font-size: 12.5px; color: #6d5f94; max-width: 480px; text-align: center; margin-top: 8px; line-height: 1.8; }
.da-opts { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.da-opt {
  min-width: 96px; border: 2px solid #ddd4f0; background: #fff; border-radius: 12px;
  padding: 11px 16px; font-size: 21px; font-weight: 800; color: #4b2d9e; cursor: pointer; transition: transform .1s;
}
.da-opt:hover { border-color: #a88dee; transform: translateY(-2px); }
.da-opt.good { background: #e5f7ee; border-color: #3fae7f; color: #1f7a54; }
.da-opt.bad { background: #fdecec; border-color: #e06868; color: #b23a3a; animation: daShake .3s; }
@keyframes daShake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
.da-feed { font-size: 15px; font-weight: 700; color: #c25f14; min-height: 24px; text-align: center; max-width: 620px; line-height: 1.7; }
.da-feed.ok { color: #1f8f5f; }
.da-next { padding: 10px 26px; font-size: 15px; border-radius: 10px; }
</style>
