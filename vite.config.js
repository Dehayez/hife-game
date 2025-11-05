import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cacheHeadersPlugin } from './vite-plugin-cache-headers.js';

export default defineConfig({
  plugins: [
    react(),
    cacheHeadersPlugin(), // Add cache headers for static assets
  ],
  server: {
    port: 5173,
  },
  // Configure static file handling
  publicDir: 'public',
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.wav', '**/*.mp3', '**/*.ogg', '**/*.json'],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  // Build configuration for production
  build: {
    rollupOptions: {
      output: {
        // Add cache headers via manifest
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/wav|mp3|ogg|m4a/i.test(ext)) {
            return `assets/audio/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
  },
});

