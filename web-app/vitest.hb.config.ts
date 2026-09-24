import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'
// No Jan global setup: that setup mocks the old ServiceHub and would hide
// accidental dependencies on its network/bootstrap behavior.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { environment: 'node', include: ['src/hb/__tests__/**/*.test.{ts,tsx}'] },
})
