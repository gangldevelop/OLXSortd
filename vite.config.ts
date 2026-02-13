import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/OLXOutreach/', // GitHub Pages base path
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        outlook: resolve(__dirname, 'outlook-addin.html'),
        gmail: resolve(__dirname, 'gmail-addon.html'),
      },
    },
  },
  server: {
    port: 3000,
    // https: true, // Temporarily disabled due to Windows update issues
    proxy: {
      '/api/llm': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, ''),
      },
    },
  },
})
