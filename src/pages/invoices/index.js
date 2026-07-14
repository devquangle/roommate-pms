// src/pages/invoices/index.js

export function renderInvoicesPage(container) {
  container.innerHTML = `
    <div data-testid="invoices-page">
      <h4>Lập hóa đơn</h4>
      <p class="text-muted">Danh sách hóa đơn sẽ hiển thị ở đây.</p>
    </div>
  `;
}
