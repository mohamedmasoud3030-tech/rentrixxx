import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for Electron production build
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5000
  },
  build: {
    outDir: 'dist'
  }
})
