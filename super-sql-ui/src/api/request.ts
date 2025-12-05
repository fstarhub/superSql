/**
 * steam requset for openai
 * @author iron.guo
 */
import type { AxiosProgressEvent, AxiosResponse, GenericAbortSignal } from 'axios'
import request from './interceptors'

export interface HttpOption {
    url: string
    data?: any
    method?: string
    headers?: any
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
    signal?: GenericAbortSignal
    beforeRequest?: () => void
    afterRequest?: () => void
}

export interface Response<T = any> {
    data: T
    message: string | null
    status: string
    code: number
}

function http<T = any>(
    { url, data, method, headers, onDownloadProgress, signal, beforeRequest, afterRequest }: HttpOption,
) {
    const successHandler = (res: AxiosResponse<Response<T>>) => {
        // 如果响应是字符串类型，直接返回
        if (typeof res.data === 'string')
            return res.data
        
        // 如果响应是对象，检查状态码，但不要因为状态码不是20000就拒绝
        // 因为服务器可能返回其他成功的状态码
        if (res.data && res.data.code) {
            // 记录状态码但不拒绝，让调用方处理具体逻辑
            console.log('响应状态码:', res.data.code)
        }
        
        return res.data
    }

    const failHandler = (error: Response<Error>) => {
        afterRequest?.()
        console.log('error info',error)
    }

    beforeRequest?.()

    method = method || 'GET'

    const params = Object.assign(typeof data === 'function' ? data() : data ?? {}, {})

    return method === 'GET'
        ? request.get(url, { params, signal, onDownloadProgress }).then(successHandler, failHandler)
        : request.post(url, params, { headers, signal, onDownloadProgress }).then(successHandler, failHandler)
}

export function get<T = any>(
    { url, data, method = 'GET', onDownloadProgress, signal, beforeRequest, afterRequest }: HttpOption,
): Promise<Response<T> | void> {
    return http<T>({
        url,
        method,
        data,
        onDownloadProgress,
        signal,
        beforeRequest,
        afterRequest,
    })
}

export function post<T = any>(
    { url, data, method = 'POST', headers, onDownloadProgress, signal, beforeRequest, afterRequest }: HttpOption,
): Promise<Response<T> | void> {
    return http<T>({
        url,
        method,
        data,
        headers,
        onDownloadProgress,
        signal,
        beforeRequest,
        afterRequest,
    })
}

export default post