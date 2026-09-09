<template>
  <div>
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: !challenge }" @click="modeExplore">🔍 探索：点一块看一看</button>
        <button :class="{ active: challenge }" @click="modeChallenge">🎯 挑战：找出所有等值块</button>
      </div>
      <span v-if="challenge" class="frac-score">已找 {{ foundCount }} / {{ totalCount }}</span>
    </div>

    <!-- 挑战目标横幅 -->
    <div v-if="challenge" class="frac-task-band">
      <span>在墙上找出所有等于</span>
      <Fraction :m="target[0]" :n="target[1]" small />
      <span>的块（写法不同、大小相同的分数）</span>
    </div>

    <p class="frac-tip-sm">每行把一个整体平均分成不同的份数。横向看：等分越多，一块越短；竖向比：同一列里的块大小一样。</p>

    <!-- 分数墙 -->
    <div class="frac-wall">
      <div v-for="d in ROWS" :key="d" class="wall-row">
        <div class="wall-lab">{{ d }} 份</div>
        <div class="wall-grid" :style="{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }">
          <button v-for="i in d" :key="i" class="wcell"
            :class="cellClass(d, i - 1)"
            :style="{ gridColumn: `span ${GRID / d}` }"
            @click="tap(d, i - 1)"
            :title="`${i}/${d} = ${(i / d).toFixed(3)}`" />
        </div>
      </div>
    </div>

    <!-- 反馈 -->
    <p v-if="!challenge && sel" class="frac-read-line">
      你点了 <b>{{ sel[0] }}/{{ sel[1] }}</b>（{{ selZh }}），墙上{{ sameList.length }}块和它大小相等：
      <span v-for="s in sameList" :key="`${s[1]}-${s[0]}`" class="frac-eq-chip">{{ s[0] }}/{{ s[1] }}</span>
      —— 分数写成不同样子，数量却一样多！
    </p>
    <p v-else-if="!challenge" class="frac-read-line frac-muted">点任意一块，看它和其它行哪些块一样大。</p>
    <p v-if="challenge" class="frac-read-line" :class="{ 'frac-good': success }">
      {{ feed }}
    </p>
    <div v-if="challenge && success" class="frac-ctl frac-ctl-center">
      <button class="frac-btn-main" @click="newTarget">下一题</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Fraction from './Fraction.vue'
import { fracReadZh, simplify } from '../../data/fractions/fracUtils.js'

const GRID = 12
const ROWS = [2, 3, 4, 6, 12]
const challenge = ref(false)
const sel = ref(null) // [i, d] 当前点选块
const target = ref([1, 2])
const found = ref([]) // 已找到的等值块 [i, d]
const feed = ref('')
const wrong = ref(null) // 最近点错的块
const success = ref(false)

function valOf(i, d) { return i / d }
function isSameVal(i, d, x, y) { return i * y === x * d }

// 目标分数的所有等值块
const targetBlocks = computed(() => {
  const [x, y] = target.value
  const out = []
  ROWS.forEach(d => {
    for (let i = 1; i < d; i++) if (isSameVal(i, d, x, y)) out.push([i, d])
  })
  return out
})
const totalCount = computed(() => targetBlocks.value.length)
const foundCount = computed(() => found.value.length)

// 探索模式：点击块的等值集合
const sameList = computed(() => {
  if (!sel.value) return []
  const [i, d] = sel.value
  const out = []
  ROWS.forEach(dd => {
    for (let ii = 1; ii < dd; ii++) if (isSameVal(ii, dd, i, d)) out.push([ii, dd])
  })
  return out
})
const selZh = computed(() => sel.value ? fracReadZh(...sel.value) : '')

function cellClass(d, i) {
  const cls = []
  if (challenge.value) {
    const isT = targetBlocks.value.some(([x, y]) => x === i && y === d)
    const isF = found.value.some(([x, y]) => x === i && y === d)
    if (isF) cls.push('ok')
    else if (wrong.value && wrong.value[0] === i && wrong.value[1] === d) cls.push('wrong')
    else if (isT) cls.push('target')
    return cls
  }
  if (sel.value && isSameVal(i, d, ...sel.value)) cls.push('sel-same')
  if (sel.value && sel.value[0] === i && sel.value[1] === d) cls.push('sel')
  return cls
}

function tap(d, i) {
  if (!challenge.value) {
    sel.value = [i, d]
    return
  }
  wrong.value = null
  if (found.value.some(([x, y]) => x === i && y === d)) return
  if (isSameVal(i, d, ...target.value)) {
    found.value.push([i, d])
    feed.value = `✅ ${i}/${d} 和 ${target.value[0]}/${target.value[1]} 一样大（还剩 ${totalCount.value - found.value.length} 个）`
    if (found.value.length === totalCount.value) {
      success.value = true
      feed.value = `🎉 全找到了！${target.value[0]}/${target.value[1]} 有 ${totalCount.value} 种写法，它们都一样大。`
    }
  } else {
    wrong.value = [i, d]
    feed.value = `再想想：${i}/${d} 和 ${target.value[0]}/${target.value[1]} 不一样大`
  }
}

function newTarget() {
  // 随机挑一个墙上的块，作为目标（保证墙上必有等值块）
  const d = ROWS[Math.floor(Math.random() * ROWS.length)]
  const i = 1 + Math.floor(Math.random() * (d - 1))
  target.value = simplify(i, d)
  found.value = []
  feed.value = ''
  success.value = false
  wrong.value = null
}

function modeExplore() {
  challenge.value = false
  sel.value = null
}
function modeChallenge() {
  challenge.value = true
  newTarget()
}
</script>

<style scoped>
.frac-tip-sm { text-align: center; font-size: 12.5px; color: #8593a4; margin: 10px 0 4px; }
.frac-wall { display: flex; flex-direction: column; gap: 4px; margin: 6px auto; max-width: 620px; }
.wall-row { display: grid; grid-template-columns: 58px 1fr; align-items: stretch; gap: 8px; }
.wall-lab { display: flex; align-items: center; justify-content: flex-end; font-size: 12px; color: #7d8b9c; }
.wall-grid { display: grid; gap: 2px; }
.wcell {
  border: 0; border-radius: 5px; background: #ffe3bd; height: 36px; cursor: pointer;
  transition: transform .08s;
}
.wcell:hover { filter: brightness(1.06); }
.wcell.sel { background: #f0943f; box-shadow: 0 0 0 2px #c25f14; }
.wcell.sel-same { background: #4e9e7c; box-shadow: 0 0 0 2px #2f7a5e; }
.wcell.target { background: #ffe3bd; outline: 1.5px dashed #f0943f; }
.wcell.ok { background: #2f9e6e; box-shadow: 0 0 0 1.5px #1e7a52; }
.wcell.wrong { background: #e05d5d; animation: fracShake .3s; }
.frac-task-band {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: #f0f7ff; border: 1px solid #d8e7fb; border-radius: 12px; padding: 9px 14px;
  font-size: 15px; color: #3d4f66;
}
.frac-read-line { text-align: center; font-size: 15px; color: #3d4f66; line-height: 1.9; margin: 14px auto 0; max-width: 640px; }
.frac-read-line b { color: #c25f14; }
.frac-muted { color: #93a0af; }
.frac-eq-chip {
  display: inline-block; background: #e7f6ee; color: #1e7a52; font-weight: 800;
  border-radius: 20px; padding: 2px 10px; margin: 0 3px;
}
.frac-ctl-center { justify-content: center; margin-top: 12px; }
</style>
