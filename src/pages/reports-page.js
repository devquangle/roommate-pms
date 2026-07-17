// src/pages/reports-page.js

/**
 * Trang báo cáo thống kê cho RoomMate.
 * Tích hợp bộ lọc từ tháng - đến tháng, khu vực, phòng và 5 Tab phân tích chuyên sâu:
 * Doanh thu, Công nợ, Điện nước, Phòng, Hợp đồng kèm biểu đồ Chart.js và tính năng xuất Excel/CSV.
 */

import '../styles/reports.css';
import Chart from 'chart.js/auto';
import * as StorageService from '../services/storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { getRooms, getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getActiveContractByRoom, getContractById, getContracts } from '../services/contract-service.js';
import { getOutstandingInvoices, calculateDaysOverdue } from '../services/debt-service.js';
import { getPayments } from '../services/payment-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { initSearchableSelect } from '../components/searchable-select.js';
import { renderEmptyState } from '../components/empty-state.js';

// ─── STATE TOÀN CỤC ─────────────────────────────────────────────
let fromMonth = 1;
let fromYear = 2026;
let toMonth = 12;
let toYear = 2026;
let selectedFloor = '';
let selectedRoomId = '';

// Lưu giữ các thực thể Chart để hủy trước khi vẽ lại (tránh lỗi đè chart của Chart.js)
let revenueLineChart = null;
let collectedDebtBarChart = null;
let electricityBarChart = null;
let waterBarChart = null;
let roomStatusPieChart = null;

export function renderReportsPage(container) {
  // Đặt mặc định khoảng lọc là từ đầu năm đến hết năm hiện tại
  const now = new Date();
  fromMonth = 1;
  fromYear = now.getFullYear();
  toMonth = 12;
  toYear = now.getFullYear();
  selectedFloor = '';
  selectedRoomId = '';

  container.innerHTML = `
    <div data-testid="reports-page" class="pb-5">
      <!-- Header -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="mb-0 fw-bold"><i class="bi bi-bar-chart-line me-2 text-primary"></i>Báo cáo & Thống kê</h4>
      </div>

      <!-- 1. Bộ lọc (Filters) -->
      <div class="card border-0 shadow-sm p-3 mb-4">
        <div class="row g-3 align-items-end">
          <!-- Từ tháng -->
          <div class="col-md-2 col-6">
            <label class="form-label small text-muted fw-bold">Từ tháng</label>
            <div class="d-flex gap-1">
              <select class="form-select form-select-sm" id="filterFromMonth">
                ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                  <option value="${m}" ${m === fromMonth ? 'selected' : ''}>T0${m}</option>
                `).join('')}
              </select>
              <select class="form-select form-select-sm" id="filterFromYear">
                <option value="2025" ${fromYear === 2025 ? 'selected' : ''}>2025</option>
                <option value="2026" ${fromYear === 2026 ? 'selected' : ''}>2026</option>
              </select>
            </div>
          </div>

          <!-- Đến tháng -->
          <div class="col-md-2 col-6">
            <label class="form-label small text-muted fw-bold">Đến tháng</label>
            <div class="d-flex gap-1">
              <select class="form-select form-select-sm" id="filterToMonth">
                ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                  <option value="${m}" ${m === toMonth ? 'selected' : ''}>T0${m}</option>
                `).join('')}
              </select>
              <select class="form-select form-select-sm" id="filterToYear">
                <option value="2025" ${toYear === 2025 ? 'selected' : ''}>2025</option>
                <option value="2026" ${toYear === 2026 ? 'selected' : ''}>2026</option>
              </select>
            </div>
          </div>

          <!-- Khu vực -->
          <div class="col-md-2 col-6">
            <label for="filterFloor" class="form-label small text-muted fw-bold">Khu vực (Tầng)</label>
            <select class="form-select form-select-sm" id="filterFloor">
              <option value="">Tất cả khu vực</option>
            </select>
          </div>

          <!-- Phòng -->
          <div class="col-md-2 col-6">
            <label for="filterRoom" class="form-label small text-muted fw-bold">Phòng</label>
            <select class="form-select form-select-sm" id="filterRoom">
              <option value="">Tất cả phòng</option>
            </select>
          </div>

          <!-- Nút hành động -->
          <div class="col-md-4 col-12 d-flex gap-2">
            <button class="btn btn-primary btn-sm flex-grow-1 fw-semibold" id="btnApplyFilters">
              <i class="bi bi-funnel-fill me-1"></i> Áp dụng bộ lọc
            </button>
            <button class="btn btn-outline-success btn-sm fw-semibold" id="btnExportData" title="Xuất dữ liệu CSV">
              <i class="bi bi-file-earmark-excel me-1"></i> Xuất dữ liệu
            </button>
          </div>
        </div>
      </div>

      <!-- 2. Nav Tabs Báo cáo -->
      <ul class="nav nav-tabs mb-4" id="reportTabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active fw-bold" id="revenue-tab" data-bs-toggle="tab" data-bs-target="#revenue-content" type="button" role="tab">
            <i class="bi bi-cash-coin me-1"></i>Doanh thu
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link fw-bold" id="debt-tab" data-bs-toggle="tab" data-bs-target="#debt-content" type="button" role="tab">
            <i class="bi bi-wallet-fill me-1"></i>Công nợ
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link fw-bold" id="utility-tab" data-bs-toggle="tab" data-bs-target="#utility-content" type="button" role="tab">
            <i class="bi bi-lightning-charge-fill me-1"></i>Điện nước
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link fw-bold" id="room-tab" data-bs-toggle="tab" data-bs-target="#room-content" type="button" role="tab">
            <i class="bi bi-house-door-fill me-1"></i>Phòng
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link fw-bold" id="contract-tab" data-bs-toggle="tab" data-bs-target="#contract-content" type="button" role="tab">
            <i class="bi bi-file-earmark-text-fill me-1"></i>Hợp đồng
          </button>
        </li>
      </ul>

      <!-- 3. Tab Contents -->
      <div class="tab-content" id="reportTabsContent">
        <!-- ─── TAB 1: DOANH THU ─── -->
        <div class="tab-pane fade show active" id="revenue-content" role="tabpanel">
          <!-- Stats Cards -->
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tổng giá trị hóa đơn phát sinh</span>
                <h4 class="mb-0 fw-bold text-primary" id="statInvoicedTotal">0 ₫</h4>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tổng thực thu (Đã thu)</span>
                <h4 class="mb-0 fw-bold text-success" id="statCollectedTotal">0 ₫</h4>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tổng công nợ chưa thu</span>
                <h4 class="mb-0 fw-bold text-danger" id="statRemainingDebtTotal">0 ₫</h4>
              </div>
            </div>
          </div>

          <!-- Charts -->
          <div class="row g-3 mb-4">
            <div class="col-lg-6">
              <div class="card border-0 shadow-sm p-3 bg-white">
                <h6 class="fw-bold mb-3 small text-muted text-uppercase">Biểu đồ đường doanh thu theo tháng</h6>
                <div style="height: 250px; position: relative;">
                  <canvas id="revenueLineChart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="card border-0 shadow-sm p-3 bg-white">
                <h6 class="fw-bold mb-3 small text-muted text-uppercase">Biểu đồ cột thực thu & công nợ</h6>
                <div style="height: 250px; position: relative;">
                  <canvas id="collectedDebtBarChart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="card border-0 shadow-sm rounded overflow-hidden">
            <div class="card-header bg-white py-3 border-0">
              <h6 class="mb-0 fw-bold text-dark">Bảng số liệu chi tiết theo tháng</h6>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 text-nowrap" id="revenueTable">
                <thead class="table-light border-bottom">
                  <tr>
                    <th>Thời gian</th>
                    <th class="text-end">Doanh thu phát sinh</th>
                    <th class="text-end">Thực thu</th>
                    <th class="text-end">Còn nợ</th>
                    <th class="text-center">Tỷ lệ thu hồi</th>
                  </tr>
                </thead>
                <tbody id="revenueTableBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ─── TAB 2: CÔNG NỢ ─── -->
        <div class="tab-pane fade" id="debt-content" role="tabpanel">
          <!-- Stats Cards -->
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tổng công nợ quá hạn</span>
                <h4 class="mb-0 fw-bold text-danger" id="statOverdueDebtTotal">0 ₫</h4>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tổng số hóa đơn còn nợ</span>
                <h4 class="mb-0 fw-bold text-warning" id="statDebtInvoiceCount">0 HĐ</h4>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="card border-0 shadow-sm rounded overflow-hidden">
            <div class="card-header bg-white py-3 border-0">
              <h6 class="mb-0 fw-bold text-dark">Bảng theo dõi chi tiết công nợ theo phòng</h6>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 text-nowrap" id="debtReportTable">
                <thead class="table-light border-bottom">
                  <tr>
                    <th>Phòng</th>
                    <th>Người thuê</th>
                    <th class="text-center">Số HĐ nợ</th>
                    <th class="text-end">Tổng tiền hóa đơn</th>
                    <th class="text-end">Đã thanh toán</th>
                    <th class="text-end">Còn nợ</th>
                    <th class="text-center">Hạn đóng gần nhất</th>
                    <th class="text-center">Số ngày trễ hạn</th>
                  </tr>
                </thead>
                <tbody id="debtReportTableBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- ─── TAB 3: ĐIỆN NƯỚC ─── -->
        <div class="tab-pane fade" id="utility-content" role="tabpanel">
          <!-- Biểu đồ tiêu thụ điện nước -->
          <div class="row g-3 mb-4">
            <div class="col-lg-6">
              <div class="card border-0 shadow-sm p-3 bg-white">
                <h6 class="fw-bold mb-3 small text-muted text-uppercase">Biểu đồ điện tiêu thụ theo phòng (kWh)</h6>
                <div style="height: 250px; position: relative;">
                  <canvas id="electricityBarChart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-6">
              <div class="card border-0 shadow-sm p-3 bg-white">
                <h6 class="fw-bold mb-3 small text-muted text-uppercase">Biểu đồ nước tiêu thụ theo phòng (m³)</h6>
                <div style="height: 250px; position: relative;">
                  <canvas id="waterBarChart"></canvas>
                </div>
              </div>
            </div>
          </div>

          <!-- Bảng & Cảnh báo tiêu thụ -->
          <div class="row g-3">
            <div class="col-lg-7">
              <div class="card border-0 shadow-sm rounded overflow-hidden">
                <div class="card-header bg-white py-3 border-0">
                  <h6 class="mb-0 fw-bold text-dark">Top 5 phòng tiêu thụ cao nhất (Trong kì lọc)</h6>
                </div>
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0 text-nowrap" id="topUtilitiesTable">
                    <thead class="table-light border-bottom">
                      <tr>
                        <th>Hạng</th>
                        <th>Phòng</th>
                        <th class="text-end">Điện tiêu thụ (kWh)</th>
                        <th class="text-end">Nước tiêu thụ (m³)</th>
                      </tr>
                    </thead>
                    <tbody id="topUtilitiesTableBody">
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="col-lg-5">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <h6 class="fw-bold mb-3 small text-danger text-uppercase"><i class="bi bi-shield-exclamation me-1"></i>Cảnh báo tiêu thụ bất thường (>50%)</h6>
                <div id="utilityWarnings" class="overflow-auto" style="max-height: 260px;">
                  <p class="text-muted small fst-italic">Không phát hiện chỉ số tiêu thụ bất thường trong kỳ lọc này.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── TAB 4: PHÒNG ─── -->
        <div class="tab-pane fade" id="room-content" role="tabpanel">
          <!-- Stats Cards -->
          <div class="row g-3 mb-4">
            <div class="col-md-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tỷ lệ lấp đầy phòng</span>
                <h4 class="mb-0 fw-bold text-primary" id="statOccupancyRate">0%</h4>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Phòng đang cho thuê</span>
                <h4 class="mb-0 fw-bold text-success" id="statRentedRooms">0 phòng</h4>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Phòng đang để trống</span>
                <h4 class="mb-0 fw-bold text-secondary" id="statAvailableRooms">0 phòng</h4>
              </div>
            </div>
          </div>

          <!-- Room Status and Available Rooms List -->
          <div class="row g-3">
            <div class="col-lg-4">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <h6 class="fw-bold mb-3 small text-muted text-uppercase">Cơ cấu trạng thái phòng</h6>
                <div style="height: 180px; position: relative;">
                  <canvas id="roomStatusPieChart"></canvas>
                </div>
              </div>
            </div>
            <div class="col-lg-8">
              <div class="card border-0 shadow-sm rounded overflow-hidden">
                <div class="card-header bg-white py-3 border-0">
                  <h6 class="mb-0 fw-bold text-dark">Danh sách phòng trống hiện tại</h6>
                </div>
                <div class="table-responsive">
                  <table class="table table-hover align-middle mb-0 text-nowrap" id="availableRoomsTable">
                    <thead class="table-light border-bottom">
                      <tr>
                        <th>Tên phòng</th>
                        <th>Khu vực (Tầng)</th>
                        <th>Loại phòng</th>
                        <th class="text-end">Giá thuê mặc định</th>
                        <th>Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody id="availableRoomsTableBody">
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ─── TAB 5: HỢP ĐỒNG ─── -->
        <div class="tab-pane fade" id="contract-content" role="tabpanel">
          <!-- Stats Cards -->
          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Tổng hợp đồng đang có hiệu lực</span>
                <h4 class="mb-0 fw-bold text-success" id="statActiveContracts">0 hợp đồng</h4>
              </div>
            </div>
            <div class="col-md-6">
              <div class="card border-0 shadow-sm p-3 bg-white h-100">
                <span class="text-muted small d-block mb-1">Hợp đồng sắp hết hạn (trong 30 ngày)</span>
                <h4 class="mb-0 fw-bold text-danger" id="statExpiringContracts">0 hợp đồng</h4>
              </div>
            </div>
          </div>

          <!-- Contracts Table -->
          <div class="card border-0 shadow-sm rounded overflow-hidden">
            <div class="card-header bg-white py-3 border-0">
              <h6 class="mb-0 fw-bold text-dark">Chi tiết danh sách hợp đồng hoạt động & sắp hết hạn</h6>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0 text-nowrap" id="contractsReportTable">
                <thead class="table-light border-bottom">
                  <tr>
                    <th>Phòng</th>
                    <th>Người thuê đại diện</th>
                    <th>Ngày bắt đầu</th>
                    <th>Ngày kết thúc</th>
                    <th class="text-end">Giá thuê</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody id="contractsReportTableBody">
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  populateFilters();
  bindEvents();
  triggerSearch();
}

// ─── POPULATE FILTERS ──────────────────────────────────────────

function populateFilters() {
  const rooms = getRooms();
  
  // Nạp khu vực
  const floorSelect = document.getElementById('filterFloor');
  if (floorSelect) {
    const uniqueFloors = [...new Set(rooms.map(r => r.floor).filter(Boolean))];
    floorSelect.innerHTML = '<option value="">Tất cả khu vực</option>' + 
      uniqueFloors.map(f => `<option value="${f}">${f}</option>`).join('');
  }

  // Nạp phòng tương ứng
  const roomSelect = document.getElementById('filterRoom');
  if (roomSelect && floorSelect) {
    const updateRooms = () => {
      const floorVal = floorSelect.value;
      const filtered = floorVal ? rooms.filter(r => r.floor === floorVal) : rooms;
      roomSelect.innerHTML = '<option value="">Tất cả phòng</option>' +
        filtered.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
      
      initSearchableSelect(roomSelect);
    };

    floorSelect.addEventListener('change', updateRooms);
    updateRooms();
  }
}

// ─── COMPILE FINANCIAL REPORT DATA ──────────────────────────────

function getCompiledFinancialData() {
  const startVal = fromYear * 12 + fromMonth;
  const endVal = toYear * 12 + toMonth;

  const invoices = StorageService.getAll(STORAGE_KEYS.INVOICES);
  const rooms = getRooms();

  // Lọc danh sách hóa đơn theo khoảng thời gian và phòng/khu vực
  const filtered = invoices.filter(inv => {
    const invVal = inv.year * 12 + inv.month;
    if (invVal < startVal || invVal > endVal) return false;
    if (selectedRoomId && inv.roomId !== selectedRoomId) return false;
    if (selectedFloor) {
      const r = rooms.find(room => room.id === inv.roomId);
      if (!r || r.floor !== selectedFloor) return false;
    }
    return inv.status !== 'cancelled' && inv.status !== 'draft';
  });

  // Gom theo tháng
  const monthlyMap = {};
  for (let val = startVal; val <= endVal; val++) {
    const y = Math.floor((val - 1) / 12);
    const m = val - y * 12;
    const label = `Tháng ${m}/${y}`;
    monthlyMap[val] = {
      label,
      month: m,
      year: y,
      totalAmount: 0,
      paidAmount: 0,
      remainingDebt: 0
    };
  }

  filtered.forEach(inv => {
    const val = inv.year * 12 + inv.month;
    if (monthlyMap[val]) {
      monthlyMap[val].totalAmount += Number(inv.totalAmount) || 0;
      monthlyMap[val].paidAmount += Number(inv.paidAmount) || 0;
      monthlyMap[val].remainingDebt += Number(inv.remainingDebt) || 0;
    }
  });

  return Object.values(monthlyMap);
}

// ─── RENDER TABS DATA & CHARTS ──────────────────────────────────

function triggerSearch() {
  // Lấy dữ liệu lọc hiện hành
  fromMonth = Number(document.getElementById('filterFromMonth').value);
  fromYear = Number(document.getElementById('filterFromYear').value);
  toMonth = Number(document.getElementById('filterToMonth').value);
  toYear = Number(document.getElementById('filterToYear').value);
  selectedFloor = document.getElementById('filterFloor').value;
  selectedRoomId = document.getElementById('filterRoom').value;

  if (fromYear * 12 + fromMonth > toYear * 12 + toMonth) {
    showToast('Thời gian bắt đầu không được lớn hơn thời gian kết thúc!', 'danger');
    return;
  }

  // Cập nhật tất cả các Tab số liệu
  updateRevenueTab();
  updateDebtTab();
  updateUtilityTab();
  updateRoomTab();
  updateContractTab();

  // Làm mới chart của tab hiện tại đang active
  refreshActiveTabCharts();
}

function refreshActiveTabCharts() {
  const activeTab = document.querySelector('#reportTabs .nav-link.active');
  if (!activeTab) return;

  if (activeTab.id === 'revenue-tab') {
    renderRevenueCharts();
  } else if (activeTab.id === 'utility-tab') {
    renderUtilityCharts();
  } else if (activeTab.id === 'room-tab') {
    renderRoomCharts();
  }
}

// ─── TAB 1: DOANH THU ───
function updateRevenueTab() {
  const data = getCompiledFinancialData();

  // Tính tổng
  const totalInvoiced = data.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalCollected = data.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalDebt = data.reduce((sum, d) => sum + d.remainingDebt, 0);

  document.getElementById('statInvoicedTotal').textContent = formatCurrency(totalInvoiced);
  document.getElementById('statCollectedTotal').textContent = formatCurrency(totalCollected);
  document.getElementById('statRemainingDebtTotal').textContent = formatCurrency(totalDebt);

  // Render Table
  const tbody = document.getElementById('revenueTableBody');
  if (tbody) {
    if (totalInvoiced === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-5">
            ${renderEmptyState('no-reports', {
              actionId: 'btnEmptyActionResetFilter',
              actionText: '🔄 Lọc lại khoảng thời gian'
            })}
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(d => {
      const rate = d.totalAmount > 0 ? ((d.paidAmount / d.totalAmount) * 100).toFixed(1) + '%' : '—';
      return `
        <tr>
          <td><strong>${d.label}</strong></td>
          <td class="text-end fw-semibold text-primary">${formatCurrency(d.totalAmount)}</td>
          <td class="text-end fw-semibold text-success">${formatCurrency(d.paidAmount)}</td>
          <td class="text-end fw-semibold text-danger">${formatCurrency(d.remainingDebt)}</td>
          <td class="text-center"><span class="badge bg-light text-dark border">${rate}</span></td>
        </tr>
      `;
    }).join('');
  }
}

function renderRevenueCharts() {
  const data = getCompiledFinancialData();
  const labels = data.map(d => d.label);

  // Line Chart
  const lineCtx = document.getElementById('revenueLineChart');
  if (lineCtx) {
    if (revenueLineChart) revenueLineChart.destroy();
    revenueLineChart = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Doanh thu phát sinh',
          data: data.map(d => d.totalAmount),
          borderColor: '#0d6efd',
          backgroundColor: 'rgba(13, 110, 253, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Bar Chart
  const barCtx = document.getElementById('collectedDebtBarChart');
  if (barCtx) {
    if (collectedDebtBarChart) collectedDebtBarChart.destroy();
    collectedDebtBarChart = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Thực thu',
            data: data.map(d => d.paidAmount),
            backgroundColor: '#198754'
          },
          {
            label: 'Còn nợ',
            data: data.map(d => d.remainingDebt),
            backgroundColor: '#dc3545'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: false },
          y: { stacked: false }
        }
      }
    });
  }
}

// ─── TAB 2: CÔNG NỢ ───
function updateDebtTab() {
  const outstanding = getOutstandingInvoices();
  const rooms = getRooms();
  const today = new Date();

  // Lọc
  const filtered = outstanding.filter(inv => {
    const invVal = inv.year * 12 + inv.month;
    if (invVal < fromYear * 12 + fromMonth || invVal > toYear * 12 + toMonth) return false;
    if (selectedRoomId && inv.roomId !== selectedRoomId) return false;
    if (selectedFloor) {
      const r = rooms.find(room => room.id === inv.roomId);
      if (!r || r.floor !== selectedFloor) return false;
    }
    return true;
  });

  // Gom theo phòng
  const roomMap = {};
  filtered.forEach(inv => {
    if (!roomMap[inv.roomId]) {
      const room = getRoomById(inv.roomId);
      const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : inv.roomId;
      
      const contract = getActiveContractByRoom(inv.roomId);
      const tenant = contract ? getTenantById(contract.tenantId) : null;
      const tenantName = tenant ? tenant.fullName : 'N/A';

      roomMap[inv.roomId] = {
        roomName,
        tenantName,
        invoiceCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingDebt: 0,
        nearestDueDate: null
      };
    }

    const group = roomMap[inv.roomId];
    group.invoiceCount++;
    group.totalAmount += Number(inv.totalAmount) || 0;
    group.paidAmount += Number(inv.paidAmount) || 0;
    group.remainingDebt += Number(inv.remainingDebt) || 0;

    if (!group.nearestDueDate || new Date(inv.dueDate) < new Date(group.nearestDueDate)) {
      group.nearestDueDate = inv.dueDate;
    }
  });

  const list = Object.values(roomMap).sort((a, b) => b.remainingDebt - a.remainingDebt);

  // Stats
  const totalOverdueDebt = filtered
    .filter(inv => calculateDaysOverdue(inv.dueDate, today) > 0)
    .reduce((sum, inv) => sum + (Number(inv.remainingDebt) || 0), 0);

  document.getElementById('statOverdueDebtTotal').textContent = formatCurrency(totalOverdueDebt);
  document.getElementById('statDebtInvoiceCount').textContent = `${filtered.length} HĐ`;

  const tbody = document.getElementById('debtReportTableBody');
  if (tbody) {
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted small py-4">Không có công nợ nào phù hợp khoảng lọc.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => {
      const days = item.nearestDueDate ? calculateDaysOverdue(item.nearestDueDate, today) : 0;
      const daysText = days > 0 ? `${days} ngày` : '—';
      return `
        <tr>
          <td><strong>${item.roomName}</strong></td>
          <td>${item.tenantName}</td>
          <td class="text-center fw-semibold text-secondary">${item.invoiceCount}</td>
          <td class="text-end text-muted small">${formatCurrency(item.totalAmount)}</td>
          <td class="text-end text-muted small">${formatCurrency(item.paidAmount)}</td>
          <td class="text-end text-danger fw-bold">${formatCurrency(item.remainingDebt)}</td>
          <td class="text-center small">${formatDateToDisplay(item.nearestDueDate)}</td>
          <td class="text-center fw-semibold text-danger small">${daysText}</td>
        </tr>
      `;
    }).join('');
  }
}

// ─── TAB 3: ĐIỆN NƯỚC ───
function getUtilityData() {
  const startVal = fromYear * 12 + fromMonth;
  const endVal = toYear * 12 + toMonth;

  const readings = StorageService.getAll(STORAGE_KEYS.METER_READINGS);
  const rooms = getRooms();

  return readings.filter(r => {
    const rVal = r.year * 12 + r.month;
    if (rVal < startVal || rVal > endVal) return false;
    if (selectedRoomId && r.roomId !== selectedRoomId) return false;
    if (selectedFloor) {
      const room = rooms.find(rm => rm.id === r.roomId);
      if (!room || room.floor !== selectedFloor) return false;
    }
    return true;
  });
}

function updateUtilityTab() {
  const readings = getUtilityData();
  const rooms = getRooms();
  const today = new Date();

  // Gom theo phòng để tính tổng tiêu thụ trong kì
  const roomUtilMap = {};
  readings.forEach(r => {
    if (!roomUtilMap[r.roomId]) {
      const room = rooms.find(rm => rm.id === r.roomId);
      roomUtilMap[r.roomId] = {
        roomId: r.roomId,
        roomName: room ? room.name : r.roomId,
        electricityUsage: 0,
        waterUsage: 0
      };
    }
    roomUtilMap[r.roomId].electricityUsage += (r.electricityUsage || 0);
    roomUtilMap[r.roomId].waterUsage += (r.waterUsage || 0);
  });

  const list = Object.values(roomUtilMap).sort((a, b) => b.electricityUsage - a.electricityUsage);

  // Top 5 phòng tiêu thụ cao nhất
  const topTable = document.getElementById('topUtilitiesTableBody');
  if (topTable) {
    if (list.length === 0) {
      topTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted small py-4">Chưa có chỉ số tiêu thụ điện nước.</td></tr>`;
    } else {
      topTable.innerHTML = list.slice(0, 5).map((item, index) => {
        return `
          <tr>
            <td class="text-center"><strong>#${index + 1}</strong></td>
            <td><strong>${item.roomName}</strong></td>
            <td class="text-end fw-semibold text-warning">${item.electricityUsage.toLocaleString()} kWh</td>
            <td class="text-end fw-semibold text-info">${item.waterUsage.toLocaleString()} m³</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Cảnh báo tiêu thụ bất thường (Tăng >50% và trị số chênh lệch đáng kể điện >30kWh, nước >5m3)
  const alertContainer = document.getElementById('utilityWarnings');
  if (alertContainer) {
    const alerts = [];
    readings.forEach(rd => {
      // Tìm chỉ số tháng trước liền kề của phòng đó
      let prevM = rd.month - 1;
      let prevY = rd.year;
      if (prevM === 0) {
        prevM = 12;
        prevY -= 1;
      }
      
      const prevRd = StorageService.getAll(STORAGE_KEYS.METER_READINGS).find(r => 
        r.roomId === rd.roomId && r.month === prevM && r.year === prevY
      );

      if (prevRd) {
        const room = rooms.find(rm => rm.id === rd.roomId);
        const roomName = room ? room.name : rd.roomId;

        // Kiểm tra điện
        const elecDiff = rd.electricityUsage - prevRd.electricityUsage;
        if (prevRd.electricityUsage > 0 && elecDiff > 30) {
          const elecPct = (elecDiff / prevRd.electricityUsage) * 100;
          if (elecPct > 50) {
            alerts.push(`
              <div class="alert alert-warning py-2 px-3 mb-2 border-0 rounded small">
                <i class="bi bi-lightning-fill text-warning me-1"></i>
                <strong>${roomName}</strong>: Điện <strong>${rd.electricityUsage} kWh</strong> 
                (Tăng <strong>${elecPct.toFixed(1)}%</strong>, +${elecDiff} kWh so với tháng ${prevM})
              </div>
            `);
          }
        }

        // Kiểm tra nước
        const waterDiff = rd.waterUsage - prevRd.waterUsage;
        if (prevRd.waterUsage > 0 && waterDiff > 5) {
          const waterPct = (waterDiff / prevRd.waterUsage) * 100;
          if (waterPct > 50) {
            alerts.push(`
              <div class="alert alert-danger py-2 px-3 mb-2 border-0 rounded small" style="background-color: #ffe8d6; color: #d9480f;">
                <i class="bi bi-droplet-fill text-danger me-1"></i>
                <strong>${roomName}</strong>: Nước <strong>${rd.waterUsage} m³</strong> 
                (Tăng <strong>${waterPct.toFixed(1)}%</strong>, +${waterDiff} m³ so với tháng ${prevM})
              </div>
            `);
          }
        }
      }
    });

    if (alerts.length === 0) {
      alertContainer.innerHTML = '<p class="text-muted small fst-italic">Không phát hiện chỉ số tiêu thụ bất thường nào.</p>';
    } else {
      alertContainer.innerHTML = alerts.join('');
    }
  }
}

function renderUtilityCharts() {
  const readings = getUtilityData();
  const rooms = getRooms();

  const roomUtilMap = {};
  readings.forEach(r => {
    if (!roomUtilMap[r.roomId]) {
      const room = rooms.find(rm => rm.id === r.roomId);
      roomUtilMap[r.roomId] = {
        roomName: room ? room.name : r.roomId,
        electricityUsage: 0,
        waterUsage: 0
      };
    }
    roomUtilMap[r.roomId].electricityUsage += (r.electricityUsage || 0);
    roomUtilMap[r.roomId].waterUsage += (r.waterUsage || 0);
  });

  const list = Object.values(roomUtilMap);
  const labels = list.map(item => item.roomName);

  // Điện Chart
  const elecCtx = document.getElementById('electricityBarChart');
  if (elecCtx) {
    if (electricityBarChart) electricityBarChart.destroy();
    electricityBarChart = new Chart(elecCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Điện tiêu thụ (kWh)',
          data: list.map(item => item.electricityUsage),
          backgroundColor: '#ffc107'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  // Nước Chart
  const waterCtx = document.getElementById('waterBarChart');
  if (waterCtx) {
    if (waterBarChart) waterBarChart.destroy();
    waterBarChart = new Chart(waterCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Nước tiêu thụ (m³)',
          data: list.map(item => item.waterUsage),
          backgroundColor: '#0dcaf0'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }
}

// ─── TAB 4: PHÒNG ───
function updateRoomTab() {
  const rooms = getRooms();
  const total = rooms.length;
  const rented = rooms.filter(r => r.status === 'rented').length;
  const available = rooms.filter(r => r.status === 'available').length;
  const rate = total > 0 ? ((rented / total) * 100).toFixed(1) + '%' : '0%';

  document.getElementById('statOccupancyRate').textContent = rate;
  document.getElementById('statRentedRooms').textContent = `${rented} phòng`;
  document.getElementById('statAvailableRooms').textContent = `${available} phòng`;

  // Bảng phòng trống
  const emptyRooms = rooms.filter(r => r.status === 'available');
  const tbody = document.getElementById('availableRoomsTableBody');
  if (tbody) {
    if (emptyRooms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted small py-4">Tất cả các phòng hiện đã được lấp đầy.</td></tr>`;
      return;
    }

    tbody.innerHTML = emptyRooms.map(r => {
      const typeLabel = r.type === 'deluxe' ? 'Phòng Cao Cấp (Deluxe)' : (r.type === 'suite' ? 'Phòng Vip (Suite)' : 'Phòng Tiêu Chuẩn');
      return `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.floor || '—'}</td>
          <td>${typeLabel}</td>
          <td class="text-end fw-semibold text-dark">${formatCurrency(r.price)}</td>
          <td><span class="badge bg-success-subtle text-success">Còn trống</span></td>
        </tr>
      `;
    }).join('');
  }
}

function renderRoomCharts() {
  const rooms = getRooms();
  const rented = rooms.filter(r => r.status === 'rented').length;
  const available = rooms.filter(r => r.status === 'available').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;

  const pieCtx = document.getElementById('roomStatusPieChart');
  if (pieCtx) {
    if (roomStatusPieChart) roomStatusPieChart.destroy();
    roomStatusPieChart = new Chart(pieCtx, {
      type: 'pie',
      data: {
        labels: ['Đang thuê', 'Phòng trống', 'Bảo trì'],
        datasets: [{
          data: [rented, available, maintenance],
          backgroundColor: ['#198754', '#0dcaf0', '#6c757d']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 12, font: { size: 10 } }
          }
        }
      }
    });
  }
}

// ─── TAB 5: HỢP ĐỒNG ───
function updateContractTab() {
  const contracts = getContracts();
  const today = new Date();
  const rooms = getRooms();

  // 1. Hợp đồng đang hoạt động
  const activeContracts = contracts.filter(c => c.status === 'active');
  
  // 2. Hợp đồng sắp hết hạn trong 30 ngày
  const expiringContracts = activeContracts.filter(c => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  });

  document.getElementById('statActiveContracts').textContent = `${activeContracts.length} hợp đồng`;
  document.getElementById('statExpiringContracts').textContent = `${expiringContracts.length} hợp đồng`;

  // Render Table
  const tbody = document.getElementById('contractsReportTableBody');
  if (tbody) {
    if (activeContracts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted small py-4">Không có hợp đồng nào đang hoạt động.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeContracts.map(item => {
      const room = rooms.find(rm => rm.id === item.roomId);
      const roomName = room ? room.name : item.roomId;
      
      const tenant = getTenantById(item.tenantId);
      const tenantName = tenant ? tenant.fullName : 'N/A';

      // Kiểm tra xem có thuộc nhóm sắp hết hạn hay không
      const end = new Date(item.endDate);
      const diffTime = end - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusBadge = '<span class="badge bg-success-subtle text-success">Đang hoạt động</span>';
      if (diffDays >= 0 && diffDays <= 30) {
        statusBadge = `<span class="badge text-dark" style="background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba;">Hết hạn trong ${diffDays} ngày</span>`;
      }

      return `
        <tr>
          <td><strong>${roomName}</strong></td>
          <td>${tenantName}</td>
          <td>${formatDateToDisplay(item.startDate)}</td>
          <td>${formatDateToDisplay(item.endDate)}</td>
          <td class="text-end fw-semibold text-dark">${formatCurrency(item.roomPrice)}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join('');
  }
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Click nút Áp dụng bộ lọc
  const btnApply = document.getElementById('btnApplyFilters');
  if (btnApply) {
    btnApply.addEventListener('click', () => {
      triggerSearch();
      showToast('Đã áp dụng các tiêu chí lọc mới!', 'success');
    });
  }

  // Click nút Xuất dữ liệu
  const btnExport = document.getElementById('btnExportData');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const activeTab = document.querySelector('#reportTabsContent .tab-pane.active');
      if (!activeTab) return;

      const table = activeTab.querySelector('table');
      if (!table) {
        showToast('Không tìm thấy bảng số liệu để xuất dữ liệu!', 'warning');
        return;
      }

      const filename = `bao_cao_${activeTab.id}_${new Date().toISOString().split('T')[0]}.csv`;
      exportTableToCSV(table.id, filename);
    });
  }

  // Xử lý sự kiện thay đổi Tab để vẽ lại biểu đồ tương ứng
  const tabEl = document.getElementById('reportTabs');
  if (tabEl) {
    tabEl.addEventListener('shown.bs.tab', (e) => {
      const activeTabId = e.target.id;
      if (activeTabId === 'revenue-tab') {
        renderRevenueCharts();
      } else if (activeTabId === 'utility-tab') {
        renderUtilityCharts();
      } else if (activeTabId === 'room-tab') {
        renderRoomCharts();
      }
    });
  }

  // Click handler delegation cho empty state
  const revenueTable = document.getElementById('revenueTable');
  if (revenueTable) {
    revenueTable.addEventListener('click', (e) => {
      const btnReset = e.target.closest('#btnEmptyActionResetFilter');
      if (btnReset) {
        e.preventDefault();
        // Reset về mặc định
        const now = new Date();
        document.getElementById('filterFromMonth').value = '1';
        document.getElementById('filterFromYear').value = String(now.getFullYear());
        document.getElementById('filterToMonth').value = '12';
        document.getElementById('filterToYear').value = String(now.getFullYear());
        
        triggerSearch();
        showToast('Đã khôi phục khoảng thời gian mặc định (Cả năm)!', 'info');
      }
    });
  }
}

// ─── EXPORT TO CSV ─────────────────────────────────────────────

function exportTableToCSV(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csvContent = "\uFEFF"; // Thêm BOM để tránh lỗi font tiếng Việt Excel
  const rows = table.querySelectorAll('tr');

  rows.forEach(row => {
    const cols = row.querySelectorAll('th, td');
    const rowData = [];
    cols.forEach(col => {
      // Loại bỏ khoảng trắng và chuyển đổi kí tự nháy kép
      let text = col.innerText.trim().replace(/"/g, '""');
      rowData.push(`"${text}"`);
    });
    csvContent += rowData.join(',') + "\r\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Xuất file ${filename} thành công!`, 'success');
}
