<template>
  <a-layout-sider 
    v-model:collapsed="collapsed" 
    :trigger="null" 
    collapsible
    :width="240"
    :style="{ background: '#fff', boxShadow: '2px 0 8px rgba(0,0,0,0.1)' }"
  >
    <div class="sidebar-header">
      <div class="logo-section">
        <img class="logo" src="@/assets/images/logo.png" alt="SuperSQL"/>
        <span v-if="!collapsed" class="logo-text">SuperSQL</span>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- 新建对话按钮 -->
      <div class="new-chat-section">
        <a-button 
          type="primary" 
          size="large" 
          block 
          @click="handleNewChat"
          :style="{ marginBottom: '16px' }"
        >
          <template #icon>
            <plus-outlined />
          </template>
          <span v-if="!collapsed">新建对话</span>
        </a-button>
      </div>

      <!-- 历史对话折叠菜单 -->
       <!-- @change="handleCollapseChange" -->
      <a-collapse 
        v-model:activeKey="activeKeys" 
        :bordered="false"
        :expand-icon-position="'end'"
        class="sidebar-collapse"
      >
        <a-collapse-panel key="history" :header="'历史对话'" :show-arrow="!collapsed">
          <div class="history-list">
            <div v-if="loading.history && !chatHistory.length" class="loading-state">
              <loading-outlined spin />
              <span>加载中...</span>
            </div>
            <div 
              v-else
              v-for="chat in chatHistory" 
              :key="chat.id"
              class="history-item"
              :class="{ active: activeChatId === chat.id }"
              @click="handleSelectChat(chat.id)"
            >
              <span class="history-title">{{ chat.description }}</span>
              <span class="history-time">{{ dayjs(chat.createTime).format('YYYY-MM-DD HH:mm:ss') }}</span>
            </div>
            <div v-if="!loading.history && chatHistory.length === 0" class="empty-history">
              暂无历史对话
            </div>
            <div v-if="hasMoreHistory && chatHistory.length > 0" class="load-more-section">
              <a-button 
                type="link" 
                size="small" 
                @click="loadMoreHistory"
                :loading="loading.history"
                :disabled="loading.history"
                class="load-more-btn"
              >
                {{ loading.history ? '加载中...' : '加载更多' }}
              </a-button>
            </div>
            <div v-if="!hasMoreHistory && chatHistory.length > 0" class="no-more-data">
              <span>没有更多数据了</span>
            </div>
          </div>
        </a-collapse-panel>

        <!-- 数据洞察折叠菜单 -->
        <a-collapse-panel key="insight" :header="'数据洞察'" :show-arrow="!collapsed">
          <div class="insight-list">
            <div v-if="loading.insight && !insightList.length" class="loading-state">
              <loading-outlined spin />
              <span>加载中...</span>
            </div>
            <div 
              v-else
              v-for="insight in insightList" 
              :key="insight.id"
              class="insight-item"
              @click="handleSelectInsight(insight.id)"
            >
              <bar-chart-outlined />
              <span class="insight-title">{{ insight.requestChange }}</span>
            </div>
            <div v-if="!loading.insight && insightList.length === 0" class="empty-insight">
              暂无数据洞察
            </div>
            <div v-if="hasMoreInsight && insightList.length > 0" class="load-more-section">
              <a-button 
                type="link" 
                size="small" 
                @click="loadMoreInsight"
                :loading="loading.insight"
                :disabled="loading.insight"
                class="load-more-btn"
              >
                {{ loading.insight ? '加载中...' : '加载更多' }}
              </a-button>
            </div>
            <div v-if="!hasMoreInsight && insightList.length > 0" class="no-more-data">
              <span>没有更多数据了</span>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>

    <!-- 折叠按钮 -->
    <!-- <div class="sidebar-footer">
      <a-button 
        type="text" 
        @click="toggleCollapse"
        :style="{ width: '100%', border: 'none' }"
      >
        <template #icon>
          <menu-fold-outlined v-if="!collapsed" />
          <menu-unfold-outlined v-else />
        </template>
        <span v-if="!collapsed">收起菜单</span>
      </a-button>
    </div> -->
  </a-layout-sider>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  PlusOutlined, 
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LoadingOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { ChatHistoryParams, fetchChatHistory, type ChatHistoryItem, type ChatHistoryResponse } from '@/api/chatHistory'
import { fetchInsightList, type InsightItem, type InsightResponse } from '@/api/insight'
import { eventBus } from '@/util/eventBus'

// 类型定义 - 使用API接口的类型
const router = useRouter()
const route = useRoute()

const collapsed = ref(false)
const activeKeys = ref<string[]>(['history', 'insight'])
const activeChatId = ref<string | null>(null)
const loading = ref({
  history: false,
  insight: false
})
const chatHistoryParam = ref<ChatHistoryParams>({
  oucAiAppAlias: 'text2Sql_ai_app',
  pageNum: '1',
  pageSize: '10'
})
const insightParam = ref({
  pageNum: '1',
  pageSize: '10'
})

// 响应式数据
const chatHistory = ref<ChatHistoryItem[]>([])
const insightList = ref<InsightItem[]>([])

// 分页相关变量
const hasMoreHistory = ref(true)
const hasMoreInsight = ref(true)

// 数据获取函数
const loadChatHistory = async (loadMore = false): Promise<void> => {
  if (loading.value.history || !hasMoreHistory.value) return
  
  loading.value.history = true
  try {
    const res = await fetchChatHistory(chatHistoryParam.value)
    const newItems = res.content || []
    
    if (loadMore) {
      chatHistory.value.push(...newItems)
    } else {
      chatHistory.value = newItems
    }
    
    // 判断是否还有更多数据
    hasMoreHistory.value = newItems.length === parseInt(chatHistoryParam.value.pageSize)
    
    // 如果有更多数据，更新页码
    if (hasMoreHistory.value) {
      chatHistoryParam.value.pageNum = (parseInt(chatHistoryParam.value.pageNum) + 1).toString()
    }
  } catch (error) {
    console.error('获取历史对话失败:', error)
  } finally {
    loading.value.history = false
  }
}

const loadInsightList = async (loadMore = false): Promise<void> => {
  if (loading.value.insight || !hasMoreInsight.value) return
  
  loading.value.insight = true
  try {
    const res = await fetchInsightList(insightParam.value);
    const newItems = res.content || []
    
    if (loadMore) {
      insightList.value.push(...newItems)
    } else {
      insightList.value = newItems
    }
    
    // 判断是否还有更多数据
    hasMoreInsight.value = newItems.length === parseInt(insightParam.value.pageSize)
    
    // 如果有更多数据，更新页码
    if (hasMoreInsight.value) {
      insightParam.value.pageNum = (parseInt(insightParam.value.pageNum) + 1).toString()
    }
  } catch (error) {
    console.error('获取数据洞察失败:', error)
  } finally {
    loading.value.insight = false
  }
}

// 加载更多函数
const loadMoreHistory = (): void => {
  if (hasMoreHistory.value && !loading.value.history) {
    loadChatHistory(true)
  }
}

const loadMoreInsight = (): void => {
  if (hasMoreInsight.value && !loading.value.insight) {
    loadInsightList(true)
  }
}

// 初始化数据
onMounted(() => {
  loadChatHistory()
  loadInsightList()
})

// 折叠面板变化事件
const handleCollapseChange = (keys: string[]): void => {
  // 当面板展开时加载对应数据
  if (keys.includes('history') && chatHistory.value.length === 0) {
    loadChatHistory()
  }
  if (keys.includes('insight') && insightList.value.length === 0) {
    loadInsightList()
  }
}

const handleNewChat = async (): Promise<void> => {
  try {
    // 触发新建对话事件
    eventBus.emit('new-chat')
    
    // 直接导航到聊天页面，不添加新的对话到列表
    activeChatId.value = null
    router.push('/chat')
  } catch (error) {
    console.error('创建新对话失败:', error)
  }
}

const handleSelectChat = (chatId: string): void => {
  activeChatId.value = chatId
  router.push({
    path: '/chat',
    query: { 
      chatId: chatId,
      from: 'history'
    }
  })
}

const handleSelectInsight = (insightId: string): void => {
  // 查找对应的洞察数据
  const insight = insightList.value.find(item => item.id === insightId)
  if (insight) {
    // 跳转到洞察详情页面
    router.push({
      path: '/home/insight',
      query: { 
        insightId: insightId
      }
    })
  }
}

const toggleCollapse = (): void => {
  collapsed.value = !collapsed.value
}
</script>

<style lang="less" scoped>
.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo {
  width: 32px;
  height: 32px;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #1890ff;
}

.sidebar-content {
  flex: 1;
  padding: 0 16px;
  overflow-y: auto;
}

.new-chat-section {
  margin-bottom: 16px;
}

.sidebar-collapse {
  background: transparent;
  
  :deep(.ant-collapse-item) {
    border-bottom: none;
    
    .ant-collapse-header {
      padding: 12px 0 !important;
      font-weight: 500;
    }
    
    .ant-collapse-content-box {
      padding: 0 !important;
    }
  }
}

.history-list, .insight-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item, .insight-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    background: #f5f5f5;
  }
  
  &.active {
    background: #e6f7ff;
    color: #1890ff;
  }
}

.history-item {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.history-title {
  font-size: 14px;
  flex: 1;
}

.history-time {
  font-size: 12px;
  color: #999;
}

.insight-title {
  font-size: 14px;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: #999;
  font-size: 14px;
}

.load-more-section {
  text-align: center;
  padding: 8px;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
}

.load-more-btn {
  color: #1890ff;
  font-size: 12px;
  
  &:hover {
    color: #40a9ff;
  }
  
  &:disabled {
    color: #d9d9d9;
    cursor: not-allowed;
  }
}

.no-more-data {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 8px;
  border-top: 1px solid #f0f0f0;
  margin-top: 8px;
}

.empty-history, .empty-insight {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 16px;
}

.sidebar-footer {
  border-top: 1px solid #f0f0f0;
  padding: 8px;
}

:deep(.ant-layout-sider-children) {
  display: flex;
  flex-direction: column;
}
</style>