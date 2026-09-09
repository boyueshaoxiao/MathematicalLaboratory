<template>
  <div>
    <div class="frac-ctl frac-ctl-center">
      <button v-for="s in shapes" :key="s.key" :class="{ active: kind === s.key }" @click="pick(s)">
        {{ s.icon }} {{ s.name }}
      </button>
    </div>

    <div class="area-grid ag-grid">
      <div class="ag-svg">
        <AreaShape :kind="kind" :p="params" :fill="fill" />
      </div>
      <div class="ag-panel">
        <h4>{{ current.name }} <span class="frac-tag">{{ current.grade }}</span></h4>
        <label v-for="d in current.params" :key="d.key" class="frac-label ag-slider">
          {{ d.label }}
          <input type="range" :min="d.min" :max="d.max" :step="d.step" v-model.number="params[d.key]" class="frac-slider" />
          <b class="frac-num">{{ params[d.key] }}</b><span class="ag-unit">cm</span>
        </label>

        <div class="ag-formula">{{ current.formula }}</div>
        <div class="ag-compute">
          <template v-if="kind === 'square'">
            S = {{ params.a }} × {{ params.a }}
          </template>
          <template v-else-if="kind === 'rect'">
            S = {{ params.a }} × {{ params.b }}
          </template>
          <template v-else-if="kind === 'para'">
            S = {{ params.a }} × {{ params.h }}
          </template>
          <template v-else-if="kind === 'tri'">
            S = {{ params.a }} × {{ params.h }} ÷ 2
          </template>
          <template v-else-if="kind === 'trap'">
            S = ({{ params.a }} + {{ params.b }}) × {{ params.h }} ÷ 2
          </template>
          <template v-else>
            S = 3.14 × {{ params.r }} × {{ params.r }}
          </template>
        </div>
        <div class="ag-result">
          S = <b>{{ areaStr }}</b> <span>cm²</span>
        </div>
        <p v-if="kind === 'circle'" class="ag-note">这里 π 取 3.14。把圆剪开拼一拼，会得到长 πr、宽 r 的长方形，见「剪拼推导」。</p>
      </div>
    </div>

    <p class="ag-tip">拖动滑块改尺寸，图形和面积会实时更新——数一数格子，面积就是格子数（每格 1 cm²）。</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AreaShape from './AreaShape.vue'
import { AREA_SHAPES, shapeByKey, fmtArea } from '../../data/area/areaUtils.js'

const shapes = AREA_SHAPES
const kind = ref('rect')
const current = computed(() => shapeByKey(kind.value))
const params = ref({})

function pick(s) {
  kind.value = s.key
  const p = {}
  for (const d of s.params) p[d.key] = d.def
  params.value = p
}
pick(current.value)

const areaStr = computed(() => fmtArea(current.value.compute(params.value)))
const fill = computed(() => ({
  square: '#bfe0ff', rect: '#ffe0b8', para: '#c8e6d2', tri: '#ffd9d9', trap: '#dcd6ff', circle: '#ffe9a8'
}[kind.value]))
</script>

<style scoped>
.area-grid { background-color: #fff; border-radius: 12px; }
.ag-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(250px, .8fr); gap: 18px; padding: 14px; align-items: center; }
.ag-svg { display: flex; justify-content: center; }
.ag-panel h4 { margin: 0 0 10px; font-size: 17px; color: #20364f; }
.ag-slider { display: flex; justify-content: space-between; margin-bottom: 8px; width: 100%; }
.ag-unit { font-size: 12px; color: #7d8b9c; }
.ag-formula { font-size: 13px; color: #5c6b80; background: #f4f7fb; border-radius: 8px; padding: 6px 10px; margin: 8px 0 6px; }
.ag-compute { font-size: 15px; color: #44566c; }
.ag-result { font-size: 15px; color: #44566c; margin-top: 6px; }
.ag-result b { font-size: 34px; color: #2c6ec4; margin: 0 4px; }
.ag-result span { color: #7d8b9c; }
.ag-note { font-size: 12.5px; color: #8a7a5a; background: #fff6e2; border: 1px solid #f3e4c4; border-radius: 8px; padding: 7px 10px; line-height: 1.7; margin: 10px 0 0; }
.ag-tip { text-align: center; font-size: 13px; color: #7d8b9c; margin: 12px 0 0; }
@media (max-width: 800px) { .ag-grid { grid-template-columns: 1fr; } }
</style>
