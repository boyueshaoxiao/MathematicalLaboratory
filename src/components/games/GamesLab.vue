<template>
  <div class="game-wrap">
    <div class="game-head" role="tablist">
      <button v-for="m in modules" :key="m.key" role="tab" class="game-tab"
        :class="{ active: m.key === active }" @click="go(m.key)">
        {{ m.icon }} {{ m.name }}
      </button>
    </div>
    <div class="game-body">
      <keep-alive>
        <component :is="viewComp" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import Game2048 from './Game2048.vue'
import SlidePuzzle from './SlidePuzzle.vue'
import TwentyFour from './TwentyFour.vue'
import SudokuGame from './SudokuGame.vue'

const modules = [
  { key: '2048', icon: '🔢', name: '2048' },
  { key: 'puzzle', icon: '🧩', name: '数字华容道' },
  { key: 'calc24', icon: '🃏', name: '24点' },
  { key: 'sudoku', icon: '🎲', name: '数独' }
]
const COMPONENTS = { '2048': Game2048, puzzle: SlidePuzzle, calc24: TwentyFour, sudoku: SudokuGame }

// URL 直达：?lab=games&gmod=2048|puzzle|calc24|sudoku
const qs = new URLSearchParams(window.location.search)
const m = qs.get('gmod')
const startKey = COMPONENTS[m] ? m : '2048'
const active = ref(startKey)
const viewComp = computed(() => COMPONENTS[active.value])

function go(key) {
  active.value = key
  const url = new URL(window.location.href)
  url.searchParams.set('lab', 'games')
  url.searchParams.set('gmod', key)
  window.history.replaceState(null, '', url)
}
</script>

<style scoped>
.game-wrap {
  flex: 1; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
  background: #f2f7f9; overflow: hidden;
}
.game-head {
  flex: 0 0 auto; display: flex; gap: 8px;
  padding: 10px 14px 0; background: #fff;
  border-bottom: 1px solid #e5ebf2;
}
.game-tab {
  border: 0; background: transparent; color: #5c6c82;
  padding: 9px 18px; border-radius: 9px 9px 0 0;
  cursor: pointer; font-weight: 800; font-size: 14px;
}
.game-tab:hover { background: #eff6f5; color: #0e7f74; }
.game-tab.active {
  background: #e4f5f2; color: #0d7f74;
  box-shadow: inset 0 3px 0 #2bb3a2;
}
.game-body {
  flex: 1; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
  overflow: auto; padding: 18px;
}
.game-body > * { margin: auto; }
</style>
