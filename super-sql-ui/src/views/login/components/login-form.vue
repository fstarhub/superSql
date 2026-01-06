<template>
  <contextHolder />
  <a-spin :spinning="false">
    <div class="login-form-wrapper">
      <div class="login-slogan">
        <div class="login-slogan-title">
          贝和SQL助手
        </div>
      </div>

      <a-form
          :model="formState"
          class="login-form"
          name="basic"
          autocomplete="off"
          @finish="onFinish"
          @finishFailed="onFinishFailed"
      >
        <a-form-item
            name="username"
            :rules="[{ required: true, message: '请输入账号!' }]"
        >
          <a-input
              v-model:value="formState.username"
              size="large"
              placeholder="请输入账号"
          >
            <template #prefix>
              <user-outlined />
            </template>
          </a-input>
        </a-form-item>

        <a-form-item
            name="password"
            :rules="[{ required: true, message: '请输入密码!' }]"
        >
          <a-input-password
              v-model:value="formState.password"
              size="large"
              placeholder="请输入密码"
          >
            <template #prefix>
              <lock-outlined />
            </template>
          </a-input-password>
        </a-form-item>

        <a-form-item>
          <a-form-item name="remember" no-style>
            <a-checkbox v-model:checked="formState.remember">记住我</a-checkbox>
          </a-form-item>
          <a class="login-form-forgot" href="">忘记密码</a>
        </a-form-item>

        <a-form-item>
          <a-button
              type="primary"
              html-type="submit"
              :loading="loading"
              size="large"
              block
          >
            登录
          </a-button>
        </a-form-item>

        <a-typography-text class="login-sm" type="secondary">
          注册登录即表示同意
          <a>用户协议</a>
          和
          <a>隐私政策</a>
        </a-typography-text>
      </a-form>


    </div>


  </a-spin>


</template>

<script lang="ts" setup>

import {
  UserOutlined,
  LockOutlined
} from '@ant-design/icons-vue'
import {reactive, ref} from 'vue';
import {handleLogin} from "@/api/login";
import {setToken} from "@/util/auth";
import {useRouter} from "vue-router";
import { message } from 'ant-design-vue';
const [messageApi, contextHolder] = message.useMessage();

interface FormState {
  username: string;
  password: string;
  remember: boolean;
}

const loading = ref(false);
const formState = reactive<FormState>({
  username: '',
  password: '',
  remember: true,
});
const router = useRouter();

const onFinish = async (values: FormState) => {
  console.log('=== onFinish 函数被调用 ===');
  console.log('values:', values);
  
  loading.value = true;
  try {
    console.log('=== 准备调用 handleLogin ===');
    console.log('登录参数:', { username: values.username, password: values.password });
    
    const res = await handleLogin({
      username: values.username,
      password: values.password
    });
    
    console.log('=== handleLogin 返回结果 ===');
    console.log('res==>', res);
    console.log('res 类型:', typeof res);
    console.log('res 是否为 null:', res === null);
    console.log('res 是否为 undefined:', res === undefined);
    
    if (!res) {
      console.error('res 为空，无法继续');
      messageApi.error('登录失败，请稍后重试');
      return;
    }
    
    // 处理用户已登录的情况
    if (res.status === 'login_repeated') {
      messageApi.warning(res.exception?.message || '用户已登录');
      // 如果已登录，也可以尝试跳转
      router.push({ path: '/chat' });
      return;
    }
    
    // 处理登录成功的情况
    if (res.status === 'ok' && res.data) {
      const userToken = res.data.userToken;
      const userInfo = res.data.userInfo;
      
      if (userToken?.token) {
        setToken(userToken.token);
      }
      
      if (userToken?.refreshToken) {
        localStorage.setItem('refreshToken', userToken.refreshToken);
      }
      
      if (userInfo) {
        localStorage.setItem('nvwa-user', JSON.stringify(userInfo));
      }
      
      messageApi.success('登录成功');
      router.push({ path: '/chat' });
    } else {
      // 处理其他错误情况
      const errorMessage = res.exception?.message || res.message || '登录失败，请检查账号密码';
      messageApi.error(errorMessage);
    }
  } catch (error: any) {
    console.error('=== 登录异常 ===');
    console.error('error:', error);
    console.error('error.message:', error?.message);
    console.error('error.response:', error?.response);
    console.error('error.response?.data:', error?.response?.data);
    messageApi.error(error?.message || error?.response?.data?.message || '登录失败，请稍后重试');
  } finally {
    loading.value = false;
    console.log('=== onFinish 执行完成 ===');
  }
};

const onFinishFailed = () => {
  messageApi.error('请填写完整的登录信息');
};


</script>

<style lang="less" scoped>

.login-slogan {
  text-align: center;
  line-height: 44px;

  &-title {
    position: relative;
    top: 2px;
    color: var(--color-text-1);
    font-weight: 600;
    font-size: 20px;
  }
}

.login-form-wrapper {
  background-color: #ffffff;
  padding: 30px 40px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
}

.login-form {
  display: flex;
  flex-direction: column;
  width: 100%;
  
  :deep(.ant-form-item) {
    margin-bottom: 20px;
  }
  
  .login-form-forgot {
    float: right;
  }
}

.login-sm {
  margin-top: 10px;
  font-size: 13px;
  display: flex;
  justify-content: center;
}
</style>
