// src/main.js

import { renderLayout } from './components/layout.js';
import { initRouter } from './router.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app-root');

  // 1. Render khung giao diện (sidebar, header, content area)
  renderLayout(root);

  // 2. Khởi tạo router – lắng nghe popstate và render trang đầu tiên
  initRouter();
});
