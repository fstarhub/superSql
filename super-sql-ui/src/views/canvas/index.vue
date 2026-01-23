<template>
  <div class="canvas-container global-card">
    <div class="canvas-header">
       <div class="header-left">
           <span class="page-title">画布编排</span>
           <span class="canvas-name" v-if="canvasName"> / {{ canvasName }}</span>
       </div>
       <div class="header-right">
           <a-button type="primary" ghost class="action-btn" @click="handleAiLayout">
               <template #icon><ThunderboltOutlined /></template>
               AI 一键美化
           </a-button>
           <a-button type="primary" class="action-btn" @click="handleSave">
               <template #icon><SaveOutlined /></template>
               保存画布
           </a-button>
       </div>
    </div>
    
    <div class="canvas-body">
        <div class="insight-selector">
            <div class="selector-title">洞察列表</div>
            <div class="insight-list">
                 <!-- 待实现：可拖拽的洞察列表 -->
                 <div class="empty-tip">暂无可用洞察</div>
            </div>
        </div>
        
        <div class="canvas-main">
            <div class="canvas-workspace">
                 <div class="empty-canvas-state">
                     <file-add-outlined style="font-size: 48px; color: #ccc; margin-bottom: 16px;" />
                     <p>从左侧选择洞察图表添加到画布，或点击 "AI 一键美化"</p>
                 </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { ThunderboltOutlined, SaveOutlined, FileAddOutlined } from '@ant-design/icons-vue'

const canvasName = ref('未命名画布')

const handleAiLayout = () => {
    // 待实现：调用AI接口
    console.log('AI Layout Triggered')
}

const handleSave = () => {
    // 待实现：保存逻辑
    console.log('Save Triggered')
}
</script>

<style scoped lang="less">
.canvas-container {
    height: 80vh;
    background: #fff;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.canvas-header {
    height: 60px;
    border-bottom: 1px solid #f0f0f0;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .page-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
    }
    
    .canvas-name {
        color: #666;
        margin-left: 8px;
    }
    
    .header-right {
        display: flex;
        gap: 12px;
    }
}

.canvas-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.insight-selector {
    width: 240px;
    border-right: 1px solid #f0f0f0;
    display: flex;
    flex-direction: column;
    background: #f9f9fc;
    
    .selector-title {
        padding: 16px;
        font-weight: 500;
        border-bottom: 1px solid #eee;
    }
    
    .insight-list {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
    }
}

.canvas-main {
    flex: 1;
    background: #f0f2f5;
    padding: 24px;
    overflow: auto;
}

.canvas-workspace {
    min-height: 100%;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.empty-canvas-state {
    text-align: center;
    color: #999;
}

.empty-tip {
    text-align: center;
    color: #999;
    font-size: 13px;
    margin-top: 20px;
}
</style>