import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'

function getBuildId() {
  const fromEnv = process.env.VITE_APP_BUILD?.trim();
  if (fromEnv) return fromEnv;

  try {
    const gitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);
    return `${timestamp}-${gitSha}`;
  } catch {
    return `local-${Date.now()}`;
  }
}

const appBuild = getBuildId();

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_BUILD__: JSON.stringify(appBuild),
  },
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    rollupOptions: {
      output: {
        // Force new filenames on every build to bust Vercel cache
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  }
});
