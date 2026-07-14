// src/pages/payments/index.js

export function renderPaymentsPage(container) {
  container.innerHTML = `
    <div data-testid="payments-page">
      <h4>Thanh toán</h4>
      <p class="text-muted">Danh sách thanh toán sẽ hiển thị ở đây.</p>
    </div>
  `;
}
