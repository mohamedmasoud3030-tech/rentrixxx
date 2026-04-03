import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: '/',
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5000
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    sourcemap: mode === 'production' ? false : true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'vendor'
          }

          if (id.includes('/src/components/ui/')) {
            return 'ui'
          }

          if (
            id.includes('/src/pages/Finance') ||
            id.includes('/src/pages/Financials') ||
            id.includes('/src/pages/Accounting') ||
            id.includes('/src/pages/GeneralLedger') ||
            id.includes('/src/pages/financial/')
          ) {
            return 'finance'
          }

          if (id.includes('/src/pages/Reports') || id.includes('/src/components/reports/')) {
            return 'reports'
          }
        }
      }
    }
  }
}))
