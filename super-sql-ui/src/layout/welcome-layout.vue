<template>
  <a-layout>
    <!-- 欢迎页面专用布局，只显示内容区域 -->
    <a-layout :style="{ background: colorConfirm }">
      <div class="width-000">
        <a-layout-content class="welcome-content">
          <router-view  v-slot="{ Component, route }">
            <transition appear name="fade" mode="out-in">
              <div class="container">
                <component
                    :is="Component"
                    v-if="route.meta.ignoreCache"
                    :key="route.fullPath"
                />
                <keep-alive v-else >
                  <component :is="Component" :key="route.fullPath" />
                </keep-alive>
              </div>
            </transition>
          </router-view>
        </a-layout-content>
      </div>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { ref} from 'vue'

const colorConfirm = ref<string>('#f2f2ff')
</script>

<style lang="less" scoped>
.welcome-content {
  margin: 0;
  overflow: auto;
  height: 100vh;
}

/* 过度动画 */
.fade-enter-active {
  transition: all 0.3s ease-out;
}

.fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.fade-enter-from,
.fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
</style>