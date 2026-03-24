import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/react-vite-taskmanager",
  build: {
    outDir: 'dist',
  },
  base: './',
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      }
    }
  }
})
