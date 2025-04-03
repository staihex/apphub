import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    base: '/apphub/',
    build: {
      outDir: 'apphub', // 输出目录
      assetsDir: 'scripts', // 静态资源目录
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL, // 后端地址
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    }
  }
})

