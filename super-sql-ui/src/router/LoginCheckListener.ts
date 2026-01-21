import { Router } from "vue-router";
import NProgress from 'nprogress';

export default function setupUserLoginInfoGuard(router: Router) {
    router.beforeEach(async (to, from, next) => {
        // NProgress.start();
        const token = localStorage.getItem('satoken');

        if (token) {
            // 1. 已登录，如果去登录页则重定向到首页，否则直接放行
            if (to.path === '/login') {
                next({ path: '/' });
            } else {
                next();
            }
        } else {
            // 2. 未登录
            if (to.path === '/login') {
                // 如果本来就是去登录页，直接放行，否则会死循环
                next();
            } else {
                // 否则全部重定向到登录页
                next({ path: '/login' });
            }
        }
        // NProgress.done(); // 注意：通常 done 放在 router.afterEach 中更合适
    });
}