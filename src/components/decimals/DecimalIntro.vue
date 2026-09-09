<template>
  <div class="di-wrap">
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: !quizMode }" @click="quizMode = false">🔍 看一看</button>
        <button :class="{ active: quizMode }" @click="startQuiz">🎯 考一考</button>
      </div>
      <span v-if="quizMode" class="frac-score">连续答对 {{ streak }} 题</span>
    </div>

    <!-- 看一看：调整数字，看位值拆分 -->
    <template v-if="!quizMode">
      <div class="frac-ctl di-ctl">
        <button class="frac-btn-main" @click="randomize">🎲 换一个数</button>
        <label class="frac-label di-slider">
          值
          <input type="range" min="1" max="999" step="1" v-model.number="cents" class="frac-slider" />
          <b class="di-accent">{{ fmtCents(cents) }}</b>
        </label>
      </div>

      <div class="di-big">
        <div class="di-big-num">{{ fmtCents(cents) }}</div>
        <div class="di-big-read">读作：{{ readCents(cents) }}</div>
      </div>

      <div class="di-note di-formula">{{ fmtCents(cents) }} = {{ formula }}</div>
      <div class="di-words">也就是 <b>{{ partsText }}</b></div>

      <DecFigure :cents="cents" show-labels />
    </template>

    <!-- 考一考：看图形，读出它是多少 -->
    <template v-else>
      <div class="di-quiz">
        <div class="di-task">下面的图形合起来是多少？</div>
        <DecFigure :cents="quizCents" />
        <div class="di-opts">
          <button v-for="o in options" :key="o" class="di-opt"
            :class="{ good: answered && o === quizCents, bad: answered && o === picked && o !== quizCents }"
            @click="choose(o)">{{ fmtCents(o) }}</button>
        </div>
        <div class="di-feed" :class="{ ok: lastOk }">{{ feed }}</div>
        <button v-if="answered" class="frac-btn-main di-next" @click="nextQuiz">下一题</button>
      </div>
    </template>

    <p class="di-tip">💡 一行一行看：1 拆成 10 个 0.1，0.1 再拆成 10 个 0.01——每往后一位就缩小 10 倍。</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import DecFigure from './DecFigure.vue'
import { fmtCents, readCents, splitCents, randomTenths, randomHundredths, shuffle } from '../../data/decimals/decUtils.js'

const cents = ref(265)
const quizMode = ref(false)
const quizCents = ref(37)
const options = ref([37, 25, 63, 80])
const answered = ref(false)
const picked = ref(null)
const streak = ref(0)
const lastOk = ref(true)
const feed = ref('')

const formula = computed(() => {
  const { int, t, h } = splitCents(cents.value)
  const parts = []
  if (int) parts.push(`${int} × 1`)
  if (t) parts.push(`${t} × 0.1`)
  if (h) parts.push(`${h} × 0.01`)
  return parts.length ? parts.join(' + ') : '0'
})
const partsText = computed(() => partsTextOf(cents.value))

function partsTextOf(c) {
  const { int, t, h } = splitCents(c)
  const arr = []
  if (int) arr.push(`${int} 个一`)
  if (t) arr.push(`${t} 个十分之一`)
  if (h) arr.push(`${h} 个百分之一`)
  return arr.length ? arr.join('、') : '0'
}

function randomize() {
  cents.value = 1 + Math.floor(Math.random() * 999)
}

function newQuizCents() {
  return Math.random() < 0.45 ? randomTenths(2) : randomHundredths(2)
}

function nextQuiz() {
  const ans = newQuizCents()
  quizCents.value = ans
  const set = new Set([ans])
  let guard = 0
  while (set.size < 4 && guard < 200) {
    set.add(newQuizCents())
    guard++
  }
  let tail = ans + 11
  while (set.size < 4) set.add(((tail++ % 999) || 1))
  options.value = shuffle([...set])
  answered.value = false
  picked.value = null
  feed.value = ''
  lastOk.value = true
}

function startQuiz() {
  quizMode.value = true
  nextQuiz()
}

function choose(o) {
  if (answered.value) return
  answered.value = true
  picked.value = o
  const ok = o === quizCents.value
  lastOk.value = ok
  if (ok) {
    streak.value++
    feed.value = `✅ 对！这些图形合起来就是 ${fmtCents(quizCents.value)}，读作 ${readCents(quizCents.value)}。`
  } else {
    streak.value = 0
    feed.value = `✏️ 再数数：从左到右先整数、再 0.1、后 0.01。正确答案是 ${fmtCents(quizCents.value)}。`
  }
}
</script>

<style scoped>
.di-ctl { justify-content: center; margin-top: 4px; }
.di-slider { gap: 8px; }
.di-slider .frac-slider { width: 200px; }
.di-accent { font-size: 20px; color: #6d46cf; min-width: 52px; text-align: center; }
.di-big { display: flex; align-items: baseline; justify-content: center; gap: 18px; margin: 16px 0 6px; flex-wrap: wrap; }
.di-big-num { font-size: 56px; font-weight: 900; color: #4b2d9e; letter-spacing: 1px; }
.di-big-read { font-size: 19px; color: #6d46cf; font-weight: 700; }
.di-note { margin: 4px auto 10px; }
.di-formula {
  width: fit-content; padding: 6px 14px; border-radius: 99px;
  background: #f3edff; color: #6d46cf; font-size: 16px; font-weight: 700;
}
.di-words { text-align: center; font-size: 14px; color: #4b3a7a; margin: 0 0 12px; }
.di-words b { color: #6d46cf; }
.di-tip { text-align: center; color: #8a7ba5; font-size: 13px; margin: 16px 0 0; }

.di-quiz { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.di-task { font-size: 17px; font-weight: 800; color: #3d2c66; }
.di-opts { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
.di-opt {
  min-width: 96px; border: 2px solid #ddd4f0; background: #fff; border-radius: 12px;
  padding: 12px 18px; font-size: 22px; font-weight: 800; color: #4b2d9e; cursor: pointer; transition: transform .1s;
}
.di-opt:hover { border-color: #a88dee; transform: translateY(-2px); }
.di-opt.good { background: #e5f7ee; border-color: #3fae7f; color: #1f7a54; }
.di-opt.bad { background: #fdecec; border-color: #e06868; color: #b23a3a; animation: diShake .3s; }
@keyframes diShake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-5px) } 75% { transform: translateX(5px) } }
.di-feed { font-size: 15px; font-weight: 700; color: #d2691e; min-height: 24px; text-align: center; }
.di-feed.ok { color: #1f8f5f; }
.di-next { padding: 10px 26px; font-size: 15px; border-radius: 10px; }
</style>
