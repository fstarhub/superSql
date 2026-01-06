import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemeType = 'light' | 'dark' | 'blue' | 'white'

interface ThemeConfig {
  name: string
  primaryColor: string
  backgroundColor: string
  textColor: string
  cardBg: string
}

const themes: Record<ThemeType, ThemeConfig> = {
  light: {
    name: '浅色',
    primaryColor: '#535bf2',
    backgroundColor: '#f2f2ff',
    textColor: '#333333', // 确保文字颜色与背景区分开
    cardBg: '#ffffff'
  },
  dark: {
    name: '黑色',
    primaryColor: '#1890ff', // 蓝色作为主色，与黑色背景区分
    backgroundColor: '#141414',
    textColor: '#ffffff', // 白色文字，确保可见
    cardBg: '#1f1f1f' // 深灰色卡片背景
  },
  blue: {
    name: '蓝色',
    primaryColor: '#1890ff',
    backgroundColor: '#e6f7ff',
    textColor: '#333333',
    cardBg: '#ffffff'
  },
  white: {
    name: '白色',
    primaryColor: '#535bf2',
    backgroundColor: '#ffffff',
    textColor: '#333333',
    cardBg: '#fafafa'
  }
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemeType>((localStorage.getItem('theme') as ThemeType) || 'light')

  const setTheme = (theme: ThemeType) => {
    currentTheme.value = theme
    localStorage.setItem('theme', theme)
    applyTheme(theme)
  }

  const applyTheme = (theme: ThemeType) => {
    const config = themes[theme]
    const root = document.documentElement
    
    // 设置CSS变量
    root.style.setProperty('--theme-primary-color', config.primaryColor)
    root.style.setProperty('--theme-background-color', config.backgroundColor)
    root.style.setProperty('--theme-text-color', config.textColor)
    root.style.setProperty('--theme-card-bg', config.cardBg)
    
    // 设置body背景色和文字颜色
    document.body.style.backgroundColor = config.backgroundColor
    document.body.style.color = config.textColor
    
    // 如果是暗色主题，添加dark类
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme')
      // 暗色主题下，确保所有文字可见
      root.style.setProperty('--ant-text-color', '#ffffff')
      root.style.setProperty('--ant-heading-color', '#ffffff')
    } else {
      document.documentElement.classList.remove('dark-theme')
      // 浅色主题下，使用深色文字
      root.style.setProperty('--ant-text-color', '#333333')
      root.style.setProperty('--ant-heading-color', '#333333')
    }
  }

  // 初始化时应用主题
  applyTheme(currentTheme.value)

  // 监听主题变化
  watch(currentTheme, (newTheme) => {
    applyTheme(newTheme)
  })

  return {
    currentTheme,
    setTheme,
    themes,
    getCurrentThemeConfig: () => themes[currentTheme.value]
  }
})
