// src/pages/dashboard/index.js

export function renderDashboardPage(container) {
  container.innerHTML = `
    <div data-testid="dashboard-page">
      <h4>Dashboard</h4>
      <p class="text-muted">Tổng quan hệ thống quản lý nhà trọ RoomMate.</p>
    </div>
  `;
}
