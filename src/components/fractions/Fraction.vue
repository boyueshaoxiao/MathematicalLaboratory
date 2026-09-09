<template>
  <span class="frac-fraction" :class="{ small, tall }">
    <span class="frac-numer">{{ m }}</span>
    <span class="frac-denom">{{ n }}</span>
  </span>
</template>

<script setup>
defineProps({
  m: { type: Number, required: true },
  n: { type: Number, required: true },
  small: { type: Boolean, default: false },
  tall: { type: Boolean, default: false }
})
</script>

<style scoped>
.small { font-size: 24px; }
.tall { line-height: 1.15; }
</style>
