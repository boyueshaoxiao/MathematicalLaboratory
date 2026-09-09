<template>
  <div>
    <div class="frac-ctl frac-ctl-center">
      <button v-for="k in KINDS" :key="k.key" :class="{ active: kind === k.key }" @click="pick(k.key)">
        {{ k.icon }} {{ k.name }}
      </button>
    </div>

    <div class="ag-grid ad-grid">
      <div class="ag-svg ad-stage">
        <!-- ============ 平行四边形 ============ -->
        <svg v-if="kind === 'para'" viewBox="0 0 400 250" class="ad-svg">
          <g v-if="step === 0">
            <polygon points="180,80 340,80 280,210 120,210" fill="#b7d8ff" stroke="#20364f" stroke-width="2" />
            <line x1="180" y1="80" x2="180" y2="210" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
            <line x1="120" y1="222" x2="280" y2="222" stroke="#5c6b7e" />
            <text x="200" y="242" class="ad-t">底</text>
            <text x="187" y="150" class="ad-t ad-h">高</text>
            <text x="18" y="40" class="ad-note" text-anchor="start">先沿“高”方向画一条垂线</text>
          </g>
          <g v-else-if="step === 1">
            <polygon points="180,80 340,80 280,210 180,210" fill="#b7d8ff" stroke="#20364f" stroke-width="2" />
            <polygon points="60,215 120,215 120,85" fill="#ffc984" stroke="#20364f" stroke-width="2" />
            <line x1="120" y1="210" x2="120" y2="230" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="6 5" />
            <text x="90" y="100" class="ad-note" text-anchor="middle">剪下的小三角</text>
            <path d="M 125 100 L 165 150 M 160 100 L 190 150" stroke="#8a99ad" stroke-width="1.5" fill="none" stroke-dasharray="5 5" />
            <text x="200" y="242" class="ad-t">底不变</text>
          </g>
          <g v-else>
            <polygon points="180,80 340,80 280,210 180,210" fill="#b7d8ff" stroke="#20364f" stroke-width="2" />
            <polygon points="280,210 340,210 340,80" fill="#ffc984" stroke="#20364f" stroke-width="2" />
            <rect x="180" y="80" width="160" height="130" fill="none" stroke="#2f9e6e" stroke-width="2" stroke-dasharray="8 5" />
            <line x1="180" y1="222" x2="340" y2="222" stroke="#5c6b7e" />
            <text x="260" y="242" class="ad-t">长 = 底</text>
            <line x1="180" y1="80" x2="180" y2="210" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
            <text x="186" y="150" class="ad-t ad-h">宽 = 高</text>
            <text x="345" y="75" class="ad-note" text-anchor="end">拼成了长方形！</text>
          </g>
        </svg>

        <!-- ============ 三角形 ============ -->
        <svg v-if="kind === 'tri'" viewBox="0 0 400 250" class="ad-svg">
          <g v-if="step === 0">
            <polygon points="70,205 270,205 180,85" fill="#ffc9c9" stroke="#20364f" stroke-width="2" />
            <line x1="180" y1="85" x2="180" y2="205" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
            <line x1="70" y1="222" x2="270" y2="222" stroke="#5c6b7e" />
            <text x="170" y="242" class="ad-t">底</text>
            <text x="187" y="150" class="ad-t ad-h">高</text>
          </g>
          <g v-else-if="step === 1">
            <polygon points="70,205 270,205 180,85" fill="#ffc9c9" stroke="#20364f" stroke-width="2" />
            <polygon points="140,25 230,145 340,25" fill="none" stroke="#5b8def" stroke-width="2" stroke-dasharray="7 5" />
            <text x="240" y="60" class="ad-note">另一个完全一样的三角形（倒过来）</text>
            <line x1="180" y1="85" x2="180" y2="205" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
          </g>
          <g v-else>
            <polygon points="70,205 270,205 180,85" fill="#ffc9c9" stroke="#20364f" stroke-width="2" />
            <polygon points="180,85 380,85 270,205" fill="#b7d8ff" stroke="#20364f" stroke-width="2" />
            <line x1="180" y1="85" x2="270" y2="205" stroke="#f0f4f9" stroke-width="2" stroke-dasharray="6 4" />
            <line x1="180" y1="85" x2="180" y2="205" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
            <line x1="70" y1="222" x2="270" y2="222" stroke="#5c6b7e" />
            <text x="170" y="242" class="ad-t">底</text>
            <text x="215" y="150" class="ad-t ad-h">高不变</text>
            <text x="330" y="240" class="ad-note" text-anchor="middle">拼成了平行四边形（2 个三角形）</text>
          </g>
        </svg>

        <!-- ============ 梯形 ============ -->
        <svg v-if="kind === 'trap'" viewBox="0 0 400 250" class="ad-svg">
          <g v-if="step === 0">
            <polygon points="0,170 168,170 140,50 28,50" fill="#d8cfff" stroke="#20364f" stroke-width="2" />
            <line x1="28" y1="50" x2="28" y2="170" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
            <line x1="0" y1="190" x2="168" y2="190" stroke="#5c6b7e" />
            <text x="84" y="210" class="ad-t">下底</text>
            <line x1="28" y1="30" x2="140" y2="30" stroke="#5c6b7e" />
            <text x="84" y="20" class="ad-t">上底</text>
            <text x="35" y="115" class="ad-t ad-h" text-anchor="start">高</text>
          </g>
          <g v-else-if="step === 1">
            <polygon points="0,170 168,170 140,50 28,50" fill="#d8cfff" stroke="#20364f" stroke-width="2" />
            <polygon points="180,30 348,30 320,150 208,150" fill="none" stroke="#f0943f" stroke-width="2" stroke-dasharray="7 5" />
            <text x="340" y="80" class="ad-note" text-anchor="middle">再来一个一样的梯形（倒过来）</text>
          </g>
          <g v-else>
            <polygon points="0,170 168,170 140,50 28,50" fill="#d8cfff" stroke="#20364f" stroke-width="2" />
            <polygon points="140,50 308,50 280,170 168,170" fill="#b7d8ff" stroke="#20364f" stroke-width="2" />
            <polygon points="0,170 280,170 308,50 28,50" fill="none" stroke="#2f9e6e" stroke-width="2" stroke-dasharray="8 5" />
            <line x1="28" y1="50" x2="28" y2="170" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="7 5" />
            <line x1="0" y1="190" x2="280" y2="190" stroke="#5c6b7e" />
            <text x="140" y="210" class="ad-t">底 = 上底 + 下底</text>
            <text x="35" y="115" class="ad-t ad-h" text-anchor="start">高</text>
          </g>
        </svg>

        <!-- ============ 圆 ============ -->
        <svg v-if="kind === 'circle'" viewBox="0 0 400 250" class="ad-svg">
          <g v-if="step === 0">
            <g stroke="#7d8ea3" stroke-width="1">
              <line v-for="i in 12" :key="i" :x1="cx" :y1="cy" :x2="cx + 75 * Math.cos((i * 30 - 90) * Math.PI / 180)"
                :y2="cy + 75 * Math.sin((i * 30 - 90) * Math.PI / 180)" />
            </g>
            <circle :cx="cx" :cy="cy" r="75" fill="#ffe9a8" fill-opacity=".5" stroke="#20364f" stroke-width="2" />
            <line :x1="cx" :y1="cy" :x2="cx + 75" :y2="cy" stroke="#e0567a" stroke-width="2" />
            <circle :cx="cx" :cy="cy" r="4" fill="#e0567a" />
            <text :x="cx + 75" :y="cy - 10" class="ad-t" text-anchor="end">半径 r</text>
            <text :x="cx" :y="cy + 100" class="ad-note" text-anchor="middle">周长 C = 2πr —— 把它等分成许多小扇形</text>
          </g>
          <g v-else>
            <rect x="60" y="95" width="250" height="80" rx="3" fill="#ffe9a8" stroke="#20364f" stroke-width="2" />
            <g v-for="i in 12" :key="i">
              <rect :x="60 + (i - 1) * 250 / 12" y="95" :width="250 / 12 + 0.6" height="80"
                :fill="i % 2 ? '#ffe9a8' : '#ffd76e'" opacity=".6" />
            </g>
            <line x1="60" y1="95" x2="60" y2="175" stroke="#e0567a" stroke-width="1.6" stroke-dasharray="6 4" />
            <text x="48" y="125" class="ad-t ad-h" text-anchor="end">宽 = r</text>
            <line x1="60" y1="195" x2="310" y2="195" stroke="#5c6b7e" />
            <text x="185" y="216" class="ad-t">长 ≈ πr（周长的一半）</text>
            <text x="335" y="55" class="ad-note" text-anchor="middle">扇形重新拼起来，接近一个长方形</text>
          </g>
        </svg>
      </div>

      <div class="ad-panel">
        <h4>{{ kindName }}</h4>
        <p class="ad-desc">{{ desc }}</p>
        <p class="ad-equ">{{ equ }}</p>
        <div class="ad-bar">
          <button class="frac-btn-main" :disabled="step === 0" @click="step--">◀ 上一步</button>
          <span class="ad-count">{{ step + 1 }} / {{ count }}</span>
          <button v-if="step < count - 1" class="frac-btn-main" @click="step++">下一步 ▶</button>
          <button v-else class="frac-btn-main" @click="replay">🔁 再看一遍</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const KINDS = [
  { key: 'para', name: '平行四边形', icon: '▱' },
  { key: 'tri', name: '三角形', icon: '△' },
  { key: 'trap', name: '梯形', icon: '⏢' },
  { key: 'circle', name: '圆', icon: '●' }
]
const KIND_NAME = Object.fromEntries(KINDS.map(k => [k.key, k.name]))
const COUNT = { para: 3, tri: 3, trap: 3, circle: 2 }
const DESCS = {
  para: [
    '平行四边形有底和高，却不好数格子。能不能变成会算的长方形？',
    '沿着高剪开，就得到一个小三角形和一个（缺角的）长方形。',
    '小三角形移到另一边，正好拼成一个完整的长方形！'
  ],
  tri: [
    '三角形的面积更难数了——先标好它的底和高。',
    '再准备一个完全一样的三角形，把它倒过来。',
    '两个三角形正好拼成一个平行四边形：三角形 = 它的一半。'
  ],
  trap: [
    '梯形有上底、下底和高，面积怎么算？',
    '再准备一个完全一样的梯形，倒过来放。',
    '两个梯形拼成平行四边形，底正好等于 上底+下底。'
  ],
  circle: [
    '圆没有“底”和“高”，但有半径 r，周长 C = 2πr。',
    '把圆切成小扇形再重新拼，拼出来的形状接近长方形。'
  ]
}
const EQUS = {
  para: ['S = ?', '先把平行四边形分成两块', 'S = 长 × 宽 = 底 × 高'],
  tri: ['S = ?', 'S = ?', 'S = 平行四边形 ÷ 2 = 底 × 高 ÷ 2'],
  trap: ['S = ?', 'S = ?', 'S = (上底 + 下底) × 高 ÷ 2'],
  circle: ['S = ?', 'S ≈ 长 × 宽 = πr × r = πr²']
}

const kind = ref('para')
const step = ref(0)
const count = computed(() => COUNT[kind.value])
const kindName = computed(() => KIND_NAME[kind.value])
const desc = computed(() => DESCS[kind.value][step.value])
const equ = computed(() => EQUS[kind.value][step.value])

// 圆：圆心固定在 (190,125)，半径 75
const cx = 190
const cy = 125

function pick(k) {
  kind.value = k
  step.value = 0
}
function replay() { step.value = 0 }
</script>

<style scoped>
.ad-grid { padding: 14px; align-items: stretch; gap: 8px; }
.ad-svg { width: 100%; max-width: 480px; }
.ad-stage { display: flex; align-items: center; min-height: 260px; }
.ad-panel { padding: 4px 10px; }
.ad-panel h4 { margin: 0 0 8px; font-size: 17px; color: #20364f; }
.ad-desc { font-size: 14px; color: #44566c; line-height: 1.9; margin: 0 0 6px; }
.ad-equ { font-size: 17px; font-weight: 800; color: #c25f14; margin: 0 0 14px; }
.ad-bar { display: flex; gap: 10px; align-items: center; }
.ad-count { font-size: 13px; color: #7d8b9c; font-weight: 700; }
.ad-t { font-size: 14px; font-weight: 800; fill: #20364f; paint-order: stroke; stroke: rgba(255, 255, 255, .92); stroke-width: 4px; }
.ad-h { fill: #c22d55; }
.ad-note { font-size: 12.5px; font-weight: 700; fill: #5c6b80; paint-order: stroke; stroke: rgba(255, 255, 255, .85); stroke-width: 3.5px; }
.ad-stage svg { height: auto; }
</style>
