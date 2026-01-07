<template>
  <div class="insight-detail-container">
    <div class="insight-query-title">
      <span class="label">查询标题：</span>
      <span class="title-text">
        {{ insightData?.requestChange || comeMsg || '未命名查询' }}
      </span>
    </div>
    <!-- Loading 遮罩 -->
    <a-spin :spinning="loading" tip="正在加载洞察数据，请稍候..." :style="{ minHeight: '400px' }">
      <div class="insight-content" v-if="!loading || insightData">
        <a-row :gutter="16">
          <!-- 左侧内容区域 -->
          <a-col :span="12">
            <a-card title="数据表格" class="content-card">
              <!-- <div class="text-content" v-html="getMdiText(comeMsg || '暂无内容')"></div> -->
              <div v-if="insightData?.header && Array.isArray(insightData.header) && insightData.header.length > 0" class="data-table">
                <table class="insight-table">
                  <thead>
                    <tr>
                      <th v-for="(value,index) in insightData.header" :key="index" class="table-header-cell">
                        {{value}}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in insightData.data" :key="rowIndex">
                      <td v-for="(headerValue, colIndex) in insightData.header" :key="colIndex" class="table-cell">
                        {{getCellValue(row, headerValue, colIndex)}}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else-if="!loading" class="no-table-data">
                <div>暂无数据</div>
              </div>
            </a-card>
          </a-col>

          <!-- 右侧图表区域 -->
          <a-col :span="12">
            <a-card title="数据图表" class="chart-card">
              <div v-if="insightData?.chart" class="chart-section">
                <div ref="chartRef" class="chart-placeholder">
                </div>
              </div>
              <div v-else-if="!loading" class="no-chart-data">
                <BarChartOutlined class="no-data-icon" />
                <p>暂无数据</p>
              </div>
            </a-card>
          </a-col>
        </a-row>

        <!-- 原始数据展示 -->
        <!-- <a-card class="data-card">
           <div class="text-content" v-if="comeMsg">
            {{ comeMsg }}
           </div>
           <div v-else>暂无内容</div>
        </a-card> -->
        <div class="send-area">
          <a-input @pressEnter="handleEnter" :bordered="false" class="send-input" v-model:value.trim="inputText" placeholder="请输入你的问题" :disabled="isLoading">
            <template #suffix>
              <a-tooltip :title="isLoading ? '正在处理中...' : '发送消息'">
                <SendOutlined  @click="send" style="color: #535bf2;font-size: 26px" />
              </a-tooltip>
            </template>
          </a-input>
        </div>
      </div>
    </a-spin>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {SendOutlined, BarChartOutlined } from "@ant-design/icons-vue";
import { fetchInsightDetail, type InsightDetail, fetchInsightItem, updateInsight } from '@/api/insight'
import hljs from 'highlight.js'
import "highlight.js/styles/vs2015.css";
import MarkdownIt from 'markdown-it';
import * as echarts from 'echarts'
import { eventBus } from '@/util/eventBus'
const isLoading = ref(false)

// 创建MarkdownIt实例并配置hljs高亮
const mdi = new MarkdownIt({
  linkify: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(lang, code, true).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  }
})

// 代码块高亮函数
function highlightBlock(str:any, lang:any) {
  return `<pre class="pre-code-box"><div class="pre-code-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy"></span></div><div class="pre-code"><code class="hljs code-block-body ${lang}"> ${str}</code></div></pre>`
}

const route = useRoute()
const router = useRouter()

const comeMsg = ref<string>('')
const insightData = ref<InsightDetail | null>(null)
const loading = ref(false)
const chartRef = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null
const inputText = ref<string>('')
const currentInsightId = ref<string>('')

// 获取单元格值（支持对象和数组两种数据结构）
const getCellValue = (row: any, headerValue: string, colIndex: number): string => {
  // 如果row是对象，使用headerValue作为key
  if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
    return row[headerValue] || row[colIndex] || ''
  }
  // 如果row是数组，使用colIndex作为索引
  if (Array.isArray(row)) {
    return row[colIndex] || ''
  }
  return ''
}

// 获取洞察详情
const createInsight = async (msg: string, requestChange: string): Promise<void> => {
  loading.value = true
  try {
    const res = await fetchInsightDetail({ sqlText: msg, requestChange: requestChange })
    
    // 处理不同的数据结构
    const result = res.data || res
    currentInsightId.value = result.id || res.id
    insightData.value = result
    
    // 创建洞察后，触发刷新洞察列表事件
    eventBus.emit('refresh-insight-list')
    
    await nextTick() // ⭐ 非常关键

    if (chartRef.value) {
      const chartData = result.chart || res.chart
      if (chartData) {
        if (chart) {
          chart.dispose()
        }
        chart = echarts.init(chartRef.value)
        chart.setOption(chartData, true)
      }
    }
  } catch (error) {
    console.error('获取洞察详情失败:', error)
  } finally {
    loading.value = false
  }
}

const loadInsightById = async (insightId: string): Promise<void> => {
  loading.value = true
  try {
    console.log('=== 加载洞察详情 ===');
    console.log('insightId:', insightId);
    
    const res = await fetchInsightItem({ insightId: insightId })
    
    console.log('=== 洞察详情接口返回 ===');
    console.log('完整返回数据:', res);
    console.log('res.data:', (res as any).data);
    console.log('res.header:', res.header);
    console.log('res.chart:', res.chart);
    
    // 处理不同的数据结构
    const result = (res as any).data || res
    insightData.value = result
    currentInsightId.value = result.id || insightId
    
    console.log('更新后的 insightData:', insightData.value);
    
    await nextTick() // ⭐ 非常关键

    if (chartRef.value) {
      const chartData = result.chart || res.chart
      if (chartData) {
        if (chart) {
          chart.dispose()
        }
        chart = echarts.init(chartRef.value)
        chart.setOption(chartData, true)
        console.log('图表已初始化');
      } else {
        console.warn('没有图表数据');
      }
    }
  } catch (error) {
    console.error('=== 获取洞察详情失败 ===');
    console.error('错误信息:', error);
  } finally {
    loading.value = false
  }
}

// 检查是否有图表数据
const hasChartData = (content?: string) => {
  if (!content) return false
  
  const hasDataPatterns = [
    /SELECT.*FROM/i, // SQL查询
    /\|.*\|/g, // 表格格式
    /\d+\s*%/g, // 百分比数据
    /\d+\.?\d*/g // 数字数据
  ]
  
  return hasDataPatterns.some(pattern => pattern.test(content))
}

// 提取代码块内容
const extractCodeBlocks = (content?: string) => {
  if (!content) return '暂无内容'
  
  // 使用正则表达式匹配代码块
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g
  const codeBlocks = []
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push(match[1])
  }
  
  // 如果没有找到代码块，返回原始内容
  if (codeBlocks.length === 0) {
    return content
  }
  
  // 将代码块用Markdown代码块格式包装
  return codeBlocks.map(code => `\`\`\`\n${code}\n\`\`\``).join('\n\n')
}

// Markdown 渲染
const getMdiText = (content?: string) => {
  if (!content) return '暂无内容'
  
  // 只渲染代码块内容
  const codeContent = extractCodeBlocks(content)
  return mdi.render(codeContent)
}

const handleEnter = (e: { preventDefault: () => void; }) => {
  e.preventDefault() // 防止默认的表单提交行为
  send()
}
const send = () => {
  if (inputText.value.trim() === '' || loading.value) {
    return
  }
  handleUpdateInsight(currentInsightId.value, inputText.value)
  inputText.value = ''
}
const handleUpdateInsight = async (insightId: string, inputText: string) => {
  if (!insightId || !inputText.trim() || loading.value) {
    return
  }
  
  loading.value = true
  isLoadingInsight = true
  try {
    const res = await updateInsight({ insightId: insightId, question: inputText })
    
    // 处理不同的数据结构
    const result = (res as any).data || res
    insightData.value = result
    currentInsightId.value = result.id || insightId
    
    await nextTick() // ⭐ 非常关键

    if (chartRef.value) {
      const chartData = result.chart || res.chart
      if (chartData) {
        if (chart) {
          chart.dispose()
        }
        chart = echarts.init(chartRef.value)
        chart.setOption(chartData, true)
      }
    }
  } catch (error) {
    console.error('更新洞察详情失败:', error)
  } finally {
    loading.value = false
    isLoadingInsight = false
  }
}


// 防止重复加载的标志
let isLoadingInsight = false
let lastLoadedInsightId: string | null = null
let lastLoadedContent: string | null = null

// 加载洞察数据的函数
const loadInsightFromStorage = (): void => {
  // 从 sessionStorage 读取数据，而不是从 route.query
  const insightDataStr = sessionStorage.getItem('insightData')
  
  if (!insightDataStr) {
    console.log('没有找到洞察数据');
    return
  }
  
  try {
    const data = JSON.parse(insightDataStr)
    const { sqlText, requestChange, insightId } = data
    
    // 如果是相同的insightId或content，不重复加载
    if (insightId && lastLoadedInsightId === insightId && isLoadingInsight) {
      console.log('相同的insightId正在加载中，跳过重复加载');
      return
    }
    
    if (!insightId && sqlText) {
      if (lastLoadedContent === sqlText && isLoadingInsight) {
        console.log('相同的内容正在加载中，跳过重复加载');
        return
      }
    }
    
    comeMsg.value = sqlText || ''
    
    if (insightId) {
      // 通过insightId获取洞察详情
      if (lastLoadedInsightId !== insightId) {
        lastLoadedInsightId = insightId
        currentInsightId.value = insightId
        // 保存当前洞察ID到sessionStorage
        sessionStorage.setItem('currentInsightId', insightId)
        isLoadingInsight = true
        loadInsightById(insightId).finally(() => {
          isLoadingInsight = false
          // 加载完成后清除 sessionStorage
          sessionStorage.removeItem('insightData')
        })
      }
    } else {
      if (sqlText) {
        // 检查是否已经有insightId（防止刷新页面重复创建）
        const existingInsightId = sessionStorage.getItem('currentInsightId')
        if (existingInsightId && currentInsightId.value === existingInsightId) {
          console.log('已存在洞察ID，跳过重复创建:', existingInsightId)
          // 直接加载已存在的洞察
          loadInsightById(existingInsightId)
          return
        }
        
        if (lastLoadedContent !== sqlText) {
          lastLoadedContent = sqlText
          isLoadingInsight = true
          createInsight(sqlText, requestChange || '').finally(() => {
            isLoadingInsight = false
            // 保存当前洞察ID到sessionStorage，防止刷新重复创建
            if (currentInsightId.value) {
              sessionStorage.setItem('currentInsightId', currentInsightId.value)
            }
            // 加载完成后清除 sessionStorage
            sessionStorage.removeItem('insightData')
          })
        }
      }
    }
  } catch (error) {
    console.error('解析洞察数据失败:', error)
    sessionStorage.removeItem('insightData')
  }
}

// 监听 sessionStorage 变化，支持自由切换洞察项
let storageCheckInterval: NodeJS.Timeout | null = null
let insightDataChangedHandler: ((event: CustomEvent) => void) | null = null

const startStorageWatcher = (): void => {
  // 使用轮询方式监听 sessionStorage 变化
  storageCheckInterval = setInterval(() => {
    const insightDataStr = sessionStorage.getItem('insightData')
    if (insightDataStr) {
      try {
        const data = JSON.parse(insightDataStr)
        const { insightId, sqlText } = data
        
        // 如果数据发生变化，重新加载
        if (insightId && insightId !== lastLoadedInsightId) {
          console.log('检测到新的洞察ID，重新加载:', insightId)
          lastLoadedInsightId = null // 重置，允许重新加载
          loadInsightFromStorage()
        } else if (!insightId && sqlText && sqlText !== lastLoadedContent) {
          console.log('检测到新的SQL内容，重新加载')
          lastLoadedContent = null // 重置，允许重新加载
          loadInsightFromStorage()
        }
      } catch (error) {
        console.error('解析洞察数据失败:', error)
      }
    }
  }, 200) // 每200ms检查一次，提高响应速度
  
  // 监听自定义事件（当在洞察页面内切换时）
  insightDataChangedHandler = ((event: CustomEvent) => {
    console.log('收到洞察数据变化事件')
    lastLoadedInsightId = null
    lastLoadedContent = null
    loadInsightFromStorage()
  }) as (event: CustomEvent) => void
  
  window.addEventListener('insight-data-changed', insightDataChangedHandler as EventListener)
}

// 初始化
onMounted(() => {
  loadInsightFromStorage()
  // 启动监听
  startStorageWatcher()
})

onBeforeUnmount(() => {
  // 清理定时器
  if (storageCheckInterval) {
    clearInterval(storageCheckInterval)
    storageCheckInterval = null
  }
  // 清理图表
  if (chart) {
    chart.dispose()
    chart = null
  }
  // 移除事件监听
  if (insightDataChangedHandler) {
    window.removeEventListener('insight-data-changed', insightDataChangedHandler as EventListener)
    insightDataChangedHandler = null
  }
})
// onBeforeUnmount(() => {
//   chart?.dispose()
// })
</script>

<style lang="less" scoped>
.insight-detail-container {
  height: 80vh;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.insight-query-title {
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-left: 4px solid #535bf2;
  background: #f7f8ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.insight-query-title .label {
  color: #666;
  font-weight: 500;
}

.insight-query-title .title-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.insight-header {
  margin-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--theme-text-color, #333);
  
  :deep(.ant-page-header-heading-title) {
    font-size: 20px;
    font-weight: 600;
    color: var(--theme-text-color, #333);
  }
}

.insight-content {
  height: calc(100% - 80px);
  // overflow-y: auto;
}
.content-card, .chart-card {
  height: 450px;
  margin-bottom: 16px;
  
  :deep(.ant-card-body) {
    height: calc(100% - 57px);
    overflow-y: auto;
  }
}

.text-content {
  line-height: 1.6;
  
  :deep(pre) {
    background: #000000 !important;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    color: #ffffff !important;
  }
  
  :deep(code) {
    background: #000000 !important;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    color: #ffffff !important;
  }
  
  /* 覆盖highlight.js样式，保持黑色背景 */
  :deep(.hljs) {
    background: #000000 !important;
    color: #ffffff !important;
  }
}

.no-table-data {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.chart-section {
  height: 100%;
}

.no-chart-data {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  
  .no-data-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
}

.raw-data {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 200px;
  overflow-y: auto;
}
.chart-section {
  width: 100%;
  height: 100%;
}

.chart-placeholder {
  width: 100%;
  height: 100%;
}

.send-area{
  width: 100%;
  height: 120px;
  background: linear-gradient(0deg, #fff, hsla(0, 0%, 100%, .95));
  backdrop-filter: blur(10px);
}
.send-input{
  padding: 0 2vw !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  // width: 90%;
  min-height: 52px;
  padding: 0 12px 0 0;
  overflow: hidden;
  line-height: 52px;
  border: 2px solid #535bf2;
  border-radius: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(83, 91, 242, 0.1);
  
  &:hover {
    border-color: #6c5ce7;
    box-shadow: 0 4px 12px rgba(83, 91, 242, 0.15);
  }
  
  &:focus-within {
    border-color: #6c5ce7;
    box-shadow: 0 4px 16px rgba(83, 91, 242, 0.2);
  }
}
</style>