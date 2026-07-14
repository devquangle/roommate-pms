import { defineConfig } from 'vite';

export default defineConfig({
  // base='/' cho History API routing (URL sạch, không hash)
  base: '/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist'
  }
});
