import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/TEN-REPOSITORY/' : '/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist'
  }
});
