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
import { UNIT_MODULES, moduleByKey } from '../../data/units/modules.js'
import UnitConvert from './UnitConvert.vue'
import UnitLadder from './UnitLadder.vue'
import UnitQuiz from './UnitQuiz.vue'
import UnitCompare from './UnitCompare.vue'

const COMPONENTS = {
  convert: UnitConvert,
  ladder: UnitLadder,
  quiz: UnitQuiz,
  compare: UnitCompare
}

const modules = UNIT_MODULES

// URL 直达：?lab=unit&umod=convert
const qs = new URLSearchParams(window.location.search)
const active = ref(moduleByKey(qs.get('umod')).key)
const mod = computed(() => moduleByKey(active.value))
const viewComp = computed(() => COMPONENTS[active.value])

function go(key) {
  active.value = key
  const url = new URL(window.location.href)
  url.searchParams.set('lab', 'unit')
  url.searchParams.set('umod', key)
  window.history.replaceState(null, '', url)
}
</script>

<style scoped>
.frac-mod-head { display: flex; gap: 14px; align-items: center; padding: 2px 2px 14px; border-bottom: 1px dashed #ead9f0; }
.frac-mod-icon { font-size: 40px; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,.08)); }
.frac-mod-title { margin: 0 0 4px; font-size: 20px; }
.frac-mod-desc { margin: 0; font-size: 13.5px; color: #75879b; }
/* 单位换算的专属标签色 */
.frac-tab.active { background: #ffe9f2; color: #c2255e; box-shadow: inset 0 2px 0 #ef5f9b; }
.frac-tag { background: #fdeef5; color: #b2346a; }
</style>
