// src/pages/reports/index.js

export function renderReportsPage(container) {
  container.innerHTML = `
    <div data-testid="reports-page">
      <h4>Báo cáo</h4>
      <p class="text-muted">Biểu đồ và thống kê sẽ hiển thị ở đây.</p>
    </div>
  `;
}
