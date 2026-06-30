import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // boardgame.io references Node's `global`; map it to `globalThis` so the
  // browser bundle doesn't crash with "global is not defined".
  define: {
    global: 'globalThis',
  },
})
