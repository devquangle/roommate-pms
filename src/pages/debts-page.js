// src/pages/debts-page.js

/**
 * Trang theo dõi công nợ.
 * Hiển thị tổng công nợ, danh sách phòng còn nợ sắp xếp giảm dần, số ngày quá hạn, các bộ lọc phòng/tháng/quá hạn và liên kết xem chi tiết hóa đơn.
 */

import '../styles/debts.css';

import {
  getOutstandingInvoices,
  getOverdueInvoices,
  getTotalDebt,
  getDebtByRoom,
  getDebtByMonth,
  calculateDaysOverdue
} from '../services/debt-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentRoomId = '';
let currentMonth = '';
let currentYear = '';
let showOnlyOverdue = false;

export function renderDebtsPage(container) {
  // Reset state lọc
  currentRoomId = '';
  currentMonth = '';
  currentYear = '';
  showOnlyOverdue = false;

  container.innerHTML = `
    <div data-testid="debts-page">
      <!-- Summary Card (Tổng nợ hiện tại) -->
      <div class="row g-3 mb-4">
        <div class="col-12">
          <div class="card border-0 shadow-sm p-4 bg-white">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <span class="text-muted small">Tổng công nợ chưa thu hồi</span>
                <h2 class="debt-summary-val mt-1 mb-0" id="totalDebtVal" data-testid="sum-total-debt">0 ₫</h2>
              </div>
              <div class="text-end">
                <span class="badge bg-danger p-2" id="overdueCountText" data-testid="overdue-count">0 hóa đơn trễ hạn</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Filters & Sorting -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div class="d-flex flex-wrap align-items-center gap-2">
          <!-- Lọc phòng -->
          <select class="form-select form-select-sm" style="max-width: 140px;" id="filterRoom" data-testid="filter-room">
            <option value="">Tất cả phòng</option>
          </select>

          <!-- Lọc tháng -->
          <select class="form-select form-select-sm" style="max-width: 120px;" id="filterMonth" data-testid="filter-month">
            <option value="">Tất cả tháng</option>
            ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
              <option value="${m}">Tháng ${m}</option>
            `).join('')}
          </select>

          <!-- Lọc năm -->
          <input type="number" class="form-control form-control-sm" style="max-width: 80px;" id="filterYear" data-testid="filter-year"
            placeholder="Năm" />

          <!-- Checkbox lọc quá hạn -->
          <div class="form-check form-switch ms-2">
            <input class="form-check-input" type="checkbox" id="filterOverdue" data-testid="filter-overdue" />
            <label class="form-check-label small" for="filterOverdue">Chỉ hiện quá hạn</label>
          </div>
        </div>

        <span class="text-muted small">Sắp xếp: Công nợ giảm dần</span>
      </div>

      <!-- Main Layout: Grid 2 cột (Trái: Danh sách chi tiết nợ, Phải: Top phòng nợ nhiều nhất) -->
      <div class="row g-3">
        <!-- Bảng chi tiết công nợ -->
        <div class="col-lg-8">
          <div class="card border-0 shadow-sm p-3 bg-white">
            <h6 class="mb-3 text-muted">Chi tiết các hóa đơn chưa hoàn tất thanh toán</h6>
            <div class="table-responsive">
              <table class="table table-hover align-middle" data-testid="debts-table">
                <thead class="table-light">
                  <tr>
                    <th>Phòng</th>
                    <th>Kỳ hóa đơn</th>
                    <th>Hạn thanh toán</th>
                    <th class="text-end">Phải thu</th>
                    <th class="text-end">Còn nợ</th>
                    <th class="text-center">Quá hạn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody id="debtsTableBody" data-testid="debts-table-body">
                </tbody>
              </table>
            </div>
            <div id="debtsEmpty" class="text-muted text-center d-none p-4" data-testid="debts-empty">
              Không tìm thấy công nợ nào phù hợp bộ lọc.
            </div>
          </div>
        </div>

        <!-- Top phòng nợ nhiều nhất -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm p-3 bg-white">
            <h6 class="mb-3 text-muted">Phòng nợ nhiều nhất</h6>
            <div id="topRoomDebtsList" data-testid="top-room-debts-list">
              <!-- Render danh sách tiến trình nợ ở đây -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  populateRoomFilter();
  renderDebtsList();
  renderTopRoomDebts();
  bindEvents();
}

// ─── POPULATE ROOM FILTER ──────────────────────────────────────

function populateRoomFilter() {
  const filterRoom = document.getElementById('filterRoom');
  if (!filterRoom) return;

  const rooms = getRooms();
  const options = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;
}

// ─── RENDER DEBTS DETAIL ───────────────────────────────────────

function getFilteredDebts() {
  let list = getOutstandingInvoices();

  if (currentRoomId) {
    list = list.filter(inv => inv.roomId === currentRoomId);
  }
  if (currentMonth) {
    list = list.filter(inv => inv.month === Number(currentMonth));
  }
  if (currentYear) {
    list = list.filter(inv => inv.year === Number(currentYear));
  }
  if (showOnlyOverdue) {
    list = list.filter(inv => calculateDaysOverdue(inv.dueDate, new Date()) > 0);
  }

  // Sắp xếp công nợ còn lại giảm dần (theo yêu cầu: "Sắp xếp công nợ giảm dần")
  return list.sort((a, b) => b.remainingDebt - a.remainingDebt);
}

function renderDebtsList() {
  const tbody = document.getElementById('debtsTableBody');
  const emptyEl = document.getElementById('debtsEmpty');
  const totalDebtVal = document.getElementById('totalDebtVal');
  const overdueCountText = document.getElementById('overdueCountText');

  if (!tbody) return;

  const list = getFilteredDebts();

  // Tính lại tổng công nợ theo bộ lọc đang hiển thị
  const sumDebt = list.reduce((sum, inv) => sum + inv.remainingDebt, 0);
  const overdueCount = list.filter(inv => calculateDaysOverdue(inv.dueDate, new Date()) > 0).length;

  if (totalDebtVal) totalDebtVal.textContent = formatCurrency(sumDebt);
  if (overdueCountText) overdueCountText.textContent = `${overdueCount} hóa đơn trễ hạn`;

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    const room = getRoomById(item.roomId);
    const roomName = room ? room.name : item.roomId;

    const days = calculateDaysOverdue(item.dueDate, new Date());
    const overdueLabel = days > 0
      ? `<span class="badge-overdue-tag" data-testid="overdue-tag">${days} ngày</span>`
      : '<span class="text-muted small">-</span>';

    return `
      <tr data-testid="debt-row-${item.id}">
        <td><strong>${roomName}</strong></td>
        <td>Tháng ${item.month}/${item.year}</td>
        <td>${formatDateToDisplay(item.dueDate)}</td>
        <td class="text-end text-muted small">${formatCurrency(item.totalAmount)}</td>
        <td class="text-end text-danger fw-semibold" data-testid="remaining-debt-val">${formatCurrency(item.remainingDebt)}</td>
        <td class="text-center">${overdueLabel}</td>
        <td>
          <a href="#" class="btn btn-outline-primary btn-sm btn-view-invoice" data-id="${item.id}" data-testid="btn-view-invoice-${item.id}">
            Xem hóa đơn
          </a>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── RENDER TOP ROOM DEBTS ─────────────────────────────────────

function renderTopRoomDebts() {
  const container = document.getElementById('topRoomDebtsList');
  if (!container) return;

  const roomDebts = getDebtByRoom();

  if (roomDebts.length === 0) {
    container.innerHTML = '<p class="text-muted small text-center p-3">Không có công nợ phòng nào.</p>';
    return;
  }

  // Lấy phòng nợ nhiều nhất để tính phần trăm hiển thị tương ứng
  const maxDebt = roomDebts[0].totalDebt;

  container.innerHTML = roomDebts.slice(0, 5).map(rd => {
    const percent = maxDebt > 0 ? (rd.totalDebt / maxDebt) * 100 : 0;
    return `
      <div class="mb-3" data-testid="top-debt-item-${rd.roomId}">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="fw-semibold small">Phòng ${rd.roomName}</span>
          <span class="text-danger fw-bold small">${formatCurrency(rd.totalDebt)}</span>
        </div>
        <div class="debt-progress-bar">
          <div class="debt-progress-fill" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Lọc phòng
  const filterRoom = document.getElementById('filterRoom');
  if (filterRoom) {
    filterRoom.addEventListener('change', () => {
      currentRoomId = filterRoom.value;
      renderDebtsList();
    });
  }

  // Lọc tháng
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    filterMonth.addEventListener('change', () => {
      currentMonth = filterMonth.value;
      renderDebtsList();
    });
  }

  // Lọc năm
  const filterYear = document.getElementById('filterYear');
  if (filterYear) {
    filterYear.addEventListener('input', () => {
      currentYear = filterYear.value;
      renderDebtsList();
    });
  }

  // Lọc chỉ trễ hạn
  const filterOverdue = document.getElementById('filterOverdue');
  if (filterOverdue) {
    filterOverdue.addEventListener('change', () => {
      showOnlyOverdue = filterOverdue.checked;
      renderDebtsList();
    });
  }

  // Xem chi tiết hóa đơn (Event delegation)
  const tbody = document.getElementById('debtsTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const link = e.target.closest('.btn-view-invoice');
      if (!link) return;

      e.preventDefault();
      const id = link.dataset.id;
      if (!id) return;

      // Import động/hoặc gọi trực tiếp từ modal
      const invoice = getOutstandingInvoices().find(inv => inv.id === id);
      if (invoice) {
        openInvoiceDetail(invoice);
      }
    });
  }
}
