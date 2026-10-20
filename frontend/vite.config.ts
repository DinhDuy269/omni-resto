import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            // Ngăn chặn in stack trace khi socket bị client/trình duyệt ngắt đột ngột (F5, HMR, close tab)
            if (['ECONNRESET', 'ECONNABORTED', 'EPIPE'].includes(err?.code)) {
              return;
            }
          });
        },
      },
      '/ws-raw': {
        target: 'http://localhost:8080',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            // Ngăn chặn in stack trace khi socket bị client/trình duyệt ngắt đột ngột (F5, HMR, close tab)
            if (['ECONNRESET', 'ECONNABORTED', 'EPIPE'].includes(err?.code)) {
              return;
            }
          });
        },
      },
    },
  },
})
