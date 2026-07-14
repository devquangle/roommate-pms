// src/pages/settings/index.js

export function renderSettingsPage(container) {
  container.innerHTML = `
    <div data-testid="settings-page">
      <h4>Cài đặt & Sao lưu</h4>
      <p class="text-muted">Cấu hình hệ thống, export/import dữ liệu sẽ hiển thị ở đây.</p>
    </div>
  `;
}
