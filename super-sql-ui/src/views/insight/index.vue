<template>
  <div class="insight-detail-container">
    <a-page-header
      class="insight-header"
      title="数据洞察详情"
      :sub-title="insightData?.requestChange || '洞察详情'"
      @back="handleBack"
    >
      <template #extra>
        <a-button @click="handleBack">返回</a-button>
      </template>
    </a-page-header>

    <div class="insight-content">
      <a-row :gutter="16">
        <!-- 左侧内容区域 -->
        <a-col :span="12">
          <a-card title="洞察内容" class="content-card">
            <div class="text-content" v-html="getMdiText(insightData?.content || '暂无内容')"></div>
          </a-card>
        </a-col>

        <!-- 右侧图表区域 -->
        <a-col :span="12">
          <a-card title="数据可视化" class="chart-card">
            <div v-if="hasChartData(insightData?.content)" class="chart-section">
              <div class="chart-placeholder">
                <bar-chart-outlined class="chart-icon" />
                <p>数据可视化图表区域</p>
                <p class="chart-hint">这里可以展示SQL查询结果的可视化图表</p>
              </div>
            </div>
            <div v-else class="no-chart-data">
              <bar-chart-outlined class="no-data-icon" />
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
import { markdownIt } from '@/utils/markdown'

const route = useRoute()
const router = useRouter()

const insightData = ref<InsightDetail | null>(null)
const loading = ref(false)

// 获取洞察详情
const loadInsightDetail = async (insightId: string) => {
  loading.value = true
  try {
    const res = await fetchInsightDetail({ id: insightId })
    insightData.value = res
  } catch (error) {
    console.error('获取洞察详情失败:', error)
  } finally {
    loading.value = false
  }
}

// 检查是否有图表数据
const hasChartData = (content: string) => {
  if (!content) return false
  
  const hasDataPatterns = [
    /SELECT.*FROM/i, // SQL查询
    /\|.*\|/g, // 表格格式
    /\d+\s*%/g, // 百分比数据
    /\d+\.?\d*/g // 数字数据
  ]
  
  return hasDataPatterns.some(pattern => pattern.test(content))
}

// Markdown 渲染
const getMdiText = (content: string) => {
  if (!content) return '暂无内容'
  return markdownIt.render(content)
}

// 返回处理
const handleBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  const insightId = route.query.insightId as string
  const content = route.query.content as string
  
  if (insightId) {
    // 从侧边栏点击进入，加载洞察详情
    loadInsightDetail(insightId)
  } else if (content) {
    // 从聊天页面点击进入，直接显示内容
    insightData.value = {
      id: 'chat-content',
      requestChange: '聊天内容洞察',
      content: decodeURIComponent(content),
      data: null
    }
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
    background: #f6f8fa;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
  }
  
  :deep(code) {
    background: #f6f8fa;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
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