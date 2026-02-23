import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  base: './', // Tauri desktop app requires relative base path
  server: {
    port: 5173,
    strictPort: true,
  }
})
