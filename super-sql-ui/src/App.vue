<template>
  <a-config-provider
    :theme="{
      token: {
        colorPrimary: themeConfig.primaryColor,
      },
      algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
    }"
  >
    <div id="app" :class="`theme-${currentTheme}`">
      <router-view />
    </div>
  </a-config-provider>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { theme } from 'ant-design-vue'
import { useThemeStore } from '@/store/theme'

const themeStore = useThemeStore()
const currentTheme = computed(() => themeStore.currentTheme)
const themeConfig = computed(() => themeStore.getCurrentThemeConfig())
</script>

<style>
:root {
  --theme-primary-color: #535bf2;
  --theme-background-color: #f2f2ff;
  --theme-text-color: #333;
  --theme-card-bg: #ffffff;
}

/* 暗色主题样式 */
.dark-theme {
  --theme-primary-color: #1890ff;
  --theme-background-color: #141414;
  --theme-text-color: #ffffff;
  --theme-card-bg: #1f1f1f;
}

#app {
  background-color: var(--theme-background-color);
  color: var(--theme-text-color);
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

/* 主题切换动画 */
.theme-light,
.theme-blue,
.theme-white {
  background-color: var(--theme-background-color);
  color: var(--theme-text-color);
}

.theme-dark {
  background-color: #141414;
  color: #ffffff;
}

.theme-dark .ant-layout {
  background: #141414;
  color: #ffffff;
}

.theme-dark .ant-card {
  background: #1f1f1f !important;
  color: #ffffff !important;
  border-color: #434343;
}

.theme-dark .ant-card-head-title {
  color: #ffffff !important;
}

.theme-dark .ant-input {
  background: #1f1f1f !important;
  color: #ffffff !important;
  border-color: #434343;
}

.theme-dark .ant-input::placeholder {
  color: rgba(255, 255, 255, 0.5) !important;
}

.theme-dark .ant-btn {
  border-color: #434343;
  color: #ffffff;
}

.theme-dark .ant-btn-primary {
  background: #1890ff;
  border-color: #1890ff;
}

.theme-dark .ant-menu {
  background: #1f1f1f;
  color: #ffffff;
}

.theme-dark .ant-menu-item {
  color: #ffffff;
}

.theme-dark .ant-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #1890ff;
}

.theme-dark .ant-dropdown-menu {
  background: #1f1f1f;
  color: #ffffff;
}

.theme-dark .ant-dropdown-menu-item {
  color: #ffffff;
}

.theme-dark .ant-dropdown-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.theme-dark .ant-avatar {
  background: #434343;
  color: #ffffff;
}

.theme-dark .ant-card-body {
  color: #ffffff;
}

.theme-dark .ant-spin-container {
  color: #ffffff;
}

// 确保所有文本在暗色主题下可见
.dark-theme * {
  color: inherit;
}

.dark-theme .ant-typography {
  color: #ffffff;
}

.dark-theme .ant-typography-title {
  color: #ffffff;
}

.dark-theme .ant-typography-text {
  color: rgba(255, 255, 255, 0.85);
}
</style>
