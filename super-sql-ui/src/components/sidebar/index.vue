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
        <img class="logo" src="@/assets/images/beihero.png" alt="BeiHero Logo" />
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
          <span v-if="!collapsed">新聊天</span>
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
        <a-collapse-panel key="history" :header="'你的聊天'" :show-arrow="!collapsed">
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
              暂无你的聊天
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
              :class="{ 'editing': editingInsightId === insight.id }"
              @mouseenter="hoveredInsightId = insight.id"
              @mouseleave="hoveredInsightId = null"
              @dblclick.stop="handleStartEdit(insight)"
            >
              <bar-chart-outlined />
              <!-- 编辑模式 -->
              <a-input
                v-if="editingInsightId === insight.id"
                v-model:value="editingInsightName"
                @blur="handleSaveEdit(insight.id)"
                @pressEnter="handleSaveEdit(insight.id)"
                @click.stop
                class="insight-edit-input"
                :auto-focus="true"
              />
              <!-- 显示模式 -->
              <span 
                v-else 
                class="insight-title"
                @click.stop="handleSelectInsight(insight.sqlText, insight.requestChange, insight.id)"
              >
                {{ insight.requestChange }}
              </span>
              <!-- 删除按钮（悬停时显示） -->
              <a-button
                v-if="hoveredInsightId === insight.id && editingInsightId !== insight.id"
                type="text"
                size="small"
                danger
                class="insight-delete-btn"
                @click.stop="handleDeleteInsight(insight.id)"
                :loading="loading.insight"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 
  PlusOutlined, 
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LoadingOutlined,
  DeleteOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { ChatHistoryParams, fetchChatHistory, type ChatHistoryItem, type ChatHistoryResponse } from '@/api/chatHistory'
import { fetchInsightList, deleteInsight, updateInsightName, type InsightItem, type InsightResponse } from '@/api/insight'
import { eventBus } from '@/util/eventBus'
import { message, Modal } from 'ant-design-vue'

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

// 洞察编辑相关状态
const editingInsightId = ref<string | null>(null)
const editingInsightName = ref<string>('')
const hoveredInsightId = ref<string | null>(null)

// 防止重复请求的请求锁
const historyRequesting = ref(false)
const insightRequesting = ref(false)

// 是否已初始化加载过
const historyInitialized = ref(false)
const insightInitialized = ref(false)

// 数据获取函数
const loadChatHistory = async (loadMore = false): Promise<void> => {
  // 请求锁：防止并发 & 重复触发
  if (historyRequesting.value) return

  // 非 loadMore 且已初始化过，不再重复请求
  if (!loadMore && historyInitialized.value) return

  // 没有更多数据时，不再 loadMore
  if (loadMore && !hasMoreHistory.value) return

  historyRequesting.value = true
  loading.value.history = true

  try {
    const res = await fetchChatHistory(chatHistoryParam.value)
    const newItems = res.content || res.data?.content || res.data || []

    if (loadMore) {
      const existingIds = new Set(chatHistory.value.map(item => item.id))
      const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id))
      chatHistory.value.push(...uniqueNewItems)
    } else {
      chatHistory.value = newItems
      historyInitialized.value = true
    }

    const pageSize = Number(chatHistoryParam.value.pageSize)
    hasMoreHistory.value = newItems.length === pageSize

    if (loadMore && hasMoreHistory.value) {
      chatHistoryParam.value.pageNum = String(Number(chatHistoryParam.value.pageNum) + 1)
    }
  } catch (e) {
    console.error('获取历史对话失败', e)
  } finally {
    historyRequesting.value = false
    loading.value.history = false
  }
}

const loadInsightList = async (loadMore = false): Promise<void> => {
  if (insightRequesting.value) return
  if (!loadMore && insightInitialized.value) return
  if (loadMore && !hasMoreInsight.value) return

  insightRequesting.value = true
  loading.value.insight = true

  try {
    const res = await fetchInsightList(insightParam.value)
    const newItems = res.content || res.data?.content || res.data || []

    if (loadMore) {
      const existingIds = new Set(insightList.value.map(item => item.id))
      const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id))
      insightList.value.push(...uniqueNewItems)
    } else {
      insightList.value = newItems
      insightInitialized.value = true
    }

    const pageSize = Number(insightParam.value.pageSize)
    hasMoreInsight.value = newItems.length === pageSize

    if (loadMore && hasMoreInsight.value) {
      insightParam.value.pageNum = String(Number(insightParam.value.pageNum) + 1)
    }
  } catch (e) {
    console.error('获取洞察失败', e)
  } finally {
    insightRequesting.value = false
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

  // 监听刷新事件
  eventBus.on('refresh-chat-history', () => {
    chatHistoryParam.value.pageNum = '1'
    hasMoreHistory.value = true
    historyInitialized.value = false
    loadChatHistory(false)
  })

  eventBus.on('refresh-insight-list', () => {
    insightParam.value.pageNum = '1'
    hasMoreInsight.value = true
    insightInitialized.value = false
    loadInsightList(false)
  })
})

onUnmounted(() => {
  eventBus.off('refresh-chat-history')
  eventBus.off('refresh-insight-list')
})

// 折叠面板变化事件
const handleCollapseChange = (keys: string[]): void => {
  // 「你的聊天」：只在未初始化且列表为空时加载，防止折叠误触发重复请求
  if (
    keys.includes('history') &&
    !historyInitialized.value &&
    chatHistory.value.length === 0
  ) {
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

    // 刷新历史对话列表（只在sidebar已初始化后才刷新，避免重复请求）
    setTimeout(() => {
      // 仅在当前 sidebar 已初始化后才刷新，避免重复请求
      historyInitialized.value = false
      eventBus.emit('refresh-chat-history')
    }, 300)
  } catch (error) {
    console.error('创建新对话失败:', error)
  }
}

// 防抖：防止重复点击
let chatClickTimer: NodeJS.Timeout | null = null

const handleSelectChat = (chatId: string): void => {
  activeChatId.value = chatId

  if (chatClickTimer) {
    clearTimeout(chatClickTimer)
  }

  // 防抖处理：100ms内只执行一次
  chatClickTimer = setTimeout(() => {
    const chatData = {
      chatId,
      timestamp: Date.now()
    }

    // 先写入 sessionStorage（兜底）
    sessionStorage.setItem('chatData', JSON.stringify(chatData))

    if (route.path === '/chat') {
      // 已在 chat 页面，直接通知
      window.dispatchEvent(
        new CustomEvent('chat-changed', { detail: chatData })
      )
    } else {
      // 不在 chat 页面：直接跳转
      router.push('/chat')
    }
  }, 100)
}

// 防抖：防止重复点击（优化为更短的延迟，允许快速切换）
let insightClickTimer: NodeJS.Timeout | null = null

const handleSelectInsight = (sqlText: string, requestChange: string, insightId: string): void => {
  // 清除之前的定时器
  if (insightClickTimer) {
    clearTimeout(insightClickTimer)
  }
  
  // 防抖处理：100ms内只执行一次（缩短延迟，允许快速切换）
  insightClickTimer = setTimeout(() => {
    // 将数据存储到 sessionStorage，不通过地址栏传递
    const insightData = {
      sqlText,
      requestChange,
      insightId,
      timestamp: Date.now()
    }
    sessionStorage.setItem('insightData', JSON.stringify(insightData))
    
    // 如果当前已经在洞察页面，直接触发数据加载
    if (route.path === '/home/insight') {
      // 触发自定义事件，让洞察页面重新加载数据
      window.dispatchEvent(new CustomEvent('insight-data-changed', { detail: insightData }))
    } else {
      // 只跳转路径，不传参数
      router.push({
        path: '/home/insight'
      })
    }
  }, 100)
}

const toggleCollapse = (): void => {
  collapsed.value = !collapsed.value
}

// 开始编辑洞察名称
const handleStartEdit = (insight: InsightItem): void => {
  editingInsightId.value = insight.id
  editingInsightName.value = insight.requestChange
}

// 保存编辑的洞察名称
const handleSaveEdit = async (insightId: string): Promise<void> => {
  if (!editingInsightName.value.trim()) {
    message.warning('名称不能为空')
    editingInsightId.value = null
    return
  }
  
  // 如果名称没有变化，直接取消编辑
  const insight = insightList.value.find(item => item.id === insightId)
  if (insight && insight.requestChange === editingInsightName.value.trim()) {
    editingInsightId.value = null
    return
  }
  
  try {
    await updateInsightName({
      insightId: insightId,
      name: editingInsightName.value.trim()
    })
    
    // 更新本地列表
    if (insight) {
      insight.requestChange = editingInsightName.value.trim()
    }
    
    message.success('名称更新成功')
    editingInsightId.value = null
  } catch (error) {
    console.error('更新洞察名称失败:', error)
    message.error('更新名称失败，请重试')
    // 恢复原值
    if (insight) {
      editingInsightName.value = insight.requestChange
    }
  }
}

// 删除洞察
const handleDeleteInsight = async (insightId: string): Promise<void> => {
  // 确认删除
  const insight = insightList.value.find(item => item.id === insightId)
  if (!insight) return
  
  // 使用 Modal 确认删除
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除"${insight.requestChange}"吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        loading.value.insight = true
        await deleteInsight({ insightId: insightId })
        
        // 从列表中移除
        const index = insightList.value.findIndex(item => item.id === insightId)
        if (index > -1) {
          insightList.value.splice(index, 1)
        }
        
        message.success('删除成功')
        
        // 如果删除后列表为空，重新加载
        if (insightList.value.length === 0) {
          insightParam.value.pageNum = '1'
          loadInsightList()
        }
      } catch (error) {
        console.error('删除洞察失败:', error)
        message.error('删除失败，请重试')
      } finally {
        loading.value.insight = false
      }
    }
  })
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
  justify-content: center;
  gap: 8px;
  padding: 6px 8px;
}

.logo {
  width: 120px;
  height: 40px;
  object-fit: contain;
  display: block;
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
  
  :deep(.ant-btn-primary) {
    background: linear-gradient(135deg, #535bf2 0%, #6c5ce7 100%);
    border: none;
    height: 44px;
    font-size: 15px;
    font-weight: 500;
    border-radius: 10px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(83, 91, 242, 0.2);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(83, 91, 242, 0.3);
      background: linear-gradient(135deg, #6c5ce7 0%, #535bf2 100%);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 2px 6px rgba(83, 91, 242, 0.25);
    }
  }
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
  max-height: 260px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(83, 91, 242, 0.3) transparent;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(83, 91, 242, 0.3);
    border-radius: 2px;
    
    &:hover {
      background: rgba(83, 91, 242, 0.5);
    }
  }
}

.history-item, .insight-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin: 4px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%) scaleY(0);
    width: 3px;
    height: 0;
    background: #535bf2;
    border-radius: 0 2px 2px 0;
    transition: all 0.2s ease;
  }
  
  &:hover {
    background: #f5f7fa;
    transform: translateX(2px);
    
    &::before {
      transform: translateY(-50%) scaleY(1);
      height: 60%;
    }
  }
  
  &.active {
    background: linear-gradient(90deg, rgba(83, 91, 242, 0.1) 0%, rgba(83, 91, 242, 0.05) 100%);
    color: #535bf2;
    font-weight: 500;
    
    &::before {
      transform: translateY(-50%) scaleY(1);
      height: 60%;
    }
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
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.insight-item {
  &.editing {
    background: #f0f0f0;
    cursor: default;
  }
  
  .insight-edit-input {
    flex: 1;
    height: 28px;
    
    :deep(.ant-input) {
      padding: 4px 8px;
      font-size: 14px;
    }
  }
  
  .insight-delete-btn {
    opacity: 0;
    transition: opacity 0.2s ease;
    margin-left: auto;
    padding: 2px 4px;
    min-width: auto;
    height: 24px;
    
    &:hover {
      background-color: rgba(255, 77, 79, 0.1);
    }
  }
  
  &:hover .insight-delete-btn {
    opacity: 1;
  }
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