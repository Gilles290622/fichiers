import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Permet l'accès via un hostname personnalisé mappé vers 127.0.0.1
    host: true,
    // Servir directement sur le port 80 pour accéder via http://fichiers
    port: 80,
    strictPort: true,
    // Assurer que le HMR utilise le bon host/port quand on visite via jtsfichiers
    hmr: {
      host: 'fichiers',
      port: 80,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
