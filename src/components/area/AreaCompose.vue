<template>
  <div>
    <div class="frac-ctl frac-ctl-center">
      <button v-for="s in SHAPES" :key="s.key" :class="{ active: shape === s.key }" @click="pick(s.key)">
        {{ s.icon }} {{ s.name }}
      </button>
    </div>

    <div class="area-grid ac-grid">
      <div class="ac-stage">
        <!-- ==================== L 形 ==================== -->
        <svg v-if="shape === 'l'" viewBox="0 0 440 300" class="ac-svg">
          <g v-if="mode === 'A'">
            <polygon points="150,104 198,104 198,200 150,200" fill="#ffcf8a" stroke="#20364f" stroke-width="2" />
            <polygon points="198,152 294,152 294,200 198,200" fill="#cfe3ff" stroke="#20364f" stroke-width="2" />
            <line x1="198" y1="152" x2="198" y2="200" stroke="#20364f" stroke-width="2" stroke-dasharray="5 4" />
            <text x="174" y="160" class="c-num">8</text>
            <text x="246" y="182" class="c-num">8</text>
            <line x1="136" y1="104" x2="136" y2="200" stroke="#5c6b7e" />
            <line x1="130" y1="104" x2="142" y2="104" stroke="#5c6b7e" />
            <line x1="130" y1="200" x2="142" y2="200" stroke="#5c6b7e" />
            <text x="128" y="156" class="c-dim" text-anchor="end">4</text>
            <line x1="150" y1="88" x2="198" y2="88" stroke="#5c6b7e" />
            <line x1="150" y1="82" x2="150" y2="94" stroke="#5c6b7e" />
            <line x1="198" y1="82" x2="198" y2="94" stroke="#5c6b7e" />
            <text x="174" y="79" class="c-dim">2</text>
            <line x1="198" y1="218" x2="294" y2="218" stroke="#5c6b7e" />
            <line x1="198" y1="212" x2="198" y2="224" stroke="#5c6b7e" />
            <line x1="294" y1="212" x2="294" y2="224" stroke="#5c6b7e" />
            <text x="246" y="238" class="c-dim">4</text>
            <line x1="306" y1="152" x2="306" y2="200" stroke="#5c6b7e" />
            <line x1="300" y1="152" x2="312" y2="152" stroke="#5c6b7e" />
            <line x1="300" y1="200" x2="312" y2="200" stroke="#5c6b7e" />
            <text x="314" y="180" class="c-dim">2</text>
          </g>
          <g v-else>
            <polygon points="150,104 294,104 294,200 150,200" fill="#ffdfc0" stroke="#20364f" stroke-width="2" />
            <rect x="198" y="104" width="96" height="48" fill="#ffffff" opacity=".72" stroke="#e0567a" stroke-width="2" stroke-dasharray="6 4" />
            <text x="246" y="132" class="c-num" fill="#e0567a" stroke="rgba(255,255,255,.9)">−8</text>
            <line x1="150" y1="218" x2="294" y2="218" stroke="#5c6b7e" />
            <line x1="150" y1="212" x2="150" y2="224" stroke="#5c6b7e" />
            <line x1="294" y1="212" x2="294" y2="224" stroke="#5c6b7e" />
            <text x="222" y="238" class="c-dim">6</text>
            <line x1="306" y1="104" x2="306" y2="200" stroke="#5c6b7e" />
            <line x1="300" y1="104" x2="312" y2="104" stroke="#5c6b7e" />
            <line x1="300" y1="200" x2="312" y2="200" stroke="#5c6b7e" />
            <text x="314" y="156" class="c-dim">4</text>
            <text x="206" y="98" class="c-note" text-anchor="end">补一块 = 4×2</text>
          </g>
        </svg>

        <!-- ==================== 楼梯形 ==================== -->
        <svg v-if="shape === 'stair'" viewBox="0 0 440 300" class="ac-svg">
          <g v-if="mode === 'A'">
            <polygon points="152,84 196,84 196,128 152,128" fill="#ffcf8a" stroke="#20364f" stroke-width="2" />
            <polygon points="152,128 240,128 240,172 152,172" fill="#ffb866" stroke="#20364f" stroke-width="2" />
            <polygon points="152,172 284,172 284,216 152,216" fill="#ff9e45" stroke="#20364f" stroke-width="2" />
            <line x1="152" y1="128" x2="240" y2="128" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 4" />
            <line x1="152" y1="172" x2="284" y2="172" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 4" />
            <text x="174" y="116" class="c-num">4</text>
            <text x="196" y="154" class="c-num">8</text>
            <text x="218" y="197" class="c-num">12</text>
            <line x1="284" y1="234" x2="152" y2="234" stroke="#5c6b7e" />
            <line x1="152" y1="228" x2="152" y2="240" stroke="#5c6b7e" />
            <line x1="284" y1="228" x2="284" y2="240" stroke="#5c6b7e" />
            <text x="218" y="254" class="c-dim">6</text>
            <text x="330" y="176" class="c-note">每层都高 2</text>
          </g>
          <g v-else>
            <polygon points="152,84 196,84 196,128 240,128 240,172 284,172 284,216 152,216" fill="#cfe3ff" stroke="#20364f" stroke-width="2" />
            <rect x="196" y="84" width="88" height="44" fill="#fff" opacity=".7" stroke="#e0567a" stroke-width="2" stroke-dasharray="6 4" />
            <rect x="240" y="128" width="44" height="44" fill="#fff" opacity=".7" stroke="#e0567a" stroke-width="2" stroke-dasharray="6 4" />
            <rect x="152" y="84" width="132" height="132" fill="none" stroke="#2f9e6e" stroke-width="2" stroke-dasharray="8 5" />
            <text x="240" y="110" class="c-num" fill="#e0567a" stroke="rgba(255,255,255,.9)">−8</text>
            <text x="262" y="154" class="c-num" fill="#e0567a" stroke="rgba(255,255,255,.9)">−4</text>
            <line x1="152" y1="234" x2="284" y2="234" stroke="#5c6b7e" />
            <line x1="152" y1="228" x2="152" y2="240" stroke="#5c6b7e" />
            <line x1="284" y1="228" x2="284" y2="240" stroke="#5c6b7e" />
            <text x="218" y="254" class="c-dim">6</text>
            <line x1="296" y1="84" x2="296" y2="216" stroke="#5c6b7e" />
            <line x1="290" y1="84" x2="302" y2="84" stroke="#5c6b7e" />
            <line x1="290" y1="216" x2="302" y2="216" stroke="#5c6b7e" />
            <text x="306" y="154" class="c-dim">6</text>
            <text x="320" y="252" class="c-note">补成 6×6 的大正方形</text>
          </g>
        </svg>

        <!-- ==================== 缺角矩形 ==================== -->
        <svg v-if="shape === 'notch'" viewBox="0 0 440 300" class="ac-svg">
          <g v-if="mode === 'A'">
            <polygon points="140,104 284,104 284,158 140,158" fill="#ffcf8a" stroke="#20364f" stroke-width="2" />
            <polygon points="140,158 230,158 230,194 140,194" fill="#cfe3ff" stroke="#20364f" stroke-width="2" />
            <line x1="140" y1="158" x2="230" y2="158" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 4" />
            <text x="212" y="138" class="c-num">24</text>
            <text x="185" y="183" class="c-num">10</text>
            <line x1="140" y1="210" x2="284" y2="210" stroke="#5c6b7e" />
            <line x1="140" y1="204" x2="140" y2="216" stroke="#5c6b7e" />
            <line x1="284" y1="204" x2="284" y2="216" stroke="#5c6b7e" />
            <text x="212" y="230" class="c-dim">8</text>
            <line x1="300" y1="104" x2="300" y2="158" stroke="#5c6b7e" />
            <line x1="294" y1="104" x2="306" y2="104" stroke="#5c6b7e" />
            <line x1="294" y1="158" x2="306" y2="158" stroke="#5c6b7e" />
            <text x="310" y="135" class="c-dim">3</text>
            <text x="312" y="205" class="c-note" text-anchor="end">上：8×3　下左：5×2</text>
          </g>
          <g v-else>
            <polygon points="140,104 284,104 284,194 140,194" fill="#ffe0b8" stroke="#20364f" stroke-width="2" />
            <rect x="230" y="158" width="54" height="36" fill="#fff" opacity=".72" stroke="#e0567a" stroke-width="2" stroke-dasharray="6 4" />
            <text x="257" y="181" class="c-num" fill="#e0567a" stroke="rgba(255,255,255,.9)">−6</text>
            <line x1="140" y1="210" x2="284" y2="210" stroke="#5c6b7e" />
            <line x1="140" y1="204" x2="140" y2="216" stroke="#5c6b7e" />
            <line x1="284" y1="204" x2="284" y2="216" stroke="#5c6b7e" />
            <text x="212" y="230" class="c-dim">8</text>
            <line x1="300" y1="104" x2="300" y2="194" stroke="#5c6b7e" />
            <line x1="294" y1="104" x2="306" y2="104" stroke="#5c6b7e" />
            <line x1="294" y1="194" x2="306" y2="194" stroke="#5c6b7e" />
            <text x="310" y="153" class="c-dim">5</text>
            <text x="204" y="96" class="c-note">补回缺角 = 3×2</text>
          </g>
        </svg>

        <!-- ==================== 房子形 ==================== -->
        <svg v-if="shape === 'house'" viewBox="0 0 440 300" class="ac-svg">
          <g v-if="mode === 'A'">
            <polygon points="210,26 150,66 270,66" fill="#ffd9c9" stroke="#20364f" stroke-width="2" />
            <rect x="150" y="66" width="120" height="80" fill="#cfe3ff" stroke="#20364f" stroke-width="2" />
            <line x1="210" y1="26" x2="210" y2="66" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="6 4" />
            <text x="217" y="52" class="c-dim" text-anchor="start">高 2</text>
            <text x="210" y="60" class="c-num">6</text>
            <text x="210" y="118" class="c-num">24</text>
            <line x1="150" y1="164" x2="270" y2="164" stroke="#5c6b7e" />
            <line x1="150" y1="158" x2="150" y2="170" stroke="#5c6b7e" />
            <line x1="270" y1="158" x2="270" y2="170" stroke="#5c6b7e" />
            <text x="210" y="184" class="c-dim">6</text>
            <line x1="288" y1="66" x2="288" y2="146" stroke="#5c6b7e" />
            <line x1="282" y1="66" x2="294" y2="66" stroke="#5c6b7e" />
            <line x1="282" y1="146" x2="294" y2="146" stroke="#5c6b7e" />
            <text x="296" y="110" class="c-dim">4</text>
          </g>
          <g v-else>
            <polygon points="210,26 150,66 150,146 210,146" fill="#ffd9c9" stroke="#20364f" stroke-width="2" />
            <polygon points="210,26 270,66 270,146 210,146" fill="#cfe3ff" stroke="#20364f" stroke-width="2" />
            <line x1="210" y1="26" x2="210" y2="146" stroke="#fff" stroke-width="2.4" stroke-dasharray="5 4" />
            <text x="180" y="118" class="c-num">15</text>
            <text x="240" y="118" class="c-num">15</text>
            <line x1="150" y1="164" x2="270" y2="164" stroke="#5c6b7e" />
            <line x1="150" y1="158" x2="150" y2="170" stroke="#5c6b7e" />
            <line x1="270" y1="158" x2="270" y2="170" stroke="#5c6b7e" />
            <text x="210" y="184" class="c-dim">6</text>
            <text x="350" y="130" class="c-note" text-anchor="end">对半分，左右完全一样</text>
            <text x="165" y="156" class="c-note">半底 3</text>
          </g>
        </svg>
      </div>

      <div class="ac-panel">
        <h4>{{ cur.name }} <span class="frac-tag">五年级</span></h4>
        <p class="ac-intro">{{ cur.intro }}</p>
        <div class="ac-modes">
          <button v-for="m in MODES" :key="m" :class="{ active: mode === m }" @click="mode = m">{{ tag(m) }}</button>
        </div>
        <p class="ac-desc">{{ info.step }}</p>
        <div class="ac-steps">
          <div v-for="(ln, i) in info.steps" :key="i" class="ac-line">{{ ln }}</div>
          <div class="ac-eq">{{ info.eq }}</div>
        </div>
        <p class="ac-tip2">同一块图形,切法不同、算式不同,但面积永远只有一个答案。</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const SHAPES = [
  { key: 'l', name: 'L 形', icon: '∟', intro: '一个长方形拐了个弯,缺了一角。把它看成几块会算的长方形,就能求面积。' },
  { key: 'stair', name: '楼梯形', icon: '▦', intro: '像一级一级的楼梯。每一级其实都是一条长方形。' },
  { key: 'notch', name: '缺角矩形', icon: '▤', intro: '大长方形被切掉一个小角。可以先求整块,再减掉缺角。' },
  { key: 'house', name: '房子形', icon: '⌂', intro: '屋顶是三角形、屋身是长方形,三角形和长方形的面积合起来。' }
]
const MODES = ['A', 'B']

const INFO = {
  l: {
    A: {
      tag: '✂ 割成两块',
      step: '沿折线切开:L 形 = 左边竖条(2×4) + 右边横条(4×2)。',
      steps: ['竖条:2 × 4 = 8', '横条:4 × 2 = 8'],
      eq: 'S = 8 + 8 = 16 cm²'
    },
    B: {
      tag: '🪄 补成整块',
      step: '右上缺的一角(4×2)补回去,就是一个完整的长方形 6×4。',
      steps: ['完整的长方形:6 × 4 = 24', '补上的小块:4 × 2 = 8'],
      eq: 'S = 24 − 8 = 16 cm²'
    }
  },
  stair: {
    A: {
      tag: '✂ 分成三级',
      step: '每级都是长方形:宽从 6、4、2 变小,高都是 2。',
      steps: ['最下:6 × 2 = 12', '中间:4 × 2 = 8', '最上:2 × 2 = 4'],
      eq: 'S = 12 + 8 + 4 = 24 cm²'
    },
    B: {
      tag: '🪄 补成正方形',
      step: '右上缺的两块补上,变成一个 6×6 的大正方形。',
      steps: ['大正方形:6 × 6 = 36', '两块缺口:4×2 + 2×2 = 12'],
      eq: 'S = 36 − 12 = 24 cm²'
    }
  },
  notch: {
    A: {
      tag: '✂ 横切成两块',
      step: '沿虚线横切:上面是 8×3,下面剩左半 5×2。',
      steps: ['上面:8 × 3 = 24', '下面:5 × 2 = 10'],
      eq: 'S = 24 + 10 = 34 cm²'
    },
    B: {
      tag: '🪄 补回缺角',
      step: '缺掉的是右下角 3×2。先用整块 8×5 算,再减掉它。',
      steps: ['整块:8 × 5 = 40', '缺角:3 × 2 = 6'],
      eq: 'S = 40 − 6 = 34 cm²'
    }
  },
  house: {
    A: {
      tag: '✂ 屋顶屋身分开',
      step: '屋顶是三角形(底 6、高 2),屋身是长方形 6×4。',
      steps: ['屋顶:6 × 2 ÷ 2 = 6', '屋身:6 × 4 = 24'],
      eq: 'S = 6 + 24 = 30 cm²'
    },
    B: {
      tag: '✂ 左右对半分',
      step: '从屋顶尖到屋底对半分,左右两半完全一样。',
      steps: ['左半:3×4 + 3×2÷2 = 15', '右半:也是 15'],
      eq: 'S = 15 + 15 = 30 cm²'
    }
  }
}

const shape = ref('l')
const mode = ref('A')
const cur = computed(() => SHAPES.find(s => s.key === shape.value))
const info = computed(() => INFO[shape.value][mode.value])
const tag = m => INFO[shape.value][m].tag
function pick(k) { shape.value = k; mode.value = 'A' }
</script>

<style scoped>
.ac-grid { align-items: stretch; }
.ac-stage { display: flex; align-items: center; justify-content: center; min-height: 320px; padding: 6px; }
.ac-svg { width: 100%; max-width: 470px; height: auto; display: block; }
.ac-panel { padding: 4px 12px 4px 2px; }
.ac-panel h4 { margin: 0 0 6px; font-size: 17px; color: #20364f; }
.ac-intro { font-size: 13.5px; color: #7d8b9c; line-height: 1.7; margin: 0 0 10px; }
.ac-modes { display: flex; gap: 8px; margin-bottom: 10px; }
.ac-modes button {
  border: 1.5px solid #d5dfec; background: #fff; color: #44566c; border-radius: 9px;
  padding: 5px 11px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.ac-modes button.active { background: #fff3e4; border-color: #f0943f; color: #b8540e; }
.ac-desc { font-size: 14px; color: #44566c; line-height: 1.85; margin: 0 0 8px; }
.ac-steps { background: #f4f7fb; border-radius: 10px; padding: 9px 12px; line-height: 2; font-size: 14.5px; color: #44566c; }
.ac-line { font-weight: 600; }
.ac-eq { font-size: 17px; font-weight: 800; color: #2c6ec4; border-top: 1px dashed #d5dfec; margin-top: 3px; padding-top: 4px; }
.ac-tip2 { font-size: 12.5px; color: #7d8b9c; margin: 10px 0 0; line-height: 1.7; }
.c-num { font-size: 21px; font-weight: 800; fill: #20364f; paint-order: stroke; stroke: rgba(255, 255, 255, .92); stroke-width: 5px; text-anchor: middle; }
.c-dim { font-size: 13.5px; font-weight: 800; fill: #20364f; paint-order: stroke; stroke: rgba(255, 255, 255, .95); stroke-width: 4px; text-anchor: middle; }
.c-note { font-size: 13px; font-weight: 700; fill: #b8540e; paint-order: stroke; stroke: rgba(255, 255, 255, .9); stroke-width: 4px; text-anchor: middle; }
@media (max-width: 800px) {
  .ac-grid { grid-template-columns: 1fr !important; }
  .ac-stage { min-height: 240px; }
  .ac-panel { padding: 2px 4px; }
}
</style>
