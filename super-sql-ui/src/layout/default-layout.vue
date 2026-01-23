<template>
  <a-layout class="app-layout">
    <!-- 左侧菜单栏 -->
    <Sidebar />
    
    <!-- 右侧内容区域 -->
    <a-layout :style="{ background: colorConfirm }">
      <div class="width-000">
        <a-layout-header
          :style="{ background: '#ffffff' ,display:'flex'}"
        >
          <Header/>
        </a-layout-header>
        <a-layout-content class="main-other">
          <PageLayout />
        </a-layout-content>
        <Footer />
      </div>
    </a-layout>
  </a-layout>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue'
import Footer from '@/components/footer/index.vue'
import Menu from '@/components/menu/index.vue'
import Header from '@/components/header/index.vue'
import Sidebar from '@/components/sidebar/index.vue'
import PageLayout from '@/layout/page-layout.vue'
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/store/theme'
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons-vue'

const router = useRouter()
const themeStore = useThemeStore()
const collapsed = ref<boolean>(false)
const colorConfirm = computed(() => themeStore.getCurrentThemeConfig().backgroundColor)

const rightIsoOpen = ref<boolean>()
//获得子组件传过来的数据
const rightSideFun = (val: boolean) => {
  rightIsoOpen.value = val
  console.log('rightIsoOpen:', rightIsoOpen.value)
}
// 监听当前路由
// watch(
//   () => router.currentRoute.value,
//   (newValue: any) => {
//     if (newValue.name.includes(routerChat.value)) {
//       colorConfirm.value = '#ffffff'
//       isChat.value = true
//       //调用子组件的 play方法
//       // childComp.value.setOpenData(true)
//       rightSideFun(true)
//     } else {
//       colorConfirm.value = 'rgb(242, 242, 255)'
//       isChat.value = false
//       rightSideFun(false)
//     }
//   },
//   { immediate: true }
// )
</script>

<style lang="less" scoped>

.app-layout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.logo{
  width: 120px;
  height: 31px;
  margin: 16px 24px 16px 0;
  float: left;
}

.ant-layout-header {
}
.width-300 {
  width: calc(100% - 300px) !important;
}
.width-000 {
  width: calc(100%) !important;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.main-chat {
  margin: 16px 16px 0px 16px;
  overflow: auto;
  height: 100%;
}
.main-other {
  margin: 16px 16px 0 16px;
  overflow: auto;
  flex: 1;
  // height: calc(100% - 110px);
}
</style>