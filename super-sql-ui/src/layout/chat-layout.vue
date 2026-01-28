<template>
  <div class="chat-layout">
    <!-- Sidebar -->
    <div class="chat-sidebar">
      <Sidebar />
    </div>

    <!-- Main Content -->
    <div class="chat-main">
      <!-- Model/Header (Optional in ChatGPT, but usually shows model name) -->
      <!-- <div class="chat-header">
        <div class="model-selector">GPT-3.5</div>
      </div> -->
      
      <!-- Router View (The Chat Interface) -->
      <div class="chat-viewport">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import Sidebar from '@/components/sidebar/index.vue';
</script>

<style lang="less" scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #343541; /* Dark ChatGPT bg, or light #ffffff */
}

/* Sidebar Wrapper */
.chat-sidebar {
  flex-shrink: 0;
  height: 100%;
  /* The Sidebar component likely has its own width/styles, we just contain it */
  :deep(.ant-layout-sider) {
    height: 100%;
    background-color: #202123; /* ChatGPT Sidebar Dark */
    border-right: 1px solid rgba(255,255,255,0.1);
    
    .ant-layout-sider-children {
      background-color: #202123;
    }
  }
}

/* Main Area */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #ffffff; /* Or #343541 for dark mode */
  height: 100%;
  min-width: 0; /* Prevent flex items from overflowing */
}

.chat-viewport {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden; /* Let the internal view handle scrolling */
}
</style>
