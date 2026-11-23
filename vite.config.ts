import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from https://<user>.github.io/smokies-escape-26/
export default defineConfig({
  base: '/smokies-escape-26/',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020', cssCodeSplit: true },
})
