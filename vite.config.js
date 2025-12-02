import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensure assets work correctly in production
  build: {
    outDir: 'dist', // Default is 'dist', optional
  },
  // Optional dev server config
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Only for local dev
        changeOrigin: true,
      }
    }
  }
})
