import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Electron 专用 Vite 配置
// 与主 vite.config.ts 的唯一区别：base 设为 './' 以支持 Electron loadFile 本地加载
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist-electron',
  },
})
