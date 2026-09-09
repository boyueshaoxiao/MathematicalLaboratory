<template>
  <div class="frac-wrap">
    <div class="frac-head" role="tablist">
      <button v-for="mod in modules" :key="mod.key" role="tab" class="frac-tab"
        :class="{ active: mod.key === active }" @click="go(mod.key)">
        {{ mod.icon }} {{ mod.name }}
      </button>
    </div>
    <div class="frac-body">
      <div class="frac-card">
        <div class="frac-mod-head">
          <div class="frac-mod-icon">{{ mod.icon }}</div>
          <div>
            <h2 class="frac-mod-title">{{ mod.name }}
              <span class="frac-tag">{{ mod.grade }}</span>
            </h2>
            <p class="frac-mod-desc">{{ mod.desc }}</p>
          </div>
        </div>
        <keep-alive>
          <component :is="viewComp" />
        </keep-alive>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AreaGallery from './AreaGallery.vue'
import AreaTile from './AreaTile.vue'
import AreaDerive from './AreaDerive.vue'
import AreaCompose from './AreaCompose.vue'
import AreaQuiz from './AreaQuiz.vue'

const modules = [
  { key: 'gallery', name: '图形百科', icon: '📏', grade: '3~6 年级', desc: '正方形、长方形、平行四边形、三角形、梯形、圆的面积公式，拖一拖看图形怎么变。' },
  { key: 'tile', name: '铺格子', icon: '🧱', grade: '3 年级', desc: '面积就是一格一格“铺”出来的——点一点格子，自己发现“长×宽”为什么成立。' },
  { key: 'derive', name: '剪拼推导', icon: '✂️', grade: '5~6 年级', desc: '平行四边形剪成长方形、三角形和梯形“倍拼”、圆拼成近长方形——公式是这样来的。' },
  { key: 'compose', name: '组合面积', icon: '🧩', grade: '5 年级', desc: 'L 形、楼梯、缺角的图形怎么算？割一割、补一补，每种都有两种思路。' },
  { key: 'quiz', name: '面积挑战', icon: '🎯', grade: '5~6 年级', desc: '看图量尺寸算面积，小心面积公式里的陷阱。' }
]
const COMPONENTS = { gallery: AreaGallery, tile: AreaTile, derive: AreaDerive, compose: AreaCompose, quiz: AreaQuiz }

const qs = new URLSearchParams(window.location.search)
const active = ref(['gallery', 'tile', 'derive', 'compose', 'quiz'].includes(qs.get('amod')) ? qs.get('amod') : 'gallery')
const mod = computed(() => modules.find(m => m.key === active.value))
const viewComp = computed(() => COMPONENTS[active.value])

function go(key) {
  active.value = key
  const url = new URL(window.location.href)
  url.searchParams.set('lab', 'area')
  url.searchParams.set('amod', key)
  window.history.replaceState(null, '', url)
}
</script>
