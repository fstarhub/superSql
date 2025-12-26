import axios from 'axios'
//import {clearToken, getToken} from "@/util/auth";
import { notification } from 'ant-design-vue';


//创建axios的一个实例
var service = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL, //接口统一域名
    //timeout: 6000, //设置超时
    headers: {
        'Content-Type': 'application/json;charset=UTF-8;',
    }
})

//请求拦截器
service.interceptors.request.use((config: any) => {
    // 每次发送请求之前判断是否存在token，如果存在，则统一在http请求的header都加上token，不用每次请求都手动添加了
     const userInfoStr = localStorage.getItem('userInfo');
     if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        const token = userInfo?.userToken?.token;

        if (token) {
          config.headers = config.headers || {};
          config.headers['token'] = token;
          // 如果后端不是 Bearer，直接 token 也可以
          // config.headers['token'] = token;
        }
      } catch (e) {
        console.warn('userInfo JSON 解析失败', e);
      }
    }
    // console.log('token',token)
    // token && (config.headers.satoken = token)
    //若请求方式为post，则将data参数转为JSON字符串
    if (config.method === 'POST') {
        config.data = JSON.stringify(config.data);
    }
    return config;
}, (error) =>
    // 对请求错误做些什么
    Promise.reject(error));

//响应拦截器
service.interceptors.response.use((response) => {

    const res = response.data;
    if (res.code === 58000) {
        //
        notification.error({
            message: res.message,
            description: res.message,
        });
        // clearToken();
        // window.location.reload();
    }
    return response.data;
}, (error) => {
    console.log(error, '响应错误')
    //响应错误
    if (error.response && error.response.status) {
        const status = error.response.status
        console.log(status);
        return Promise.reject(error);
    }
    return Promise.reject(error);
});
export default service;
