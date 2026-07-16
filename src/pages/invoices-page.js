// src/pages/invoices-page.js

/**
 * Trang quản lý hóa đơn.
 * Hỗ trợ danh sách hóa đơn, các bộ lọc, tìm kiếm, lập hóa đơn đơn lẻ/hàng loạt, chốt, hủy, xóa bản nháp, in hóa đơn, hiển thị tổng thu/nợ.
 */

import '../styles/invoices.css';

import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  generateInvoiceForRoom,
  generateInvoicesForMonth,
  updateDraftInvoice,
  finalizeInvoice,
  cancelInvoice,
  deleteDraftInvoice,
  filterInvoices,
  getInvoiceByRoomAndMonth
} from '../services/invoice-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openInvoiceForm } from '../components/invoice-form.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';
import { initSearchableSelect } from '../components/searchable-select.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentMonth = new Date().getMonth() + 1; // 1-12
let currentYear = new Date().getFullYear();
let currentRoomId = '';
let currentStatus = '';
let currentKeyword = '';

export function renderInvoicesPage(container) {
  container.innerHTML = `
    <div data-testid="invoices-page">
      <!-- Summary Cards (Tổng tiền, Đã thu, Còn nợ) -->
      <div class="row g-3 mb-4" id="invoicesSummaryCards">
        <!-- Tổng tiền -->
        <div class="col-md-4">
          <div class="card invoice-summary-card bg-primary text-white">
            <div class="card-body p-3">
              <span class="small text-white-50">Tổng tiền phải thu</span>
              <h4 class="mt-1 mb-0" id="totalAmountText" data-testid="sum-total-amount">0 ₫</h4>
            </div>
          </div>
        </div>
        <!-- Đã thu -->
        <div class="col-md-4">
          <div class="card invoice-summary-card bg-success text-white">
            <div class="card-body p-3">
              <span class="small text-white-50">Đã thu</span>
              <h4 class="mt-1 mb-0" id="totalPaidText" data-testid="sum-paid-amount">0 ₫</h4>
            </div>
          </div>
        </div>
        <!-- Còn nợ -->
        <div class="col-md-4">
          <div class="card invoice-summary-card bg-danger text-white">
            <div class="card-body p-3">
              <span class="small text-white-50">Còn nợ (Công nợ)</span>
              <h4 class="mt-1 mb-0" id="totalDebtText" data-testid="sum-remaining-debt">0 ₫</h4>
            </div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Hóa đơn điện nước</h4>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm" id="btnBatchInvoice" data-testid="btn-batch-invoice">
            ⚡ Lập hóa đơn hàng loạt
          </button>
          <button class="btn btn-primary btn-sm" id="btnAddInvoice" data-testid="btn-add-invoice">
            + Lập hóa đơn phòng
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <!-- Tìm theo mã -->
        <input type="text" class="form-control form-control-sm" style="max-width: 200px;" id="invoiceSearch" data-testid="input-search-invoice"
          placeholder="Tìm theo mã hóa đơn..." />

        <!-- Lọc tháng -->
        <select class="form-select form-select-sm" style="max-width: 110px;" id="filterMonth" data-testid="filter-month">
          <option value="">Tất cả tháng</option>
          ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
            <option value="${m}" ${currentMonth === m ? 'selected' : ''}>Tháng ${m}</option>
          `).join('')}
        </select>

        <!-- Lọc năm -->
        <input type="number" class="form-control form-control-sm" style="max-width: 80px;" id="filterYear" data-testid="filter-year"
          value="${currentYear}" />

        <!-- Lọc phòng -->
        <select class="form-select form-select-sm" style="max-width: 140px;" id="filterRoom" data-testid="filter-room">
          <option value="">Tất cả phòng</option>
        </select>

        <!-- Lọc trạng thái -->
        <select class="form-select form-select-sm" style="max-width: 160px;" id="filterStatus" data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="unpaid">Chưa thanh toán</option>
          <option value="partial">Thanh toán một phần</option>
          <option value="paid">Đã thanh toán</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-hover align-middle" data-testid="invoices-table">
          <thead class="table-light">
            <tr>
              <th>Mã hóa đơn</th>
              <th>Phòng</th>
              <th>Thời gian</th>
              <th>Hạn đóng</th>
              <th class="text-end">Phải thanh toán</th>
              <th class="text-end">Đã trả</th>
              <th class="text-end">Còn nợ</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="invoicesTableBody" data-testid="invoices-table-body">
          </tbody>
        </table>
      </div>

      <div id="invoicesEmpty" class="text-muted text-center d-none p-4" data-testid="invoices-empty">
        Không tìm thấy hóa đơn nào phù hợp.
      </div>
    </div>
  `;

  populateRoomFilter();
  renderFinancialSummary();
  renderInvoicesList();
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

// ─── FINANCIAL SUMMARY ─────────────────────────────────────────

function renderFinancialSummary() {
  const totText = document.getElementById('totalAmountText');
  const paidText = document.getElementById('totalPaidText');
  const debtText = document.getElementById('totalDebtText');
  if (!totText || !paidText || !debtText) return;

  const filters = {
    month: currentMonth || undefined,
    year: currentYear || undefined,
    roomId: currentRoomId || undefined,
    status: currentStatus || undefined
  };

  let list = filterInvoices(filters);

  // Tìm theo mã nếu có
  if (currentKeyword) {
    list = list.filter(inv => inv.id.toLowerCase().includes(currentKeyword.toLowerCase()));
  }

  // Loại bỏ các hóa đơn đã hủy khỏi tổng kết tài chính
  const activeInvoices = list.filter(inv => inv.status !== 'cancelled');

  const total = activeInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const paid = activeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const debt = activeInvoices.reduce((sum, inv) => sum + inv.remainingDebt, 0);

  totText.textContent = formatCurrency(total);
  paidText.textContent = formatCurrency(paid);
  debtText.textContent = formatCurrency(debt);
}

// ─── RENDER LIST ───────────────────────────────────────────────

function renderInvoicesList() {
  const tbody = document.getElementById('invoicesTableBody');
  const emptyEl = document.getElementById('invoicesEmpty');
  if (!tbody) return;

  const filters = {
    month: currentMonth || undefined,
    year: currentYear || undefined,
    roomId: currentRoomId || undefined,
    status: currentStatus || undefined
  };

  let list = filterInvoices(filters);

  if (currentKeyword) {
    list = list.filter(inv => inv.id.toLowerCase().includes(currentKeyword.toLowerCase()));
  }

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    const room = getRoomById(item.roomId);
    const roomName = room ? room.name : item.roomId;

    let statusClass = 'badge-invoice-draft';
    let statusLabel = 'Bản nháp';

    if (item.status === 'unpaid') {
      statusClass = 'badge-invoice-unpaid';
      statusLabel = 'Chưa thanh toán';
    } else if (item.status === 'partial') {
      statusClass = 'badge-invoice-partial';
      statusLabel = 'Thanh toán một phần';
    } else if (item.status === 'paid') {
      statusClass = 'badge-invoice-paid';
      statusLabel = 'Đã thanh toán';
    } else if (item.status === 'cancelled') {
      statusClass = 'badge-invoice-cancelled';
      statusLabel = 'Đã hủy';
    }

    // Các nút thao tác
    const actionButtons = buildActionButtons(item);

    return `
      <tr data-testid="invoice-row-${item.id}">
        <td>
          <a href="#" class="btn-view-invoice text-primary text-decoration-none" data-id="${item.id}" data-testid="btn-view-invoice-${item.id}">
            ${item.id.substring(0, 10)}…
          </a>
        </td>
        <td><strong>${roomName}</strong></td>
        <td>Tháng ${item.month}/${item.year}</td>
        <td>${formatDateToDisplay(item.dueDate)}</td>
        <td class="text-end fw-semibold text-primary">${formatCurrency(item.totalAmount)}</td>
        <td class="text-end text-success">${formatCurrency(item.paidAmount)}</td>
        <td class="text-end text-danger">${formatCurrency(item.remainingDebt)}</td>
        <td><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td>
          <div class="btn-group gap-1">
            ${actionButtons}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function buildActionButtons(invoice) {
  const btns = [];

  // Xem chi tiết (luôn có)
  btns.push(`<button class="btn btn-outline-info btn-sm btn-detail-invoice" data-id="${invoice.id}" data-testid="btn-detail-invoice-${invoice.id}" title="Xem chi tiết">👁</button>`);

  if (invoice.status === 'draft') {
    // Sửa nháp
    btns.push(`<button class="btn btn-outline-primary btn-sm btn-edit-invoice" data-id="${invoice.id}" data-testid="btn-edit-invoice-${invoice.id}" title="Sửa nháp">✏️</button>`);
    // Chốt hóa đơn
    btns.push(`<button class="btn btn-outline-success btn-sm btn-finalize-invoice" data-id="${invoice.id}" data-testid="btn-finalize-invoice-${invoice.id}" title="Chốt hóa đơn">✓</button>`);
    // Xóa nháp
    btns.push(`<button class="btn btn-outline-danger btn-sm btn-delete-invoice" data-id="${invoice.id}" data-testid="btn-delete-invoice-${invoice.id}" title="Xóa nháp">✕</button>`);
  }

  if (invoice.status === 'unpaid') {
    // Hủy hóa đơn (chỉ khi chưa trả)
    btns.push(`<button class="btn btn-outline-warning btn-sm btn-cancel-invoice" data-id="${invoice.id}" data-testid="btn-cancel-invoice-${invoice.id}" title="Hủy hóa đơn">⏸</button>`);
  }

  return btns.join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Lập hóa đơn phòng đơn lẻ
  const btnAdd = document.getElementById('btnAddInvoice');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      // Mở confirm dialog hoặc prompt đơn giản để chọn phòng
      const rooms = getRooms();
      const options = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

      const dialogContainer = document.getElementById('confirm-dialog-container');
      if (!dialogContainer) return;

      dialogContainer.innerHTML = `
        <div class="modal fade" id="selectRoomForInvoiceModal" tabindex="-1" aria-hidden="true" data-testid="select-room-invoice-modal">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Chọn phòng lập hóa đơn</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <div id="selectRoomInvoiceError" class="alert alert-danger d-none" data-testid="select-room-invoice-error"></div>
                <div class="mb-3">
                  <label for="selectRoomId" class="form-label">Chọn phòng</label>
                  <select class="form-select" id="selectRoomId" data-testid="select-room-id">
                    ${options}
                  </select>
                </div>
                <div class="row g-2">
                  <div class="col-6">
                    <label for="selectMonthVal" class="form-label">Tháng</label>
                    <select class="form-select" id="selectMonthVal" data-testid="select-month-val">
                      ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                        <option value="${m}" ${currentMonth === m ? 'selected' : ''}>Tháng ${m}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="col-6">
                    <label for="selectYearVal" class="form-label">Năm</label>
                    <input type="number" class="form-control" id="selectYearVal" data-testid="select-year-val" value="${currentYear}" />
                  </div>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                <button type="button" class="btn btn-primary" id="btnConfirmGenerateInvoice" data-testid="btn-confirm-generate-invoice">Tạo hóa đơn</button>
              </div>
            </div>
          </div>
        </div>
      `;

      const modalEl = document.getElementById('selectRoomForInvoiceModal');
      const bsModal = new window.bootstrap.Modal(modalEl);

      document.getElementById('btnConfirmGenerateInvoice').addEventListener('click', () => {
        const roomId = document.getElementById('selectRoomId').value;
        const month = Number(document.getElementById('selectMonthVal').value);
        const year = Number(document.getElementById('selectYearVal').value);
        const errorEl = document.getElementById('selectRoomInvoiceError');

        try {
          generateInvoiceForRoom(roomId, month, year);
          bsModal.hide();
          showToast('Lập hóa đơn nháp thành công!', 'success');
          renderFinancialSummary();
          renderInvoicesList();
        } catch (err) {
          errorEl.textContent = err.message;
          errorEl.classList.remove('d-none');
        }
      });

      modalEl.addEventListener('hidden.bs.modal', () => {
        dialogContainer.innerHTML = '';
      });

      bsModal.show();
    });
  }

  // Lập hóa đơn hàng loạt
  const btnBatch = document.getElementById('btnBatchInvoice');
  if (btnBatch) {
    btnBatch.addEventListener('click', () => {
      showConfirmDialog(
        'Lập hóa đơn hàng loạt',
        `Hệ thống sẽ quét tất cả các phòng đang thuê chưa có hóa đơn trong tháng ${currentMonth}/${currentYear} và tự động tạo hóa đơn nháp (yêu cầu có chỉ số điện nước trước). Bạn có chắc chắn muốn tiến hành?`,
        () => {
          const res = generateInvoicesForMonth(currentMonth, currentYear);
          const successCount = res.created.length;
          const failCount = res.failed.length;

          if (successCount > 0) {
            showToast(`Lập thành công ${successCount} hóa đơn nháp!`, 'success');
          }
          if (failCount > 0) {
            showToast(`Có ${failCount} phòng lỗi lập hóa đơn (Thiếu chỉ số điện nước hoặc đã lập).`, 'warning');
          }
          if (successCount === 0 && failCount === 0) {
            showToast('Không có phòng nào cần lập hóa đơn mới trong tháng này.', 'info');
          }

          renderFinancialSummary();
          renderInvoicesList();
        }
      );
    });
  }

  // Search input
  const searchInput = document.getElementById('invoiceSearch');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentKeyword = searchInput.value.trim();
        renderFinancialSummary();
        renderInvoicesList();
      }, 300);
    });
  }

  // Filter Month
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    filterMonth.addEventListener('change', () => {
      currentMonth = filterMonth.value ? Number(filterMonth.value) : '';
      renderFinancialSummary();
      renderInvoicesList();
    });
  }

  // Filter Year
  const filterYear = document.getElementById('filterYear');
  if (filterYear) {
    filterYear.addEventListener('input', () => {
      const year = Number(filterYear.value);
      if (!isNaN(year) && year >= 2000) {
        currentYear = year;
        renderFinancialSummary();
        renderInvoicesList();
      }
    });
  }

  // Filter Room
  const filterRoom = document.getElementById('filterRoom');
  if (filterRoom) {
    filterRoom.addEventListener('change', () => {
      currentRoomId = filterRoom.value;
      renderFinancialSummary();
      renderInvoicesList();
    });
  }

  // Filter Status
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentStatus = filterStatus.value;
      renderFinancialSummary();
      renderInvoicesList();
    });
  }

  // Table actions delegation
  const tbody = document.getElementById('invoicesTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const target = e.target.closest('button, a');
      if (!target) return;

      const id = target.dataset.id;
      if (!id) return;

      e.preventDefault();

      if (target.classList.contains('btn-view-invoice') || target.classList.contains('btn-detail-invoice')) {
        handleView(id);
      } else if (target.classList.contains('btn-edit-invoice')) {
        handleEdit(id);
      } else if (target.classList.contains('btn-finalize-invoice')) {
        handleFinalize(id);
      } else if (target.classList.contains('btn-delete-invoice')) {
        handleDelete(id);
      } else if (target.classList.contains('btn-cancel-invoice')) {
        handleCancel(id);
      }
    });
  }
}

function handleView(id) {
  const invoice = getInvoiceById(id);
  if (invoice) {
    openInvoiceDetail(invoice);
  }
}

function handleEdit(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) return;

  openInvoiceForm({
    invoice,
    onSave: (data) => {
      updateDraftInvoice(id, data);
      showToast('Cập nhật hóa đơn nháp thành công!', 'success');
      renderFinancialSummary();
      renderInvoicesList();
    }
  });
}

function handleFinalize(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) return;

  showConfirmDialog(
    'Chốt hóa đơn',
    'Bạn có chắc chắn muốn chốt hóa đơn này không? Sau khi chốt, bạn sẽ không thể chỉnh sửa bản nháp được nữa và hóa đơn sẽ sẵn sàng để thanh toán.',
    () => {
      try {
        finalizeInvoice(id);
        showToast('Chốt hóa đơn thành công!', 'success');
        renderFinancialSummary();
        renderInvoicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleDelete(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) return;

  showConfirmDialog(
    'Xóa hóa đơn nháp',
    'Bạn có chắc chắn muốn xóa vĩnh viễn hóa đơn bản nháp này?',
    () => {
      try {
        deleteDraftInvoice(id);
        showToast('Xóa hóa đơn nháp thành công.', 'success');
        renderFinancialSummary();
        renderInvoicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleCancel(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) return;

  showConfirmDialog(
    'Hủy hóa đơn',
    'Bạn có chắc chắn muốn hủy hóa đơn này không? Thao tác này không thể hoàn tác.',
    () => {
      try {
        cancelInvoice(id);
        showToast('Đã hủy hóa đơn thành công.', 'success');
        renderFinancialSummary();
        renderInvoicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}
