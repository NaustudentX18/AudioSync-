import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 30000000 // Allow up to 30MB for WASM and large JS bundles
        },
        manifest: {
          name: 'AuraReader',
          short_name: 'AuraReader',
          description: 'Premium BYO-Key Audiobook Player',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          icons: [
            {
              src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236366f1"/><text x="50" y="70" font-family="sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">A</text></svg>',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236366f1"/><text x="50" y="70" font-family="sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle">A</text></svg>',
              sizes: '512x512',
              type: 'image/svg+xml'
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
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
