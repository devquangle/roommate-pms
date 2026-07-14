// src/pages/services/index.js

export function renderServicesPage(container) {
  container.innerHTML = `
    <div data-testid="services-page">
      <h4>Cấu hình dịch vụ</h4>
      <p class="text-muted">Bảng cấu hình giá dịch vụ sẽ hiển thị ở đây.</p>
    </div>
  `;
}
