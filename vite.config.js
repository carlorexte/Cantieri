import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    base44({
      legacySDKImports: true
    }),
    react(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'clsx', 'tailwind-merge', 'framer-motion'],
          'chart-vendor': ['recharts'],
          'date-vendor': ['date-fns', 'moment'],
          'utils': ['lodash', 'zod', 'sonner'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  }
});