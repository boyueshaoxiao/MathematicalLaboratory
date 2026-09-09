<template>
  <svg :viewBox="'0 0 380 272'" class="ash">
    <!-- 图形主体 -->
    <g :fill="fill" stroke="#20364f" stroke-width="2">
      <rect v-if="kind === 'square'" :x="body.x" :y="body.y" :width="body.w" :height="body.h" :rx="3" />
      <rect v-else-if="kind === 'rect'" :x="body.x" :y="body.y" :width="body.w" :height="body.h" :rx="3" />
      <polygon v-else-if="kind === 'para'" :points="body.pts" />
      <polygon v-else-if="kind === 'tri'" :points="body.pts" />
      <polygon v-else-if="kind === 'trap'" :points="body.pts" />
      <circle v-else :cx="body.cx" :cy="body.cy" :r="body.r" />
    </g>

    <!-- 高线/半径辅助（三角、平四、梯形、圆） -->
    <g v-if="alt.lines.length || alt.rt.length || alt.dots.length">
      <line v-for="(l, i) in alt.lines" :key="'l' + i" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]"
        stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
      <path v-for="(s, i) in alt.rt" :key="'r' + i" :d="s" fill="none" stroke="#e0567a" stroke-width="1.6" />
      <circle v-for="(c, i) in alt.dots" :key="'d' + i" :cx="c[0]" :cy="c[1]" r="3.4" fill="#e0567a" stroke="#fff" stroke-width="1.5" />
      <text v-for="(t, i) in alt.labels" :key="'t' + i" :x="t.x" :y="t.y" :text-anchor="t.a || 'middle'"
        class="ash-ah">{{ t.txt }}</text>
    </g>

    <!-- 主尺寸线 -->
    <g v-if="dim.lines.length">
      <line v-for="(l, i) in dim.lines" :key="'d' + i" :x1="l[0]" :y1="l[1]" :x2="l[2]" :y2="l[3]" stroke="#5c6b7e" stroke-width="1.2" />
    </g>
    <!-- 尺寸文字 -->
    <g v-if="dim.labels.length">
      <text v-for="(t, i) in dim.labels" :key="'dl' + i" :x="t.x" :y="t.y" :text-anchor="t.a || 'middle'" class="ash-dimt">
        {{ t.txt }}
      </text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  kind: { type: String, required: true },
  p: { type: Object, required: true },
  fill: { type: String, default: '#cfe3ff' }
})

const S = 20 // px / cm
const BASE = 226 // 底边基线 y

// ---- 图形主体几何 ----
const body = computed(() => {
  if (props.kind === 'square' || props.kind === 'rect') {
    const w = (props.kind === 'square' ? props.p.a : props.p.a) * S
    const h = (props.kind === 'square' ? props.p.a : props.p.b) * S
    return { x: (380 - w) / 2, y: (272 - h) / 2, w, h }
  }
  if (props.kind === 'para') {
    const a = props.p.a * S
    const h = props.p.h * S
    const d = Math.min(0.42 * a, 66)
    const x0 = (380 - (a + d)) / 2
    return { pts: `${x0},${BASE} ${x0 + a},${BASE} ${x0 + a + d},${BASE - h} ${x0 + d},${BASE - h}` }
  }
  if (props.kind === 'tri') {
    const a = props.p.a * S
    const h = props.p.h * S
    const x0 = (380 - a) / 2
    const cx = x0 + a * 0.55
    return { pts: `${x0},${BASE} ${x0 + a},${BASE} ${cx},${BASE - h}` }
  }
  if (props.kind === 'trap') {
    const b = props.p.b * S
    const u = props.p.a * S
    const h = props.p.h * S
    const x0 = (380 - b) / 2
    const tx = x0 + (b - u) / 2
    return { pts: `${x0},${BASE} ${x0 + b},${BASE} ${tx + u},${BASE - h} ${tx},${BASE - h}` }
  }
  return { cx: 190, cy: 138, r: props.p.r * S }
})

const polyPts = computed(() =>
  (body.value.pts || '').split(' ').filter(Boolean).map(s => s.split(',').map(Number)))

// ---- 高线/半径（辅助色）----
const alt = computed(() => {
  const o = { lines: [], rt: [], dots: [], labels: [] }
  if (props.kind === 'para') {
    // 从顶边左端点竖直落到底边上（底水平，故高线即竖线）
    const top = polyPts.value[3]
    const hx = top[0]
    o.lines.push([hx, top[1], hx, BASE])
    o.rt.push(`M ${hx} ${BASE} L ${hx + 11} ${BASE} L ${hx + 11} ${BASE - 11}`)
    o.dots.push([hx, BASE])
    o.labels.push({ x: hx + 8, y: (top[1] + BASE) / 2 + 4, a: 'start', txt: `高 ${props.p.h} cm` })
  } else if (props.kind === 'tri') {
    const top = polyPts.value[2]
    const hx = top[0]
    o.lines.push([hx, top[1], hx, BASE])
    o.rt.push(`M ${hx} ${BASE} L ${hx + 11} ${BASE} L ${hx + 11} ${BASE - 11}`)
    o.dots.push([hx, BASE])
    o.labels.push({ x: hx + 8, y: (top[1] + BASE) / 2 + 4, a: 'start', txt: `高 ${props.p.h} cm` })
  } else if (props.kind === 'trap') {
    const topL = polyPts.value[3]
    o.lines.push([topL[0], topL[1], topL[0], BASE])
    o.rt.push(`M ${topL[0]} ${BASE} L ${topL[0] + 11} ${BASE} L ${topL[0] + 11} ${BASE - 11}`)
    o.dots.push([topL[0], BASE])
    o.labels.push({ x: topL[0] + 7, y: (topL[1] + BASE) / 2 + 4, a: 'start', txt: `高 ${props.p.h} cm` })
  } else if (props.kind === 'circle') {
    const end = [body.value.cx + body.value.r, body.value.cy]
    o.lines.push([body.value.cx, body.value.cy, end[0], end[1]])
    o.dots.push([body.value.cx, body.value.cy], end)
    o.labels.push({ x: body.value.cx + body.value.r / 2, y: body.value.cy - 10, txt: `半径 ${props.p.r} cm` })
  }
  return o
})

// ---- 主尺寸线与文字 ----
const dim = computed(() => {
  const o = { lines: [], labels: [] }
  const tick = (x1, y1, x2, y2) => o.lines.push([x1, y1, x2, y2])
  const ext = (x1, y1, x2, y2) => { o.lines.push([x1, y1, x2, y2]) }
  const lab = (x, y, txt, a = 'middle') => o.labels.push({ x, y, txt, a })

  if (props.kind === 'square') {
    const b = body.value
    const by = b.y + b.h
    ext(b.x, by + 10, b.x + b.w, by + 10)
    ext(b.x, by + 4, b.x, by + 16)
    ext(b.x + b.w, by + 4, b.x + b.w, by + 16)
    lab(b.x + b.w / 2, by + 30, `边长 ${props.p.a} cm`)
  } else if (props.kind === 'rect') {
    const b = body.value
    const by = b.y + b.h
    // 长：标在底边（水平方向）
    ext(b.x, by + 10, b.x + b.w, by + 10)
    ext(b.x, by + 4, b.x, by + 16)
    ext(b.x + b.w, by + 4, b.x + b.w, by + 16)
    lab(b.x + b.w / 2, by + 30, `长 ${props.p.a} cm`)
    // 宽：标在右侧竖边旁（竖直方向）
    const rx = b.x + b.w
    ext(rx + 10, b.y, rx + 10, by)
    ext(rx + 4, b.y, rx + 16, b.y)
    ext(rx + 4, by, rx + 16, by)
    lab(rx + 22, (b.y + by) / 2 + 5, `宽 ${props.p.b} cm`, 'start')
  } else if (props.kind === 'para' || props.kind === 'tri') {
    const pts = polyPts.value
    ext(pts[0][0], BASE + 10, pts[1][0], BASE + 10)
    ext(pts[0][0], BASE + 4, pts[0][0], BASE + 16)
    ext(pts[1][0], BASE + 4, pts[1][0], BASE + 16)
    lab((pts[0][0] + pts[1][0]) / 2, BASE + 30, `底 ${props.p.a} cm`)
  } else if (props.kind === 'trap') {
    const pts = polyPts.value
    const yTop = pts[2][1]
    ext(pts[0][0], BASE + 10, pts[1][0], BASE + 10)
    ext(pts[0][0], BASE + 4, pts[0][0], BASE + 16)
    ext(pts[1][0], BASE + 4, pts[1][0], BASE + 16)
    lab((pts[0][0] + pts[1][0]) / 2, BASE + 30, `下底 ${props.p.b} cm`)
    ext(pts[3][0], yTop - 10, pts[2][0], yTop - 10)
    ext(pts[3][0], yTop - 4, pts[3][0], yTop - 16)
    ext(pts[2][0], yTop - 4, pts[2][0], yTop - 16)
    lab((pts[3][0] + pts[2][0]) / 2, yTop - 30, `上底 ${props.p.a} cm`)
  }
  return o
})
</script>

<style scoped>
.ash { width: 100%; max-width: 430px; height: auto; display: block; margin: 0 auto; }
.ash-ah { font-size: 14px; font-weight: 800; fill: #c22d55; paint-order: stroke; stroke: rgba(255,255,255,.9); stroke-width: 4px; }
.ash-dimt { font-size: 14px; font-weight: 800; fill: #20364f; paint-order: stroke; stroke: rgba(255,255,255,.92); stroke-width: 4px; }
</style>
