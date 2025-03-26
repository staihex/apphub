import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/apphub/',
  build: {
    outDir: 'apphub', // 输出目录
    assetsDir: 'scripts', // 静态资源目录
  },
  server: {
    proxy: {
      // '/api': {
      //   target: 'http://120.79.143.196', // 后端地址
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, ''),
      // },
      // '/api': {
      //   target: 'http://120.194.142.8:7080', // 后端地址
      //   changeOrigin: true,
      //   rewrite: (path) => path.replace(/^\/api/, ''),
      // },
      '/api': {
        target: 'https://test.staihex.com', // 后端地址
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '^/soundhelix': {
        target: 'https://staihex.oss-cn-shenzhen.aliyuncs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/soundhelix/, ''),
      },
      '^/test': {
        target: 'https://test.staihex.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/test/, ''),
      },
    },
  },
})
