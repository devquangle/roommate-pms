// src/pages/invoices-page.js

/**
 * Trang quản lý hóa đơn.
 * Hỗ trợ danh sách hóa đơn, các bộ lọc, tìm kiếm, lập hóa đơn đơn lẻ/hàng loạt, chốt, hủy, xóa bản nháp, in hóa đơn, hiển thị 5 card thống kê.
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
  filterInvoices
} from '../services/invoice-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { getActiveContractByRoom } from '../services/contract-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { calculateDaysOverdue } from '../services/debt-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openInvoiceForm } from '../components/invoice-form.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';
import { initSearchableSelect } from '../components/searchable-select.js';
import { renderPagination } from '../components/pagination.js';
import { ROOM_STATUS_LABELS } from '../constants/statuses.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentMonth = new Date().getMonth() + 1; // 1-12
let currentYear = new Date().getFullYear();
let currentRoomId = '';
let currentStatus = '';
let currentKeyword = '';
let currentPage = 1;
const itemsPerPage = 10;

export function renderInvoicesPage(container) {
  const rooms = getRooms();

  container.innerHTML = `
    <div data-testid="invoices-page">
      <!-- 5 Card Thống kê Tài chính -->
      <div class="row g-3 mb-4 row-cols-1 row-cols-sm-2 row-cols-md-5" id="invoicesSummaryCards">
        <!-- Tổng hóa đơn tháng -->
        <div class="col">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1" style="font-size: 11px;">Tổng hóa đơn tháng</div>
            <div class="fs-4 fw-bold text-dark" id="statTotalCount">0</div>
            <div class="small text-muted mt-1" id="statTotalAmount">0 ₫</div>
          </div>
        </div>
        <!-- Đã thanh toán -->
        <div class="col">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1" style="font-size: 11px;">Đã thanh toán</div>
            <div class="fs-4 fw-bold text-success" id="statPaidCount">0</div>
            <div class="small text-muted mt-1" id="statPaidAmount">0 ₫</div>
          </div>
        </div>
        <!-- Chưa thanh toán -->
        <div class="col">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1" style="font-size: 11px;">Chưa thanh toán</div>
            <div class="fs-4 fw-bold text-warning" id="statUnpaidCount">0</div>
            <div class="small text-muted mt-1" id="statUnpaidAmount">0 ₫</div>
          </div>
        </div>
        <!-- Thanh toán một phần -->
        <div class="col">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1" style="font-size: 11px;">Thanh toán một phần</div>
            <div class="fs-4 fw-bold text-info" id="statPartialCount">0</div>
            <div class="small text-muted mt-1" id="statPartialAmount">0 ₫</div>
          </div>
        </div>
        <!-- Quá hạn -->
        <div class="col">
          <div class="card border-0 shadow-sm rounded p-3 bg-danger bg-opacity-10 border border-danger-subtle h-100">
            <div class="small text-danger fw-bold text-uppercase mb-1" style="font-size: 11px;">Quá hạn</div>
            <div class="fs-4 fw-bold text-danger" id="statOverdueCount">0</div>
            <div class="small text-danger mt-1" id="statOverdueAmount">0 ₫</div>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0 fw-bold text-dark">Hóa đơn điện nước</h4>
        <div class="d-flex gap-2">
          <button class="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" id="btnBatchInvoice" data-testid="btn-batch-invoice">
            <i class="bi bi-lightning-charge-fill"></i> Tạo hóa đơn hàng loạt
          </button>
          <button class="btn btn-primary btn-sm d-flex align-items-center gap-1" id="btnAddInvoice" data-testid="btn-add-invoice">
            <i class="bi bi-plus-circle"></i> Tạo hóa đơn
          </button>
        </div>
      </div>

      <!-- Bộ lọc và Tìm kiếm -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3 bg-white p-3 border rounded shadow-sm">
        <!-- Tìm theo mã hoặc phòng -->
        <div style="flex: 1; min-width: 200px;">
          <input type="text" class="form-control form-control-sm" id="invoiceSearch" data-testid="input-search-invoice"
            placeholder="Tìm theo mã hoặc phòng..." />
        </div>

        <!-- Lọc tháng -->
        <div style="width: 120px;">
          <select class="form-select form-select-sm" id="filterMonth" data-testid="filter-month">
            <option value="">Tất cả tháng</option>
            ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
              <option value="${m}" ${currentMonth === m ? 'selected' : ''}>Tháng ${String(m).padStart(2, '0')}</option>
            `).join('')}
          </select>
        </div>

        <!-- Lọc năm -->
        <div style="width: 90px;">
          <input type="number" class="form-control form-control-sm" id="filterYear" data-testid="filter-year"
            value="${currentYear}" placeholder="Năm" />
        </div>

        <!-- Lọc phòng -->
        <div style="width: 180px;">
          <select class="form-select form-select-sm" id="filterRoom" data-testid="filter-room">
            <option value="">Tất cả phòng</option>
          </select>
        </div>

        <!-- Lọc trạng thái -->
        <div style="width: 180px;">
          <select class="form-select form-select-sm" id="filterStatus" data-testid="filter-status">
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="unpaid">Chưa thanh toán</option>
            <option value="partial">Thanh toán một phần</option>
            <option value="paid">Đã thanh toán</option>
            <option value="overdue">Quá hạn</option>
            <option value="cancelled">Đã hủy</option>
          </select>
        </div>
      </div>

      <!-- Bảng danh sách hóa đơn -->
      <div class="card border-0 shadow-sm rounded">
        <div class="table-responsive" >
          <table class="table table-hover align-middle mb-0" data-testid="invoices-table">
            <thead class="table-light border-bottom">
              <tr>
                <th>Mã hóa đơn</th>
                <th>Phòng</th>
                <th>Người thuê</th>
                <th class="text-center">Tháng</th>
                <th class="text-end">Tiền phòng</th>
                <th class="text-end">Điện nước</th>
                <th class="text-end">Dịch vụ</th>
                <th class="text-end">Tổng tiền</th>
                <th class="text-end">Đã trả</th>
                <th class="text-end">Còn nợ</th>
                <th class="text-center" style="min-width: 100px;">Hạn thanh toán</th>
                <th class="text-center">Trạng thái</th>
                <th class="text-end" style="min-width: 140px;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="invoicesTableBody" data-testid="invoices-table-body">
            </tbody>
          </table>
        </div>
      </div>

      <!-- Phân trang -->
      <div id="invoicesPaginationContainer" class="mt-3"></div>

      <div id="invoicesEmpty" class="text-muted text-center d-none p-5 bg-white border rounded shadow-sm mt-3" data-testid="invoices-empty">
        <i class="bi bi-clipboard-x fs-1 text-muted mb-2"></i>
        <p class="mb-0">Không tìm thấy hóa đơn nào phù hợp.</p>
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
  const options = rooms.map(r => {
    const nameText = r.name.startsWith('Phòng') ? r.name : 'Phòng ' + r.name;
    const statusText = ROOM_STATUS_LABELS[r.status] || r.status;
    return `<option value="${r.id}" ${currentRoomId === r.id ? 'selected' : ''}>${nameText} (${statusText})</option>`;
  }).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;

  initSearchableSelect(filterRoom);
}

// ─── FINANCIAL SUMMARY ───
// Tính toán 5 card thống kê dựa trên tháng/năm/phòng đang chọn

function renderFinancialSummary() {
  const statTotalCount = document.getElementById('statTotalCount');
  const statTotalAmount = document.getElementById('statTotalAmount');
  const statPaidCount = document.getElementById('statPaidCount');
  const statPaidAmount = document.getElementById('statPaidAmount');
  const statUnpaidCount = document.getElementById('statUnpaidCount');
  const statUnpaidAmount = document.getElementById('statUnpaidAmount');
  const statPartialCount = document.getElementById('statPartialCount');
  const statPartialAmount = document.getElementById('statPartialAmount');
  const statOverdueCount = document.getElementById('statOverdueCount');
  const statOverdueAmount = document.getElementById('statOverdueAmount');

  if (!statTotalCount) return;

  const filters = {
    month: currentMonth || undefined,
    year: currentYear || undefined,
    roomId: currentRoomId || undefined
  };

  let list = filterInvoices(filters);

  // Áp dụng tìm kiếm theo keyword (nếu có) vào thống kê để khớp dữ liệu
  if (currentKeyword) {
    const kw = currentKeyword.toLowerCase();
    list = list.filter(inv => {
      const room = getRoomById(inv.roomId);
      const roomName = room ? room.name.toLowerCase() : '';
      return inv.id.toLowerCase().includes(kw) || roomName.includes(kw) || inv.roomId.toLowerCase().includes(kw);
    });
  }

  // Loại bỏ các hóa đơn đã hủy khỏi tổng kết tài chính
  const activeInvoices = list.filter(inv => inv.status !== 'cancelled');

  let totalCount = 0, totalSum = 0;
  let paidCount = 0, paidSum = 0;
  let unpaidCount = 0, unpaidSum = 0;
  let partialCount = 0, partialSum = 0;
  let overdueCount = 0, overdueSum = 0;

  activeInvoices.forEach(inv => {
    const isOverdue = (inv.status === 'unpaid' || inv.status === 'partial') && calculateDaysOverdue(inv.dueDate, new Date()) > 0;
    
    totalCount++;
    totalSum += inv.totalAmount;

    if (inv.status === 'paid') {
      paidCount++;
      paidSum += inv.paidAmount;
    } else if (isOverdue) {
      overdueCount++;
      overdueSum += inv.remainingDebt;
    } else if (inv.status === 'unpaid') {
      unpaidCount++;
      unpaidSum += inv.remainingDebt;
    } else if (inv.status === 'partial') {
      partialCount++;
      partialSum += inv.remainingDebt;
    }
  });

  statTotalCount.textContent = totalCount;
  statTotalAmount.textContent = formatCurrency(totalSum);

  statPaidCount.textContent = paidCount;
  statPaidAmount.textContent = formatCurrency(paidSum);

  statUnpaidCount.textContent = unpaidCount;
  statUnpaidAmount.textContent = formatCurrency(unpaidSum);

  statPartialCount.textContent = partialCount;
  statPartialAmount.textContent = formatCurrency(partialSum);

  statOverdueCount.textContent = overdueCount;
  statOverdueAmount.textContent = formatCurrency(overdueSum);
}

// ─── RENDER LIST ───────────────────────────────────────────────

function renderInvoicesList() {
  const tbody = document.getElementById('invoicesTableBody');
  const emptyEl = document.getElementById('invoicesEmpty');
  if (!tbody) return;

  const filters = {
    month: currentMonth || undefined,
    year: currentYear || undefined,
    roomId: currentRoomId || undefined
  };

  // Nếu lọc status khác "overdue" thì truyền cho service, riêng "overdue" ta tự lọc bên ngoài
  if (currentStatus && currentStatus !== 'overdue') {
    filters.status = currentStatus;
  }

  let list = filterInvoices(filters);

  // Tìm theo mã hoặc tên phòng
  if (currentKeyword) {
    const kw = currentKeyword.toLowerCase();
    list = list.filter(inv => {
      const room = getRoomById(inv.roomId);
      const roomName = room ? room.name.toLowerCase() : '';
      return inv.id.toLowerCase().includes(kw) || roomName.includes(kw) || inv.roomId.toLowerCase().includes(kw);
    });
  }

  if (currentStatus === 'overdue') {
    list = list.filter(inv => (inv.status === 'unpaid' || inv.status === 'partial') && calculateDaysOverdue(inv.dueDate, new Date()) > 0);
  }

  const paginationContainer = document.getElementById('invoicesPaginationContainer');

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  // Xử lý phân trang
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }
  
  if (paginationContainer) {
    paginationContainer.innerHTML = renderPagination(currentPage, totalItems, itemsPerPage);
  }

  const start = (currentPage - 1) * itemsPerPage;
  const paginatedList = list.slice(start, start + itemsPerPage);

  tbody.innerHTML = paginatedList.map(item => {
    const room = getRoomById(item.roomId);
    const roomName = room ? room.name : item.roomId;

    // Lấy thông tin người thuê đại diện
    const contract = getActiveContractByRoom(item.roomId);
    const tenant = contract ? getTenantById(contract.tenantId) : null;
    const tenantName = tenant ? tenant.fullName : '<span class="text-muted small">Chưa thuê</span>';

    // Tính toán cấu phần hóa đơn
    const roomFee = item.roomFee || 0;
    const utilitiesFee = (item.electricityFee || 0) + (item.waterFee || 0);
    const servicesFee = item.otherServicesFee || 0;

    // Tính toán quá hạn
    const isOverdue = (item.status === 'unpaid' || item.status === 'partial') && calculateDaysOverdue(item.dueDate, new Date()) > 0;

    let statusClass = 'badge-invoice-draft';
    let statusLabel = 'Bản nháp';
    let trClass = '';

    if (isOverdue) {
      statusClass = 'bg-danger text-white px-2 py-1 rounded small';
      statusLabel = 'Quá hạn';
      trClass = 'table-danger border-danger-subtle'; // Nổi bật dòng màu đỏ/cam
    } else if (item.status === 'unpaid') {
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
      <tr class="${trClass}" data-testid="invoice-row-${item.id}">
        <td>
          <a href="#" class="btn-view-invoice text-primary text-decoration-none fw-semibold" data-id="${item.id}" data-testid="btn-view-invoice-${item.id}">
            ${item.id.substring(0, 8).toUpperCase()}…
          </a>
        </td>
        <td><strong>${roomName.startsWith('Phòng') ? roomName : 'Phòng ' + roomName}</strong></td>
        <td>${tenantName}</td>
        <td class="text-center">Tháng ${item.month}/${item.year}</td>
        <td class="text-end text-dark">${formatCurrency(roomFee)}</td>
        <td class="text-end text-dark">${formatCurrency(utilitiesFee)}</td>
        <td class="text-end text-dark">${formatCurrency(servicesFee)}</td>
        <td class="text-end fw-bold text-primary">${formatCurrency(item.totalAmount)}</td>
        <td class="text-end text-success">${formatCurrency(item.paidAmount)}</td>
        <td class="text-end text-danger">${formatCurrency(item.remainingDebt)}</td>
        <td class="text-center text-muted small">${formatDateToDisplay(item.dueDate)}</td>
        <td class="text-center"><span class="badge ${statusClass}">${statusLabel}</span></td>
        <td class="text-end">
          <div class="dropdown">
            <button class="btn btn-sm btn-light border-0 rounded-circle p-1" type="button" data-bs-toggle="dropdown" data-bs-boundary="window" aria-expanded="false" title="Thao tác">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm" style="min-width: 150px;">
              ${actionButtons}
            </ul>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function buildActionButtons(invoice) {
  const items = [];

  // Xem chi tiết (luôn có)
  items.push(`<li><a class="dropdown-item btn-detail-invoice" href="#" data-id="${invoice.id}" data-testid="btn-detail-invoice-${invoice.id}"><i class="bi bi-eye text-info me-2"></i>Xem chi tiết</a></li>`);

  if (invoice.status === 'draft') {
    // Sửa nháp
    items.push(`<li><a class="dropdown-item btn-edit-invoice" href="#" data-id="${invoice.id}" data-testid="btn-edit-invoice-${invoice.id}"><i class="bi bi-pencil text-primary me-2"></i>Cập nhật</a></li>`);
    // Chốt hóa đơn
    items.push(`<li><a class="dropdown-item btn-finalize-invoice" href="#" data-id="${invoice.id}" data-testid="btn-finalize-invoice-${invoice.id}"><i class="bi bi-check-circle text-success me-2"></i>Chốt đơn</a></li>`);
    // Xóa nháp
    items.push(`<li><hr class="dropdown-divider"></li>`);
    items.push(`<li><a class="dropdown-item btn-delete-invoice text-danger" href="#" data-id="${invoice.id}" data-testid="btn-delete-invoice-${invoice.id}"><i class="bi bi-trash text-danger me-2"></i>Xóa</a></li>`);
  }

  if (invoice.status === 'unpaid') {
    // Hủy hóa đơn (chỉ khi chưa trả)
    items.push(`<li><hr class="dropdown-divider"></li>`);
    items.push(`<li><a class="dropdown-item btn-cancel-invoice text-warning" href="#" data-id="${invoice.id}" data-testid="btn-cancel-invoice-${invoice.id}"><i class="bi bi-x-circle text-warning me-2"></i>Hủy hóa đơn</a></li>`);
  }

  return items.join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  const rooms = getRooms();

  // Lập hóa đơn phòng đơn lẻ
  const btnAdd = document.getElementById('btnAddInvoice');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openInvoiceForm();
    });
  }

  // Lắng nghe event từ InvoiceCreateModal để refresh danh sách
  document.addEventListener('invoices-updated', () => {
    renderFinancialSummary();
    renderInvoicesList();
  }, { once: false });

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
        currentPage = 1;
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
      currentPage = 1;
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
        currentPage = 1;
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
      currentPage = 1;
      renderFinancialSummary();
      renderInvoicesList();
    });
  }

  // Filter Status
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentStatus = filterStatus.value;
      currentPage = 1;
      renderFinancialSummary();
      renderInvoicesList();
    });
  }

  // Pagination
  const paginationContainer = document.getElementById('invoicesPaginationContainer');
  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-page');
      if (btn) {
        e.preventDefault();
        const page = Number(btn.dataset.page);
        if (!isNaN(page) && page > 0) {
          currentPage = page;
          renderInvoicesList();
        }
      }
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

      if (target.classList.contains('btn-view-invoice') || target.classList.contains('btn-detail-invoice') || target.closest('.btn-view-invoice')) {
        handleView(id);
      } else if (target.classList.contains('btn-edit-invoice') || target.closest('.btn-edit-invoice')) {
        handleEdit(id);
      } else if (target.classList.contains('btn-finalize-invoice') || target.closest('.btn-finalize-invoice')) {
        handleFinalize(id);
      } else if (target.classList.contains('btn-delete-invoice') || target.closest('.btn-delete-invoice')) {
        handleDelete(id);
      } else if (target.classList.contains('btn-cancel-invoice') || target.closest('.btn-cancel-invoice')) {
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
