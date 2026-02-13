import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Cloudflare tunnel (change to '/OLXOutreach/' for GitHub Pages)
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow external connections
    // https: true, // Temporarily disabled due to Windows update issues
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com', // Allow all Cloudflare tunnel URLs
      'portsmouth-hereby-fibre-gotta.trycloudflare.com', // Current tunnel URL
    ],
    proxy: {
      '/api/llm': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llm/, ''),
      },
    },
  },
})
