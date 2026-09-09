<template>
  <div class="df-fig">
    <div class="df-r">
      <div class="df-cap">
        <span>整数部分 · 个位</span>
        <small v-if="showLabels">一个一 = 1</small>
      </div>
      <div class="df-units" v-if="s.int">
        <span v-for="k in s.int" :key="k" class="df-one">1</span>
      </div>
      <div class="df-none" v-else>没有整数部分</div>
    </div>

    <div class="df-r">
      <div class="df-cap">
        <span>十分位</span>
        <small v-if="showLabels">把 1 平均分成 10 份，每份 0.1</small>
      </div>
      <div class="df-bar">
        <i v-for="k in 10" :key="k" class="df-cell" :class="{ on: k <= s.t }"></i>
      </div>
      <div class="df-side" v-if="showLabels">涂了 {{ s.t }} 份 = {{ s.t }} × 0.1</div>
    </div>

    <div class="df-r df-hr">
      <div class="df-cap">
        <span>百分位</span>
        <small v-if="showLabels">把 1 份 0.1 再分成 10 份（放大看），每份 0.01</small>
      </div>
      <div class="df-bar df-mini">
        <i v-for="k in 10" :key="k" class="df-cell" :class="{ on: k <= s.h }"></i>
      </div>
      <div class="df-side" v-if="showLabels">涂了 {{ s.h }} 份 = {{ s.h }} × 0.01</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { splitCents } from '../../data/decimals/decUtils.js'

const props = defineProps({
  cents: { type: Number, required: true },
  showLabels: Boolean
})
const s = computed(() => splitCents(props.cents))
</script>

<style scoped>
.df-fig { max-width: 700px; margin: 8px auto 0; display: flex; flex-direction: column; gap: 9px; }
.df-r { display: flex; align-items: center; gap: 14px; background: #fbfaff; border: 1px solid #e9e3fa; border-radius: 12px; padding: 9px 12px; flex-wrap: wrap; }
.df-cap { width: 148px; display: flex; flex-direction: column; gap: 2px; }
.df-cap span { font-size: 14.5px; font-weight: 800; color: #4b2d9e; }
.df-cap small { font-size: 11.5px; line-height: 1.5; color: #8d7fb8; }
.df-units { display: flex; gap: 6px; flex-wrap: wrap; }
.df-one {
  width: 42px; height: 42px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #cfbdfb, #b39cf2); color: #3f2191; font-weight: 900; font-size: 16px;
  box-shadow: 0 2px 4px rgba(80, 50, 180, .16);
}
.df-none { color: #aaa2c2; font-size: 13px; }
.df-bar { display: flex; gap: 2px; background: #fff; padding: 5px; border: 1px solid #ddd6ee; border-radius: 8px; }
.df-cell { width: 34px; height: 20px; border-radius: 3px; background: #e9ebf1; transition: background .15s; }
.df-cell.on { background: #8b63e8; box-shadow: inset 0 -3px 0 rgba(0, 0, 0, .15); }
.df-mini .df-cell { width: 24px; height: 15px; }
.df-mini .df-cell.on { background: #c0abf6; }
.df-side { font-size: 12.5px; color: #6d46cf; font-weight: 700; }
.df-hr { margin-top: 2px; }
</style>
