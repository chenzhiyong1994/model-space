import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

let galleryUrl = '/'

export default defineConfig({
  plugins: [react(), {
    name: 'gallery-entry-links',
    configResolved(config) {
      galleryUrl = config.mode === 'pages' ? `${config.base}app/` : config.base
    },
    transformIndexHtml(html) {
      return html.replaceAll('%GALLERY_URL%', galleryUrl)
    },
  }],
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        site: fileURLToPath(new URL('./site/index.html', import.meta.url)),
      },
      output: {
        manualChunks: { three: ['three', '@react-three/fiber', '@react-three/drei'] },
      },
    },
  },
})
