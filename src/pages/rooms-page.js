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

import { getActiveContractByRoom } from '../services/contract-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getDebtByRoom } from '../services/debt-service.js';

import { ROOM_STATUS, ROOM_STATUS_LABELS } from '../constants/statuses.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openRoomForm } from '../components/room-form.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = '';
let currentStatus = '';
let currentSort = ''; // 'price_asc' | 'price_desc' | ''
let currentView = 'table'; // 'table' | 'card'

// ─── ENTRY POINT ───────────────────────────────────────────────
export function renderRoomsPage(container) {
  currentKeyword = '';
  currentStatus = '';
  currentSort = '';
  currentView = 'table';

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
    `;
    renderTableRows();
  } else {
    wrapper.innerHTML = `<div class="row g-3" id="roomsCardContainer" data-testid="rooms-card-container"></div>`;
    renderCards();
  }

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
  if (currentSort === 'price_asc') {
    list.sort((a, b) => a.price - b.price);
  } else if (currentSort === 'price_desc') {
    list.sort((a, b) => b.price - a.price);
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
  if (!tbody) return;

  const list = getProcessedRooms();

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }
  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    // Số người: đang ở / tối đa
    let currentOccupants = 0;
    try {
      currentOccupants = getRoomOccupancy(item.id).activeContracts || 0;
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
        <td><strong>${item.name || ''}</strong></td>
        <td>${item.displayName || item.name || ''}</td>
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
}

// ─── CARD GRID ─────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('roomsCardContainer');
  const emptyEl = document.getElementById('roomsEmpty');
  if (!grid) return;

  const list = getProcessedRooms();

  if (list.length === 0) {
    grid.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }
  emptyEl && emptyEl.classList.add('d-none');

  grid.innerHTML = list.map(item => {
    let occ = { activeContracts: 0, maxTenants: item.maxTenants || 0 };
    try { occ = getRoomOccupancy(item.id); } catch (_) { /* ignore */ }

    const electricity = item.electricityThisMonth !== undefined
      ? `${item.electricityThisMonth} kWh` : 'Chưa ghi';
    const water = item.waterThisMonth !== undefined
      ? `${item.waterThisMonth} m³` : 'Chưa ghi';
    const debt = item.remainingDebt !== undefined
      ? formatCurrency(item.remainingDebt) : formatCurrency(0);

    return `
      <div class="col-12 col-sm-6 col-xl-3" data-testid="room-card-${item.id}">
        <div class="card h-100 room-card room-card--${item.status}">
          <div class="card-body">
            <!-- Header: Tên + Badge -->
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title mb-0">${item.name || ''}</h5>
              ${getStatusBadge(item.status)}
            </div>

            <p class="card-text text-muted small mb-1">${item.description || ''}</p>
            <p class="card-text fw-bold text-primary mb-2">${formatCurrency(item.price)}/tháng</p>

            <!-- Thông tin chi tiết -->
            <ul class="list-unstyled small mb-0">
              <li class="mb-1"><i class="bi bi-people"></i> Người ở: ${occ.activeContracts}/${occ.maxTenants}</li>
              <li class="mb-1"><i class="bi bi-person-badge"></i> Đại diện: ${item.representative || '—'}</li>
              <li class="mb-1"><i class="bi bi-lightning-charge"></i> Điện: ${electricity}</li>
              <li class="mb-1"><i class="bi bi-droplet"></i> Nước: ${water}</li>
              <li class="mb-1"><i class="bi bi-cash-stack"></i> Công nợ: ${debt}</li>
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
        renderMainContent();
      }, 300);
    });
  }

  // Lọc trạng thái
  document.getElementById('filterStatus')?.addEventListener('change', (e) => {
    currentStatus = e.target.value;
    renderMainContent();
  });

  // Sắp xếp
  document.getElementById('sortRooms')?.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderMainContent();
  });

  // Chuyển chế độ xem
  const viewTableBtn = document.getElementById('viewTable');
  const viewCardBtn = document.getElementById('viewCard');

  viewTableBtn?.addEventListener('click', () => {
    currentView = 'table';
    viewTableBtn.classList.add('active');
    viewCardBtn?.classList.remove('active');
    renderMainContent();
  });

  viewCardBtn?.addEventListener('click', () => {
    currentView = 'card';
    viewCardBtn.classList.add('active');
    viewTableBtn?.classList.remove('active');
    renderMainContent();
  });
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
}

// ─── ACTION HANDLERS ───────────────────────────────────────────

function handleView(id) {
  const room = getRoomById(id);
  if (!room) return;

  const dialogContainer = document.getElementById('confirm-dialog-container');
  if (!dialogContainer) return;

  let currentOccupants = 0;
  try {
    currentOccupants = getRoomOccupancy(id).activeContracts || 0;
  } catch (_) { /* ignore */ }

  dialogContainer.innerHTML = `
    <div class="modal fade" id="roomDetailModal" tabindex="-1" aria-hidden="true" data-testid="room-detail-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="room-detail-title">Chi tiết phòng trọ</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="room-detail-panel p-3 bg-light rounded mb-3">
              <div class="mb-2">
                <span class="room-stat-label">Mã phòng (Tên phòng):</span>
                <div class="room-stat-value" data-testid="detail-room-name">${room.name}</div>
              </div>
              <div class="mb-2">
                <span class="room-stat-label">Giá thuê theo tháng:</span>
                <div class="room-stat-value text-primary">${formatCurrency(room.price)}</div>
              </div>
              <div class="mb-2">
                <span class="room-stat-label">Sức chứa tối đa:</span>
                <div class="room-stat-value">${room.maxTenants} người</div>
              </div>
              <div class="mb-2">
                <span class="room-stat-label">Số khách đang ở:</span>
                <div class="room-stat-value">${currentOccupants} người</div>
              </div>
              <div class="mb-2">
                <span class="room-stat-label">Trạng thái:</span>
                <div>${getStatusBadge(room.status)}</div>
              </div>
              <div>
                <span class="room-stat-label">Ghi chú tiện nghi:</span>
                <div class="room-stat-value text-muted small">${room.description || 'Không có ghi chú.'}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-testid="btn-detail-close">Đóng lại</button>
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
