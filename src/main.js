// src/main.js

import { renderLayout } from './components/layout.js';
import { initRouter } from './router.js';
import { seedIfEmpty, resetToSeedData } from './services/seed-service.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app-root');

  // 1. Kiểm tra tính toàn vẹn của dữ liệu trong localStorage.
  // Nếu có bất kỳ trường ngày tháng hoặc kiểu dữ liệu month/year nào bị trống/sai kiểu, tự động reset về dữ liệu mẫu chuẩn sạch 100%.
  let needReset = false;
  try {
    const rawContracts = localStorage.getItem('roommate_contracts');
    if (rawContracts) {
      const contracts = JSON.parse(rawContracts);
      if (Array.isArray(contracts)) {
        if (contracts.some(c => !c.startDate || !c.endDate || typeof c.startDate !== 'string' || typeof c.endDate !== 'string')) {
          needReset = true;
        }
      }
    }
    const rawInvoices = localStorage.getItem('roommate_invoices');
    if (rawInvoices) {
      const invoices = JSON.parse(rawInvoices);
      if (Array.isArray(invoices)) {
        if (invoices.some(i => !i.dueDate || typeof i.month !== 'number' || typeof i.year !== 'number')) {
          needReset = true;
        }
      }
    }
  } catch (e) {
    needReset = true;
  }

  if (needReset) {
    resetToSeedData();
  } else {
    seedIfEmpty();
  }

  // Debug: log LocalStorage contents
  (function logLocalStorage() {
    console.log('--- LocalStorage Contents ---');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      try {
        console.log(`${key}:`, JSON.parse(localStorage.getItem(key)));
      } catch (e) {
        console.log(`${key}:`, localStorage.getItem(key));
      }
    }
  })();

  // 2. Render khung giao diện (sidebar, header, content area)
  renderLayout(root);

  // 3. Khởi tạo router – lắng nghe popstate và render trang đầu tiên
  initRouter();
});
