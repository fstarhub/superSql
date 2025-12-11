import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import * as path from 'path'
// 新增
const resolve = (p: string) => {
  return path.resolve(__dirname, p);
}

export default({command,mode}:any) => {
  return defineConfig({
    resolve: {
      alias: {
        '@': resolve('./src')
      }
    },
    plugins: [vue()],
    server: {
      watch: {
        usePolling: true,
      },
      host: true,
      port: 5173,        // 端口可改，比如 3000
      open: false,        // 自动打开浏览器
      https: false,      // 是否开启 https
      strictPort: true,  // 如果端口被占用就报错，不随机换端口
      proxy: {
        '/api': {
          target: 'https://test-lnlnjyggfwpt.orgspace.beihero.com',
          changeOrigin: true,
          secure: false,
          ws: true,
          // 移除/api前缀，因为目标服务器不需要这个前缀
          rewrite: (path) => path.replace(/^\/api/, ''),
        }
      }
    }

  })
}