import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@coderline/alphatab'],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('@coderline/alphatab')) {
            return 'vendor-alphatab';
          }
          if (id.includes('tone') || id.includes('tonejs-instrument')) {
            return 'vendor-tone';
          }
          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'vendor-ui';
          }
        },
      },
    },
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}', 'server/**/*.{test,spec}.{js,ts}'],
    environment: 'node',
  },
});
