import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const basePath = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base: basePath,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
  },
})