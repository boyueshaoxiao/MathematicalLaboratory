<template>
  <div>
    <!-- 题目横幅 -->
    <div class="frac-task-band og-band">
      <span>一共有 <b>{{ N }}</b> 个苹果，平均分成 <b>{{ b }}</b> 份，每份 <b>{{ per }}</b> 个。
        取其中的 <b>{{ a }}</b> 份，就是求 {{ N }} 的</span>
      <Fraction :m="a" :n="b" small />
      <span>是多少个？</span>
    </div>

    <!-- 步骤 -->
    <div class="frac-ctl frac-ctl-center og-stepbar">
      <button class="frac-btn-main" :disabled="step > 0" @click="step = 1">① 分一分：分成 {{ b }} 份</button>
      <button class="frac-btn-main" :disabled="step !== 1 || picked !== a" @click="step = 2">
        ② 点选要取的 {{ a }} 份 {{ picked === a ? '✓' : `（已选 ${picked}）` }}</button>
      <button class="frac-btn-main" :disabled="step !== 2" @click="step = 3">③ 数一数共有几个</button>
    </div>

    <!-- 每份一行 -->
    <div class="og-area">
      <div v-for="(g, gi) in b" :key="gi" class="og-group"
        :class="{ picked: pickedSet.has(gi), dim: step >= 2 && !pickedSet.has(gi) }"
        @click="toggleGroup(gi)">
        <span class="og-glab">第 {{ gi + 1 }} 份</span>
        <div class="og-cells">
          <span v-for="j in per" :key="j" class="og-cell" :class="{ count: step >= 3 && pickedSet.has(gi) }" />
        </div>
      </div>
    </div>

    <!-- 引导文字 -->
    <p class="og-flow">
      <template v-if="step === 0">点「分一分」：{{ N }} 个苹果要平均分成 {{ b }} 份。</template>
      <template v-else-if="step === 1">
        每份有 <b>{{ per }}</b> 个苹果，共 <b>{{ b }}</b> 份。
        点击份量把它选走，选出 <b>{{ a }}</b> 份（{{ picked }} / {{ a }}）。
      </template>
      <template v-else-if="step === 2">
        已经选好 {{ a }} 份，每份 {{ per }} 个。来数一数一共有多少个？
      </template>
      <template v-else>
        每份 {{ per }} 个，{{ a }} 份就是 {{ a }} × {{ per }}。
      </template>
    </p>

    <!-- 答案揭示 -->
    <div v-if="step >= 3" class="og-answer">
      <span class="og-answer-num">{{ selectedCount }} 个</span>
      <span class="og-answer-explain">
        = {{ a }} 份 × 每份 {{ per }} 个 = {{ a }} × {{ per }} = {{ selectedCount }}<br>
        所以 {{ N }} 的 {{ a }}/{{ b }} = <b>{{ selectedCount }}</b>
      </span>
    </div>

    <div class="frac-ctl frac-ctl-center og-nextbar">
      <button class="frac-btn-main" @click="next">🔄 换一题</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Fraction from './Fraction.vue'

// [总数 N, 分母 b]，要求 N 能被 b 整除
const POOLS = [
  [12, 3], [12, 4], [16, 4], [15, 3], [16, 8], [20, 5],
  [18, 3], [20, 4], [24, 6], [24, 4], [24, 8], [10, 5], [8, 4], [14, 7]
]
const N = ref(12)
const b = ref(3)
const a = ref(1)
const step = ref(0) // 0 未分 | 1 已分 | 2 已取 a 份 | 3 已数
const pickedSet = ref(new Set())
const picked = computed(() => pickedSet.value.size)
const per = computed(() => N.value / b.value)
const selectedCount = computed(() => a.value * per.value)

function next() {
  const pick = POOLS[Math.floor(Math.random() * POOLS.length)]
  N.value = pick[0]
  b.value = pick[1]
  a.value = 1 + Math.floor(Math.random() * (b.value - 1)) // 1..b-1 份
  step.value = 0
  pickedSet.value = new Set()
}

function toggleGroup(gi) {
  if (step.value !== 1) return
  const s = new Set(pickedSet.value)
  if (s.has(gi)) s.delete(gi)
  else s.add(gi)
  pickedSet.value = s
}
</script>

<style scoped>
.frac-task-band {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  background: #f0f7ff; border: 1px solid #d8e7fb; border-radius: 12px; padding: 9px 14px;
  font-size: 15px; color: #3d4f66; flex-wrap: wrap;
}
.og-band b { color: #c25f14; }
.og-stepbar { gap: 8px; }
.og-stepbar button:disabled { opacity: .45; cursor: not-allowed; }
.og-area { display: flex; flex-direction: column; gap: 8px; max-width: 660px; margin: 16px auto 0; }
.og-group {
  display: flex; align-items: center; gap: 12px; padding: 6px 10px;
  border: 2px solid transparent; border-radius: 12px; cursor: pointer;
}
.og-group.picked { border-color: #f0943f; background: #fff3e4; }
.og-group.dim .og-cells { opacity: .3; }
.og-glab { flex: 0 0 74px; font-size: 12.5px; color: #7d8b9c; }
.og-cells { display: flex; gap: 6px; flex-wrap: wrap; }
.og-cell {
  width: 40px; height: 40px; border-radius: 9px; background: #ffe9cf;
  border: 1.5px solid #f3cfa2; transition: transform .1s;
}
.og-group.picked .og-cell { background: #f0943f; border-color: #c25f14; }
.og-group.picked .og-cell.count { background: #ef6b7b; animation: ogPop .3s; }
.og-group:hover .og-cell { transform: translateY(-1px); }
@keyframes ogPop { 0% { transform: scale(1); } 50% { transform: scale(1.18); } 100% { transform: scale(1); } }
.og-flow { text-align: center; font-size: 15px; color: #3d4f66; line-height: 1.9; max-width: 620px; margin: 16px auto 0; }
.og-flow b { color: #c25f14; }
.og-answer { display: flex; gap: 18px; align-items: center; justify-content: center; margin: 14px auto 0; flex-wrap: wrap; }
.og-answer-num { font-size: 34px; font-weight: 800; color: #fff; background: #2f9e6e; border-radius: 14px; padding: 8px 22px; }
.og-answer-explain { font-size: 14px; color: #4c5d72; line-height: 1.9; }
.og-answer-explain b { color: #2f9e6e; font-size: 17px; }
.og-nextbar { margin-top: 16px; }
</style>
