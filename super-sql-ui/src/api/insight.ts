import {get, post} from "@/api/request";

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
export interface InsightItemParams {
    insightId: string;
}

export interface InsightResponse {
    content: InsightItem[];
    maxPage: string;
    offset: string;
    page: string;
    pageSize: string;
    totalElements: string;
}

export interface InsightDetail {
    id: string;
    createdDate: number;
    lastModifiedDate: number;
    data: any;
    header: any;
    chart: any;
    orgId: string;
    orgPath: string;
    requestChange: string;
    sqlText: string;
}

export interface InsightDetailParams {
    sqlText: string;
    requestChange: string;
}
export interface updataInsightParams {
    insightId: string;
    question: string;
}

export interface DeleteInsightParams {
    insightId: string;
}

export interface UpdateInsightNameParams {
    insightId: string;
    name: string;
}

export function fetchInsightList(
    params: InsightParams
) {
    return get<InsightResponse>({
        url: '/api/aibi/home/see/text2Sql/insight/page',
        data: params || {}
    });
}
// 单条查询
export function fetchInsightItem(
    params: InsightItemParams
) {
    return get<InsightDetail>({
        url: `/api/aibi/home/see/text2Sql/insight/${params.insightId}`,
    });
}

export function fetchInsightDetail(
    params: InsightDetailParams
) {
    return post<InsightDetail>({
        url: '/api/aibi/home/see/text2Sql/insight/create',
        data: params || {}
    });
}
export function updateInsight(
    params: updataInsightParams
) {
    return post<InsightDetail>({
        url: `/api/aibi/home/see/text2Sql/insight/requestChange?insightId=${params.insightId}&question=${params.question}`,
    });
}

// 删除洞察
export function deleteInsight(
    params: DeleteInsightParams
) {
    return post({
        url: `/api/aibi/home/see/text2Sql/insight/delete?insightId=${params.insightId}`,
    });
}

// 更新洞察名称
export function updateInsightName(
    params: UpdateInsightNameParams
) {
    return post({
        url: `/api/aibi/home/see/text2Sql/insight/updateName?insightId=${params.insightId}&name=${params.name}`,
    });
}