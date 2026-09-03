import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const WORKER_URL = process.env.VITE_WORKER_URL || 'https://calendarjet-hr.edubot-leonardus.workers.dev'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: WORKER_URL,
        changeOrigin: true,
        secure: true
      }
    }
  }
})
