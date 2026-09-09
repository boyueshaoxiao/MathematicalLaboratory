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
import { DECIMAL_MODULES, moduleByKey } from '../../data/decimals/modules.js'
import DecimalIntro from './DecimalIntro.vue'
import DecimalGrid from './DecimalGrid.vue'
import DecimalLine from './DecimalLine.vue'
import DecimalAdd from './DecimalAdd.vue'

const COMPONENTS = {
  intro: DecimalIntro,
  grid: DecimalGrid,
  line: DecimalLine,
  addsub: DecimalAdd
}

const modules = DECIMAL_MODULES

// URL 直达：?lab=decimal&dmod=grid
const qs = new URLSearchParams(window.location.search)
const active = ref(moduleByKey(qs.get('dmod')).key)
const mod = computed(() => moduleByKey(active.value))
const viewComp = computed(() => COMPONENTS[active.value])

function go(key) {
  active.value = key
  const url = new URL(window.location.href)
  url.searchParams.set('lab', 'decimal')
  url.searchParams.set('dmod', key)
  window.history.replaceState(null, '', url)
}
</script>

<style scoped>
.frac-mod-head { display: flex; gap: 14px; align-items: center; padding: 2px 2px 14px; border-bottom: 1px dashed #e6e0d2; }
.frac-mod-icon { font-size: 40px; line-height: 1; filter: drop-shadow(0 2px 3px rgba(0,0,0,.08)); }
.frac-mod-title { margin: 0 0 4px; font-size: 20px; }
.frac-mod-desc { margin: 0; font-size: 13.5px; color: #75879b; }
</style>
