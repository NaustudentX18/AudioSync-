import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'AudioSync',
        short_name: 'AudioSync',
        description: 'Local-first audiobook player with Kokoro TTS',
        theme_color: '#000000',
        background_color: '#000000',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
        shortcuts: [
          {
            name: 'Play Next',
            short_name: 'Next',
            description: 'Jump to the next queued chapter',
            url: '/?action=play-next',
          },
          {
            name: 'Quick Bookmark',
            short_name: 'Bookmark',
            description: 'Add a position bookmark',
            url: '/?action=bookmark',
          },
          {
            name: 'Smart Rewind',
            short_name: 'Rewind',
            description: 'Rewind using smart rewind setting',
            url: '/?action=rewind',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages' },
          },
          {
            urlPattern: ({ request }) => ['script', 'style', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'assets' },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/sync/'),
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'audiosync-sync-queue',
                options: {
                  maxRetentionTime: 24 * 60,
                },
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        // Externalize dynamically-imported modules that may not be present
        // in node_modules at build time (e.g. web-vitals on constrained envs).
        external: ['web-vitals'],
        manualChunks: {
          react: ['react', 'react-dom'],
          ai: ['@google/genai', 'kokoro-js'],
          search: ['fuse.js', 'flexsearch'],
          upload: ['react-dropzone', 'jszip', 'fast-xml-parser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
