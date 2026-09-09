<template>
  <div>
    <div class="frac-ctl frac-ctl-center">
      <button :class="{ active: kind === 'square' }" @click="pick('square')">▢ 正方形</button>
      <button :class="{ active: kind === 'rect' }" @click="pick('rect')">▭ 长方形</button>
    </div>

    <div class="area-grid at-grid">
      <div class="at-left">
        <div class="at-legend"><i class="at-sw"></i>每小格代表 1 cm²</div>
        <svg :viewBox="`0 0 ${VBW} ${VBH}`" class="at-svg">
          <rect x="3" y="3" :width="VBW - 6" :height="VBH - 6" rx="12" fill="#ffffff" stroke="#e5ecf4" />
          <template v-for="r in rows" :key="'r' + r">
            <rect v-for="c in cols" :key="'c' + c"
              :x="ox + (c - 1) * CELL + .75" :y="oy + (r - 1) * CELL + .75"
              :width="CELL - 1.5" :height="CELL - 1.5" rx="2"
              :class="['at-c', { on: isOn(r - 1, c - 1) }]" @click="tap(r - 1, c - 1)" />
          </template>

          <!-- 底边：长/边长 尺寸线 -->
          <g v-if="cols * rows > 0">
            <line :x1="ox" :y1="bottomY" :x2="ox + cols * CELL" :y2="bottomY" stroke="#5c6b7e" stroke-width="1.2" />
            <line :x1="ox" :y1="bottomY - 5" :x2="ox" :y2="bottomY + 5" stroke="#5c6b7e" stroke-width="1.2" />
            <line :x1="ox + cols * CELL" :y1="bottomY - 5" :x2="ox + cols * CELL" :y2="bottomY + 5" stroke="#5c6b7e" stroke-width="1.2" />
            <text :x="ox + cols * CELL / 2" :y="bottomY + 22" class="at-dim" text-anchor="middle">{{ bottomTxt }}</text>
          </g>
          <!-- 右侧：宽 尺寸线（仅长方形） -->
          <g v-if="kind === 'rect' && cols * rows > 0">
            <line :x1="rightX" :y1="oy" :x2="rightX" :y2="oy + rows * CELL" stroke="#5c6b7e" stroke-width="1.2" />
            <line :x1="rightX - 5" :y1="oy" :x2="rightX + 5" :y2="oy" stroke="#5c6b7e" stroke-width="1.2" />
            <line :x1="rightX - 5" :y1="oy + rows * CELL" :x2="rightX + 5" :y2="oy + rows * CELL" stroke="#5c6b7e" stroke-width="1.2" />
            <text :x="rightX + 12" :y="oy + rows * CELL / 2 + 5" class="at-dim" text-anchor="start">{{ rows }} cm</text>
          </g>
        </svg>
      </div>

      <div class="at-panel">
        <h4>{{ kindName }}·铺格子 <span class="frac-tag">三年级</span></h4>

        <label v-for="d in sliders" :key="d.key" class="frac-label at-slider">
          {{ d.label }}
          <input type="range" :min="d.min" :max="d.max" step="1" v-model.number="p[d.key]" class="frac-slider" @input="onDim" />
          <b class="frac-num">{{ p[d.key] }}</b><span class="at-unit">cm</span>
        </label>

        <div class="at-progress">
          <div class="at-prog-bar"><i :style="{ width: pct + '%' }"></i></div>
          <span class="at-prog-txt">{{ count }} / {{ total }} 格</span>
        </div>

        <div class="at-guide" :class="{ full: done }">
          <template v-if="done">✅ 铺满啦!共有 {{ rows }} 行,每行 {{ cols }} 格 → {{ cols }} × {{ rows }} = {{ total }} 格</template>
          <template v-else-if="count === 0">点一下任意小格就铺上一格;或者用「自动铺满」——一格一格数着铺。</template>
          <template v-else>已经铺了 {{ count }} 格 = {{ count }} cm²,继续把剩下的铺满!</template>
        </div>

        <div class="at-formula" v-if="done">
          S = {{ cols }} × {{ rows }} = <b>{{ total }}</b> cm²
        </div>
        <div class="at-why" v-if="done">
          每行 {{ cols }} 格,铺 {{ rows }} 行 —— 面积就是“长 × 宽”。
        </div>

        <div class="at-btns">
          <button class="frac-btn-main" @click="auto" :disabled="autoOn">
            {{ autoOn ? '铺着…' : done ? '↻ 再铺一遍' : '⚡ 自动铺满' }}
          </button>
          <button class="frac-btn-main ghost-b" @click="clear">🧹 清空重来</button>
        </div>
      </div>
    </div>

    <p class="at-tip">用手一格一格点着数,再和旁边自动算出来的乘法比一比 —— 面积单位 cm² 的来历就是这样。</p>
  </div>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from 'vue'

const VBW = 460
const VBH = 312
const CELL = 26
const DEFS = { square: { a: 5 }, rect: { a: 6, b: 4 } }

const kind = ref('rect')
const p = ref({ ...DEFS.rect })

const cols = computed(() => p.value.a)
const rows = computed(() => (kind.value === 'square' ? p.value.a : p.value.b))
const total = computed(() => cols.value * rows.value)
const ox = computed(() => (VBW - cols.value * CELL) / 2)
const oy = computed(() => (VBH - rows.value * CELL) / 2)
const bottomY = computed(() => oy.value + rows.value * CELL + 14)
const rightX = computed(() => ox.value + cols.value * CELL + 16)

const kindName = computed(() => (kind.value === 'square' ? '正方形' : '长方形'))
const sliders = computed(() =>
  kind.value === 'square'
    ? [{ key: 'a', label: '边长', min: 2, max: 8 }]
    : [
        { key: 'a', label: '长', min: 3, max: 8 },
        { key: 'b', label: '宽', min: 2, max: 6 }
      ])
const bottomTxt = computed(() => (kind.value === 'square' ? `边长 ${cols.value} cm` : `长 ${cols.value} cm`))

const filled = ref([])
const autoOn = ref(false)
let timer = null

function syncLen() {
  if (filled.value.length === total.value) return
  filled.value = new Array(total.value).fill(0)
}
function clear() {
  stopAuto()
  filled.value = new Array(total.value).fill(0)
}
const count = computed(() => filled.value.reduce((s, x) => s + x, 0))
const done = computed(() => total.value > 0 && count.value === total.value)
const pct = computed(() => (total.value ? Math.round(count.value * 100 / total.value) : 0))
const isOn = (r, c) => !!filled.value[r * cols.value + c]

function tap(r, c) {
  stopAuto()
  if (done.value) return
  const i = r * cols.value + c
  filled.value[i] = filled.value[i] ? 0 : 1
}
function auto() {
  if (autoOn.value) return
  if (done.value) clear()
  syncLen()
  autoOn.value = true
  timer = setInterval(() => {
    const idx = filled.value.findIndex(x => !x)
    if (idx === -1) { stopAuto(); return }
    filled.value[idx] = 1
  }, 55)
}
function stopAuto() {
  if (timer) { clearInterval(timer); timer = null }
  autoOn.value = false
}
function pick(k) {
  kind.value = k
  p.value = { ...DEFS[k] }
  clear()
}
function onDim() { clear() }

watch([cols, rows], () => clear())
watch(() => p.value.a, () => {
  if (kind.value === 'square' && p.value.b !== p.value.a) p.value.b = p.value.a
})
onBeforeUnmount(() => stopAuto())
</script>

<style scoped>
.at-grid { align-items: stretch; }
.at-left { padding: 8px; }
.at-legend { font-size: 12.5px; color: #7d8b9c; display: flex; align-items: center; gap: 6px; padding: 2px 4px; }
.at-sw { width: 14px; height: 14px; border-radius: 3px; background: #ffb84d; border: 1px solid #e09c2e; display: inline-block; }
.at-svg { width: 100%; max-width: 470px; display: block; margin: 0 auto; }
.at-c { fill: #f9fbff; stroke: #dbe4ef; stroke-width: 1.2; cursor: pointer; }
.at-c:hover { fill: #fff1d6; }
.at-c.on { fill: #ffb84d; stroke: #e7a23a; }
.at-dim { font-size: 13.5px; font-weight: 800; fill: #20364f; paint-order: stroke; stroke: rgba(255, 255, 255, .95); stroke-width: 4px; }
.at-panel { padding: 6px 8px 6px 0; }
.at-panel h4 { margin: 0 0 12px; font-size: 17px; color: #20364f; }
.at-slider { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; width: 100%; }
.at-unit { font-size: 12px; color: #7d8b9c; }
.at-progress { display: flex; align-items: center; gap: 8px; margin: 6px 0 8px; }
.at-prog-bar { flex: 1; height: 8px; background: #eef2f8; border-radius: 5px; overflow: hidden; }
.at-prog-bar i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #ffb84d, #ff8f3d); border-radius: 5px; transition: width .15s; }
.at-prog-txt { font-size: 12.5px; font-weight: 800; color: #c25f14; }
.at-guide { font-size: 13.5px; color: #44566c; line-height: 1.8; background: #f4f7fb; border-radius: 9px; padding: 8px 11px; min-height: 46px; }
.at-guide.full { background: #e7f6ee; color: #1e7a52; }
.at-formula { font-size: 19px; color: #44566c; margin-top: 10px; }
.at-formula b { font-size: 30px; color: #2c6ec4; margin: 0 3px; }
.at-why { font-size: 13px; color: #2f9e6e; font-weight: 700; margin-top: 3px; }
.at-btns { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.ghost-b { background: #fff; border: 1.5px solid #cfd9e6; color: #5c6b80; }
.ghost-b:hover { border-color: #f0943f; color: #c25f14; }
.at-tip { text-align: center; font-size: 13px; color: #7d8b9c; margin: 12px 0 0; }
@media (max-width: 800px) {
  .at-grid { grid-template-columns: 1fr !important; }
  .at-panel { padding: 2px 4px; }
}
</style>
