// src/pages/meters/index.js

export function renderMetersPage(container) {
  container.innerHTML = `
    <div data-testid="meters-page">
      <h4>Chỉ số điện nước</h4>
      <p class="text-muted">Bảng ghi chỉ số điện nước sẽ hiển thị ở đây.</p>
    </div>
  `;
}
