<template>
  <div class="user-center-container">
    <a-card title="个人中心" class="user-center-card">
      <a-row :gutter="24">
        <!-- 左侧：用户信息 -->
        <a-col :span="8">
          <a-card title="用户信息" class="info-card">
            <a-space direction="vertical" :size="16" style="width: 100%">
              <div class="user-avatar-section">
                <a-avatar :size="80">
                  <template #icon>
                    <UserOutlined />
                  </template>
                </a-avatar>
                <div class="user-name">{{ userInfo?.username || '用户' }}</div>
              </div>
            </a-space>
          </a-card>
        </a-col>

        <!-- 右侧：主题设置 -->
        <a-col :span="16">
          <a-card title="主题设置" class="theme-card">
            <a-space direction="vertical" :size="16" style="width: 100%">
              <div class="theme-description">
                选择您喜欢的主题颜色，系统将自动应用主题到所有页面
              </div>
              <div class="theme-list">
                <div
                  v-for="(config, key) in themeStore.themes"
                  :key="key"
                  class="theme-item"
                  :class="{ 'theme-active': themeStore.currentTheme === key }"
                  @click="handleThemeChange(key as ThemeType)"
                >
                  <div class="theme-preview" :style="{ 
                    backgroundColor: config.backgroundColor,
                    borderColor: config.primaryColor 
                  }">
                    <div class="theme-preview-header" :style="{ backgroundColor: config.primaryColor }"></div>
                    <div class="theme-preview-content" :style="{ 
                      backgroundColor: config.cardBg,
                      color: config.textColor 
                    }">
                      <div class="theme-preview-text">示例文本</div>
                    </div>
                  </div>
                  <div class="theme-info">
                    <div class="theme-name">{{ config.name }}</div>
                    <div class="theme-colors">
                      <span 
                        class="color-dot" 
                        :style="{ backgroundColor: config.primaryColor }"
                        :title="config.primaryColor"
                      ></span>
                      <span 
                        class="color-dot" 
                        :style="{ backgroundColor: config.backgroundColor }"
                        :title="config.backgroundColor"
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </a-space>
          </a-card>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { UserOutlined } from '@ant-design/icons-vue'
import { useThemeStore, type ThemeType } from '@/store/theme'

const themeStore = useThemeStore()

const userInfo = ref<any>(null)

const handleThemeChange = (theme: ThemeType) => {
  themeStore.setTheme(theme)
}

onMounted(() => {
  // 获取用户信息
  const userStr = localStorage.getItem('nvwa-user')
  if (userStr) {
    try {
      userInfo.value = JSON.parse(userStr)
    } catch (e) {
      console.error('解析用户信息失败:', e)
    }
  }
})
</script>

<style lang="less" scoped>
.user-center-container {
  padding: 24px;
  min-height: calc(100vh - 200px);
}

.user-center-card {
  :deep(.ant-card-body) {
    padding: 24px;
  }
}

.info-card,
.theme-card {
  height: 100%;
  
  :deep(.ant-card-body) {
    padding: 24px;
  }
}

.user-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.user-name {
  font-size: 18px;
  font-weight: 500;
  color: var(--theme-text-color, #333);
}

.theme-description {
  color: var(--theme-text-color, #666);
  font-size: 14px;
  margin-bottom: 8px;
}

.theme-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.theme-item {
  cursor: pointer;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
  background: var(--theme-card-bg, #fff);
  
  &:hover {
    border-color: var(--theme-primary-color, #535bf2);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &.theme-active {
    border-color: var(--theme-primary-color, #535bf2);
    border-width: 2px;
    box-shadow: 0 4px 16px rgba(83, 91, 242, 0.2);
  }
}

.theme-preview {
  width: 100%;
  height: 120px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  margin-bottom: 12px;
}

.theme-preview-header {
  height: 30%;
  transition: background-color 0.3s;
}

.theme-preview-content {
  height: 70%;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.theme-preview-text {
  font-size: 12px;
}

.theme-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.theme-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--theme-text-color, #333);
}

.theme-colors {
  display: flex;
  gap: 4px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  display: inline-block;
}
</style>
