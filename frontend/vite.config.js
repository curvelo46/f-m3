// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy SOLO para desarrollo local
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    // Asegura que el build genere rutas relativas correctas
    outDir: 'dist',
    assetsDir: 'assets',
    // Genera un manifest para debug si es necesario
    manifest: false,
    // Limpia la carpeta dist antes de build
    emptyOutDir: true,
  }
})