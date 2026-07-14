// src/pages/tenants/index.js

export function renderTenantsPage(container) {
  container.innerHTML = `
    <div data-testid="tenants-page">
      <h4>Người thuê</h4>
      <p class="text-muted">Danh sách người thuê sẽ hiển thị ở đây.</p>
    </div>
  `;
}
