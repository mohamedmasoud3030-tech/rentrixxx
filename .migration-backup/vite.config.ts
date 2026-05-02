import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      strategies: 'generateSW',
      manifest: {
        name: "Rentrix - Property Management System",
        short_name: "Rentrix",
        description: "نظام إدارة العقارات الشامل - Comprehensive Property Management System",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        icons: [
          {
            "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='%232563eb' rx='45'/><text x='50%' y='50%' font-size='120' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central' font-family='Georgia, serif'>R</text></svg>",
            "sizes": "192x192",
            "type": "image/svg+xml",
            "purpose": "any"
          },
          {
            "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' fill='%232563eb' rx='45'/><text x='50%' y='50%' font-size='120' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central' font-family='Georgia, serif'>R</text></svg>",
            "sizes": "192x192",
            "type": "image/svg+xml",
            "purpose": "maskable"
          },
          {
            "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='%232563eb' rx='120'/><text x='50%' y='50%' font-size='320' font-weight='bold' fill='white' text-anchor='middle' dominant-baseline='central' font-family='Georgia, serif'>R</text></svg>",
            "sizes": "512x512",
            "type": "image/svg+xml",
            "purpose": "any"
          }
        ],
        categories: ["productivity", "business"],
        shortcuts: [
          {
            "name": "لوحة التحكم",
            "short_name": "Dashboard",
            "url": "/?shortcut=dashboard"
          },
          {
            "name": "الفواتير",
            "short_name": "Invoices",
            "url": "/finance/invoices"
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/supabase/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.html') && !url.pathname.includes('index.html'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              plugins: [
                {
                  handlerDidError: async () => {
                    return caches.match('/offline.html');
                  },
                },
              ],
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        backgroundSync: {
          name: 'supabase-sync-queue',
          options: {
            maxRetentionTime: 24 * 60, // 24 hours
          },
        },
      },
      devOptions: { enabled: true },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: '/',
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5000,
    strictPort: false,
  },
  build: {
    chunkSizeWarningLimit: 1300,
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@supabase/supabase-js')) return 'supabase';
        },
      },
    },
  },
})
