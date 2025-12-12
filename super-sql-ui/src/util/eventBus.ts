// 创建事件总线
type EventCallback = (payload?: any) => void

class EventBus {
  private events: Map<string, EventCallback[]> = new Map()

  // 监听事件
  on(event: string, callback: EventCallback) {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(callback)
  }

  // 触发事件
  emit(event: string, payload?: any) {
    const callbacks = this.events.get(event)
    if (callbacks) {
      callbacks.forEach(callback => callback(payload))
    }
  }

  // 移除事件监听
  off(event: string, callback?: EventCallback) {
    if (!callback) {
      // 如果没有提供回调函数，移除该事件的所有监听器
      this.events.delete(event)
    } else {
      const callbacks = this.events.get(event)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  // 一次性监听
  once(event: string, callback: EventCallback) {
    const onceCallback = (payload?: any) => {
      callback(payload)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus()

// 定义事件类型
export const EVENTS = {
  OPEN_INSIGHT_MODAL: 'open-insight-modal',
  CLOSE_INSIGHT_MODAL: 'close-insight-modal'
}