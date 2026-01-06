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
const isLoading = ref(false) // 加载状态
const chatId = ref<string>('') // 对话ID
const showWelcomeMessage = ref(true) // 控制欢迎语显示状态

let controller = new AbortController()
let currentAiMessageIndex = -1 // 当前流式输出的AI消息索引
let isStreaming = false // 是否正在流式输出
let scrollTimer: NodeJS.Timeout | null = null // 滚动节流定时器

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
  return mdi.render(value)
}

// 复制代码段到剪贴板
const copyToClipboard = async (content: string) => {
  try {
    // 提取代码块内容（如果有）
    const codeMatch = content.match(/```(?:\w+)?\n([\s\S]*?)\n```/)
    const textToCopy = codeMatch ? codeMatch[1] : content
    
    await navigator.clipboard.writeText(textToCopy)
    antMessage.success('复制成功')
  } catch (err) {
    console.error('复制失败:', err)
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = content
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      antMessage.success('复制成功')
    } catch (fallbackErr) {
      antMessage.error('复制失败')
    }
    document.body.removeChild(textArea)
  }
}

// 检查是否有图表数据
const hasChartData = (content: string) => {
  // 这里可以添加更复杂的逻辑来检测是否有可图表化的数据
  // 例如：检测SQL查询结果、数据表格、统计信息等
  const hasDataPatterns = [
    /SELECT.*FROM/i, // SQL查询
    /\|.*\|/g, // 表格格式
    /\d+\s*%/g, // 百分比数据
    /\d+\.?\d*/g // 数字数据
  ]
  
  return hasDataPatterns.some(pattern => pattern.test(content))
}

// 加载历史对话记录到messages变量
const loadChatRecords = async () => {
  if (!chatId.value) return
  
  try {
    console.log('=== 加载聊天记录 ===');
    console.log('chatId:', chatId.value);
    
    const res = await fetchChatRecord({
      oucAiAppAlias: 'text2Sql_ai_app',
      chatId: chatId.value,
      pageNum: '1',
      pageSize: '20'
    })
    
    console.log('=== 聊天记录接口返回 ===');
    console.log('完整返回数据:', res);
    console.log('res.content:', res.content);
    console.log('res.data:', (res as any).data);
    
    // 处理不同的数据结构
    const records = res.content || (res as any).data?.content || (res as any).data || []
    
    console.log('提取的 records:', records);
    console.log('records 数量:', records.length);
      
    // 清空当前消息，然后添加历史记录
    messages.value = []
    
    // 将历史记录转换为消息格式并添加到messages中
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
    
    console.log('更新后的 messages:', messages.value);
    
    // 隐藏欢迎语，因为现在显示历史记录
    showWelcomeMessage.value = false
  } catch (error) {
    console.error('=== 加载历史对话记录失败 ===');
    console.error('错误信息:', error);
    antMessage.error('加载历史对话记录失败')
  }
}

// 监听路由参数变化
watch(() => route.query.chatId, (newChatId) => {
  if (newChatId && newChatId !== chatId.value) {
    chatId.value = newChatId as string
    // 如果是来自历史对话的跳转，加载历史记录
    if (route.query.from === 'history') {
      loadChatRecords()
    }
  }
})

// 重置聊天状态
const resetChat = () => {
  messages.value = []
  chatId.value = ''
  showWelcomeMessage.value = true
}

onMounted(()=> {
  // 监听新建对话事件
  eventBus.on('new-chat', resetChat)
  
  // 初始化时检查是否有chatId参数
  if (route.query.chatId) {
    chatId.value = route.query.chatId as string
    // 如果是来自历史对话的跳转，加载历史记录
    if (route.query.from === 'history') {
      loadChatRecords()
    }
  }
  
  if (showWelcomeMessage.value) {
    // 欢迎语现在通过模板静态显示
  }
})

onBeforeUnmount(() => {
  // 清理滚动定时器
  if (scrollTimer) {
    clearTimeout(scrollTimer)
    scrollTimer = null
  }
  // 取消请求
  if (controller) {
    controller.abort()
  }
})

const router = useRouter()

// 提取代码块内容
const extractCodeBlocks = (content?: string) => {
  if (!content) return ''

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

  // 返回第一个代码块内容（通常是SQL），并去除换行符，同时合并多余空格
  return codeBlocks[0].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
}

// 防抖：防止重复点击洞察按钮
let insightClickTimer: NodeJS.Timeout | null = null
let isNavigatingToInsight = false

const handleInsightClick = (content: string, question: string): void => {
  // 如果正在导航中，忽略点击
  if (isNavigatingToInsight) {
    console.log('正在导航到洞察页面，忽略重复点击');
    return
  }
  
  // 清除之前的定时器
  if (insightClickTimer) {
    clearTimeout(insightClickTimer)
  }
  
  // 设置导航标志
  isNavigatingToInsight = true
  
  // 防抖处理：300ms内只执行一次
  insightClickTimer = setTimeout(() => {
    // 从内容中提取SQL代码块
    const sqlContent = extractCodeBlocks(content)
    
    // 将数据存储到 sessionStorage，不通过地址栏传递
    const insightData = {
      sqlText: sqlContent,
      requestChange: question,
      insightId: '',
      timestamp: Date.now()
    }
    sessionStorage.setItem('insightData', JSON.stringify(insightData))
    
    // 只跳转路径，不传参数
    router.push({
      path: '/home/insight'
    }).finally(() => {
      // 导航完成后重置标志
      setTimeout(() => {
        isNavigatingToInsight = false
      }, 500)
    })
  }, 300)
}

const handleEnter = (e: { preventDefault: () => void; }) => {
  e.preventDefault() // 防止默认的表单提交行为
  send()
}

const send = async () => {
  // 检查是否正在加载或输入为空
  if (isLoading.value || !filterText.value?.trim()) {
    return
  }
  
  // 如果是第一次发送消息，隐藏欢迎语
  if (showWelcomeMessage.value) {
    showWelcomeMessage.value = false
  }
  
  // 使用nextTick确保DOM更新完成后再清空输入框
  const inputText = filterText.value
  
  // 设置加载状态
  isLoading.value = true
  const data={
    query: inputText,
    stream: true, // 改为流式输出
    oucAiAppAlias: 'text2Sql_ai_app',
    chatId: chatId.value // 添加对话ID参数
  }
  const message={
    messageType: "your",
    content: inputText
  }
  messages.value.push(message)
  scrollToBottom()
  
  // 在DOM更新完成后清空输入框
  nextTick(() => {
    filterText.value = ""
  })
  
  // 创建AI消息占位符，用于流式更新
  let accumulatedContent = ''
  let messageId = ''
  
  // 重置流式输出状态
  if (isStreaming) {
    // 如果之前有未完成的流式输出，先完成它
    isStreaming = false
  }
  
  // 添加AI消息占位符
  const aiMessage = {
    messageType: 'ai',
    content: '',
    id: '',
    question: inputText,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  messages.value.push(aiMessage)
  currentAiMessageIndex = messages.value.length - 1
  isStreaming = true
  accumulatedContent = '' // 重置累积内容
  messageId = '' // 重置消息ID
  // 初始滚动到底部
  nextTick(() => {
    smoothScrollToBottom()
  })
  
  try {
    await fetchChatProcess({
      data,
      signal: controller.signal,
      onDownloadProgress: ({event}) => {
        const xhr = event.target
        const {responseText} = xhr
        
        // 检查responseText是否有效
        if (!responseText || responseText === 'undefined') {
          return
        }
        
        // 处理SSE流式响应
        if (responseText && typeof responseText === 'string') {
          const lines = responseText.split('\n')
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            
            // 检查是否到达结束标志
            if (trimmedLine === '[DONE]' || trimmedLine === '[done]') {
              console.log('检测到结束标志[DONE]')
              // 保存对话ID
              if (messageId && !chatId.value) {
                chatId.value = messageId
                console.log('保存对话ID:', chatId.value)
              }
              // 更新最终消息
              if (currentAiMessageIndex >= 0 && currentAiMessageIndex < messages.value.length) {
                // 确保内容不为空时才更新
                if (accumulatedContent) {
                  messages.value[currentAiMessageIndex].content = accumulatedContent
                }
                if (messageId) {
                  messages.value[currentAiMessageIndex].id = messageId
                }
                // 确保question字段保留，用于洞察按钮（必须保留）
                if (!messages.value[currentAiMessageIndex].question && inputText) {
                  messages.value[currentAiMessageIndex].question = inputText
                }
                // 确保时间戳存在
                if (!messages.value[currentAiMessageIndex].timestamp) {
                  messages.value[currentAiMessageIndex].timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                }
              }
              isStreaming = false
              // 回复完成后，平滑滚动到底部
              nextTick(() => {
                smoothScrollToBottom()
              })
              return
            }
            
            // 处理以"data:"开头的SSE格式行
            if (trimmedLine.startsWith('data:')) {
              try {
                const jsonData = trimmedLine.substring(5).trim()
                if (!jsonData || jsonData === '' || jsonData === '[DONE]') {
                  continue
                }
                
                const responseData = JSON.parse(jsonData)
                
                // 适配新的响应结构
                // {
                //   "Choices": [{"Delta": {"Content": "查询"}}],
                //   "Id": "08de480d-290c-4855-8702-47d826cdeaab"
                // }
                if (responseData.Choices && Array.isArray(responseData.Choices) && responseData.Choices.length > 0) {
                  const choice = responseData.Choices[0]
                  if (choice.Delta && choice.Delta.Content) {
                    // 累积内容
                    accumulatedContent += choice.Delta.Content
                    
                    // 更新消息内容（流式显示）
                    if (currentAiMessageIndex >= 0 && currentAiMessageIndex < messages.value.length) {
                      messages.value[currentAiMessageIndex].content = accumulatedContent
                      // 确保question字段始终保留（在流式输出过程中也要保留）
                      if (!messages.value[currentAiMessageIndex].question && inputText) {
                        messages.value[currentAiMessageIndex].question = inputText
                      }
                      // 流式输出时，始终自动滚动到底部（类似ChatGPT）
                      // 使用节流，避免频繁滚动影响性能
                      if (scrollTimer) {
                        clearTimeout(scrollTimer)
                      }
                      scrollTimer = setTimeout(() => {
                        nextTick(() => {
                          smoothScrollToBottom()
                        })
                      }, 50) // 每50ms最多滚动一次
                    }
                  }
                  
                  // 保存消息ID（从第一个响应中获取）
                  if (responseData.Id && !messageId) {
                    messageId = responseData.Id
                    if (currentAiMessageIndex >= 0 && currentAiMessageIndex < messages.value.length) {
                      messages.value[currentAiMessageIndex].id = messageId
                    }
                  }
                }
              } catch (e) {
                // 忽略单行解析错误，继续处理下一行
                console.log('单行解析失败:', trimmedLine, '错误:', e)
              }
            }
          }
        }
      },
      beforeRequest:()=>{
        // 请求开始
      },
      afterRequest:()=>{
        console.log("请求完成")
        isStreaming = false
        // 确保最终内容已更新
        if (currentAiMessageIndex >= 0 && currentAiMessageIndex < messages.value.length) {
          // 确保内容不为空时才更新
          if (accumulatedContent) {
            messages.value[currentAiMessageIndex].content = accumulatedContent
          }
          if (messageId) {
            messages.value[currentAiMessageIndex].id = messageId
          }
          // 确保question字段保留，用于洞察按钮（必须保留）
          if (!messages.value[currentAiMessageIndex].question && inputText) {
            messages.value[currentAiMessageIndex].question = inputText
          }
          // 确保时间戳存在
          if (!messages.value[currentAiMessageIndex].timestamp) {
            messages.value[currentAiMessageIndex].timestamp = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          }
          // 调试日志：检查消息数据
          console.log('最终消息数据:', {
            content: messages.value[currentAiMessageIndex].content?.substring(0, 50) + '...',
            hasQuestion: !!messages.value[currentAiMessageIndex].question,
            question: messages.value[currentAiMessageIndex].question
          })
        }
        // 保存对话ID
        if (messageId && !chatId.value) {
          chatId.value = messageId
        }
        // 回复完成后，平滑滚动到底部
        nextTick(() => {
          smoothScrollToBottom()
        })
        // 重置索引
        currentAiMessageIndex = -1
      }
    })
  } catch (error) {
    console.error('请求失败:', error)
  } finally {
    // 无论成功或失败，都取消加载状态
    isLoading.value = false
  }
}

</script>


<template>

  <a-card class="global-card">
    <div class="center-main">

      <!-- 主聊天区域 -->
      <div class="chat-list" id="scrollRef" ref="scrollRef">
       <!-- 欢迎语 -->
       <div v-if="showWelcomeMessage">
         <div class="welcomeClass">
           <div class="welcomeTitle">
              请输入查询需求
            </div>
         </div>
       </div>
       
       <!-- 聊天内容 -->
       <div v-for="(item, index) in messages" :key="index">
         <div class="ai-message" v-if="item.messageType === 'ai'">
           <a-space align="start">
             <a-avatar :size="50" style="background-color: rgba(255,255,255,0) ">
               <template #icon>
                 <img style="width: 48px !important;height: 48px !important;" src="@/assets/images/ai_logo.png">
               </template>
             </a-avatar>
             <div class="ai-content-container">
              <div class="ai-content" v-html="getMdiText(item.content)">
              </div>
              <!-- 操作按钮区域 -->
              <div class="action-buttons" v-if="item.messageType === 'ai' && item.content && item.content.trim().length > 0">
                 <a-tooltip title="复制代码">
                   <a-button 
                     type="text" 
                     size="small" 
                     @click="copyToClipboard(item.content)"
                     class="action-btn"
                   >
                     <CopyOutlined />
                     复制
                   </a-button>
                 </a-tooltip>
                 <a-tooltip title="数据洞察">
                   <a-button 
                     type="text" 
                     size="small" 
                     @click="handleInsightClick(item.content, item.question || '')"
                     class="action-btn"
                     :disabled="!item.content || !item.content.trim()"
                   >
                     <EyeOutlined />
                     洞察
                   </a-button>
                 </a-tooltip>
               </div>
               <!-- <div class="message-time" v-if="item.timestamp">
                 {{ item.timestamp }}
               </div> -->
             </div>
           </a-space>
         </div>

         <div class="you-message" v-if="item.messageType === 'your'">

           <a-space align="start">
             <div class="you-content" v-html="item.content">
             </div>

             <a-avatar :size="50" style="background-color: #535bf2">U</a-avatar>

           </a-space>

         </div>
       </div>
       
       <!-- 加载动画 -->
       <div class="ai-message" v-if="isLoading && messages[messages.length - 1]?.messageType === 'your'">
         <a-space align="center">
           <a-avatar :size="50" style="background-color: rgba(255,255,255,0) ">
             <template #icon>
               <img style="width: 48px !important;height: 48px !important;" src="@/assets/images/ai_logo.png">
             </template>
           </a-avatar>
           <div class="loading-container">
             <div class="loading-dots">
               <span></span>
               <span></span>
               <span></span>
             </div>
             <div class="loading-text">AI正在思考中...</div>
           </div>
         </a-space>
       </div>

      </div>

      <!-- 发送区域 -->
      <div class="send-area">

        <a-input @pressEnter="handleEnter" :bordered="false" class="send-input" v-model:value.trim="filterText" placeholder="请输入你的问题" :disabled="isLoading">
          <template #suffix>
            <a-tooltip :title="isLoading ? '正在处理中...' : '发送消息'">
              <SendOutlined  @click="send" style="color: #535bf2;font-size: 26px" />
            </a-tooltip>
          </template>
        </a-input>

      </div>



    </div>
  </a-card>

</template>


<style scoped lang="less">

:deep(img){
  width: 100px !important;
  height: auto !important;
  border: 4px solid #ffffff;
  border-radius: 10px;
}
.center-main{
  position: relative;
  width: 100%;
  height: 70vh;
  overflow: hidden;
  background-color: #fff;
}


.chat-list{
  width: 100%;
  height: calc(100% - 110px);
  padding:0 80px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: none;
  scroll-behavior: smooth;
  
  // 隐藏滚动条但保持滚动功能
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(83, 91, 242, 0.3);
    border-radius: 3px;
    
    &:hover {
      background: rgba(83, 91, 242, 0.5);
    }
  }
  .welcomeClass {
    text-align: center;
    .welcomeTitle {
      font-size: 26px;
      font-weight: 500;
    }
  }
  .ai-message{
    //float: left;
    margin: 16px 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-shrink: 1;
    animation: fadeInUp 0.3s ease-out;
    .ai-content-container{
      display: flex;
      flex-direction: column;
      .ai-content{
        background-color: rgba(83, 91, 242, 0.09);
        border-radius: 12px;
        padding: 16px 18px;
        line-height: 1.6;
        transition: all 0.3s ease;
        word-wrap: break-word;
        overflow-wrap: break-word;
        
        &:hover {
          background-color: rgba(83, 91, 242, 0.12);
        }
        
        img{
          width: 400px !important;
          height: auto !important;
          border-radius: 8px;
          margin: 8px 0;
        }
      }
      // 操作按钮样式
      .action-buttons {
        display: flex;
        gap: 8px;
        margin-top: 10px;
        justify-content: flex-end;
        opacity: 1; // 默认显示按钮
        transition: opacity 0.2s ease;
        
        // 悬停时保持显示，可以添加其他效果
        .ai-message:hover & {
          opacity: 1;
        }
        
        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #535bf2;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 13px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          background: #fff;
          
          &:hover {
            color: #fff;
            background-color: #535bf2;
            border-color: #535bf2;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(83, 91, 242, 0.3);
          }
          
          &:active {
            transform: translateY(0);
            box-shadow: 0 1px 4px rgba(83, 91, 242, 0.2);
          }
        }
      }
      .message-id{
        font-size: 12px;
        color: #999;
        margin-top: 5px;
        text-align: right;
        font-family: monospace;
      }
    }
  }
  .you-message{
    margin: 16px 0;
    //float: right;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    animation: fadeInUp 0.3s ease-out;
    .you-content{
      background: linear-gradient(135deg, #535bf2 0%, #6c5ce7 100%);
      color: #fff;
      border-radius: 12px;
      padding: 16px 18px;
      max-width: 80%;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
      transition: all 0.3s ease;
      
      &:hover {
        box-shadow: 0 4px 12px rgba(83, 91, 242, 0.3);
        transform: translateY(-1px);
      }
    }
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    .loading-dots {
      display: flex;
      gap: 4px;
      span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #535bf2;
        animation: loading 1.4s ease-in-out infinite both;
        
        &:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        &:nth-child(2) {
          animation-delay: -0.16s;
        }
      }
    }
    .loading-text {
      margin-top: 8px;
      font-size: 14px;
      color: #666;
    }
  }
  
  @keyframes loading {
    0%, 80%, 100% {
      transform: scale(0);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

// 洞察模态框样式
.insight-modal {
  .insight-content {
    padding: 20px;
    .contentRow {
      display: flex;
      gap: 10px;
      .text-content {
        width: 50%;
        padding: 15px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      .chart-section {
        width: 50%;
      }
    }
    
    .no-chart-data {
      width: 100%;
      text-align: center;
      padding: 40px 20px;
      color: #999;
      font-size: 14px;
      background-color: #f5f5f5;
      border-radius: 8px;
    }
  }
}

.send-area{
  position: absolute;
  bottom: 0;
  z-index: 99;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  height: 120px;
  background: linear-gradient(0deg, #fff, hsla(0, 0%, 100%, .8));
}

.send-input{
  padding: 0 2vw !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 90%;
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

// 主聊天区域样式
.center-main {
  position: relative;
  width: 100%;
  height: 70vh;
  overflow: hidden;
  background-color: #fff;
  
  .chat-list {
    width: 100%;
    height: calc(100% - 110px);
    padding: 0 80px;
    overflow-x: hidden;
    scrollbar-width: none;
  }
  
  .send-area {
    width: 100%;
    position: absolute;
    bottom: 0;
    z-index: 99;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 120px;
    background: linear-gradient(0deg, #fff, hsla(0, 0%, 100%, .8));
  }
}
</style>