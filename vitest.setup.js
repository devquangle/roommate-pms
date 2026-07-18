// vitest.setup.js
import { beforeEach } from 'vitest';

// Dọn dẹp LocalStorage trước mỗi test case để tránh nhiễm dữ liệu giữa các test
beforeEach(() => {
  localStorage.clear();
});
