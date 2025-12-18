import {get} from "@/api/request";
import {AxiosProgressEvent, GenericAbortSignal} from "axios";

export interface ChatRecordItem {
    id: string;
    question: string;
    answer: string;
    chatId: string;
    appId: string;
    satisfaction: string;
    count: number;
    userId: string;
    createTime: string;
}

export interface ChatRecordParams {
    oucAiAppAlias: string;
    chatId: string;
    pageNum: string;
    pageSize: string;
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
    beforeRequest?: () => void
    afterRequest?: () => void
}

export interface ChatRecordResponse {
    content: ChatRecordItem[];
    page: string;
    pageSize: string;
    offset: string;
    maxPage: string;
    totalElements: string;
}

export function fetchChatRecord(
    params: ChatRecordParams
) {
    return get<ChatRecordResponse>({
        url: '/api/aibi/home/see/oucAiChat/record/paging',
        data: params || {},
    });
}