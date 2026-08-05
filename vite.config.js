import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
// Nota: para el deploy en GitHub Pages (fase 5.2) habra que anadir
// `base: '/custom-lol-tournament/'`. Por ahora se deja en la raiz.
export default defineConfig({
  plugins: [svelte()],
})
