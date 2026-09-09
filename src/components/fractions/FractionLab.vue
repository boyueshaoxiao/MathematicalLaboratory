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
import { FRACTION_MODULES, moduleByKey } from '../../data/fractions/lessons.js'
import IntroPieces from './IntroPieces.vue'
import FractionWall from './FractionWall.vue'
import NumberLine from './NumberLine.vue'
import AddSubLab from './AddSubLab.vue'
import Equivalent from './Equivalent.vue'
import MixedNumber from './MixedNumber.vue'
import FractionGridQuiz from './FractionGridQuiz.vue'

const COMPONENTS = {
  intro: IntroPieces,
  wall: FractionWall,
  line: NumberLine,
  addsub: AddSubLab,
  equal: Equivalent,
  mixed: MixedNumber,
  ofgrid: FractionGridQuiz
}

const modules = FRACTION_MODULES

// URL 直达：?lab=fraction&fmod=wall
const qs = new URLSearchParams(window.location.search)
const active = ref(moduleByKey(qs.get('fmod')).key)
const mod = computed(() => moduleByKey(active.value))
const viewComp = computed(() => COMPONENTS[active.value])

function go(key) {
  active.value = key
  const url = new URL(window.location.href)
  url.searchParams.set('lab', 'fraction')
  url.searchParams.set('fmod', key)
  window.history.replaceState(null, '', url)
}
</script>

<style scoped>
.frac-mod-head { display: flex; gap: 14px; align-items: center; padding: 2px 2px 14px; border-bottom: 1px dashed #e6e0d2; }
.frac-mod-icon { font-size: 40px; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,.08)); }
.frac-mod-title { margin: 0 0 4px; font-size: 20px; }
.frac-mod-desc { margin: 0; font-size: 13.5px; color: #75879b; }
</style>
