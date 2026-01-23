<template>
  <div class="insight-detail-container">
    <div class="insight-query-title">
      <span class="label">查询标题：</span>
      <span class="title-text">
        {{ insightData?.requestChange || comeMsg || '未命名查询' }}
      </span>
    </div>

    <a-spin :spinning="loading" tip="正在加载洞察数据..." wrapperClassName="insight-loading-wrapper">
      <div class="insight-content" v-if="!loading || insightData">
        <a-row :gutter="16" class="content-row">
          <a-col :span="12" class="content-col">
            <a-card title="数据表格" class="content-card">
              <div v-if="insightData?.header?.length" class="data-table-container">
                <table class="insight-table">
                  <thead>
                    <tr>
                      <th v-for="(value,index) in insightData.header" :key="index">
                        {{value}}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in insightData.data" :key="rowIndex">
                      <td v-for="(headerValue, colIndex) in insightData.header" :key="colIndex">
                        {{getCellValue(row, headerValue, colIndex)}}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else-if="!loading" class="no-data-placeholder">
                <a-empty description="暂无表格数据" />
              </div>
            </a-card>
          </a-col>

          <a-col :span="12" class="content-col">
            <a-card title="数据图表" class="chart-card">
              <template #extra>
                <a-tooltip title="下载图表">
                  <a-button type="text" size="small" @click="downloadChart" :disabled="!insightData?.chart">
                    <template #icon><DownloadOutlined /></template>
                  </a-button>
                </a-tooltip>
              </template>
              <div v-if="insightData?.chart" class="chart-section">
                <div ref="chartRef" class="chart-placeholder"></div>
              </div>
              <div v-else-if="!loading" class="no-data-placeholder">
                <a-empty description="暂无图表数据">
                  <template #image>
                    <BarChartOutlined style="font-size: 48px; color: #d9d9d9" />
                  </template>
                </a-empty>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <div class="send-area-wrapper">
          <div class="send-area">
            <a-textarea 
              v-model:value="inputText" 
              placeholder="请输入您的问题，Enter 发送，Shift + Enter 换行..." 
              :auto-size="{ minRows: 1, maxRows: 5 }"
              @keydown.enter="handleTextAreaEnter" 
              :bordered="false" 
              class="send-input" 
              :disabled="isLoading"
            />
            <div class="send-actions">
              <a-tooltip :title="isLoading ? '处理中...' : '点击发送'">
                <div class="send-btn" :class="{ 'disabled': isLoading || !inputText.trim() }" @click="send">
                  <SendOutlined />
                </div>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { SendOutlined, BarChartOutlined, DownloadOutlined } from "@ant-design/icons-vue";
import { fetchInsightDetail, type InsightDetail, fetchInsightItem, updateInsight } from '@/api/insight'
import * as echarts from 'echarts'
import { eventBus } from '@/util/eventBus'
import { message } from 'ant-design-vue';

const isLoading = ref(false)
const comeMsg = ref<string>('')
const insightData = ref<InsightDetail | null>(null)
const loading = ref(false)
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const inputText = ref<string>('') // 注意：这里去掉了 trim
const currentInsightId = ref<string>('')

const getCellValue = (row: any, headerValue: string, colIndex: number): string => {
  if (typeof row === 'object' && row !== null && !Array.isArray(row)) return row[headerValue] || row[colIndex] || ''
  if (Array.isArray(row)) return row[colIndex] || ''
  return ''
}

const downloadChart = () => {
  if (!chart) { message.warning('图表未加载'); return; }
  const url = chart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  const a = document.createElement('a');
  a.href = url;
  a.download = `图表_${new Date().getTime()}.png`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

const initChart = (chartData: any) => {
  if (chartRef.value && chartData) {
    if (chart) chart.dispose()
    chart = echarts.init(chartRef.value)
    chart.setOption(chartData, true)
  }
}

const handleTextAreaEnter = (e: KeyboardEvent) => {
  if (e.isComposing) return; // 处理输入法组合
  if (e.shiftKey) return;    // Shift + Enter 正常换行
  e.preventDefault();        // Enter 阻止换行并发送
  send();
}

const send = () => {
  if (!inputText.value.trim() || loading.value) return
  handleUpdateInsight(currentInsightId.value, inputText.value)
  inputText.value = ''
}

const handleUpdateInsight = async (insightId: string, text: string) => {
  loading.value = true; isLoading.value = true
  try {
    const res = await updateInsight({ insightId, question: text })
    insightData.value = res.data || res
    await nextTick(); initChart(insightData.value?.chart)
  } catch (err) { message.error('更新失败'); } 
  finally { loading.value = false; isLoading.value = false }
}

const createInsight = async (msg: string, requestChange: string) => {
  loading.value = true
  try {
    const res = await fetchInsightDetail({ sqlText: msg, requestChange })
    insightData.value = res.data || res
    currentInsightId.value = (res.data || res).id
    eventBus.emit('refresh-insight-list')
    await nextTick(); initChart(insightData.value?.chart)
  } finally { loading.value = false }
}

const loadInsightById = async (insightId: string) => {
  loading.value = true
  try {
    const res = await fetchInsightItem({ insightId })
    insightData.value = res.data || res
    currentInsightId.value = (res.data || res).id
    await nextTick(); initChart(insightData.value?.chart)
  } finally { loading.value = false }
}

let storageCheckInterval: any = null
onMounted(() => {
  const check = () => {
    const dataStr = sessionStorage.getItem('insightData')
    if (!dataStr) return
    const data = JSON.parse(dataStr)
    if (data.insightId) loadInsightById(data.insightId)
    else if (data.sqlText) createInsight(data.sqlText, data.requestChange)
    sessionStorage.removeItem('insightData')
  }
  check(); storageCheckInterval = setInterval(check, 500)
  window.addEventListener('resize', () => chart?.resize())
})

onBeforeUnmount(() => {
  clearInterval(storageCheckInterval); chart?.dispose()
})
</script>

<style lang="less" scoped>
/* 1. 基础布局容器 */
.insight-detail-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px); /* 100px 是针对顶部导航的预留，可根据实际调整 */
  overflow: hidden; 
  background: transparent;
  gap: 12px;
}

/* 2. 标题栏 */
.insight-query-title {
  flex-shrink: 0;
  padding: 12px 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  font-size: 15px;
  .label { color: #535bf2; font-weight: 600; }
  .title-text { flex: 1; margin-left: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

/* 3. 中间内容区 */
:deep(.insight-loading-wrapper) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  .ant-spin-container { height: 100%; display: flex; flex-direction: column; }
}

.insight-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 12px;
}

.content-row {
  flex: 1;
  min-height: 0;
  margin: 0 !important;
  .content-col { height: 100%; padding: 0 8px !important; }
}

/* 4. 卡片样式优化：找回最初的视觉感 */
.content-card, .chart-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid #f0f0f0;

  :deep(.ant-card-head) {
    flex-shrink: 0;
    min-height: 48px;
    border-bottom: 1px solid #f0f0f0;
  }

  :deep(.ant-card-body) {
    flex: 1;
    overflow: hidden;
    padding: 0 !important;
    display: flex;
    flex-direction: column;
  }
}

/* 5. 数据表格样式还原 */
.data-table-container {
  flex: 1;
  overflow: auto;
  scrollbar-width: thin;

  .insight-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #f5f7fa;
      th {
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #333;
        border-bottom: 1px solid #e8e8e8;
        border-right: 1px solid #f0f0f0;
        white-space: nowrap;
      }
    }

    tbody td {
      padding: 10px 16px;
      color: #555;
      border-bottom: 1px solid #e8e8e8;
      border-right: 1px solid #f0f0f0;
    }

    tr:nth-child(even) { background-color: #fafafa; }
    tr:hover {
      background-color: #e6f7ff;
      td { color: #1890ff; }
    }
  }
}

/* 6. 图表区域还原 */
.chart-section {
  flex: 1;
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
  .chart-placeholder { width: 100%; height: 100%; }
}

/* 7. 输入框区域优化 */
.send-area-wrapper {
  flex-shrink: 0;
  padding: 4px 0 12px 0;
}

.send-area {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #d9d9d9;
  display: flex;
  align-items: flex-end; /* 按钮对齐输入框底部 */
  padding: 6px 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  transition: border-color 0.3s;

  &:focus-within {
    border-color: #535bf2;
    box-shadow: 0 2px 12px rgba(83, 91, 242, 0.1);
  }
}

.send-input {
  flex: 1;
  :deep(textarea) {
    padding: 8px 0;
    font-size: 14px;
    line-height: 1.6;
    resize: none !important;
    /* 核心：保证空格和换行能够显示 */
    white-space: pre-wrap;
    word-break: break-all;
    &::placeholder { color: #bfbfbf; }
  }
}

.send-actions {
  margin-left: 12px;
  padding-bottom: 4px;
}

.send-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #535bf2;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #4349d6; transform: scale(1.05); }
  &.disabled { background: #f5f5f5; color: #ccc; cursor: not-allowed; transform: none; }
}

.no-data-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 强制隐藏系统级外层滚动条 */
:deep(.ant-layout-content) {
  overflow: hidden !important;
}
</style>