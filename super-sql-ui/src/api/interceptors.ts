import axios from 'axios'
import {clearToken, getToken} from "@/util/auth";
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
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['token'] = token;
    }
    if (config.method === 'POST') {
        config.data = JSON.stringify(config.data);
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

//响应拦截器
service.interceptors.response.use((response) => {
    const res = response.data;
    
    if (res.code === 58000) {
        notification.error({
            message: res.message,
            description: res.message,
        });
    }
    return response.data;
}, (error) => {
    if (error.response && error.response.status) {
        return Promise.reject(error);
    }
    return Promise.reject(error);
});
export default service;
