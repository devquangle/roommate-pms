// src/pages/dashboard-page.js

/**
 * Trang Dashboard tổng quan.
 * Hiển thị các Stat Cards thống kê, danh sách cảnh báo, biểu đồ doanh thu và biểu đồ trạng thái phòng.
 */

import '../styles/dashboard.css';

import {
  getRoomStats,
  getTenantStats,
  getFinancialOverview,
  getMonthlyRevenueAndCollected,
  getMonthlyConsumption
} from '../services/report-service.js';

import { renderStatCard } from '../components/stat-card.js';
import { renderAlertList } from '../components/alert-list.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { renderDashboardSkeleton } from '../components/loading-state.js';
import Chart from 'chart.js/auto';

// Khai báo biến toàn cục để lưu trữ các thực thể Chart, phục vụ việc hủy chart cũ trước khi vẽ mới
let revenueChartInstance = null;
let roomStatusChartInstance = null;

export function renderDashboardPage(container) {
  // Render loading skeleton đầu tiên
  container.innerHTML = `
    <div data-testid="dashboard-page" class="pb-5">
      <h4 class="mb-4 fw-bold"><i class="bi bi-speedometer2 text-primary me-2"></i>Tổng quan hệ thống</h4>
      <div id="dashboardActualContent">
        ${renderDashboardSkeleton()}
      </div>
    </div>
  `;

  // Giả lập trễ tải 500ms để người dùng trải nghiệm Loading Skeleton tinh tế
  setTimeout(() => {
    // 1. Thu nhập dữ liệu từ ReportService
    const roomStats = getRoomStats();
    const tenantStats = getTenantStats();
    const financial = getFinancialOverview();
    const monthlyConsumption = getMonthlyConsumption();

    // Tìm chỉ số điện/nước tháng hiện tại
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    
    const currentMonthConsumption = monthlyConsumption.find(c => c.monthKey === currentMonthKey) || {
      totalElectricity: 0,
      totalWater: 0
    };

    const actualContent = document.getElementById('dashboardActualContent');
    if (!actualContent) return;

    actualContent.innerHTML = `
      <!-- Grid chỉ số thống kê (Stat Cards) -->
      <div class="dashboard-grid mb-4" id="statCardsGrid">
        <!-- Được render động bởi JS -->
      </div>

      <!-- Vùng hiển thị Biểu đồ và Cảnh báo -->
      <div class="row g-3">
        <!-- Biểu đồ Doanh thu & Thực thu -->
        <div class="col-lg-8">
          <div class="card chart-card p-3">
            <h6 class="mb-3 text-muted">Doanh thu & Thực thu 6 tháng gần nhất</h6>
            <div class="chart-container-custom">
              <canvas id="revenueChart" data-testid="revenue-chart-canvas"></canvas>
            </div>
            <div id="revenueChartEmpty" class="text-muted text-center d-none py-5" data-testid="revenue-chart-empty">
              Chưa có dữ liệu doanh thu.
            </div>
          </div>
        </div>

        <!-- Biểu đồ Trạng thái phòng -->
        <div class="col-lg-4">
          <div class="card chart-card p-3">
            <h6 class="mb-3 text-muted">Trạng thái phòng</h6>
            <div class="chart-container-custom" style="height: 200px;">
              <canvas id="roomStatusChart" data-testid="room-status-chart-canvas"></canvas>
            </div>
          </div>
        </div>

        <!-- Danh sách Cảnh báo cần xử lý -->
        <div class="col-12 mt-3">
          <div class="card alert-card p-3">
            <h6 class="mb-3 text-muted">⚠️ Cảnh báo và nhắc nhở hệ thống</h6>
            <div id="dashboardAlertsContainer"></div>
          </div>
        </div>
      </div>
    `;

    // 3. Render các thẻ thống kê cụ thể
    renderStatCardsList(roomStats, tenantStats, financial, currentMonthConsumption);

    // 4. Render danh sách cảnh báo nhắc nhở
    const alertsContainer = document.getElementById('dashboardAlertsContainer');
    if (alertsContainer) {
      renderAlertList(alertsContainer);
    }

    // 5. Khởi dựng các biểu đồ Chart.js
    renderRevenueChart();
    renderRoomStatusChart(roomStats);
  }, 500);
}

// ─── RENDER STAT CARDS ─────────────────────────────────────────

function renderStatCardsList(roomStats, tenantStats, financial, currentMonthConsumption) {
  const grid = document.getElementById('statCardsGrid');
  if (!grid) return;

  const cardsHtml = [
    renderStatCard({
      title: 'Tổng số phòng',
      value: roomStats.total,
      icon: '🏢',
      iconBg: 'bg-primary-subtle',
      iconColor: 'text-primary',
      testId: 'stat-total-rooms'
    }),
    renderStatCard({
      title: 'Phòng đang trống',
      value: roomStats.available,
      icon: '🔓',
      iconBg: 'bg-success-subtle',
      iconColor: 'text-success',
      testId: 'stat-available-rooms'
    }),
    renderStatCard({
      title: 'Phòng đang thuê',
      value: roomStats.rented,
      icon: '🔒',
      iconBg: 'bg-warning-subtle',
      iconColor: 'text-warning',
      testId: 'stat-rented-rooms'
    }),
    renderStatCard({
      title: 'Tỷ lệ lấp đầy',
      value: `${roomStats.occupancyRate}%`,
      icon: '📊',
      iconBg: 'bg-info-subtle',
      iconColor: 'text-info',
      testId: 'stat-occupancy-rate'
    }),
    renderStatCard({
      title: 'Khách thuê hiện tại',
      value: tenantStats,
      icon: '👥',
      iconBg: 'bg-secondary-subtle',
      iconColor: 'text-secondary',
      testId: 'stat-total-tenants'
    }),
    renderStatCard({
      title: 'Doanh thu phát sinh',
      value: formatCurrency(financial.totalRevenue),
      icon: '💰',
      iconBg: 'bg-success-subtle',
      iconColor: 'text-success',
      testId: 'stat-monthly-revenue'
    }),
    renderStatCard({
      title: 'Tổng công nợ',
      value: formatCurrency(financial.totalDebt),
      icon: '💸',
      iconBg: 'bg-danger-subtle',
      iconColor: 'text-danger',
      testId: 'stat-total-debt'
    }),
    renderStatCard({
      title: 'Hóa đơn quá hạn',
      value: financial.overdueCount,
      icon: '⚠️',
      iconBg: 'bg-danger-subtle',
      iconColor: 'text-danger',
      testId: 'stat-overdue-invoices'
    }),
    renderStatCard({
      title: 'Điện tiêu thụ tháng',
      value: `${currentMonthConsumption.totalElectricity} kWh`,
      icon: '⚡',
      iconBg: 'bg-warning-subtle',
      iconColor: 'text-warning',
      testId: 'stat-elec-usage'
    }),
    renderStatCard({
      title: 'Nước tiêu thụ tháng',
      value: `${currentMonthConsumption.totalWater} m³`,
      icon: '💧',
      iconBg: 'bg-info-subtle',
      iconColor: 'text-info',
      testId: 'stat-water-usage'
    })
  ];

  grid.innerHTML = cardsHtml.join('');
}

// ─── DRAW CHARTS ───────────────────────────────────────────────

function renderRevenueChart() {
  const canvas = document.getElementById('revenueChart');
  const emptyEl = document.getElementById('revenueChartEmpty');
  if (!canvas) return;

  // Hủy chart cũ nếu đã tồn tại
  if (revenueChartInstance) {
    revenueChartInstance.destroy();
    revenueChartInstance = null;
  }

  const allFinancialData = getMonthlyRevenueAndCollected();
  // Lấy tối đa 6 tháng gần nhất để hiển thị
  const dataToShow = allFinancialData.slice(-6);

  if (dataToShow.length === 0) {
    canvas.style.display = 'none';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  canvas.style.display = 'block';
  emptyEl && emptyEl.classList.add('d-none');

  const labels = dataToShow.map(d => `T${d.month}/${d.year}`);
  const revenues = dataToShow.map(d => d.revenue);
  const collected = dataToShow.map(d => d.collected);

  revenueChartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Doanh thu (Hóa đơn)',
          data: revenues,
          backgroundColor: 'rgba(13, 110, 253, 0.85)',
          borderColor: 'rgb(13, 110, 253)',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Thực thu (Dòng tiền)',
          data: collected,
          backgroundColor: 'rgba(25, 135, 84, 0.85)',
          borderColor: 'rgb(25, 135, 84)',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatCurrency(value);
            }
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += formatCurrency(context.parsed.y);
              }
              return label;
            }
          }
        }
      }
    }
  });
}

function renderRoomStatusChart(roomStats) {
  const canvas = document.getElementById('roomStatusChart');
  if (!canvas) return;

  // Hủy chart cũ nếu đã tồn tại
  if (roomStatusChartInstance) {
    roomStatusChartInstance.destroy();
    roomStatusChartInstance = null;
  }

  // Trạng thái hiển thị khi chưa có phòng nào
  const totalRooms = roomStats.total || 0;
  const data = totalRooms > 0 
    ? [roomStats.available, roomStats.rented, roomStats.maintenance] 
    : [0, 0, 0];

  roomStatusChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Còn trống', 'Đang thuê', 'Bảo trì'],
      datasets: [{
        data,
        backgroundColor: [
          '#198754', // available -> xanh lá
          '#ffc107', // rented -> vàng
          '#dc3545'  // maintenance -> đỏ
        ],
        borderWidth: 2,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            boxWidth: 12,
            font: {
              size: 11
            }
          }
        }
      }
    }
  });
}
export default renderDashboardPage;
