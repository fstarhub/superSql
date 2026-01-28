import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchChatRecord } from "@/api/chatRecord.ts";
import { fetchChatProcess } from "@/api/chat.ts";
import { message as antMessage } from 'ant-design-vue';
import { eventBus } from '@/util/eventBus';
import { useScroll } from "@/util/useScroll.ts";

export interface ChatMessage {
  messageType: 'your' | 'ai';
  content: string;
  question?: string; // For AI messages, what question they answered
  timestamp?: string;
}

export function useChat() {
  const route = useRoute();
  const router = useRouter();
  const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom, smoothScrollToBottom } = useScroll();

  const messages = ref<ChatMessage[]>([]);
  const inputMessage = ref('');
  const isLoading = ref(false);
  const isStreaming = ref(false);
  const chatId = ref<string>('');
  const showWelcome = ref(true);
  
  // Abort controller for cancelling requests
  let controller = new AbortController();

  // Load chat history
  const loadHistory = async (id: string) => {
    if (!id) return;
    try {
      isLoading.value = true;
      const res = await fetchChatRecord({
        oucAiAppAlias: 'text2Sql_ai_app',
        chatId: id,
        pageNum: '1',
        pageSize: '50' // Load more context
      });
      
      const records = res.content || (res as any).data?.content || (res as any).data || [];
      const newMessages: ChatMessage[] = [];
      
      // The API returns records in reverse chronological order usually, or we need to sort
      // Assuming API returns list of QA pairs.
      records.forEach((record: any) => {
        if (record.question) {
          newMessages.push({
            messageType: 'your',
            content: record.question,
            timestamp: record.createTime
          });
        }
        if (record.answer) {
          newMessages.push({
            messageType: 'ai',
            content: record.answer,
            question: record.question,
            timestamp: record.createTime
          });
        }
      });
      
      messages.value = newMessages;
      showWelcome.value = messages.value.length === 0;
      nextTick(() => scrollToBottom());
    } catch (error) {
      console.error(error);
      antMessage.error('Failed to load chat history');
    } finally {
      isLoading.value = false;
    }
  };

  // Send message
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading.value) return;
    
    // UI Updates
    const userMsg = text.trim();
    inputMessage.value = ''; // Clear input immediately
    showWelcome.value = false;
    
    messages.value.push({ messageType: 'your', content: userMsg });
    scrollToBottom();

    // Prepare for AI response
    isLoading.value = true;
    isStreaming.value = true;
    const aiMsgIndex = messages.value.length;
    messages.value.push({ messageType: 'ai', content: '', question: userMsg });
    
    // Reset controller
    controller = new AbortController();

    let messageId = '';
    let rawContent = '';

    try {
      await fetchChatProcess({
        data: { 
            query: userMsg, 
            stream: true, 
            oucAiAppAlias: 'text2Sql_ai_app', 
            chatId: chatId.value 
        },
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
            const xhr = event.target;
            const responseText = xhr.responseText;
            // Basic SSE parsing logic (simplified from original for brevity/robustness)
            const lines = responseText.split('\n');
            // We need to handle the stream carefully. 
            // The original logic had a buffer. Re-implementing simplified version:
            const lastIndex = responseText.lastIndexOf('\n');
            const newChunk = responseText; // In a real stream we'd track offset
             
            // Note: The original implementation had a specific parsing logic. 
            // I will try to respect the existing parsing structure which seemed to work.
             
            // Re-using the logic from the original file roughly:
             const chunks = newChunk.split('\n');
             for (const line of chunks) {
                 if (line.trim() === '[DONE]') {
                     isStreaming.value = false;
                     return;
                 }
                 if (line.startsWith('data:')) {
                     try {
                         const dataStr = line.substring(5).trim();
                         if (!dataStr || dataStr === '[DONE]') continue;
                         const json = JSON.parse(dataStr);
                         
                         if (json.Choices?.[0]?.Delta?.Content) {
                             // This is a delta, append it
                             // Wait, existing logic appended to a local buffer `rawBuffer`?
                             // Actually `responseText` in axios onDownloadProgress grows. 
                             // We need to parse ONLY new lines or handle the whole thing.
                             // To stay safe, let's parse the LAST valid JSON line if we can, or all of them.
                             // Better: Just use the delta if the API supports it.
                             // Assumption: The API returns standard OpenAI-like SSE.
                         }
                     } catch(e) {}
                 }
             }
        },
        // We will override the complex onDownloadProgress with a simpler one if possible, 
        // OR reuse the exact one from the original file if I can copy it.
        // Let's stick to the original logic for safety, but wrapped here.
      }); 
      
      // Since I cannot easily replicate the exact `lineBuffer` logic without the closure state 
      // from the original file inside this function, I will use a simplified fetch logic 
      // or copy the exact logic.
      
    } catch (error: any) {
        if (error.name !== 'AbortError') {
             antMessage.error('Failed to send message');
             messages.value[aiMsgIndex].content += '\n[Error: Request Failed]';
        }
    } finally {
      isLoading.value = false;
      isStreaming.value = false;
      smoothScrollToBottom();
    }
  };

  // Specialized send function that replicates the original parsing exactly
  const send = async () => {
    const text = inputMessage.value;
    if (!text.trim() || isLoading.value) return;
    
    inputMessage.value = '';
    showWelcome.value = false;
    
    messages.value.push({ messageType: 'your', content: text });
    scrollToBottom();
    
    isLoading.value = true;
    isStreaming.value = true;
    
    const aiMsg = { messageType: 'ai', content: '', question: text } as ChatMessage;
    messages.value.push(aiMsg);
    const aiIndex = messages.value.length - 1;
    
    controller = new AbortController();
    
    let lastResponseLength = 0;
    let lineBuffer = '';
    let rawBuffer = '';
    let messageId = '';
    
    try {
        await fetchChatProcess({
            data: { 
                query: text, 
                stream: true, 
                oucAiAppAlias: 'text2Sql_ai_app', 
                chatId: chatId.value 
            },
            signal: controller.signal,
            onDownloadProgress: ({ event }) => {
                const xhr = event.target;
                const { responseText } = xhr;
                if (!responseText) return;
                
                const newText = responseText.slice(lastResponseLength);
                lastResponseLength = responseText.length;
                lineBuffer += newText;
                
                const lines = lineBuffer.split('\n');
                lineBuffer = lines.pop() || ''; // Keep partial line
                
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === '[DONE]') {
                        if (messageId && !chatId.value) chatId.value = messageId;
                        isStreaming.value = false;
                        return;
                    }
                    if (trimmed.startsWith('data:')) {
                        try {
                            const jsonStr = trimmed.substring(5).trim();
                            if (!jsonStr || jsonStr === '[DONE]') continue;
                            const data = JSON.parse(jsonStr);
                            
                            if (data.Choices?.[0]?.Delta?.Content) {
                                rawBuffer += data.Choices[0].Delta.Content;
                                messages.value[aiIndex].content = rawBuffer;
                                scrollToBottomIfAtBottom();
                            }
                            if (data.Id && !messageId) messageId = data.Id;
                        } catch (e) {
                            // ignore parse errors for partial lines
                        }
                    }
                }
            },
            afterRequest: () => {
                isStreaming.value = false;
                isLoading.value = false;
                if (messageId && !chatId.value) chatId.value = messageId;
                smoothScrollToBottom();
                
                // Refresh sidebar history if it's a new chat
                if (!route.query.chatId) {
                    eventBus.emit('refresh-chat-history');
                }
            }
        });
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            console.error(e);
            messages.value[aiIndex].content += '\n[Request Failed]';
        }
        isLoading.value = false;
        isStreaming.value = false;
    }
  };

  const init = () => {
      // Event listeners for cross-component communication
      eventBus.on('new-chat', () => {
          messages.value = [];
          chatId.value = '';
          showWelcome.value = true;
          router.push('/chat'); // Ensure URL is clean
      });
      
      // Listen for chat selection from Sidebar
      const handleChatChange = (e: Event) => {
          const custom = e as CustomEvent;
          if (custom.detail?.chatId) {
              chatId.value = custom.detail.chatId;
              loadHistory(chatId.value);
          }
      };
      window.addEventListener('chat-changed', handleChatChange);
      
      // Check URL params
      if (route.query.chatId) {
          chatId.value = route.query.chatId as string;
          loadHistory(chatId.value);
      } else {
          // Check session storage
          try {
              const session = sessionStorage.getItem('chatData');
              if (session) {
                  const data = JSON.parse(session);
                  if (data.chatId) {
                       chatId.value = data.chatId;
                       loadHistory(chatId.value);
                  }
              }
          } catch(e) {}
      }
      
      // Cleanup
      onBeforeUnmount(() => {
          window.removeEventListener('chat-changed', handleChatChange);
          controller.abort();
      });
  };

  return {
      messages,
      inputMessage,
      isLoading,
      isStreaming,
      showWelcome,
      scrollRef,
      init,
      send,
      stop: () => controller.abort()
  };
}
