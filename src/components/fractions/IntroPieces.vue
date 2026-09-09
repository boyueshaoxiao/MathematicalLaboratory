<template>
  <div>
    <!-- 控制条：自由 / 出题模式 + 形状切换 -->
    <div class="frac-toolbar">
      <div class="frac-seg">
        <button :class="{ active: shape === 'pie' }" @click="setShape('pie')">🍰 圆饼</button>
        <button :class="{ active: shape === 'bar' }" @click="setShape('bar')">🍫 长条</button>
        <button :class="{ active: shape === 'dots' }" @click="setShape('dots')">🍬 糖豆</button>
      </div>
      <div class="frac-seg">
        <button :class="{ active: !task }" @click="startFree">自由摆一摆</button>
        <button :class="{ active: task }" @click="startTask">挑战：涂出指定分数</button>
      </div>
      <span v-if="doneCount" class="frac-score">✅ 连续答对 {{ doneCount }} 题</span>
    </div>

    <!-- 大图形 -->
    <div class="frac-figure">
      <template v-if="shape === 'pie'">
        <FracPie :n="n" :m="freeM" :states="task ? states : null" :clickable="task"
          :size="Math.min(330, 340)" @tap="tap" />
      </template>
      <template v-else-if="shape === 'bar'">
        <FracBar :n="n" :m="freeM" :states="task ? states : null" :clickable="task" :width="620" :height="70" @tap="tap" />
      </template>
      <div v-else class="frac-dots" :style="{ maxWidth: '620px' }">
        <button v-for="(on, i) in dotStates" :key="i" class="frac-dot"
          :class="{ on, good: task && on, bad: tapWrong === i }"
          @click="tap(i)" :aria-label="`第 ${i + 1} 颗`" />
      </div>
    </div>

    <!-- 任务横幅（出题时显示目标） -->
    <div v-if="task" class="frac-task-band">
      <span>涂出</span>
      <Fraction :n="n" :m="targetM" small />
      <span class="frac-step-note">{{ feed }}</span>
    </div>

    <!-- 读数面板 -->
    <div v-if="!task" class="frac-readout">
      <Fraction :n="n" :m="m" />
      <div class="frac-read-text">
        <p class="frac-chinese">读作：<b>{{ zh }}</b></p>
        <p class="frac-explain">
          {{ shape === 'pie' ? '把 1 个圆饼' : shape === 'bar' ? '把 1 条巧克力' : '把 1 盒糖豆' }}
          平均分成 <b>{{ n }}</b> 份，每份是它的
          <b>1/{{ n }}</b>，涂了这样的 <b>{{ m }}</b> 份，就是 <b>{{ zh }}</b>。
        </p>
      </div>
    </div>

    <!-- 自由模式滑块 -->
    <div v-if="!task" class="frac-ctl frac-ctl-center">
      <label class="frac-label">
        平均分成 <b>{{ n }}</b> 份
        <input class="frac-slider" type="range" min="2" max="12" v-model.number="n" />
      </label>
      <label class="frac-label">
        涂色 <b class="frac-num">{{ m }}</b> 份
        <input class="frac-slider" type="range" min="1" :max="n" v-model.number="m" />
      </label>
      <button v-if="m === n" class="frac-btn-main" @click="half">减一半，再分一分</button>
    </div>
    <div v-else class="frac-ctl frac-ctl-center">
      <button class="frac-btn-main" @click="startTask">下一题</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import FracPie from './FracPie.vue'
import FracBar from './FracBar.vue'
import Fraction from './Fraction.vue'
import { fracReadZh, randomFraction } from '../../data/fractions/fracUtils.js'

const shape = ref('pie')
const task = ref(false)
// 自由模式：n 总份数，m 涂色份数
const n = ref(4)
const m = ref(3)
const freeM = computed(() => Math.min(m.value, n.value))
// 任务模式：states 记录每份是否涂色
const targetM = ref(3)
const states = ref([])
const feed = ref('')
const tapWrong = ref(-1)
const doneCount = ref(0)

const zh = computed(() => fracReadZh(m.value, n.value))

function setShape(s) {
  shape.value = s
  if (task.value) resetPainted()
}

function startFree() {
  task.value = false
  m.value = Math.min(m.value, n.value)
}

function newStates(len) {
  states.value = Array.from({ length: len }, () => false)
}

// 糖豆视图：任务模式用点选状态，自由模式按 m 涂前 m 颗
const dotStates = computed(() =>
  task.value ? states.value : Array.from({ length: n.value }, (_, i) => i < m.value)
)

function startTask() {
  task.value = true
  shape.value = 'pie' // 挑战默认用圆饼最直观
  n.value = 2 + Math.floor(Math.random() * 5) // 2~6 等分，低门槛
  targetM.value = 1 + Math.floor(Math.random() * (n.value - 1))
  newStates(n.value)
  feed.value = ''
}

function resetPainted() { newStates(n.value) }

function tap(i) {
  if (!task.value) return
  const next = [...states.value]
  next[i] = !next[i]
  states.value = next
  tapWrong.value = -1
  const got = next.filter(Boolean).length
  if (got === targetM.value) {
    feed.value = `✅ 正确！涂了 ${targetM.value} 个 1/${n.value}，合起来就是 ${targetM.value}/${n.value}。`
    doneCount.value++
  } else if (got < targetM.value) {
    feed.value = `还差 ${targetM.value - got} 份，再点 ${targetM.value - got} 份～`
  } else {
    feed.value = `多了 ${got - targetM.value} 份，点掉多余的`
    tapWrong.value = -1
  }
}

function half() {
  const g = gcd2(m.value, n.value)
  m.value = m.value / g
  n.value = n.value / g
}

function gcd2(a, b) {
  while (b) { [a, b] = [b, a % b] }
  return a || 1
}

// 切换形状时不改变分数值
watch(n, () => { m.value = Math.min(m.value, n.value) })
</script>

<style scoped>
.frac-task-band {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  background: #f0f7ff; border: 1px solid #d8e7fb; border-radius: 12px;
  padding: 10px 16px; margin: 0 0 8px;
}
.frac-task-band .frac-step-note { margin: 0; }
.frac-ctl-center { justify-content: center; margin-top: 14px; }
.frac-readout { display: flex; gap: 26px; align-items: center; justify-content: center; flex-wrap: wrap; }
.frac-read-text { max-width: 430px; }
.frac-read-text p { margin: 8px 0; }
.frac-chinese { font-size: 20px; color: #20364f; }
.frac-chinese b { color: #c25f14; }
.frac-explain { font-size: 15px; line-height: 1.9; color: #4c5d72; }
.frac-explain b { color: #2c6ec4; }
</style>
