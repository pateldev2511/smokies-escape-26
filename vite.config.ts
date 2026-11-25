import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Served from https://<user>.github.io/smokies-escape-26/
//   /                     → traveler view
//   /trip/smokies-2026/   → traveler view (share this one)
//   /admin/               → organizer dashboard (login)
export default defineConfig({
  base: '/smokies-escape-26/',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        trip: resolve(__dirname, 'trip/smokies-2026/index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
})
