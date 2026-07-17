// src/pages/payments-page.js

/**
 * Trang quản lý giao dịch thanh toán.
 * Hiển thị danh sách các giao dịch, bộ lọc, thêm giao dịch thanh toán mới, xóa giao dịch nhập sai và tự cập nhật công nợ tức thì.
 */

import '../styles/payments.css';
import Chart from 'chart.js/auto';

import {
  getPayments,
  getPaymentById,
  createPayment,
  deletePayment
} from '../services/payment-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { getInvoiceById } from '../services/invoice-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getActiveContractByRoom, getContractById } from '../services/contract-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openPaymentForm } from '../components/payment-form.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';
import { initSearchableSelect } from '../components/searchable-select.js';
import { ROOM_STATUS_LABELS } from '../constants/statuses.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentMethod = '';
let currentRoomId = '';
let currentStartDate = '';
let currentEndDate = '';
let currentKeyword = '';
let paymentChartInstance = null;

export function renderPaymentsPage(container) {
  container.innerHTML = `
    <div data-testid="payments-page" class="pb-5">
      <!-- 1. Header & Stats Row -->
      <div class="row g-3 mb-4">
        <!-- 4 Stats Cards (col-lg-8) -->
        <div class="col-lg-8">
          <div class="row g-3 h-100">
            <!-- Tổng tiền đã thu -->
            <div class="col-md-6 col-sm-6">
              <div class="card border-0 shadow-sm p-3 h-100">
                <div class="d-flex align-items-center">
                  <div class="rounded-circle bg-primary-subtle p-3 me-3 text-primary d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bi bi-wallet2 fs-5"></i>
                  </div>
                  <div>
                    <span class="text-muted small d-block">Tổng thu tháng này</span>
                    <h5 class="mb-0 fw-bold text-dark" id="statTotalThisMonth">0 ₫</h5>
                  </div>
                </div>
              </div>
            </div>

            <!-- Chuyển khoản -->
            <div class="col-md-6 col-sm-6">
              <div class="card border-0 shadow-sm p-3 h-100">
                <div class="d-flex align-items-center">
                  <div class="rounded-circle bg-info-subtle p-3 me-3 text-info d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bi bi-bank fs-5"></i>
                  </div>
                  <div>
                    <span class="text-muted small d-block">Chuyển khoản tháng này</span>
                    <h5 class="mb-0 fw-bold text-info" id="statTransferThisMonth">0 ₫</h5>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tiền mặt -->
            <div class="col-md-6 col-sm-6">
              <div class="card border-0 shadow-sm p-3 h-100">
                <div class="d-flex align-items-center">
                  <div class="rounded-circle bg-warning-subtle p-3 me-3 text-warning d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bi bi-cash-stack fs-5"></i>
                  </div>
                  <div>
                    <span class="text-muted small d-block">Tiền mặt tháng này</span>
                    <h5 class="mb-0 fw-bold text-warning" id="statCashThisMonth">0 ₫</h5>
                  </div>
                </div>
              </div>
            </div>

            <!-- Giao dịch hôm nay -->
            <div class="col-md-6 col-sm-6">
              <div class="card border-0 shadow-sm p-3 h-100">
                <div class="d-flex align-items-center">
                  <div class="rounded-circle bg-success-subtle p-3 me-3 text-success d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                    <i class="bi bi-calendar-check fs-5"></i>
                  </div>
                  <div>
                    <span class="text-muted small d-block">Giao dịch hôm nay</span>
                    <h5 class="mb-0 fw-bold text-success" id="statTodayTrans">0 GD</h5>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Donut Chart Card (col-lg-4) -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm p-3 h-100">
            <h6 class="fw-bold mb-2 small text-muted text-uppercase">Cơ cấu phương thức đóng</h6>
            <div class="position-relative d-flex align-items-center justify-content-center" style="height: 120px;">
              <canvas id="paymentMethodChart"></canvas>
              <div id="chartPlaceholder" class="text-muted small fst-italic d-none text-center">Chưa có dữ liệu giao dịch</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Toolbar Filters (Card) -->
      <div class="card border-0 shadow-sm p-3 mb-4">
        <div class="row g-3">
          <!-- Tìm hóa đơn/mã/phòng/khách -->
          <div class="col-md-3 col-sm-6">
            <label for="searchKeyword" class="form-label small text-muted fw-bold">Tìm kiếm</label>
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
              <input type="text" class="form-control form-control-sm border-start-0" id="searchKeyword" placeholder="Mã GD, hóa đơn, phòng..." value="${currentKeyword}">
            </div>
          </div>

          <!-- Chọn phòng -->
          <div class="col-md-2 col-sm-6">
            <label for="filterRoom" class="form-label small text-muted fw-bold">Chọn phòng</label>
            <select class="form-select form-select-sm" id="filterRoom" data-testid="filter-room">
              <option value="">Tất cả phòng</option>
            </select>
          </div>

          <!-- Chọn phương thức -->
          <div class="col-md-2 col-sm-6">
            <label for="filterMethod" class="form-label small text-muted fw-bold">Phương thức</label>
            <select class="form-select form-select-sm" id="filterMethod" data-testid="filter-method">
              <option value="">Tất cả phương thức</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="cash">Tiền mặt</option>
            </select>
          </div>

          <!-- Chọn khoảng ngày -->
          <div class="col-md-3 col-sm-6">
            <label class="form-label small text-muted fw-bold">Khoảng ngày thanh toán</label>
            <div class="input-group input-group-sm">
              <input type="date" class="form-control form-control-sm" id="filterStartDate" value="${currentStartDate}">
              <span class="input-group-text bg-light text-muted">-</span>
              <input type="date" class="form-control form-control-sm" id="filterEndDate" value="${currentEndDate}">
            </div>
          </div>

          <!-- Nút Ghi nhận thanh toán -->
          <div class="col-md-2 col-sm-12 d-flex align-items-end justify-content-end">
            <button class="btn btn-primary btn-sm w-100 py-2 fw-semibold" id="btnAddPayment" data-testid="btn-add-payment">
              <i class="bi bi-plus-circle me-1"></i> Ghi nhận đóng tiền
            </button>
          </div>
        </div>
      </div>

      <!-- 3. Table -->
      <div class="card border-0 shadow-sm rounded overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 text-nowrap" data-testid="payments-table">
            <thead class="table-light border-bottom">
              <tr>
                <th>Mã giao dịch</th>
                <th>Ngày thanh toán</th>
                <th>Mã hóa đơn</th>
                <th>Phòng</th>
                <th>Người thuê</th>
                <th class="text-end">Số tiền</th>
                <th>Phương thức</th>
                <th>Nội dung</th>
                <th class="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody id="paymentsTableBody" data-testid="payments-table-body">
            </tbody>
          </table>
        </div>
      </div>

      <div id="paymentsEmpty" class="text-muted text-center d-none p-5 bg-white border border-top-0 rounded-bottom shadow-sm" data-testid="payments-empty">
        <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
        Không tìm thấy lịch sử giao dịch nào phù hợp.
      </div>
    </div>
  `;

  populateRoomFilter();
  renderPaymentsList();
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

// ─── RENDER LIST ───────────────────────────────────────────────

function getFilteredPayments() {
  let list = getPayments();

  if (currentMethod) {
    list = list.filter(p => p.method === currentMethod);
  }
  if (currentStartDate) {
    list = list.filter(p => p.date >= currentStartDate);
  }
  if (currentEndDate) {
    list = list.filter(p => p.date <= currentEndDate);
  }
  if (currentRoomId) {
    list = list.filter(p => {
      const invoice = getInvoiceById(p.invoiceId);
      return invoice && invoice.roomId === currentRoomId;
    });
  }
  if (currentKeyword) {
    const kw = currentKeyword.toLowerCase();
    list = list.filter(p => {
      const invoice = getInvoiceById(p.invoiceId);
      const room = invoice ? getRoomById(invoice.roomId) : null;
      const roomName = room ? room.name.toLowerCase() : '';
      
      const contract = invoice ? getActiveContractByRoom(invoice.roomId) : null;
      const tenant = contract ? getTenantById(contract.tenantId) : null;
      const tenantName = tenant ? tenant.fullName.toLowerCase() : '';
      
      return p.id.toLowerCase().includes(kw) || 
             p.invoiceId.toLowerCase().includes(kw) || 
             roomName.includes(kw) || 
             tenantName.includes(kw) || 
             (p.note || '').toLowerCase().includes(kw);
    });
  }

  // Sắp xếp theo ngày thanh toán giảm dần (mới nhất trước)
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderPaymentsList() {
  const tbody = document.getElementById('paymentsTableBody');
  const emptyEl = document.getElementById('paymentsEmpty');
  if (!tbody) return;

  const list = getFilteredPayments();

  // 1. Cập nhật số liệu thống kê & vẽ biểu đồ tròn
  renderStatsAndChart(list);

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    const invoice = getInvoiceById(item.invoiceId);
    let roomName = 'N/A';
    let invoiceInfo = 'N/A';
    let tenantName = 'N/A';

    if (invoice) {
      const room = getRoomById(invoice.roomId);
      roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : invoice.roomId;
      
      const contract = invoice.contractId 
        ? getContractById(invoice.contractId)
        : getActiveContractByRoom(invoice.roomId);
      const tenant = contract ? getTenantById(contract.tenantId) : null;
      tenantName = tenant ? tenant.fullName : 'N/A';

      invoiceInfo = `
        <a href="#" class="btn-view-invoice text-primary text-decoration-none fw-semibold" data-invoice-id="${invoice.id}" title="Xem hóa đơn">
          ${invoice.id.substring(0, 8).toUpperCase()}… (Tháng ${invoice.month}/${invoice.year})
        </a>
      `;
    }

    let methodBadge = '<span class="badge badge-method-other">Khác</span>';
    if (item.method === 'cash') {
      methodBadge = '<span class="badge badge-method-cash">Tiền mặt</span>';
    } else if (item.method === 'transfer') {
      methodBadge = '<span class="badge badge-method-transfer">Chuyển khoản</span>';
    }

    return `
      <tr data-testid="payment-row-${item.id}">
        <td><code class="text-dark fw-semibold" data-testid="payment-id-${item.id}">${item.id}</code></td>
        <td>${formatDateToDisplay(item.date)}</td>
        <td>${invoiceInfo}</td>
        <td><strong>${roomName}</strong></td>
        <td>${tenantName}</td>
        <td class="text-end fw-bold text-success">${formatCurrency(item.amount)}</td>
        <td>${methodBadge}</td>
        <td class="text-muted text-wrap" style="max-width: 250px;">${item.note || ''}</td>
        <td class="text-center">
          <button class="btn btn-outline-danger btn-sm border-0 btn-delete-payment" data-id="${item.id}" data-testid="btn-delete-payment-${item.id}" title="Xóa giao dịch nhập sai">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── STATS & CHART ──────────────────────────────────────────────

function renderStatsAndChart(filteredList) {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const allPayments = getPayments();
  const thisMonthPayments = allPayments.filter(p => p.date && p.date.startsWith(currentMonthStr));

  // Thống kê tháng này
  const totalCollected = thisMonthPayments.reduce((sum, p) => sum + p.amount, 0);
  const cashCollected = thisMonthPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const transferCollected = thisMonthPayments.filter(p => p.method === 'transfer').reduce((sum, p) => sum + p.amount, 0);

  // Thống kê hôm nay
  const todayPayments = allPayments.filter(p => p.date === todayStr);
  const todayCount = todayPayments.length;
  const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Gán DOM
  const totalEl = document.getElementById('statTotalThisMonth');
  const transferEl = document.getElementById('statTransferThisMonth');
  const cashEl = document.getElementById('statCashThisMonth');
  const todayEl = document.getElementById('statTodayTrans');

  if (totalEl) totalEl.textContent = formatCurrency(totalCollected);
  if (transferEl) transferEl.textContent = formatCurrency(transferCollected);
  if (cashEl) cashEl.textContent = formatCurrency(cashCollected);
  if (todayEl) {
    todayEl.innerHTML = `<strong>${todayCount}</strong> GD <span class="text-muted" style="font-size: 0.75rem;">(${formatCurrency(todayAmount)})</span>`;
  }

  // Vẽ biểu đồ dựa trên danh sách giao dịch hiện đang hiển thị
  const canvas = document.getElementById('paymentMethodChart');
  const chartPlaceholder = document.getElementById('chartPlaceholder');
  if (!canvas) return;

  const cashSum = filteredList.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const transferSum = filteredList.filter(p => p.method === 'transfer').reduce((sum, p) => sum + p.amount, 0);

  if (paymentChartInstance) {
    paymentChartInstance.destroy();
    paymentChartInstance = null;
  }

  if (cashSum === 0 && transferSum === 0) {
    canvas.style.display = 'none';
    if (chartPlaceholder) chartPlaceholder.classList.remove('d-none');
    return;
  }

  canvas.style.display = 'block';
  if (chartPlaceholder) chartPlaceholder.classList.add('d-none');

  paymentChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Tiền mặt', 'Chuyển khoản'],
      datasets: [{
        data: [cashSum, transferSum],
        backgroundColor: ['#ffc107', '#0d6efd'],
        borderWidth: 1,
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
            font: { size: 10 }
          }
        }
      }
    }
  });
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Ghi nhận đóng tiền
  const btnAdd = document.getElementById('btnAddPayment');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openPaymentForm({
        defaultInvoiceId: null,
        onSave: (data) => {
          createPayment(data);
          showToast('Ghi nhận giao dịch đóng tiền thành công!', 'success');
          renderPaymentsList();
        }
      });
    });
  }

  // Filter Keyword
  const searchKeyword = document.getElementById('searchKeyword');
  if (searchKeyword) {
    searchKeyword.addEventListener('input', () => {
      currentKeyword = searchKeyword.value;
      renderPaymentsList();
    });
  }

  // Filter Room
  const filterRoom = document.getElementById('filterRoom');
  if (filterRoom) {
    filterRoom.addEventListener('change', () => {
      currentRoomId = filterRoom.value;
      renderPaymentsList();
    });
  }

  // Filter Method
  const filterMethod = document.getElementById('filterMethod');
  if (filterMethod) {
    filterMethod.addEventListener('change', () => {
      currentMethod = filterMethod.value;
      renderPaymentsList();
    });
  }

  // Filter Start Date
  const filterStartDate = document.getElementById('filterStartDate');
  if (filterStartDate) {
    filterStartDate.addEventListener('input', () => {
      currentStartDate = filterStartDate.value;
      renderPaymentsList();
    });
  }

  // Filter End Date
  const filterEndDate = document.getElementById('filterEndDate');
  if (filterEndDate) {
    filterEndDate.addEventListener('input', () => {
      currentEndDate = filterEndDate.value;
      renderPaymentsList();
    });
  }

  // Table actions delegation (Delete payment & View invoice detail)
  const tbody = document.getElementById('paymentsTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      // 1. Xem chi tiết hóa đơn khi bấm link mã hóa đơn
      const linkView = e.target.closest('.btn-view-invoice');
      if (linkView) {
        e.preventDefault();
        const invoiceId = linkView.dataset.invoiceId;
        const invoice = getInvoiceById(invoiceId);
        if (invoice) {
          openInvoiceDetail(invoice);
        }
        return;
      }

      // 2. Xóa giao dịch thanh toán
      const btnDelete = e.target.closest('.btn-delete-payment');
      if (btnDelete) {
        e.preventDefault();
        const id = btnDelete.dataset.id;
        if (id) {
          handleDelete(id);
        }
      }
    });
  }
}

function handleDelete(id) {
  const payment = getPaymentById(id);
  if (!payment) return;

  const invoice = getInvoiceById(payment.invoiceId);
  const room = invoice ? getRoomById(invoice.roomId) : null;
  const roomName = room ? room.name : 'N/A';

  showConfirmDialog(
    'Xóa giao dịch đóng tiền',
    `Bạn có chắc chắn muốn xóa giao dịch đóng tiền trị giá <strong>${formatCurrency(payment.amount)}</strong> của phòng <strong>${roomName}</strong> không?<br>Sau khi xóa, công nợ hóa đơn sẽ tự động tăng lại tương ứng.`,
    () => {
      try {
        deletePayment(id);
        showToast('Xóa giao dịch thanh toán thành công. Công nợ đã được tính lại.', 'success');
        renderPaymentsList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}
