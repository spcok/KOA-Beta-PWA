import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Kent Owl Academy',
          short_name: 'KOA',
          description: 'Professional Raptor Management & Conservation System',
          theme_color: '#10b981',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase to 5MB
          runtimeCaching: [
            {
              // 1. Weather API Cache (Online-First with 14-day failover)
              urlPattern: /^https:\/\/(api\.open-meteo\.com|api\.openweathermap\.org|geocoding-api\.open-meteo\.com)\/.*/i,
              handler: 'NetworkFirst', // Must try live internet before failing over to cache
              options: {
                cacheName: 'weather-failover-cache',
                networkTimeoutSeconds: 5, // Give the network 5 seconds before triggering the offline failover
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 14, // Exactly 14 days to match compliance rules
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              // 2. Strict Cloud Bypass for AI, Auth, and Storage
              urlPattern: /^https:\/\/.*\.supabase\.co\/(functions|auth|storage)\/v1\/.*/i,
              handler: 'NetworkOnly'
            },
            {
              // 3. Supabase REST API (Online-First with 14-day failover for Compliance)
              urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'compliance-data-cache',
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 14, // 14 days
                },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
