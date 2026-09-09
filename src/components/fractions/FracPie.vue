<template>
  <div class="fp-wrap" :style="{ width: size + 'px' }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" role="img"
      :aria-label="`${n} 等分、涂 ${count()} 份的圆饼`">
      <polygon v-for="(sl, i) in slices" :key="i"
        :points="sl.pts" :fill="sl.on ? fillColor : baseColor"
        :stroke="sl.on ? fillEdge : edgeColor" stroke-width="2"
        :class="{ 'fp-slice': true, clickable }"
        @click="tap(i)" @keydown.enter="tap(i)" :tabindex="clickable ? 0 : -1"
        :title="clickable ? `第 ${i + 1} 份` : ''" />
      <circle :cx="size / 2" :cy="size / 2" :r="size / 2 - 1" fill="none"
        stroke="#e5c9a0" stroke-width="1.5" pointer-events="none" />
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  n: { type: Number, default: 4 },
  // 直接指定涂色状态（任意份）；缺省时取前 m 份
  states: { type: Array, default: null },
  m: { type: Number, default: 1 },
  size: { type: Number, default: 250 },
  clickable: { type: Boolean, default: false },
  fillColor: { type: String, default: '#5b8def' },
  baseColor: { type: String, default: '#fff3e0' },
  edgeColor: { type: String, default: '#fff' },
  fillEdge: { type: String, default: '#2f6fe0' }
})
const emit = defineEmits(['tap'])

function polar(cx, cy, r, deg) {
  const a = (deg - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

function count() {
  return props.states ? props.states.filter(Boolean).length : props.m
}

// 用多边形近似扇形，避免 180° 整半圆时 SVG 弧标记歧义
const slices = computed(() => {
  const n = Math.max(1, props.n)
  const c = props.size / 2
  const r = c - 8
  const step = 360 / n
  const res = Math.max(4, Math.ceil(step / 5)) // 每 5° 一个点，保证边缘平滑
  return Array.from({ length: n }, (_, i) => {
    const a0 = i * step - 90
    const a1 = (i + 1) * step - 90
    let pts = `${c},${c} `
    for (let k = 0; k <= res; k++) {
      const [x, y] = polar(c, c, r, a0 + (a1 - a0) * k / res)
      pts += `${x.toFixed(2)},${y.toFixed(2)} `
    }
    const on = props.states ? !!props.states[i] : i < props.m
    return { pts, on }
  })
})

function tap(i) {
  if (props.clickable) emit('tap', i)
}
</script>

<style scoped>
.fp-wrap { margin: 0 auto; }
.fp-slice { transition: fill .15s; }
.fp-slice.clickable { cursor: pointer; }
.fp-slice.clickable:hover { filter: brightness(.95); }
</style>
