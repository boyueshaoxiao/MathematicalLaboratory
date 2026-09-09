<template>
  <div class="fb-wrap" :class="{ clickable }" :style="{ maxWidth: width + 'px', background: baseColor }"
    :aria-label="`${n} 等分、涂 ${states ? states.filter(Boolean).length : m} 份的分数条`">
    <div v-for="i in n" :key="i" class="fb-cell"
      :class="{ on: isOn(i - 1), clickable }"
      :style="isOn(i - 1) ? { background: fillColor } : null"
      @click="tap(i - 1)" :title="clickable ? `第 ${i} 份` : ''" />
  </div>
</template>

<script setup>
const props = defineProps({
  n: { type: Number, default: 4 },
  states: { type: Array, default: null },
  m: { type: Number, default: 1 },
  width: { type: Number, default: 560 },
  height: { type: Number, default: 62 },
  clickable: { type: Boolean, default: false },
  fillColor: { type: String, default: '#5b8def' },
  baseColor: { type: String, default: '#fff3e0' }
})
const emit = defineEmits(['tap'])

function isOn(i) {
  return props.states ? !!props.states[i] : i < props.m
}
function tap(i) {
  if (props.clickable) emit('tap', i)
}
</script>

<style scoped>
.fb-wrap {
  display: flex; width: 100%; margin: 0 auto;
  border: 2px solid #d9a26b; border-radius: 10px; overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(120, 80, 20, .08);
}
.fb-wrap.clickable .fb-cell { cursor: pointer; }
.fb-cell {
  flex: 1; height: v-bind(height + 'px'); min-width: 0;
  border-right: 1.5px solid rgba(240, 200, 150, .75); transition: background .15s;
}
.fb-cell:last-child { border-right: 0; }
.fb-cell.clickable:hover { filter: brightness(.96); }
</style>
