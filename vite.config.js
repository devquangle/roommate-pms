import { defineConfig } from 'vite';

// Tự động lấy tên repository khi build trên GitHub Actions hoặc dùng '/roommate-pms/'
const repoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/roommate-pms/';

export default defineConfig(({ command }) => ({
  // command === 'build' khi chạy `vite build`, 'serve' khi chạy `vite` (dev)
  base: command === 'build' ? repoName : '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false
  },
  build: {
    outDir: 'dist'
  }
}));


