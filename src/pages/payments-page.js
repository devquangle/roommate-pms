// src/pages/payments-page.js

/**
 * Trang quản lý giao dịch thanh toán.
 * Hiển thị danh sách các giao dịch, bộ lọc, thêm giao dịch thanh toán mới, xóa giao dịch nhập sai và tự cập nhật công nợ tức thì.
 */

import '../styles/payments.css';

import {
  getPayments,
  getPaymentById,
  createPayment,
  deletePayment,
  filterPayments
} from '../services/payment-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { getInvoiceById } from '../services/invoice-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openPaymentForm } from '../components/payment-form.js';
import { initSearchableSelect } from '../components/searchable-select.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentMethod = '';
let currentRoomId = '';
let currentDateFilter = '';

export function renderPaymentsPage(container) {
  container.innerHTML = `
    <div data-testid="payments-page">
      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Lịch sử giao dịch thanh toán</h4>
        <button class="btn btn-primary btn-sm" id="btnAddPayment" data-testid="btn-add-payment">
          + Ghi nhận đóng tiền
        </button>
      </div>

      <!-- Filters -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <!-- Lọc phòng -->
        <div class="d-flex align-items-center gap-1">
          <label for="filterRoom" class="small text-muted mb-0">Phòng:</label>
          <select class="form-select form-select-sm" style="max-width: 140px;" id="filterRoom" data-testid="filter-room">
            <option value="">Tất cả phòng</option>
          </select>
        </div>

        <!-- Lọc phương thức -->
        <div class="d-flex align-items-center gap-1">
          <label for="filterMethod" class="small text-muted mb-0">Phương thức:</label>
          <select class="form-select form-select-sm" style="max-width: 160px;" id="filterMethod" data-testid="filter-method">
            <option value="">Tất cả phương thức</option>
            <option value="transfer">Chuyển khoản</option>
            <option value="cash">Tiền mặt</option>
          </select>
        </div>

        <!-- Lọc ngày -->
        <div class="d-flex align-items-center gap-1">
          <label for="filterDate" class="small text-muted mb-0">Ngày đóng:</label>
          <input type="date" class="form-control form-control-sm" style="max-width: 140px;" id="filterDate" data-testid="filter-date"
            value="${currentDateFilter}" />
        </div>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-hover align-middle" data-testid="payments-table">
          <thead class="table-light">
            <tr>
              <th>Mã giao dịch</th>
              <th>Phòng</th>
              <th>Hóa đơn</th>
              <th>Ngày đóng</th>
              <th class="text-end">Số tiền đóng</th>
              <th>Phương thức</th>
              <th>Ghi chú</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="paymentsTableBody" data-testid="payments-table-body">
          </tbody>
        </table>
      </div>

      <div id="paymentsEmpty" class="text-muted text-center d-none p-4" data-testid="payments-empty">
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
  const options = rooms.map(r => `<option value="${r.id}" ${currentRoomId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;

  initSearchableSelect(filterRoom);
}

// ─── RENDER LIST ───────────────────────────────────────────────

function getFilteredPayments() {
  let list = getPayments();

  if (currentMethod) {
    list = list.filter(p => p.method === currentMethod);
  }
  if (currentDateFilter) {
    list = list.filter(p => p.date === currentDateFilter);
  }
  if (currentRoomId) {
    list = list.filter(p => {
      const invoice = getInvoiceById(p.invoiceId);
      return invoice && invoice.roomId === currentRoomId;
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

    if (invoice) {
      const room = getRoomById(invoice.roomId);
      roomName = room ? room.name : invoice.roomId;
      invoiceInfo = `Tháng ${invoice.month}/${invoice.year}`;
    }

    let methodBadge = '<span class="badge badge-method-other">Khác</span>';
    if (item.method === 'cash') {
      methodBadge = '<span class="badge badge-method-cash">Tiền mặt</span>';
    } else if (item.method === 'transfer') {
      methodBadge = '<span class="badge badge-method-transfer">Chuyển khoản</span>';
    }

    return `
      <tr data-testid="payment-row-${item.id}">
        <td><code data-testid="payment-id-${item.id}">${item.id}</code></td>
        <td><strong>${roomName}</strong></td>
        <td>${invoiceInfo}</td>
        <td>${formatDateToDisplay(item.date)}</td>
        <td class="text-end fw-semibold text-success">${formatCurrency(item.amount)}</td>
        <td>${methodBadge}</td>
        <td class="text-muted small">${item.note || ''}</td>
        <td>
          <button class="btn btn-outline-danger btn-sm btn-delete-payment" data-id="${item.id}" data-testid="btn-delete-payment-${item.id}" title="Xóa giao dịch nhập sai">
            ✕
          </button>
        </td>
      </tr>
    `;
  }).join('');
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

  // Filter Date
  const filterDate = document.getElementById('filterDate');
  if (filterDate) {
    filterDate.addEventListener('input', () => {
      currentDateFilter = filterDate.value;
      renderPaymentsList();
    });
  }

  // Table actions delegation
  const tbody = document.getElementById('paymentsTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-delete-payment')) {
        handleDelete(id);
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
