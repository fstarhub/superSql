<template>
  <div class="insight-detail-container">
    <a-page-header
      class="insight-header"
      title="洞察详情"
      @back="handleBack"
    >
      <!-- <template #extra>
        <a-button @click="handleBack">返回</a-button>
      </template> -->
    </a-page-header>

    <div class="insight-content">
      <a-row :gutter="16">
        <!-- 左侧内容区域 -->
        <a-col :span="12">
          <a-card title="洞察内容" class="content-card">
            <div class="text-content" v-html="getMdiText(comeMsg || '暂无内容')"></div>
          </a-card>
        </a-col>

        <!-- 右侧图表区域 -->
        <a-col :span="12">
          <a-card title="数据可视化" class="chart-card">
            <div v-if="hasChartData(comeMsg)" class="chart-section">
              <div class="chart-placeholder">
                <BarChartOutlined class="chart-icon" />
                <p>数据可视化图表区域</p>
                <p class="chart-hint">这里可以展示SQL查询结果的可视化图表</p>
              </div>
            </div>
            <div v-else class="no-chart-data">
              <BarChartOutlined class="no-data-icon" />
              <p>当前内容暂无可视化数据</p>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <!-- 原始数据展示 -->
      <a-card title="原始数据" class="data-card" v-if="insightData?.data">
        <pre class="raw-data">{{ JSON.stringify(insightData.data, null, 2) }}</pre>
      </a-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BarChartOutlined } from '@ant-design/icons-vue'
import { fetchInsightDetail, type InsightDetail } from '@/api/insight'
import hljs from 'highlight.js'
import "highlight.js/styles/vs2015.css";
import MarkdownIt from 'markdown-it';

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

// 获取洞察详情
const loadInsightDetail = async (msg: string, requestChange: string) => {
  loading.value = true
  try {
    const res = await fetchInsightDetail({ sqlText: msg, requestChange: requestChange })
    console.log( '洞察详情:', res)
    insightData.value = res
  } catch (error) {
    console.error('获取洞察详情失败:', error)
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

// 返回处理
const handleBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  const content = route.query.content as string | undefined
  const requestChange = route.query.requestChange as string | ''
  if (content) {
    comeMsg.value = decodeURIComponent(content)
    const decodedRequestChange = requestChange ? decodeURIComponent(requestChange) : ''
    loadInsightDetail(comeMsg.value, decodedRequestChange)
  }
})
</script>

<style lang="less" scoped>
.insight-detail-container {
  height: 80vh;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.insight-header {
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  
  :deep(.ant-page-header-heading-title) {
    font-size: 20px;
    font-weight: 600;
  }
}

.insight-content {
  height: calc(100% - 80px);
  // overflow-y: auto;
}

.content-card, .chart-card, .data-card {
  height: 400px;
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

.chart-section {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #999;
  
  .chart-icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: #1890ff;
  }
  
  .chart-hint {
    font-size: 12px;
    margin-top: 8px;
  }
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
</style>