import {get} from "@/api/request";

export interface InsightItem {
    id: string;
    chat: any;
    createdDate: number;
    data: any;
    lastModifiedDate: number;
    orgId: string;
    orgPath: string;
    requestChange: string;
    sqlText: string;
}

export interface InsightParams {
    pageNum: string;
    pageSize: string;
}

export interface InsightResponse {
    content: InsightItem[];
    maxPage: string;
    offset: string;
    page: string;
    pageSize: string;
    totalElements: string;
}

export function fetchInsightList(
    params: InsightParams
) {
    return get<InsightResponse>({
        url: '/api/aibi/home/see/text2Sql/insight/page',
        data: params || {}
    });
}