import {get} from "@/api/request";
import {AxiosProgressEvent, GenericAbortSignal} from "axios";
export interface ChatHistoryItem {
    id: string;
    appId: string;
    description: string;
    createTime: string;
    createUser: string;
    extendedAttributeData?: string;
    userId?: string;
}

export interface ChatHistoryParams {
    oucAiAppAlias: string;
    pageNum: string;
    pageSize: string;
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
    beforeRequest?: () => void
    afterRequest?: () => void
}

export interface ChatHistoryResponse {
    content: ChatHistoryItem[];
    maxPage: string;
    offset: string;
    page: string;
    pageSize: string;
    totalElements: string;
}

export function fetchChatHistory(
    params: ChatHistoryParams
) {
    return get<ChatHistoryResponse>({
        url: '/api/aibi/home/see/oucAiChat/paging',
        data: params || {},
    });
}