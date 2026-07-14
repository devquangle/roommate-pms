// src/pages/debts/index.js

export function renderDebtsPage(container) {
  container.innerHTML = `
    <div data-testid="debts-page">
      <h4>Công nợ</h4>
      <p class="text-muted">Bảng tổng hợp công nợ sẽ hiển thị ở đây.</p>
    </div>
  `;
}
