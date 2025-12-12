<script setup lang="ts">
import {SendOutlined, UserOutlined, CopyOutlined, EyeOutlined} from "@ant-design/icons-vue";
import {nextTick, onMounted, ref, onBeforeUnmount} from "vue";
import {fetchChatProcess} from "@/api/chat.ts";
import {useScroll} from "@/util/useScroll.ts";
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js';
import "highlight.js/styles/vs2015.css";
import { message as antMessage, Modal } from 'ant-design-vue';
import { eventBus, EVENTS } from '@/util/eventBus'

const {scrollRef, scrollToBottom, scrollToBottomIfAtBottom} = useScroll()

const messages=ref([] as any)
const blockIndex=ref(0)
const filterText = ref<string>()
const isLoading = ref(false) // 加载状态
const chatId = ref<string>('') // 对话ID
const insightModalVisible = ref(false) // 洞察模态框显示状态
const currentInsightContent = ref('') // 当前洞察内容
const showWelcomeMessage = ref(true) // 控制欢迎语显示状态
let controller = new AbortController()

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
  console.log('str :', str)
  console.log('lang :',lang)
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

// 打开洞察模态框
const openInsightModal = (content: string) => {
  currentInsightContent.value = content
  insightModalVisible.value = true
}

// 关闭洞察模态框
const closeInsightModal = () => {
  insightModalVisible.value = false
  currentInsightContent.value = ''
}

// 监听事件总线
onMounted(() => {
  // 监听打开洞察模态框事件
  eventBus.on(EVENTS.OPEN_INSIGHT_MODAL, (payload) => {
    if (payload && payload.content) {
      openInsightModal(payload.content)
    }
  })
  
  // 监听关闭洞察模态框事件
  eventBus.on(EVENTS.CLOSE_INSIGHT_MODAL, () => {
    closeInsightModal()
  })
  
})

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  eventBus.off(EVENTS.OPEN_INSIGHT_MODAL)
  eventBus.off(EVENTS.CLOSE_INSIGHT_MODAL)
})

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

// 暴露洞察模态框相关方法给父组件调用
defineExpose({
  openInsightModal,
  closeInsightModal,
  insightModalVisible,
  currentInsightContent
})

onMounted(()=> {
  if (showWelcomeMessage.value) {
    // 欢迎语现在通过模板静态显示
  }
})

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
    stream: false,
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
  
  try {
    await fetchChatProcess({
      data,
      signal: controller.signal,
      onDownloadProgress: ({event}) => {
      const xhr = event.target
      const {responseText} = xhr
      
      // 检查responseText是否有效
      if (!responseText || responseText === 'undefined') {
        console.log('responseText为空或undefined，跳过处理')
        return
      }
      
      try {
        // 处理以"data:"开头的SSE格式响应
        let jsonData = responseText
        
        // 如果响应以"data:"开头，去掉前缀
        if (responseText.startsWith('data:')) {
          jsonData = responseText.substring(5) // 去掉"data:"前缀
        }
        
        // 确保jsonData不为空
        if (!jsonData || jsonData.trim() === '') {
          console.log('jsonData为空，跳过解析')
          return
        }
        
        // 解析JSON响应
        const responseData = JSON.parse(jsonData)
        
        // 提取content和id
        if (responseData.data && responseData.data.choices && responseData.data.choices.length > 0) {
          const contentText = responseData.data.choices[0].message.content
          const messageId = responseData.data.id
          
          // 保存对话ID（如果是第一次对话或新的对话）
          if (messageId && !chatId.value) {
            chatId.value = messageId
            console.log('保存对话ID:', chatId.value)
          }
          
          const content={
            messageType:'ai',
            content: contentText,
            id: messageId,
            timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          }
          
          messages.value.push(content)
        }
      } catch (error) {
        console.error('解析JSON响应失败:', error)
        console.log('原始响应文本:', responseText)
        
        // 如果解析失败，尝试处理可能的多行SSE数据
        if (responseText && typeof responseText === 'string') {
          const lines = responseText.split('\n')
          let lastValidJson = null
          let accumulatedContent = ''
          let messageId = ''
          
          for (const line of lines) {
            const trimmedLine = line.trim()
            
            // 检查是否到达结束标志
            if (trimmedLine === '[done]') {
              console.log('检测到结束标志[done]')
              break
            }
            
            // 处理以"data:"开头的行
            if (trimmedLine.startsWith('data:')) {
              try {
                const jsonData = trimmedLine.substring(5).trim()
                if (jsonData && jsonData !== '') {
                  const responseData = JSON.parse(jsonData)
                  
                  // 检查是否是有效的数据结构
                  if (responseData.data && responseData.data.choices && responseData.data.choices.length > 0) {
                    lastValidJson = responseData
                    
                    // 累积内容（如果是流式响应，可能会有多个数据块）
                    const contentText = responseData.data.choices[0].message.content
                    if (contentText) {
                      accumulatedContent += contentText
                    }
                    
                    // 保存消息ID
                    if (responseData.data.id && !messageId) {
                      messageId = responseData.data.id
                      // 保存对话ID（如果是第一次对话或新的对话）
                      if (messageId && !chatId.value) {
                        chatId.value = messageId
                        console.log('保存对话ID:', chatId.value)
                      }
                    }
                  }
                }
              } catch (e) {
                // 忽略单行解析错误，继续处理下一行
                console.log('单行解析失败:', trimmedLine, '错误:', e)
              }
            }
          }
          
          // 如果有累积的内容，优先使用累积的内容
          if (accumulatedContent) {
            const content={
              messageType:'ai',
              content: accumulatedContent,
              id: messageId || 'unknown',
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            }
            
            messages.value.push(content)
          } else if (lastValidJson && lastValidJson.data && lastValidJson.data.choices && lastValidJson.data.choices.length > 0) {
            // 如果没有累积内容，但有一个有效的JSON对象
            const contentText = lastValidJson.data.choices[0].message.content
            const finalMessageId = lastValidJson.data.id
            
            // 保存对话ID（如果是第一次对话或新的对话）
            if (finalMessageId && !chatId.value) {
              chatId.value = finalMessageId
              console.log('保存对话ID:', chatId.value)
            }
            
            const content={
              messageType:'ai',
              content: contentText,
              id: finalMessageId,
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            }
            
            messages.value.push(content)
          } else {
            // 如果所有解析方法都失败，回退到原始显示方式
            console.log('所有解析方法都失败，显示原始响应')
            const content={
              messageType:'ai',
              content: responseText,
              timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
            }
            messages.value.push(content)
          }
        } else {
          // 如果responseText不是字符串
          console.log('responseText不是字符串，跳过处理')
        }
      }
      
      scrollToBottom()
      scrollToBottomIfAtBottom()
    },
    beforeRequest:()=>{
      //steamWord.value=true;
    },
    afterRequest:()=>{
      console.log("请求完成")
      //steamWord.value=false;
      //endPrint();
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

      <div class="chat-list" id="scrollRef" ref="scrollRef">
       <!-- 欢迎语 -->
       <div v-if="showWelcomeMessage">
         <div class="ai-message">
           <a-space align="center">
             <a-avatar :size="50" style="background-color: rgba(255,255,255,0) ">
               <template #icon>
                 <img style="width: 48px !important;height: 48px !important;" src="@/assets/images/ai_logo.png">
               </template>
             </a-avatar>
             <div class="ai-content-container">
               <div class="ai-content">
                 您好，我是SQL智能助手，请问我有什么可以帮您？
               </div>
             </div>
           </a-space>
         </div>
       </div>
       
       <!-- 聊天内容 -->
       <div v-for="(item, index) in messages" :key="index">
         <div class="ai-message" v-if="item.messageType === 'ai'">
           <a-space align="flex-start">
             <a-avatar :size="50" style="background-color: rgba(255,255,255,0) ">
               <template #icon>
                 <img style="width: 48px !important;height: 48px !important;" src="@/assets/images/ai_logo.png">
               </template>
             </a-avatar>
             <div class="ai-content-container">
               <div class="ai-content" v-html="getMdiText(item.content)">
               </div>
               <!-- 操作按钮区域 -->
               <div class="action-buttons" v-if="item.content">
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
                     @click="openInsightModal(item.content)"
                     class="action-btn"
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

           <a-space align="center">
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

      <!-- 洞察模态框 -->
      <a-modal
        v-model:visible="insightModalVisible"
        title="数据洞察"
        width="80%"
        :footer="null"
        @cancel="closeInsightModal"
        class="insight-modal"
      >
        <div class="insight-content">
          <div class="contentRow">
            <div class="text-content" v-html="getMdiText(currentInsightContent)"></div>
            <div class="chart-section">
              <div v-if="hasChartData(currentInsightContent)">
                <div class="tableRow">数据可视化</div>
                <div class="chartRow"></div>
              </div>
              <div class="no-chart-data" v-else>
                <p>当前内容暂无可视化数据</p>
              </div>
            </div>
          </div>
        </div>
      </a-modal>

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
  scrollbar-width: none;
  .ai-message{
    //float: left;
    margin: 10px 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-shrink: 1;
    .ai-content-container{
      display: flex;
      flex-direction: column;
      .ai-content{
        background-color: rgba(83, 91, 242, 0.09);
        border-radius: 10px;
        padding: 15px;
        img{
          width: 400px !important;
          height: auto !important;
        }
      }
      // 操作按钮样式
      .action-buttons {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        justify-content: flex-end;
        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #535bf2;
          border: 1px solid #d9d9d9;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 12px;
          transition: all 0.3s;
          
          &:hover {
            color: #fff;
            background-color: #535bf2;
            border-color: #535bf2;
          }
          
          &:active {
            transform: scale(0.95);
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
    margin: 10px 0;
    //float: right;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    .you-content{
      background-color: rgba(83, 91, 242, 0.09);
      border-radius: 10px;
      padding: 15px;
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
  min-height: 50px;
  padding: 0 10px 0 0;
  overflow: hidden;
  line-height: 50px;
  border: 1px solid #535bf2;
  border-radius: 6px;
}
</style>