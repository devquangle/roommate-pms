// src/pages/rooms-page.js

/**
 * Trang quản lý phòng trọ.
 * Hiển thị bảng danh sách phòng và chế độ thẻ (card),
 * cùng các công cụ lọc, tìm kiếm, thống kê.
 */

import '../styles/rooms.css';
import '../styles/rooms-card.css';

import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  searchRooms,
  filterRooms,
  getRoomOccupancy,
} from '../services/room-service.js';

import { getActiveContractByRoom, filterContracts } from '../services/contract-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getDebtByRoom } from '../services/debt-service.js';
import { filterReadings } from '../services/meter-reading-service.js';
import { filterInvoices } from '../services/invoice-service.js';
import { getReadingByRoomAndMonth } from '../services/meter-reading-service.js';

import { renderPagination } from '../components/pagination.js';
import { renderEmptyState } from '../components/empty-state.js';
import { renderRoomsTableSkeleton } from '../components/loading-state.js';

import { ROOM_STATUS, ROOM_STATUS_LABELS } from '../constants/statuses.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openRoomForm } from '../components/room-form.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = '';
let currentStatus = '';
let currentType = '';
let currentSort = ''; // 'price_asc' | 'price_desc' | ''
let currentView = 'table'; // 'table' | 'card'
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

// ─── ENTRY POINT ───────────────────────────────────────────────
export function renderRoomsPage(container) {
  currentKeyword = '';
  currentStatus = '';
  currentType = '';
  currentSort = '';
  currentView = 'table';
  currentPage = 1;

  container.innerHTML = `
    <div data-testid="rooms-page">

      <!-- Header -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
        <div>
          <h4 class="mb-0">Quản lý phòng trọ</h4>
          <p class="mb-0 text-muted small">Theo dõi trạng thái và thông tin các phòng</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btnAddRoom" data-testid="btn-add-room">
          + Thêm phòng mới
        </button>
      </div>

      <!-- Statistic Cards -->
      <div class="row g-2 mb-4" id="statsContainer"></div>

      <!-- Toolbar -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <!-- Tìm kiếm -->
        <input type="text" class="form-control form-control-sm" style="max-width:200px;"
          id="roomSearch" data-testid="input-search-room"
          placeholder="Tìm theo mã hoặc tên phòng..." />

        <!-- Lọc trạng thái -->
        <select class="form-select form-select-sm" style="max-width:160px;"
          id="filterStatus" data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="${ROOM_STATUS.AVAILABLE}">Trống</option>
          <option value="${ROOM_STATUS.RENTED}">Đang thuê</option>
          <option value="${ROOM_STATUS.MAINTENANCE}">Bảo trì</option>
        </select>

        <!-- Lọc loại phòng -->
        <select class="form-select form-select-sm" style="max-width:160px;"
          id="filterType" data-testid="filter-type">
          <option value="">Tất cả loại phòng</option>
          <option value="standard">Standard</option>
          <option value="deluxe">Deluxe</option>
          <option value="suite">Suite</option>
          <option value="dormitory">Dormitory</option>
          <option value="studio">Studio</option>
        </select>

        <!-- Sắp xếp theo giá -->
        <select class="form-select form-select-sm" style="max-width:180px;"
          id="sortRooms" data-testid="sort-rooms">
          <option value="">Sắp xếp mặc định</option>
          <option value="price_asc">Giá thuê: Thấp → Cao</option>
          <option value="price_desc">Giá thuê: Cao → Thấp</option>
        </select>

        <!-- Nút chuyển chế độ xem -->
        <div class="btn-group ms-auto" role="group" aria-label="Chế độ xem">
          <button class="btn btn-outline-secondary btn-sm active" id="viewTable"
            title="Xem dạng bảng" data-testid="view-table">
            <i class="bi bi-table"></i>
          </button>
          <button class="btn btn-outline-secondary btn-sm" id="viewCard"
            title="Xem dạng thẻ" data-testid="view-card">
            <i class="bi bi-grid-3x3-gap-fill"></i>
          </button>
        </div>
      </div>

      <!-- Main content (table hoặc card sẽ render vào đây) -->
      <div id="mainContent"></div>

      <div id="roomsEmpty" class="text-muted text-center d-none p-4" data-testid="rooms-empty">
        Không tìm thấy phòng trọ nào phù hợp bộ lọc.
      </div>
    </div>
  `;

  renderStats();
  renderMainContent();
  bindToolbarEvents();
  bindContentEvents(); // Gắn 1 lần duy nhất — delegation trên #mainContent
}

// ─── STATISTICS ────────────────────────────────────────────────
function renderStats() {
  const rooms = getRooms();
  const total = rooms.length;
  const rented = rooms.filter(r => r.status === ROOM_STATUS.RENTED).length;
  const available = rooms.filter(r => r.status === ROOM_STATUS.AVAILABLE).length;
  const maintenance = rooms.filter(r => r.status === ROOM_STATUS.MAINTENANCE).length;

  const el = document.getElementById('statsContainer');
  if (!el) return;

  el.innerHTML = `
    <div class="col-6 col-md-3">
      <div class="card text-bg-primary">
        <div class="card-body p-2">
          <h6 class="card-title mb-1">Tổng phòng</h6>
          <p class="card-text fs-5 mb-0">${total}</p>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card text-bg-success">
        <div class="card-body p-2">
          <h6 class="card-title mb-1">Đang thuê</h6>
          <p class="card-text fs-5 mb-0">${rented}</p>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card text-bg-warning">
        <div class="card-body p-2">
          <h6 class="card-title mb-1">Trống</h6>
          <p class="card-text fs-5 mb-0">${available}</p>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card text-bg-danger">
        <div class="card-body p-2">
          <h6 class="card-title mb-1">Sửa chữa</h6>
          <p class="card-text fs-5 mb-0">${maintenance}</p>
        </div>
      </div>
    </div>
  `;
}

// ─── MAIN CONTENT SWITCH ───────────────────────────────────────
function renderMainContent() {
  const wrapper = document.getElementById('mainContent');
  if (!wrapper) return;

  // Render skeleton loading
  wrapper.innerHTML = renderRoomsTableSkeleton();

  setTimeout(() => {
    if (currentView === 'table') {
      wrapper.innerHTML = `
        <div class="table-responsive">
          <table class="table table-hover align-middle" data-testid="rooms-table">
            <thead class="table-light">
              <tr>
                <th>Mã phòng</th>
                <th>Tên phòng</th>
                <th>Khu vực</th>
                <th class="text-end">Giá thuê / Tháng</th>
                <th class="text-center">Số người</th>
                <th>Người đại diện</th>
                <th class="text-end">Công nợ</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody id="roomsTableBody" data-testid="rooms-table-body"></tbody>
          </table>
        </div>
        <div id="paginationContainer" class="mt-3"></div>
      `;
      renderTableRows();
    } else {
      wrapper.innerHTML = `
        <div class="row g-3" id="roomsCardContainer" data-testid="rooms-card-container"></div>
        <div id="paginationContainer" class="mt-4"></div>
      `;
      renderCards();
    }
  }, 300);

  // Event delegation đã gắn 1 lần trên #mainContent trong renderRoomsPage()
}

// ─── DATA PROCESSING ───────────────────────────────────────────
function getProcessedRooms() {
  let list = getRooms();

  if (currentKeyword) {
    list = searchRooms(currentKeyword);
  }
  if (currentStatus) {
    list = list.filter(r => r.status === currentStatus);
  }
  if (currentType) {
    list = list.filter(r => r.type === currentType);
  }
  if (currentSort === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
  } else {
    // Sắp xếp mặc định: mới nhất lên đầu
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  return list;
}

// ─── BADGE ─────────────────────────────────────────────────────
function getStatusBadge(status) {
  const label = ROOM_STATUS_LABELS[status] || status;
  let cls = 'bg-secondary';
  if (status === ROOM_STATUS.AVAILABLE) cls = 'badge-room-available';
  if (status === ROOM_STATUS.RENTED) cls = 'badge-room-rented';
  if (status === ROOM_STATUS.MAINTENANCE) cls = 'badge-room-maintenance';
  return `<span class="badge ${cls}" data-testid="room-status-badge-${status}">${label}</span>`;
}

// ─── TABLE ROWS ────────────────────────────────────────────────
function renderTableRows() {
  const tbody = document.getElementById('roomsTableBody');
  const emptyEl = document.getElementById('roomsEmpty');
  const paginationContainer = document.getElementById('paginationContainer');
  if (!tbody) return;

  const allList = getProcessedRooms();
  
  if (allList.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) {
      const hasFilters = currentKeyword || currentStatus || currentType || currentSort;
      emptyEl.innerHTML = renderEmptyState(hasFilters ? 'no-results' : 'no-rooms', {
        actionId: hasFilters ? 'btnEmptyActionClearFilters' : 'btnEmptyActionAddRoom',
        actionText: hasFilters ? '🧹 Xóa các bộ lọc tìm kiếm' : '➕ Thêm phòng trọ mới'
      });
      emptyEl.classList.remove('d-none');
    }
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }
  emptyEl && emptyEl.classList.add('d-none');

  // Phân trang
  const totalPages = Math.ceil(allList.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const list = allList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  tbody.innerHTML = list.map(item => {
    // Số người: đang ở / tối đa
    let currentOccupants = 0;
    try {
      currentOccupants = getRoomOccupancy(item.id).currentOccupants || 0;
    } catch (_) { /* ignore */ }
    const maxTenants = item.maxTenants || 0;

    // Người đại diện: lấy từ hợp đồng active
    let representative = '—';
    try {
      const contract = getActiveContractByRoom(item.id);
      if (contract && contract.tenantId) {
        const tenant = getTenantById(contract.tenantId);
        if (tenant) representative = tenant.fullName || tenant.name || '—';
      }
    } catch (_) { /* ignore */ }

    // Công nợ: tổng nợ chưa thanh toán của phòng
    let debt = 0;
    try {
      const debtList = getDebtByRoom();
      const debtEntry = debtList.find(d => d.roomId === item.id);
      if (debtEntry) debt = debtEntry.totalDebt;
    } catch (_) { /* ignore */ }

    const debtDisplay = debt > 0
      ? `<span class="text-danger fw-semibold">${formatCurrency(debt)}</span>`
      : `<span class="text-muted">0 ₫</span>`;

    return `
      <tr data-testid="room-row-${item.id}">
        <td><strong>${item.id || ''}</strong></td>
        <td>${item.name || ''}</td>
        <td class="text-muted small">${item.floor || '—'}</td>
        <td class="text-end fw-semibold text-primary">${formatCurrency(item.price)}</td>
        <td class="text-center">
          <span class="badge bg-light text-dark border">${currentOccupants}/${maxTenants}</span>
        </td>
        <td>${representative}</td>
        <td class="text-end">${debtDisplay}</td>
        <td>${getStatusBadge(item.status)}</td>
        <td>
          <div class="btn-group gap-1">
            <button class="btn btn-outline-info btn-sm btn-action-room"
              data-id="${item.id}" data-action="view"
              data-testid="btn-view-room-${item.id}" title="Xem chi tiết">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-outline-primary btn-sm btn-action-room"
              data-id="${item.id}" data-action="edit"
              data-testid="btn-edit-room-${item.id}" title="Sửa phòng">
              <i class="bi bi-pencil-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm btn-action-room"
              data-id="${item.id}" data-action="delete"
              data-testid="btn-delete-room-${item.id}" title="Xóa phòng">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationContainer) {
    paginationContainer.innerHTML = renderPagination(currentPage, allList.length, ITEMS_PER_PAGE);
  }
}

// ─── CARD GRID ─────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('roomsCardContainer');
  const emptyEl = document.getElementById('roomsEmpty');
  const paginationContainer = document.getElementById('paginationContainer');
  if (!grid) return;

  const allList = getProcessedRooms();

  if (allList.length === 0) {
    grid.innerHTML = '';
    if (emptyEl) {
      const hasFilters = currentKeyword || currentStatus || currentType || currentSort;
      emptyEl.innerHTML = renderEmptyState(hasFilters ? 'no-results' : 'no-rooms', {
        actionId: hasFilters ? 'btnEmptyActionClearFilters' : 'btnEmptyActionAddRoom',
        actionText: hasFilters ? '🧹 Xóa các bộ lọc tìm kiếm' : '➕ Thêm phòng trọ mới'
      });
      emptyEl.classList.remove('d-none');
    }
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }
  emptyEl && emptyEl.classList.add('d-none');

  // Phân trang
  const totalPages = Math.ceil(allList.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const list = allList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  grid.innerHTML = list.map(item => {
    let occ = { currentOccupants: 0, maxTenants: item.maxTenants || 0 };
    try { occ = getRoomOccupancy(item.id); } catch (_) { /* ignore */ }

    // Tính công nợ thực tế
    let debtVal = 0;
    try {
      const debtList = getDebtByRoom();
      const debtEntry = debtList.find(d => d.roomId === item.id);
      if (debtEntry) debtVal = debtEntry.totalDebt;
    } catch (_) {}

    // Tính điện nước tháng này
    const today = new Date();
    let meterReading = null;
    try {
      meterReading = getReadingByRoomAndMonth(item.id, today.getMonth() + 1, today.getFullYear());
    } catch (_) {}

    const electricity = meterReading && meterReading.electricity !== undefined
      ? `${meterReading.electricity} kWh` : 'Chưa ghi';
    const water = meterReading && meterReading.water !== undefined
      ? `${meterReading.water} m³` : 'Chưa ghi';
    const debt = debtVal > 0 ? formatCurrency(debtVal) : formatCurrency(0);
    const hasDebt = debtVal > 0;
    const missingMeter = !meterReading;

    // Người đại diện
    let repName = '—';
    try {
      const contract = getActiveContractByRoom(item.id);
      if (contract && contract.tenantId) {
        const tenant = getTenantById(contract.tenantId);
        if (tenant) repName = tenant.fullName || tenant.name || '—';
      }
    } catch (_) {}

    let cardBorder = '';
    if (hasDebt) cardBorder = 'border-danger border-2';
    else if (missingMeter && item.status === ROOM_STATUS.RENTED) cardBorder = 'border-warning border-2';

    return `
      <div class="col-12 col-sm-6 col-xl-3" data-testid="room-card-${item.id}">
        <div class="card h-100 room-card room-card--${item.status} ${cardBorder}">
          <div class="card-body">
            <!-- Header: Tên + Badge -->
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title mb-0">
                <i class="bi bi-door-open text-primary me-1"></i> ${item.id} - ${item.name || ''}
              </h5>
              ${getStatusBadge(item.status)}
            </div>

            <p class="card-text text-muted small mb-1">${item.description || ''}</p>
            <p class="card-text fw-bold text-primary mb-2">${formatCurrency(item.price)}/tháng</p>

            <!-- Thông tin chi tiết -->
            <ul class="list-unstyled small mb-0">
              <li class="mb-1"><i class="bi bi-people"></i> Người ở: ${occ.currentOccupants}/${occ.maxTenants}</li>
              <li class="mb-1"><i class="bi bi-person-badge"></i> Đại diện: ${repName}</li>
              <li class="mb-1 ${missingMeter && item.status === ROOM_STATUS.RENTED ? 'text-warning fw-bold' : ''}">
                <i class="bi bi-lightning-charge"></i> Điện: ${electricity}
              </li>
              <li class="mb-1 ${missingMeter && item.status === ROOM_STATUS.RENTED ? 'text-warning fw-bold' : ''}">
                <i class="bi bi-droplet"></i> Nước: ${water}
              </li>
              <li class="mb-1 ${hasDebt ? 'text-danger fw-bold' : ''}">
                <i class="bi bi-cash-stack"></i> Công nợ: ${debt}
              </li>
            </ul>
          </div>

          <div class="card-footer bg-transparent d-flex justify-content-between align-items-center">
            <button class="btn btn-primary btn-sm btn-action-room"
              data-id="${item.id}" data-action="view"
              data-testid="btn-card-detail-${item.id}">
              <i class="bi bi-eye"></i> Chi tiết
            </button>

            <!-- Menu ba chấm -->
            <div class="dropdown">
              <button class="btn btn-link btn-sm text-muted p-0" type="button"
                data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item btn-action-room" href="#" data-action="view" data-id="${item.id}">
                  <i class="bi bi-eye"></i> Xem</a></li>
                <li><a class="dropdown-item btn-action-room" href="#" data-action="edit" data-id="${item.id}">
                  <i class="bi bi-pencil-square"></i> Sửa</a></li>
                <li><a class="dropdown-item btn-action-room" href="#" data-action="delete" data-id="${item.id}">
                  <i class="bi bi-trash"></i> Xóa</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item btn-action-room" href="#" data-action="contracts" data-id="${item.id}">
                  <i class="bi bi-file-earmark-text"></i> Xem hợp đồng</a></li>
                <li><a class="dropdown-item btn-action-room" href="#" data-action="invoice" data-id="${item.id}">
                  <i class="bi bi-receipt"></i> Lập hóa đơn</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (paginationContainer) {
    paginationContainer.innerHTML = renderPagination(currentPage, allList.length, ITEMS_PER_PAGE);
  }
}

// ─── EVENT: TOOLBAR (chỉ gắn 1 lần) ──────────────────────────
function bindToolbarEvents() {
  // Thêm phòng mới
  document.getElementById('btnAddRoom')?.addEventListener('click', () => {
    openRoomForm({
      room: null,
      onSave: (data) => {
        createRoom(data);
        showToast('Tạo phòng trọ mới thành công!', 'success');
        renderStats();
        renderMainContent();
      },
    });
  });

  // Tìm kiếm (debounce 300ms)
  const searchInput = document.getElementById('roomSearch');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        currentKeyword = searchInput.value.trim();
        currentPage = 1;
        renderMainContent();
      }, 300);
    });
  }

  // Lọc trạng thái
  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    currentStatus = e.target.value;
    currentPage = 1;
    renderMainContent();
  });

  // Lọc loại phòng
  document.getElementById('filterType')?.addEventListener('change', (e) => {
    currentType = e.target.value;
    currentPage = 1;
    renderMainContent();
  });

  // Sắp xếp
  document.getElementById('sortRooms')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderMainContent();
  });

  // Chuyển chế độ xem
  const viewTableBtn = document.getElementById('viewTable');
  const viewCardBtn = document.getElementById('viewCard');

  viewTableBtn?.addEventListener('click', () => {
    currentView = 'table';
    viewTableBtn.classList.add('active');
    viewCardBtn?.classList.remove('active');
    currentPage = 1;
    renderMainContent();
  });

  viewCardBtn?.addEventListener('click', () => {
    currentView = 'card';
    viewCardBtn.classList.add('active');
    viewTableBtn?.classList.remove('active');
    currentPage = 1;
    renderMainContent();
  });

  // Xử lý Empty State click actions
  const emptyEl = document.getElementById('roomsEmpty');
  if (emptyEl) {
    emptyEl.addEventListener('click', (e) => {
      const btnAdd = e.target.closest('#btnEmptyActionAddRoom');
      if (btnAdd) {
        e.preventDefault();
        document.getElementById('btnAddRoom')?.click();
      }
      const btnClear = e.target.closest('#btnEmptyActionClearFilters');
      if (btnClear) {
        e.preventDefault();
        currentKeyword = '';
        currentStatus = '';
        currentType = '';
        currentSort = '';
        currentPage = 1;

        const searchInput = document.getElementById('roomSearch');
        if (searchInput) searchInput.value = '';
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) filterStatus.value = '';
        const filterType = document.getElementById('filterType');
        if (filterType) filterType.value = '';
        const sortRooms = document.getElementById('sortRooms');
        if (sortRooms) sortRooms.value = '';

        renderMainContent();
      }
    });
  }
}

// ─── EVENT: CONTENT (gắn lại mỗi lần render content) ──────────
function bindContentEvents() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;

  // Dùng 1 event delegation chung trên #mainContent
  // để bắt mọi click vào .btn-action-room (cả table lẫn card)
  mainContent.addEventListener('click', (e) => {
    const el = e.target.closest('.btn-action-room');
    if (!el) return;

    e.preventDefault();
    const id = el.dataset.id;
    const action = el.dataset.action;
    if (!id || !action) return;

    switch (action) {
      case 'view':     handleView(id);   break;
      case 'edit':     handleEdit(id);   break;
      case 'delete':   handleDelete(id); break;
      case 'contracts':
        showToast('Chức năng xem hợp đồng đang phát triển', 'info');
        break;
      case 'invoice':
        showToast('Chức năng lập hóa đơn đang phát triển', 'info');
        break;
    }
  });

  // Xử lý phân trang
  mainContent.addEventListener('click', (e) => {
    const pageLink = e.target.closest('.btn-page');
    if (pageLink) {
      e.preventDefault();
      const page = parseInt(pageLink.dataset.page);
      if (!isNaN(page)) {
        currentPage = page;
        renderMainContent();
      }
    }
  });
}

// ─── ACTION HANDLERS ───────────────────────────────────────────
function handleView(id) {
  const room = getRoomById(id);
  if (!room) return;

  const dialogContainer = document.getElementById('confirm-dialog-container');
  if (!dialogContainer) return;

  // 1. Fetch data
  const contract = getActiveContractByRoom(id);
  let mainTenant = null;
  let coTenants = [];
  if (contract) {
    mainTenant = getTenantById(contract.tenantId);
    coTenants = (contract.coTenantIds || []).map(cid => getTenantById(cid)).filter(Boolean);
  }

  const readings = filterReadings({ roomId: id });
  readings.sort((a, b) => b.year - a.year || b.month - a.month);
  const recentReadings = readings.slice(0, 2);

  const invoices = filterInvoices({ roomId: id });
  invoices.sort((a, b) => b.year - a.year || b.month - a.month);
  const unpaidInvoices = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');

  const contractsHistory = filterContracts({ roomId: id });
  contractsHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const debts = getDebtByRoom(id);
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);

  // 2. Render Modal
  dialogContainer.innerHTML = `
    <div class="modal fade" id="roomDetailModal" tabindex="-1" aria-hidden="true" data-testid="room-detail-modal">
      <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <h4 class="modal-title d-flex align-items-center gap-2">
              ${room.id} - ${room.name}
              ${getStatusBadge(room.status)}
            </h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div class="modal-body pt-2">
            <!-- Nút thao tác nhanh -->
            <div class="d-flex gap-2 mb-3">
              <button class="btn btn-outline-primary btn-sm" onclick="document.dispatchEvent(new CustomEvent('editRoom', {detail: '${room.id}'})); bootstrap.Modal.getInstance(document.getElementById('roomDetailModal')).hide();">
                <i class="bi bi-pencil"></i> Sửa phòng
              </button>
              <a href="#/invoices" data-link class="btn btn-outline-success btn-sm" onclick="bootstrap.Modal.getInstance(document.getElementById('roomDetailModal')).hide();">
                <i class="bi bi-receipt"></i> Lập hóa đơn
              </a>
              <a href="#/meters" data-link class="btn btn-outline-info btn-sm" onclick="bootstrap.Modal.getInstance(document.getElementById('roomDetailModal')).hide();">
                <i class="bi bi-lightning-charge"></i> Ghi điện nước
              </a>
            </div>

            <!-- Nav tabs -->
            <ul class="nav nav-tabs" id="roomDetailTabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="overview-tab" data-bs-toggle="tab" data-bs-target="#overview" type="button" role="tab">Tổng quan</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="tenant-tab" data-bs-toggle="tab" data-bs-target="#tenant" type="button" role="tab">Người thuê & Hợp đồng</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="meter-tab" data-bs-toggle="tab" data-bs-target="#meter" type="button" role="tab">Điện nước</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="history-tab" data-bs-toggle="tab" data-bs-target="#history" type="button" role="tab">Lịch sử</button>
              </li>
            </ul>

            <!-- Tab content -->
            <div class="tab-content border border-top-0 rounded-bottom p-3 bg-light" id="roomDetailTabsContent">
              
              <!-- TAB 1: TỔNG QUAN -->
              <div class="tab-pane fade show active" id="overview" role="tabpanel">
                <div class="row g-3">
                  <div class="col-md-6">
                    <div class="card h-100 shadow-sm border-0">
                      <div class="card-header bg-white border-bottom-0 pt-3">
                        <h6 class="mb-0 text-primary"><i class="bi bi-info-circle me-1"></i> Thông tin cơ bản</h6>
                      </div>
                      <div class="card-body">
                        <table class="table table-sm table-borderless mb-0">
                          <tbody>
                            <tr><td class="text-muted" width="40%">Giá thuê:</td><td class="fw-semibold">${formatCurrency(room.price)}/tháng</td></tr>
                            <tr><td class="text-muted">Diện tích:</td><td class="fw-semibold">${room.area ? room.area + ' m²' : '—'}</td></tr>
                            <tr><td class="text-muted">Sức chứa:</td><td class="fw-semibold">${room.maxTenants} người</td></tr>
                            <tr><td class="text-muted">Khu vực:</td><td class="fw-semibold">${room.floor || '—'}</td></tr>
                            <tr><td class="text-muted">Loại phòng:</td><td class="fw-semibold">${room.type || '—'}</td></tr>
                          </tbody>
                        </table>
                        ${room.description ? `<hr class="my-2"><div class="small"><strong>Ghi chú:</strong> ${room.description}</div>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="card h-100 shadow-sm border-0 ${totalDebt > 0 ? 'border-danger border' : ''}">
                      <div class="card-header bg-white border-bottom-0 pt-3">
                        <h6 class="mb-0 ${totalDebt > 0 ? 'text-danger' : 'text-success'}">
                          <i class="bi bi-wallet2 me-1"></i> Tình trạng công nợ
                        </h6>
                      </div>
                      <div class="card-body">
                        <h3 class="${totalDebt > 0 ? 'text-danger' : 'text-success'} mb-3">
                          ${formatCurrency(totalDebt)}
                        </h3>
                        ${unpaidInvoices.length > 0 ? `
                          <div class="small fw-semibold text-muted mb-2">Hóa đơn chưa thu:</div>
                          <ul class="list-group list-group-flush small">
                            ${unpaidInvoices.map(inv => `
                              <li class="list-group-item px-0 py-1 bg-transparent d-flex justify-content-between">
                                <span>Tháng ${inv.month}/${inv.year}</span>
                                <span class="text-danger">${formatCurrency(inv.total - (inv.paidAmount || 0))}</span>
                              </li>
                            `).join('')}
                          </ul>
                        ` : '<div class="text-muted small"><i class="bi bi-check-circle text-success me-1"></i> Đã thanh toán đầy đủ</div>'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB 2: NGƯỜI THUÊ & HỢP ĐỒNG -->
              <div class="tab-pane fade" id="tenant" role="tabpanel">
                ${!contract ? '<div class="alert alert-secondary mb-0">Phòng chưa có người thuê / hợp đồng.</div>' : `
                  <div class="card shadow-sm border-0 mb-3">
                    <div class="card-header bg-white border-bottom-0 pt-3">
                      <h6 class="mb-0"><i class="bi bi-person-badge me-1"></i> Người đại diện (Chủ hợp đồng)</h6>
                    </div>
                    <div class="card-body pt-0">
                      <div class="d-flex align-items-center mb-3">
                        <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style="width:48px;height:48px;font-size:20px;">
                          ${mainTenant?.fullName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h5 class="mb-0">${mainTenant?.fullName || 'Không rõ'}</h5>
                          <div class="text-muted small"><i class="bi bi-telephone"></i> ${mainTenant?.phone || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="row g-3">
                    <div class="col-md-6">
                      <div class="card h-100 shadow-sm border-0">
                        <div class="card-body">
                          <h6 class="mb-3"><i class="bi bi-file-earmark-text me-1"></i> Chi tiết hợp đồng</h6>
                          <table class="table table-sm table-borderless mb-0">
                            <tbody>
                              <tr><td class="text-muted" width="45%">Mã hợp đồng:</td><td class="fw-semibold">${contract.id}</td></tr>
                              <tr><td class="text-muted">Ngày bắt đầu:</td><td class="fw-semibold">${formatDateVN(contract.startDate)}</td></tr>
                              <tr><td class="text-muted">Ngày kết thúc:</td><td class="fw-semibold">${formatDateVN(contract.endDate)}</td></tr>
                              <tr><td class="text-muted">Tiền cọc:</td><td class="fw-semibold">${formatCurrency(contract.deposit)}</td></tr>
                              <tr><td class="text-muted">Thu tiền hàng tháng:</td><td class="fw-semibold">Ngày ${contract.billingDay || 1}</td></tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="card h-100 shadow-sm border-0">
                        <div class="card-body">
                          <h6 class="mb-3"><i class="bi bi-people me-1"></i> Danh sách người ở cùng (${coTenants.length})</h6>
                          ${coTenants.length === 0 ? '<div class="text-muted small">Không có ai ở cùng.</div>' : `
                            <ul class="list-group list-group-flush small">
                              ${coTenants.map(t => `
                                <li class="list-group-item px-0 py-1 border-0">
                                  <i class="bi bi-person text-secondary me-1"></i> 
                                  <strong>${t.fullName}</strong> 
                                  <span class="text-muted ms-1">
                                    (CCCD: ${t.idCard || '—'} | SĐT: ${t.phone || '—'})
                                  </span>
                                </li>
                              `).join('')}
                            </ul>
                          `}
                        </div>
                      </div>
                    </div>
                  </div>
                `}
              </div>

              <!-- TAB 3: ĐIỆN NƯỚC -->
              <div class="tab-pane fade" id="meter" role="tabpanel">
                ${recentReadings.length === 0 ? '<div class="alert alert-secondary mb-0">Chưa có chỉ số điện nước nào được ghi.</div>' : `
                  <div class="row g-3">
                    ${recentReadings.map(r => `
                      <div class="col-md-6">
                        <div class="card shadow-sm border-0">
                          <div class="card-header bg-white border-bottom-0 pt-3">
                            <h6 class="mb-0">Tháng ${r.month}/${r.year}</h6>
                          </div>
                          <div class="card-body pt-0">
                            <table class="table table-sm table-bordered text-center mb-0">
                              <thead class="table-light">
                                <tr><th>Loại</th><th>Cũ</th><th>Mới</th><th>Tiêu thụ</th></tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td class="text-warning"><i class="bi bi-lightning-fill"></i> Điện</td>
                                  <td>${r.electricityOld}</td>
                                  <td>${r.electricityNew}</td>
                                  <td class="fw-bold">${r.electricityNew - r.electricityOld}</td>
                                </tr>
                                <tr>
                                  <td class="text-info"><i class="bi bi-droplet-fill"></i> Nước</td>
                                  <td>${r.waterOld}</td>
                                  <td>${r.waterNew}</td>
                                  <td class="fw-bold">${r.waterNew - r.waterOld}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- TAB 4: LỊCH SỬ -->
              <div class="tab-pane fade" id="history" role="tabpanel">
                <h6 class="mb-2"><i class="bi bi-receipt me-1"></i> Hóa đơn gần đây</h6>
                ${invoices.length === 0 ? '<div class="text-muted small mb-3">Chưa có hóa đơn.</div>' : `
                  <div class="table-responsive mb-3">
                    <table class="table table-sm table-hover align-middle small">
                      <thead class="table-light">
                        <tr><th>Tháng</th><th>Mã HĐ</th><th>Tổng tiền</th><th>Trạng thái</th></tr>
                      </thead>
                      <tbody>
                        ${invoices.slice(0, 5).map(inv => `
                          <tr>
                            <td>${inv.month}/${inv.year}</td>
                            <td>${inv.id}</td>
                            <td>${formatCurrency(inv.total)}</td>
                            <td>
                              ${inv.status === 'paid' ? '<span class="badge bg-success">Đã thanh toán</span>' : 
                                inv.status === 'draft' ? '<span class="badge bg-secondary">Bản nháp</span>' : 
                                '<span class="badge bg-warning text-dark">Chưa thanh toán</span>'}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}

                <h6 class="mb-2"><i class="bi bi-file-earmark-text me-1"></i> Lịch sử hợp đồng</h6>
                ${contractsHistory.length === 0 ? '<div class="text-muted small">Không có lịch sử hợp đồng.</div>' : `
                  <div class="table-responsive">
                    <table class="table table-sm table-hover align-middle small">
                      <thead class="table-light">
                        <tr><th>Mã HĐ</th><th>Ngày bắt đầu</th><th>Ngày kết thúc</th><th>Trạng thái</th></tr>
                      </thead>
                      <tbody>
                        ${contractsHistory.map(c => `
                          <tr>
                            <td>${c.id}</td>
                            <td>${formatDateVN(c.startDate)}</td>
                            <td>${formatDateVN(c.endDate)}</td>
                            <td>
                              ${c.status === 'active' ? '<span class="badge bg-success">Đang hiệu lực</span>' : 
                                c.status === 'expired' ? '<span class="badge bg-danger">Đã hết hạn</span>' : 
                                '<span class="badge bg-secondary">Đã kết thúc</span>'}
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>

            </div>
          </div>
          <div class="modal-footer border-0">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('roomDetailModal');
  if (!window.bootstrap?.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);
  modalEl.addEventListener('hidden.bs.modal', () => { dialogContainer.innerHTML = ''; });
  bsModal.show();
}

// Ensure editRoom event opens form
document.addEventListener('editRoom', (e) => {
  const roomId = e.detail;
  handleEdit(roomId);
});

// Helper format date
function formatDateVN(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d)) return dateString;
    return d.toLocaleDateString('vi-VN');
  } catch {
    return dateString;
  }
}

function handleEdit(id) {
  const room = getRoomById(id);
  if (!room) return;

  openRoomForm({
    room,
    onSave: (data) => {
      updateRoom(id, data);
      showToast('Cập nhật phòng trọ thành công!', 'success');
      renderStats();
      renderMainContent();
    },
  });
}

function handleDelete(id) {
  const room = getRoomById(id);
  if (!room) return;

  showConfirmDialog(
    'Xóa phòng trọ',
    `Bạn có chắc chắn muốn xóa phòng trọ <strong>${room.name}</strong> không? Hành động này không thể hoàn tác.`,
    () => {
      try {
        deleteRoom(id);
        showToast('Xóa phòng trọ thành công.', 'success');
        renderStats();
        renderMainContent();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    },
  );
}
