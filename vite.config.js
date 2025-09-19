import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_API_PROXY || 'http://localhost:3001'
  const usePort = parseInt(env.VITE_DEV_PORT || '80', 10)
  const hmrHost = env.VITE_DEV_HOST || 'fichiers'
  return {
    plugins: [react()],
    server: {
      host: true,
      port: usePort,
      strictPort: true,
      hmr: { host: hmrHost, port: usePort },
      proxy: { '/api': { target: proxyTarget, changeOrigin: true } },
    },
  }
})
