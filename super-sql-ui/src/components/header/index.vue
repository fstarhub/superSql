<script setup lang="ts">
import { UserOutlined, LoginOutlined, SettingOutlined } from "@ant-design/icons-vue";
import { useRouter } from 'vue-router'
import { removeToken } from '@/util/auth'
import { ref } from 'vue';

const router = useRouter()
const userMenuVisible = ref(false)

const handleLogout = () => {
  // 清除token和用户信息
  removeToken()
  localStorage.removeItem('nvwa-user')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('satoken')
  
  // 跳转到登录页
  router.push({ path: '/' })
}

const handleUserCenter = () => {
  userMenuVisible.value = false
  router.push({ path: '/home/user-center' })
}
</script>

<template>
  <div class="ant-header">
    <!-- 用户菜单 -->
    <a-dropdown 
      v-model:open="userMenuVisible"
      :placement="'bottomRight'"
      :trigger="['click']"
    >
      <a-avatar>
        <template #icon>
          <UserOutlined />
        </template>
      </a-avatar>
      <template #overlay>
        <a-menu>
          <a-menu-item @click="handleUserCenter">
            <UserOutlined /> 个人中心
          </a-menu-item>
          <a-menu-item @click="handleLogout">
            <LoginOutlined style="color: red" /> 退出
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<style scoped lang="less">
.ant-header{
  display: flex;
  align-items: center;
  gap: 12px;
  float: right;
  margin-right: 0;
  margin-left: auto;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #333;
  
  &:hover {
    color: var(--theme-primary-color, #535bf2);
  }
}

.theme-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #e0e0e0;
  display: inline-block;
}

:deep(.ant-menu-item.theme-active) {
  background-color: rgba(83, 91, 242, 0.1);
  color: var(--theme-primary-color, #535bf2);
  
  &::after {
    opacity: 1;
    border-color: var(--theme-primary-color, #535bf2);
  }
}

:deep(.ant-menu-item) {
  &:hover {
    background-color: rgba(83, 91, 242, 0.05);
  }
}
</style>
