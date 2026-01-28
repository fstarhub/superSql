<script setup lang="ts">
  import {SendOutlined, UserOutlined, CopyOutlined, EyeOutlined, CloseOutlined} from "@ant-design/icons-vue";
  import {nextTick, onMounted, ref, onBeforeUnmount, watch} from "vue";
  import { useRouter, useRoute } from "vue-router";
  import {fetchChatRecord} from "@/api/chatRecord.ts";
  import {useScroll} from "@/util/useScroll.ts";
  import MarkdownIt from 'markdown-it'
  import mdKatex from '@traptitech/markdown-it-katex'
  import hljs from 'highlight.js';
  import "highlight.js/styles/vs2015.css";
  import { message as antMessage, Modal } from 'ant-design-vue';
  import { eventBus } from '@/util/eventBus';
  import {fetchChatProcess} from "@/api/chat.ts";
  
  const {scrollRef, scrollToBottom, scrollToBottomIfAtBottom, smoothScrollToBottom} = useScroll()
  
  const messages=ref([] as any)
  const blockIndex=ref(0)
  const filterText = ref<string>()
  const isLoading = ref(false)
  const chatId = ref<string>('')
  const showWelcomeMessage = ref(true)
  
  let controller = new AbortController()
  let currentAiMessageIndex = -1
  let isStreaming = false
  let scrollTimer: NodeJS.Timeout | null = null
  
  const route = useRoute()
  
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
  mdi.use(mdKatex, { blockClass: 'katexmath-block rounded-md p-[10px]', errorColor: ' #cc0000' })
  
  function highlightBlock(str:any, lang:any) {
    return `<pre class="pre-code-box"><div class="pre-code-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy"></span></div><div class="pre-code"><code class="hljs code-block-body ${lang}"> ${str}</code></div></pre>`
  }
  
  const getMdiText = (value:any) => {
    return mdi.render(value || '')
  }
  
  const copyToClipboard = async (content: string) => {
    try {
      const codeMatch = content.match(/```(?:\w+)?\n([\s\S]*?)\n```/)
      const textToCopy = codeMatch ? codeMatch[1] : content
      await navigator.clipboard.writeText(textToCopy)
      antMessage.success('复制成功')
    } catch (err) {
      antMessage.error('复制失败')
    }
  }
  
  const loadChatRecords = async () => {
    if (!chatId.value) return
    try {
      isLoading.value = true
      const res = await fetchChatRecord({
        oucAiAppAlias: 'text2Sql_ai_app',
        chatId: chatId.value,
        pageNum: '1',
        pageSize: '20'
      })
      const records = res.content || (res as any).data?.content || (res as any).data || []
      messages.value = []
      records.forEach(record => {
        if (record.question) {
          messages.value.push({
            messageType: 'your',
            content: record.question,
            timestamp: new Date(record.createTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          })
        }
        if (record.answer) {
          messages.value.push({
            messageType: 'ai',
            content: record.answer,
            question: record.question,
            timestamp: new Date(record.createTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          })
        }
      })
      showWelcomeMessage.value = messages.value.length === 0
      nextTick(() => scrollToBottom())
    } catch (error) {
      antMessage.error('加载记录失败')
    } finally {
      isLoading.value = false
    }
  }
  
  watch(() => route.query.chatId, (newChatId) => {
    if (newChatId && newChatId !== chatId.value) {
      chatId.value = newChatId as string
      if (route.query.from === 'history') loadChatRecords()
    }
  })
  
  const resetChat = () => {
    messages.value = []
    chatId.value = ''
    showWelcomeMessage.value = true
  }
  
  const handleChatChanged = (e: Event) => {
    const customEvent = e as CustomEvent
    const data = customEvent.detail
    if (data && data.chatId) {
      if (chatId.value !== data.chatId) {
        chatId.value = data.chatId
        loadChatRecords()
      }
    }
  }
  
  onMounted(()=> {
    eventBus.on('new-chat', resetChat)
    const sessionChatData = sessionStorage.getItem('chatData')
    if (sessionChatData) {
      try {
        const data = JSON.parse(sessionChatData)
        if (data.chatId && data.chatId !== chatId.value) {
          chatId.value = data.chatId
          loadChatRecords()
        }
      } catch (e) { console.error(e) }
    }
    if (!chatId.value && route.query.chatId) {
      chatId.value = route.query.chatId as string
      if (route.query.from === 'history') loadChatRecords()
    }
    window.addEventListener('chat-changed', handleChatChanged as EventListener)
    if (showWelcomeMessage.value && chatId.value) showWelcomeMessage.value = false
  })
  
  onBeforeUnmount(() => {
    window.removeEventListener('chat-changed', handleChatChanged as EventListener)
    if (scrollTimer) clearTimeout(scrollTimer)
    if (controller) controller.abort()
  })
  
  const router = useRouter()
  
  const extractCodeBlocks = (content?: string) => {
    if (!content) return ''
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g
    const codeBlocks = []
    let match
    while ((match = codeBlockRegex.exec(content)) !== null) { codeBlocks.push(match[1]) }
    if (codeBlocks.length === 0) {
      const unclosedMatch = content.match(/```(?:\w+)?\n([\s\S]*)$/)
      if (unclosedMatch) codeBlocks.push(unclosedMatch[1])
    }
    return codeBlocks[0]?.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() || content
  }
  
  const handleInsightClick = (content: string, question: string): void => {
    const sqlContent = extractCodeBlocks(content)
    const insightData = {
      sqlText: sqlContent,
      requestChange: question,
      insightId: '',
      timestamp: Date.now()
    }
    sessionStorage.setItem('insightData', JSON.stringify(insightData))
    router.push({ path: '/home/insight' })
  }
  
  const handleTextAreaEnter = (e: KeyboardEvent) => {
    if (e.isComposing) return
    if (e.shiftKey) return 
    e.preventDefault()
    send()
  }
  
  const send = async () => {
    let lastResponseLength = 0
    let lineBuffer = ''
    if (isLoading.value || !filterText.value?.trim()) return
    if (showWelcomeMessage.value) showWelcomeMessage.value = false
  
    const inputText = filterText.value
    isLoading.value = true
    const data={ query: inputText, stream: true, oucAiAppAlias: 'text2Sql_ai_app', chatId: chatId.value }
    messages.value.push({ messageType: "your", content: inputText })
    scrollToBottom()
    nextTick(() => { filterText.value = "" })
  
    let messageId = ''
    let rawBuffer = ''
    const aiMessage = { messageType: 'ai', content: '', question: inputText }
    messages.value.push(aiMessage)
    currentAiMessageIndex = messages.value.length - 1
    isStreaming = true
  
    try {
      await fetchChatProcess({
        data,
        signal: controller.signal,
        onDownloadProgress: ({event}) => {
          const xhr = event.target
          const {responseText} = xhr
          if (!responseText || responseText === 'undefined') return
          const newText = responseText.slice(lastResponseLength)
          lastResponseLength = responseText.length
          lineBuffer += newText
          const lines = lineBuffer.split('\n')
          lineBuffer = lines.pop() || ''
          for (const line of lines) {
            const trimmedLine = line.trim()
            if (trimmedLine === '[DONE]') {
              if (messageId && !chatId.value) chatId.value = messageId
              isStreaming = false
              return
            }
            if (trimmedLine.startsWith('data:')) {
              try {
                const jsonData = trimmedLine.substring(5).trim()
                if (!jsonData || jsonData === '[DONE]') continue
                const responseData = JSON.parse(jsonData)
                if (responseData.Choices?.[0]?.Delta?.Content) {
                  rawBuffer += responseData.Choices[0].Delta.Content
                  messages.value[currentAiMessageIndex].content = rawBuffer
                  scrollToBottomIfAtBottom()
                }
                if (responseData.Id && !messageId) {
                  messageId = responseData.Id
                }
              } catch (e) { }
            }
          }
        },
        afterRequest:()=>{
          isStreaming = false
          if (messageId && !chatId.value) chatId.value = messageId
          smoothScrollToBottom()
          isLoading.value = false
        }
      })
    } catch (error) { isLoading.value = false }
  }
  </script>
  
  <template>
    <a-card class="global-card" :bordered="false" :bodyStyle="{ padding: '0', height: '100%', overflow: 'hidden' }">
      <div class="center-main">
        <div class="chat-list" id="scrollRef" ref="scrollRef">
         <div v-if="showWelcomeMessage">
           <div class="welcomeClass">
             <div class="welcomeTitle">请输入查询需求</div>
           </div>
         </div>
         
         <div v-for="(item, index) in messages" :key="index">
           <div class="ai-message" v-if="item.messageType === 'ai'">
             <a-space align="start" :size="12">
               <a-avatar :size="36" class="ai-avatar-box">
                 <template #icon><img src="@/assets/images/ai_logo.png"></template>
               </a-avatar>
               <div class="ai-content-container">
                <div class="ai-content" v-html="getMdiText(item.content)"></div>
                <div class="action-buttons" v-if="item.content?.trim()">
                   <a-tooltip title="复制代码">
                     <a-button type="text" size="small" @click="copyToClipboard(item.content)" class="action-btn">
                       <CopyOutlined /> 复制
                     </a-button>
                   </a-tooltip>
                   <a-tooltip title="数据洞察">
                     <a-button type="text" size="small" @click="handleInsightClick(item.content, item.question || '')" class="action-btn">
                       <EyeOutlined /> 洞察
                     </a-button>
                   </a-tooltip>
                 </div>
               </div>
             </a-space>
           </div>
  
           <div class="you-message" v-if="item.messageType === 'your'">
             <a-space align="start" :size="12">
               <div class="you-content" v-html="item.content"></div>
               <a-avatar :size="36" style="background-color: #535bf2">U</a-avatar>
             </a-space>
           </div>
         </div>
         
         <div class="ai-message" v-if="isLoading && messages[messages.length - 1]?.messageType === 'your'">
           <a-space align="center" :size="12">
             <a-avatar :size="36" class="ai-avatar-box">
               <template #icon><img src="@/assets/images/ai_logo.png"></template>
             </a-avatar>
             <div class="loading-container">
               <div class="loading-dots"><span></span><span></span><span></span></div>
             </div>
           </a-space>
         </div>
        </div>
  
        <div class="send-area-wrapper">
          <div class="send-area-inner">
            <a-textarea 
              v-model:value="filterText" 
              placeholder="请输入查询需求..." 
              :auto-size="{ minRows: 1, maxRows: 6 }"
              @keydown.enter="handleTextAreaEnter" 
              :bordered="false" 
              class="chat-textarea" 
              :disabled="isLoading"
            />
            <div class="send-actions">
              <a-tooltip :title="isLoading ? '处理中...' : '发送'">
                <div class="send-btn" :class="{ 'disabled': isLoading || !filterText?.trim() }" @click="send">
                  <SendOutlined />
                </div>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </a-card>
  </template>
  
  <style scoped lang="less">
  .global-card {
    height: 100%;
    margin: 0 !important;
    display: flex;
    flex-direction: column;
    background: transparent;
  }
  
  .center-main {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #fff;
    overflow: hidden; /* 核心：禁止外层任何形式的滚动 */
  }
  
  /* 聊天区域 */
  .chat-list {
    flex: 1; /* 自动撑满剩余空间 */
    min-height: 0; /* 核心：防止 flex 子项溢出 */
    width: 100%;
    padding: 24px 15%; /* 增加垂直内边距 */
    overflow-y: auto; /* 只有这里可以滚动 */
    scrollbar-width: thin;
    scroll-behavior: smooth;
  
    &::-webkit-scrollbar { width: 5px; }
    &::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 3px; }
  
    .welcomeClass {
      text-align: center;
      padding-top: 15vh;
      .welcomeTitle { font-size: 24px; color: #333; font-weight: 500; }
    }
  
    .ai-message {
      margin-bottom: 28px;
      animation: fadeInUp 0.3s cubic-bezier(0.2, 0, 0, 1);
      .ai-avatar-box { background: transparent; img { width: 36px; height: 36px; } }
      .ai-content {
        background-color: #f9fafb; /* Lighter background */
        border: 1px solid #eaecf0; /* Subtle border */
        border-radius: 0 16px 16px 16px; /* Softer radius */
        padding: 16px 20px;
        line-height: 1.6;
        color: #1f2937; /* Darker text for contrast */
        font-size: 15px;
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.05); /* Subtle shadow */
      }
      .action-buttons {
        display: flex; gap: 8px; margin-top: 8px;
        .action-btn { 
          font-size: 13px; /* Slightly larger */
          color: #6b7280; /* Gray-500 */
          height: 28px; 
          padding: 0 10px; 
          background: transparent; 
          border: 1px solid transparent; 
          border-radius: 6px;
          transition: all 0.2s;
          &:hover { 
            color: #535bf2; 
            background: #eff6ff; 
          } 
        }
      }
    }
  
    .you-message {
      margin-bottom: 28px; display: flex; justify-content: flex-end;
      .you-content {
        background: linear-gradient(135deg, #535bf2 0%, #6366f1 100%); /* Gradient for premium feel */
        color: #fff; 
        border-radius: 16px 0 16px 16px;
        padding: 16px 20px; 
        font-size: 15px; 
        line-height: 1.6;
        box-shadow: 0 4px 6px -1px rgba(83, 91, 242, 0.3); /* Colored shadow */
      }
    }
  }
  
  /* 输入框区域：绝对静止 */
  .send-area-wrapper {
    flex-shrink: 0; /* 禁止被压缩 */
    padding: 10px 15% 24px 15%; /* 内边距与 chat-list 保持一致，实现对齐 */
    background: #fff;
    z-index: 10;
    position: relative;
  }
  
  .send-area-inner {
    display: flex; align-items: flex-end; background: #fff;
    border-radius: 16px; 
    border: 1px solid #e5e7eb; /* Stronger initial border */
    padding: 10px 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    &:focus-within { 
      border-color: #535bf2; 
      box-shadow: 0 0 0 4px rgba(83, 91, 242, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.05); /* Glow effect */
    }
  }
  
  .chat-textarea {
    flex: 1;
    :deep(textarea) {
      padding: 4px 0; font-size: 15px; line-height: 1.5; resize: none !important;
      &::placeholder { color: #ccc; }
    }
  }
  
  .send-actions { margin-left: 10px; padding-bottom: 2px; }
  
  .send-btn {
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    border-radius: 8px; background: #535bf2; color: #fff; cursor: pointer; transition: all 0.2s;
    &:hover { background: #4349d6; transform: scale(1.05); }
    &.disabled { background: #f5f5f5; color: #ccc; cursor: not-allowed; transform: none; }
  }
  
  .loading-container {
    padding: 12px 16px; background: #f4f4f7; border-radius: 4px 12px 12px 12px;
    .loading-dots {
      display: flex; gap: 4px;
      span { width: 6px; height: 6px; border-radius: 50%; background: #535bf2; animation: loading 1.4s infinite; &:nth-child(1) { animation-delay: -0.32s; } &:nth-child(2) { animation-delay: -0.16s; } }
    }
  }
  
  @keyframes loading { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; } }
  
  /* 强制清除所有潜在的外部滚动 */
  :deep(.ant-card-body) { overflow: hidden !important; height: 100%; display: flex; flex-direction: column; }
  </style>