import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
  },
})
