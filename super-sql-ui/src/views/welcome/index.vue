<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <div class="header-section">
        <div class="title-section">
          <h1 class="welcome-title">欢迎使用 贝和SQL助手 系统</h1>
          <p class="welcome-description">
            这是一个强大的 SQL 查询和数据分析工具，帮助您更高效地进行数据洞察和对话式查询。
          </p>
        </div>
        
        <div class="action-section">
          <a-button 
            type="primary" 
            size="large" 
            class="start-chat-btn"
            @click="startChat"
          >
            <template #icon>
              <message-outlined />
            </template>
            开始对话
          </a-button>
        </div>
      </div>
      
      <div class="features-section">
        <div class="welcome-features">
          <a-card class="feature-card" :bordered="false">
            <template #title>
              <div class="feature-title">
                <message-outlined />
                <span>智能对话</span>
              </div>
            </template>
            <p>通过自然语言与数据进行对话，轻松获取所需信息</p>
          </a-card>
          
          <a-card class="feature-card" :bordered="false">
            <template #title>
              <div class="feature-title">
                <bar-chart-outlined />
                <span>数据洞察</span>
              </div>
            </template>
            <p>深入分析数据，发现隐藏的模式和趋势</p>
          </a-card>
          
          <a-card class="feature-card" :bordered="false">
            <template #title>
              <div class="feature-title">
                <database-outlined />
                <span>知识管理</span>
              </div>
            </template>
            <p>管理和维护您的数据知识库，提高查询效率</p>
          </a-card>
          
          <a-card class="feature-card" :bordered="false">
            <template #title>
              <div class="feature-title">
                <area-chart-outlined />
                <span>SQL结果可视化</span>
              </div>
            </template>
            <p>将SQL查询结果转换为直观的图表和可视化展示</p>
          </a-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { MessageOutlined, BarChartOutlined, DatabaseOutlined, AreaChartOutlined } from '@ant-design/icons-vue'
import WelcomeLayout from '@/layout/welcome-layout.vue'
import { useRouter } from 'vue-router'
import { handleLogin } from '@/api/login'
import { setToken } from '@/util/auth'
import { message } from 'ant-design-vue'

const router = useRouter()

const startChat = async () => {
  const res = await handleLogin({ username: 'admin', password: 'Gkbh2021!' })
  
  if (res.status === 'ok' && res.data) {
    const token = res.data.userToken?.token
    if (!token) {
      message.error('登录失败：未获取到 token')
      return
    }
    
    // 保存token和用户信息
    setToken(token)
    localStorage.setItem('nvwa-user', JSON.stringify(res.data.userInfo))
    router.push('/chat')
  } else {
    message.error('登录失败，请检查账号密码')
  }
}
</script>

<style lang="less" scoped>
.welcome-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  box-sizing: border-box;
}

.welcome-content {
  text-align: center;
  color: white;
  max-width: 1200px;
  width: 100%;
  padding: 40px 20px;
}

.welcome-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.welcome-description {
  font-size: 1.2rem;
  margin-bottom: 3rem;
  line-height: 1.6;
  opacity: 0.9;
}

.header-section {
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 1000px;
  margin: 0 auto 3rem;
  position: relative;
}

.title-section {
  text-align: center;
}

.action-section {
  position: absolute;
  right: -60px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.features-section {
  max-width: 800px;
  margin: 0 auto;
}

.welcome-features {
  display: grid;
  grid-template-columns: repeat(2, minmax(320px, 1fr));
  gap: 2rem;
  justify-content: center;
}

.feature-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  }
}

.feature-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
}

.feature-card p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 1rem 0;
  min-height: 3rem;
}

.start-chat-btn {
  height: 60px;
  font-size: 1.2rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(82, 196, 26, 0.3);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(82, 196, 26, 0.4);
    background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 15px rgba(82, 196, 26, 0.3);
  }
}

.chart-preview {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 120px;
  margin-top: 1rem;
  padding: 0 10px;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 50px;
}

.bar {
  width: 30px;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
  animation: growBar 1s ease-out;
}

.chart-bar span {
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 500;
}

@keyframes growBar {
  from {
    height: 0%;
  }
  to {
    height: var(--target-height);
  }
}

:deep(.ant-card-head-title) {
  color: white !important;
}

:deep(.ant-card-body) {
  padding: 1rem 0 0 0 !important;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .header-section {
    max-width: 800px;
    gap: 1.5rem;
  }
  
  .features-section {
    max-width: 700px;
  }
  
  .welcome-features {
    grid-template-columns: repeat(2, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .welcome-container {
    padding: 10px;
  }
  
  .welcome-content {
    padding: 20px 10px;
  }
  
  .welcome-title {
    font-size: 2rem;
  }
  
  .header-section {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .title-section {
    text-align: center;
  }
  
  .action-section {
    justify-content: center;
    margin-top: 0;
  }
  
  .features-section {
    max-width: 100%;
  }
  
  .welcome-features {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .welcome-title {
    font-size: 1.8rem;
  }
  
  .welcome-description {
    font-size: 1rem;
  }
  
  .feature-card {
    padding: 1rem;
  }
  
  .feature-title {
    font-size: 1.1rem;
  }
  
  .start-chat-btn {
    height: 50px;
    font-size: 1.1rem;
  }
}
</style>