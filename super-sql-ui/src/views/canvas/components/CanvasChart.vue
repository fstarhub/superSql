<template>
  <div class="canvas-chart-wrapper">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  options: any
}>()

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  if (props.options) {
    chartInstance.setOption(props.options)
  }
}

watch(() => props.options, (newVal) => {
  if (chartInstance && newVal) {
    chartInstance.setOption(newVal, true)
  }
}, { deep: true })

// Handle resize
const resizeObserver = new ResizeObserver(() => {
  chartInstance?.resize()
})

onMounted(() => {
  nextTick(() => {
    initChart()
    if (chartRef.value) {
      resizeObserver.observe(chartRef.value)
    }
  })
})

onBeforeUnmount(() => {
  if (chartRef.value) {
    resizeObserver.unobserve(chartRef.value)
  }
  chartInstance?.dispose()
})
</script>

<style scoped>
.canvas-chart-wrapper {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
.chart-container {
  width: 100%;
  height: 100%;
}
</style>