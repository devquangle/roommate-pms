import { defineConfig } from 'vite';

export default defineConfig({
  // Để base='./' để build ra các file có đường dẫn tương đối, tiện cho việc deploy GitHub Pages
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist'
  }
});
