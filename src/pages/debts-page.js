// src/pages/debts-page.js

/**
 * Trang theo dõi công nợ.
 * Hiển thị tổng công nợ, nợ quá hạn, các bộ lọc nâng cao và bảng tổng hợp nợ theo phòng/khách thuê kèm cảnh báo phân màu trực quan.
 */

import '../styles/debts.css';

import {
  getOutstandingInvoices,
  calculateDaysOverdue
} from '../services/debt-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getActiveContractByRoom, getContractById } from '../services/contract-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';
import { openPaymentForm } from '../components/payment-form.js';
import { showToast } from '../components/toast.js';
import { renderPagination } from '../components/pagination.js';
import { initSearchableSelect } from '../components/searchable-select.js';
import { ROOM_STATUS_LABELS } from '../constants/statuses.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentRoomId = '';
let currentMonth = '';
let currentYear = '';
let currentDebtLevel = ''; // '', '1m', '5m', '10m'
let showOnlyOverdue = false;
let currentSort = 'debt-desc'; // 'debt-desc', 'debt-asc', 'overdue-desc'
let currentPage = 1;

export function renderDebtsPage(container) {
  // Reset state lọc khi vào trang
  currentRoomId = '';
  currentMonth = '';
  currentYear = '';
  currentDebtLevel = '';
  showOnlyOverdue = false;
  currentSort = 'debt-desc';
  currentPage = 1;

  container.innerHTML = `
    <div data-testid="debts-page" class="pb-5">
      <!-- 1. Header Cards Row (4 cards) -->
      <div class="row g-3 mb-4">
        <!-- Tổng công nợ -->
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <div class="d-flex align-items-center">
              <div class="rounded-circle bg-danger-subtle p-3 me-3 text-danger d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                <i class="bi bi-wallet fs-5"></i>
              </div>
              <div>
                <span class="text-muted small d-block">Tổng công nợ</span>
                <h5 class="mb-0 fw-bold text-dark" id="statTotalDebt">0 ₫</h5>
              </div>
            </div>
          </div>
        </div>

        <!-- Công nợ quá hạn -->
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <div class="d-flex align-items-center">
              <div class="rounded-circle bg-warning-subtle p-3 me-3 text-warning d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                <i class="bi bi-exclamation-triangle fs-5"></i>
              </div>
              <div>
                <span class="text-muted small d-block">Nợ quá hạn</span>
                <h5 class="mb-0 fw-bold text-warning" id="statOverdueDebt">0 ₫</h5>
              </div>
            </div>
          </div>
        </div>

        <!-- Số phòng còn nợ -->
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <div class="d-flex align-items-center">
              <div class="rounded-circle bg-primary-subtle p-3 me-3 text-primary d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                <i class="bi bi-house-door fs-5"></i>
              </div>
              <div>
                <span class="text-muted small d-block">Số phòng nợ</span>
                <h5 class="mb-0 fw-bold text-primary" id="statRoomsCount">0 phòng</h5>
              </div>
            </div>
          </div>
        </div>

        <!-- Hóa đơn quá hạn -->
        <div class="col-md-3 col-sm-6">
          <div class="card border-0 shadow-sm p-3 h-100">
            <div class="d-flex align-items-center">
              <div class="rounded-circle bg-dark-subtle p-3 me-3 text-dark d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                <i class="bi bi-file-earmark-x fs-5"></i>
              </div>
              <div>
                <span class="text-muted small d-block">HĐ quá hạn</span>
                <h5 class="mb-0 fw-bold text-danger" id="statOverdueInvoices">0 HĐ</h5>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Filters (Card) -->
      <div class="card border-0 shadow-sm p-3 mb-4">
        <div class="d-flex align-items-center flex-wrap gap-3 text-nowrap">
          <!-- Chọn phòng -->
          <div class="d-flex align-items-center gap-1">
            <label for="filterRoom" class="small text-muted fw-bold mb-0">Chọn phòng:</label>
            <select class="form-select form-select-sm" style="width: 140px;" id="filterRoom" data-testid="filter-room">
              <option value="">Tất cả phòng</option>
            </select>
          </div>

          <!-- Lọc tháng -->
          <div class="d-flex align-items-center gap-1">
            <label for="filterMonth" class="small text-muted fw-bold mb-0">Tháng:</label>
            <select class="form-select form-select-sm" style="width: 110px;" id="filterMonth" data-testid="filter-month">
              <option value="">Tất cả tháng</option>
              ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                <option value="${m}" ${currentMonth === String(m) ? 'selected' : ''}>Tháng ${m}</option>
              `).join('')}
            </select>
          </div>

          <!-- Lọc năm -->
          <div class="d-flex align-items-center gap-1">
            <label for="filterYear" class="small text-muted fw-bold mb-0">Năm:</label>
            <input type="number" class="form-control form-control-sm" style="width: 80px;" id="filterYear" data-testid="filter-year" placeholder="Năm" value="${currentYear}" />
          </div>

          <!-- Mức công nợ -->
          <div class="d-flex align-items-center gap-1">
            <label for="filterDebtLevel" class="small text-muted fw-bold mb-0">Mức nợ:</label>
            <select class="form-select form-select-sm" style="width: 150px;" id="filterDebtLevel">
              <option value="" ${currentDebtLevel === '' ? 'selected' : ''}>Tất cả mức nợ</option>
              <option value="1m" ${currentDebtLevel === '1m' ? 'selected' : ''}>&gt; 1.000.000 ₫</option>
              <option value="5m" ${currentDebtLevel === '5m' ? 'selected' : ''}>&gt; 5.000.000 ₫</option>
              <option value="10m" ${currentDebtLevel === '10m' ? 'selected' : ''}>&gt; 10.000.000 ₫</option>
            </select>
          </div>

          <!-- Sắp xếp -->
          <div class="d-flex align-items-center gap-1">
            <label for="filterSort" class="small text-muted fw-bold mb-0">Sắp xếp:</label>
            <select class="form-select form-select-sm" style="width: 140px;" id="filterSort">
              <option value="debt-desc" ${currentSort === 'debt-desc' ? 'selected' : ''}>Nợ giảm dần</option>
              <option value="debt-asc" ${currentSort === 'debt-asc' ? 'selected' : ''}>Nợ tăng dần</option>
              <option value="overdue-desc" ${currentSort === 'overdue-desc' ? 'selected' : ''}>Quá hạn lâu nhất</option>
            </select>
          </div>

          <!-- Switch quá hạn -->
          <div class="form-check form-switch mb-0 ms-2">
            <input class="form-check-input" type="checkbox" id="filterOverdue" data-testid="filter-overdue" ${showOnlyOverdue ? 'checked' : ''} />
            <label class="form-check-label small fw-bold text-muted" for="filterOverdue">Chỉ hiện quá hạn</label>
          </div>
        </div>
      </div>

      <!-- 3. Table -->
      <div class="card border-0 shadow-sm rounded overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 text-nowrap" data-testid="debts-table">
            <thead class="table-light border-bottom">
              <tr>
                <th>Phòng</th>
                <th>Người thuê</th>
                <th class="text-center">Số HĐ nợ</th>
                <th class="text-end">Tổng tiền</th>
                <th class="text-end">Đã thanh toán</th>
                <th class="text-end">Còn nợ</th>
                <th class="text-center">Hạn gần nhất</th>
                <th class="text-center">Quá hạn</th>
                <th class="text-center">Mức cảnh báo</th>
                <th class="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody id="debtsTableBody" data-testid="debts-table-body">
            </tbody>
          </table>
        </div>
        <div id="debtsPaginationContainer" class="p-3 bg-light border-top" data-testid="debts-pagination-container"></div>
      </div>

      <div id="debtsEmpty" class="text-muted text-center d-none p-5 bg-white border border-top-0 rounded-bottom shadow-sm" data-testid="debts-empty">
        <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
        Không tìm thấy công nợ nào phù hợp bộ lọc.
      </div>
    </div>
  `;

  populateRoomFilter();
  renderDebtsList();
  bindEvents();
}

// ─── POPULATE ROOM FILTER ──────────────────────────────────────

function populateRoomFilter() {
  const filterRoom = document.getElementById('filterRoom');
  if (!filterRoom) return;

  const rooms = getRooms();
  const options = rooms.map(r => {
    const nameText = r.name.startsWith('Phòng') ? r.name : 'Phòng ' + r.name;
    const statusText = ROOM_STATUS_LABELS[r.status] || r.status;
    return `<option value="${r.id}" ${currentRoomId === r.id ? 'selected' : ''}>${nameText} (${statusText})</option>`;
  }).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;

  initSearchableSelect(filterRoom);
}

// ─── FILTER & GROUP DEBTS ──────────────────────────────────────

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

  if (currentDebtLevel) {
    if (currentDebtLevel === '1m') {
      list = list.filter(inv => inv.remainingDebt > 1000000);
    } else if (currentDebtLevel === '5m') {
      list = list.filter(inv => inv.remainingDebt > 5000000);
    } else if (currentDebtLevel === '10m') {
      list = list.filter(inv => inv.remainingDebt > 10000000);
    }
  }

  return list;
}

function getGroupedDebts(filteredInvoices) {
  const roomsMap = {};
  const today = new Date();

  filteredInvoices.forEach(inv => {
    if (!roomsMap[inv.roomId]) {
      const room = getRoomById(inv.roomId);
      const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : inv.roomId;

      const contract = inv.contractId 
        ? getContractById(inv.contractId)
        : getActiveContractByRoom(inv.roomId);
      const tenant = contract ? getTenantById(contract.tenantId) : null;
      const tenantName = tenant ? tenant.fullName : 'N/A';

      roomsMap[inv.roomId] = {
        roomId: inv.roomId,
        roomName,
        tenantName,
        invoiceCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingDebt: 0,
        nearestDueDate: null,
        oldestInvoiceId: null
      };
    }

    const group = roomsMap[inv.roomId];
    group.invoiceCount++;
    group.totalAmount += inv.totalAmount;
    group.paidAmount += inv.paidAmount;
    group.remainingDebt += inv.remainingDebt;

    // Tìm hạn thanh toán gần nhất (nhỏ nhất)
    if (!group.nearestDueDate || new Date(inv.dueDate) < new Date(group.nearestDueDate)) {
      group.nearestDueDate = inv.dueDate;
      group.oldestInvoiceId = inv.id;
    }
  });

  const list = Object.values(roomsMap);

  // Sắp xếp
  if (currentSort === 'debt-desc') {
    list.sort((a, b) => b.remainingDebt - a.remainingDebt);
  } else if (currentSort === 'debt-asc') {
    list.sort((a, b) => a.remainingDebt - b.remainingDebt);
  } else if (currentSort === 'overdue-desc') {
    list.sort((a, b) => {
      const daysA = a.nearestDueDate ? calculateDaysOverdue(a.nearestDueDate, today) : 0;
      const daysB = b.nearestDueDate ? calculateDaysOverdue(b.nearestDueDate, today) : 0;
      return daysB - daysA;
    });
  }

  return list;
}

// ─── WARNING LEVEL BADGE ────────────────────────────────────────

function getWarningLevelBadge(nearestDueDate, today) {
  if (!nearestDueDate) return '<span class="badge bg-secondary">-</span>';

  const daysOverdue = calculateDaysOverdue(nearestDueDate, today);

  if (daysOverdue >= 7) {
    return `<span class="badge px-2 py-1 fw-semibold" style="background-color: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;">Đỏ (Quá hạn >=7 ngày)</span>`;
  } else if (daysOverdue > 0) {
    return `<span class="badge px-2 py-1 fw-semibold" style="background-color: #ffe8d6; color: #d9480f; border: 1px solid #ffd8a8;">Cam (Quá hạn <7 ngày)</span>`;
  } else {
    const diffTime = new Date(nearestDueDate) - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 3) {
      return `<span class="badge px-2 py-1 fw-semibold text-dark" style="background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba;">Vàng (Sắp đến hạn)</span>`;
    }
    return `<span class="badge px-2 py-1 bg-success-subtle text-success border border-success-subtle fw-semibold">An toàn</span>`;
  }
}

// ─── RENDER DEBTS LIST ─────────────────────────────────────────

function renderDebtsList() {
  const tbody = document.getElementById('debtsTableBody');
  const emptyEl = document.getElementById('debtsEmpty');
  const paginationContainer = document.getElementById('debtsPaginationContainer');

  if (!tbody) return;

  const today = new Date();

  // 1. Lọc và gộp nhóm theo phòng
  const filteredInvoices = getFilteredDebts();
  let groupedList = getGroupedDebts(filteredInvoices);

  // 2. Áp dụng lọc "Chỉ hiện quá hạn" trên danh sách phòng đã gộp nhóm
  if (showOnlyOverdue) {
    groupedList = groupedList.filter(group => {
      const daysOverdue = group.nearestDueDate ? calculateDaysOverdue(group.nearestDueDate, today) : 0;
      return daysOverdue > 0;
    });
  }

  // 3. Cập nhật 4 Card chỉ số Thống kê ở Header dựa trên danh sách phòng đã lọc
  const totalDebt = groupedList.reduce((sum, item) => sum + item.remainingDebt, 0);
  const overdueDebt = groupedList.reduce((sum, item) => {
    const daysOverdue = item.nearestDueDate ? calculateDaysOverdue(item.nearestDueDate, today) : 0;
    return daysOverdue > 0 ? sum + item.remainingDebt : sum;
  }, 0);
  const roomsCount = groupedList.length;
  const totalInvoices = groupedList.reduce((sum, item) => sum + item.invoiceCount, 0);

  const statTotalDebtEl = document.getElementById('statTotalDebt');
  const statOverdueDebtEl = document.getElementById('statOverdueDebt');
  const statRoomsCountEl = document.getElementById('statRoomsCount');
  const statOverdueInvoicesEl = document.getElementById('statOverdueInvoices');

  if (statTotalDebtEl) statTotalDebtEl.textContent = formatCurrency(totalDebt);
  if (statOverdueDebtEl) statOverdueDebtEl.textContent = formatCurrency(overdueDebt);
  if (statRoomsCountEl) statRoomsCountEl.textContent = `${roomsCount} phòng`;
  if (statOverdueInvoicesEl) statOverdueInvoicesEl.textContent = `${totalInvoices} HĐ`;

  const totalItems = groupedList.length;
  const itemsPerPage = 8;

  // 4. Phân trang
  const paginatedList = groupedList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (paginatedList.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = paginatedList.map(item => {
    const daysOverdue = item.nearestDueDate ? calculateDaysOverdue(item.nearestDueDate, today) : 0;
    const daysText = daysOverdue > 0 ? `${daysOverdue} ngày` : '—';

    return `
      <tr data-testid="debt-row-${item.roomId}">
        <td><strong>${item.roomName}</strong></td>
        <td>${item.tenantName}</td>
        <td class="text-center fw-semibold text-secondary">${item.invoiceCount}</td>
        <td class="text-end text-muted small">${formatCurrency(item.totalAmount)}</td>
        <td class="text-end text-muted small">${formatCurrency(item.paidAmount)}</td>
        <td class="text-end text-danger fw-bold" data-testid="remaining-debt-val">${formatCurrency(item.remainingDebt)}</td>
        <td class="text-center small">${formatDateToDisplay(item.nearestDueDate)}</td>
        <td class="text-center fw-semibold text-danger small">${daysText}</td>
        <td class="text-center">${getWarningLevelBadge(item.nearestDueDate, today)}</td>
        <td class="text-center">
          <button class="btn btn-outline-success btn-sm me-2 btn-pay-debt" data-invoice-id="${item.oldestInvoiceId}" title="Ghi nhận thanh toán hóa đơn cũ nhất của phòng">
            <i class="bi bi-credit-card me-1"></i>Đóng tiền
          </button>
          <a href="#" class="btn btn-outline-primary btn-sm btn-view-invoice" data-id="${item.oldestInvoiceId}" title="Xem hóa đơn gần nhất">
            Chi tiết HĐ
          </a>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationContainer) {
    paginationContainer.innerHTML = renderPagination(currentPage, totalItems, itemsPerPage);
  }
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Lọc phòng
  const filterRoom = document.getElementById('filterRoom');
  if (filterRoom) {
    filterRoom.addEventListener('change', () => {
      currentRoomId = filterRoom.value;
      currentPage = 1;
      renderDebtsList();
    });
  }

  // Lọc tháng
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    filterMonth.addEventListener('change', () => {
      currentMonth = filterMonth.value;
      currentPage = 1;
      renderDebtsList();
    });
  }

  // Lọc năm
  const filterYear = document.getElementById('filterYear');
  if (filterYear) {
    filterYear.addEventListener('input', () => {
      currentYear = filterYear.value;
      currentPage = 1;
      renderDebtsList();
    });
  }

  // Lọc mức công nợ
  const filterDebtLevel = document.getElementById('filterDebtLevel');
  if (filterDebtLevel) {
    filterDebtLevel.addEventListener('change', () => {
      currentDebtLevel = filterDebtLevel.value;
      currentPage = 1;
      renderDebtsList();
    });
  }

  // Lọc chỉ trễ hạn
  const filterOverdue = document.getElementById('filterOverdue');
  if (filterOverdue) {
    filterOverdue.addEventListener('change', () => {
      showOnlyOverdue = filterOverdue.checked;
      currentPage = 1;
      renderDebtsList();
    });
  }

  // Chọn sắp xếp
  const filterSort = document.getElementById('filterSort');
  if (filterSort) {
    filterSort.addEventListener('change', () => {
      currentSort = filterSort.value;
      currentPage = 1;
      renderDebtsList();
    });
  }

  // Phân trang click
  const paginationContainer = document.getElementById('debtsPaginationContainer');
  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-page');
      if (btn) {
        e.preventDefault();
        const page = Number(btn.dataset.page);
        if (!isNaN(page) && page > 0) {
          currentPage = page;
          renderDebtsList();
        }
      }
    });
  }

  // Click handler delegation cho table (Đóng tiền & Xem chi tiết)
  const tbody = document.getElementById('debtsTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      // 1. Xem chi tiết hóa đơn
      const btnView = e.target.closest('.btn-view-invoice');
      if (btnView) {
        e.preventDefault();
        const id = btnView.dataset.id;
        const invoice = getOutstandingInvoices().find(inv => inv.id === id);
        if (invoice) {
          openInvoiceDetail(invoice);
        }
        return;
      }

      // 2. Ghi nhận thanh toán (Mở form đóng tiền trực tiếp)
      const btnPay = e.target.closest('.btn-pay-debt');
      if (btnPay) {
        e.preventDefault();
        const invoiceId = btnPay.dataset.invoiceId;
        openPaymentForm({
          defaultInvoiceId: invoiceId,
          onSave: (paymentData) => {
            // Thực hiện ghi nhận đóng tiền qua api
            import('../services/payment-service.js').then(PaymentService => {
              try {
                PaymentService.createPayment(paymentData);
                showToast('Ghi nhận đóng tiền thành công!', 'success');
                renderDebtsList();
              } catch (err) {
                showToast(err.message, 'danger');
              }
            });
          }
        });
      }
    });
  }
}
