import {post} from "@/api/request";


export interface LoginParams {
    username: string;
    password: string;
}
export function handleLogin(
    params: LoginParams
) {
    return post<any>({
        url: '/api/core/home/auth/login',
        data: params || {}
    });
}