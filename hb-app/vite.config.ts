import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Hugging Bay foundation UI — standalone buildable module for the Jan fork.
export default defineConfig({
  plugins: [react()],
  server: { port: 5199 },
})
