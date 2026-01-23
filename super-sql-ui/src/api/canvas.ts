import request from './request';

// ================= MOCK DATA =================
// 模拟画布列表数据
const mockCanvasList = [
    { id: 'canvas-1', name: '2024年度销售报告', createTime: '2024-07-30 10:00:00' },
    { id: 'canvas-2', name: 'Q2 用户活跃度分析', createTime: '2024-07-29 14:20:00' },
    { id: 'canvas-3', name: '产品库存监控', createTime: '2024-07-28 18:00:00' },
];

// 模拟单个画布的详细数据
const mockCanvasDetail = {
    'canvas-1': {
        id: 'canvas-1',
        name: '2024年度销售报告',
        charts: [
            { id: 'chart-1', insightId: 'insight-abc', position: { x: 0, y: 0 }, size: { w: 4, h: 3 } },
            { id: 'chart-2', insightId: 'insight-def', position: { x: 4, y: 0 }, size: { w: 4, h: 3 } },
        ]
    },
    'canvas-2': {
        id: 'canvas-2',
        name: 'Q2 用户活跃度分析',
        charts: []
    }
};

// ================= API INTERFACES =================
export interface CanvasItem {
  id: string;
  name: string;
  createTime: string;
}

export interface CanvasChart {
    id: string;
    insightId: string; // 关联的洞察ID
    position: { x: number; y: number };
    size: { w: number; h: number };
}

export interface CanvasDetail extends CanvasItem {
    charts: CanvasChart[];
}


// ================= API FUNCTIONS =================

/**
 * @description 获取画布列表
 * @param params pageNum, pageSize
 */
export const fetchCanvasList = async (params: { pageNum: string, pageSize: string }): Promise<{ list: CanvasItem[], total: number }> => {
    console.log('Fetching canvas list with params:', params);
    // MOCK API Call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve({ list: mockCanvasList, total: mockCanvasList.length });
        }, 500);
    });
    // REAL API Call
    // return request({
    //     url: '/api/v1/canvas/list',
    //     method: 'get',
    //     params
    // });
};

/**
 * @description 创建新画布
 * @param data { name: string }
 */
export const createCanvas = async (data: { name: string }): Promise<CanvasItem> => {
     console.log('Creating canvas with data:', data);
     // MOCK API Call
     return new Promise(resolve => {
        setTimeout(() => {
            const newCanvas = { id: `canvas-${Date.now()}`, name: data.name, createTime: new Date().toISOString() };
            mockCanvasList.unshift(newCanvas);
            resolve(newCanvas);
        }, 500);
    });
    // REAL API Call
    // return request({
    //     url: '/api/v1/canvas/create',
    //     method: 'post',
    //     data
    // });
}

/**
 * @description 获取单个画布详情
 * @param canvasId
 */
export const fetchCanvasDetail = async (canvasId: string): Promise<CanvasDetail> => {
    console.log('Fetching detail for canvas:', canvasId);
    // MOCK API Call
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(mockCanvasDetail[canvasId] || null);
        }, 300);
    });
    // REAL API Call
    // return request({
    //     url: `/api/v1/canvas/detail/${canvasId}`,
    //     method: 'get',
    // });
}


/**
 * @description 保存/更新画布
 * @param data { id: string, name: string, charts: CanvasChart[] }
 */
export const saveCanvas = async (data: Partial<CanvasDetail>): Promise<{ success: boolean }> => {
    console.log('Saving canvas:', data);
     // MOCK API Call
     return new Promise(resolve => {
        setTimeout(() => {
            if (data.id && mockCanvasDetail[data.id]) {
                mockCanvasDetail[data.id] = { ...mockCanvasDetail[data.id], ...data };
            }
            const canvasInList = mockCanvasList.find(c => c.id === data.id);
            if (canvasInList && data.name) {
                canvasInList.name = data.name;
            }
            resolve({ success: true });
        }, 500);
    });
    // REAL API Call
    // return request({
    //     url: '/api/v1/canvas/save',
    //     method: 'post',
    //     data
    // });
}

/**
 * @description AI 一键美化
 * @param data { canvasId: string, chartIds: string[] }
 */
export const autoLayoutCanvas = async (data: { canvasId: string, chartIds: string[] }): Promise<{ charts: CanvasChart[] }> => {
    console.log('Auto-layouting canvas:', data);
    // MOCK API Call
    return new Promise(resolve => {
        setTimeout(() => {
            // 这是一个非常简单的模拟，实际的AI布局会复杂得多
            const newChartsLayout = data.chartIds.map((insightId, index) => ({
                id: `chart-${index}`,
                insightId: insightId,
                position: { x: (index % 3) * 4, y: Math.floor(index / 3) * 3 },
                size: { w: 4, h: 3 }
            }));
            resolve({ charts: newChartsLayout });
        }, 800);
    });
    // REAL API Call
    // return request({
    //     url: '/api/v1/canvas/auto-layout',
    //     method: 'post',
    //     data
    // });
}