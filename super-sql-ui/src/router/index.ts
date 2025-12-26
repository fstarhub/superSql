import {createRouter, createWebHistory, Router} from "vue-router";
import NProgress from 'nprogress'; // progress bar
import 'nprogress/nprogress.css';
import Layout from "@/layout/default-layout.vue";
//import setupUserLoginInfoGuard from "@/router/LoginCheckListener";
NProgress.configure({showSpinner: false}); // NProgress Configuration

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'welcome',
            component: () => import("@/layout/welcome-layout.vue"),
            meta: {
                requiresAuth: false,
            },
            children: [
                {
                    path: '',
                    name: 'welcome-content',
                    component: () => import("@/views/welcome/index.vue"),
                    meta: {
                        requiresAuth: false,
                    },
                }
            ]
        },
        // {
        //     path: '/login',
        //     name: 'login',
        //     component: () => import("@/views/login/Login.vue"),
        //     meta: {
        //         requiresAuth: false,
        //     }
        // },
        {
            path: '/home',
            name: 'home',
            component: () => import("@/views/home/index.vue"),
            meta: {
                requiresAuth: false,
            },
            children: [
                {
                    path: '/knowledge',
                    name: 'knowledge',
                    component: () => import("@/views/knowledge/index.vue"),
                    meta: {
                        requiresAuth: false,
                    },
                },
                {
                    path: '/chat',
                    name: 'chat',
                    component: () => import("@/views/chat/index.vue"),
                    meta: {
                        requiresAuth: false,
                    },
                },
                {
                    path: 'insight',
                    name: 'insight',
                    component: () => import("@/views/insight/index.vue"),
                    meta: {
                        requiresAuth: false,
                        ignoreCache: true
                    },
                },
            ]
        },


    ]
});
// createRouteGuard(router);
//
// function createRouteGuard(router: Router) {
//     setupUserLoginInfoGuard(router);
// }
export default router;