// src/pages/contracts-page.js

/**
 * Trang quản lý hợp đồng.
 * Hiển thị danh sách, tìm kiếm, lọc, CRUD, kích hoạt, gia hạn, kết thúc, hủy.
 */

import '../styles/contracts.css';

import {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  activateContract,
  extendContract,
  endContract,
  cancelContract,
  searchContracts,
  filterContracts,
  getExpiringContracts,
} from '../services/contract-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { isValidDate } from '../utils/validation-utils.js';
import {
  CONTRACT_STATUS,
  CONTRACT_STATUS_LABELS,
} from '../constants/statuses.js';
import { isContractExpiringSoon } from '../business/contract-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openContractForm } from '../components/contract-form.js';
import { openContractDetail } from '../components/contract-detail.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = '';
let currentFilters = {};

// ─── MAIN RENDER ───────────────────────────────────────────────

export function renderContractsPage(container) {
  currentKeyword = '';
  currentFilters = {};

  container.innerHTML = `
    <div data-testid="contracts-page">
      <!-- Cảnh báo sắp hết hạn -->
      <div id="expiringAlert" data-testid="expiring-alert"></div>

      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Hợp đồng</h4>
        <button class="btn btn-primary btn-sm" id="btnAddContract" data-testid="btn-add-contract">
          + Thêm hợp đồng
        </button>
      </div>

      <!-- Filters -->
      <div class="d-flex flex-wrap align-items-center mb-3 contracts-filter-bar" data-testid="contracts-filter-bar">
        <input type="text" class="form-control form-control-sm" id="contractSearch" data-testid="input-search-contract"
          placeholder="Tìm theo mã, phòng, người thuê..." />
        <select class="form-select form-select-sm" id="filterStatus" data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Hiệu lực</option>
          <option value="expired">Hết hạn</option>
          <option value="terminated">Đã thanh lý</option>
        </select>
        <select class="form-select form-select-sm" id="filterRoom" data-testid="filter-room">
          <option value="">Tất cả phòng</option>
        </select>
      </div>

      <!-- Bảng danh sách -->
      <div class="table-responsive">
        <table class="table table-hover contracts-table" data-testid="contracts-table">
          <thead class="table-light">
            <tr>
              <th>Mã HĐ</th>
              <th>Phòng</th>
              <th>Người thuê</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Giá thuê</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="contractsTableBody" data-testid="contracts-table-body">
          </tbody>
        </table>
      </div>

      <div id="contractsEmpty" class="text-muted text-center d-none" data-testid="contracts-empty">
        Không có hợp đồng nào.
      </div>
    </div>
  `;

  // Populate room filter
  populateRoomFilter();

  // Render data
  renderExpiringAlert();
  renderContractsList();

  // Event listeners
  bindEvents(container);
}

// ─── RENDER EXPIRING ALERT ─────────────────────────────────────

function renderExpiringAlert() {
  const alertEl = document.getElementById('expiringAlert');
  if (!alertEl) return;

  const expiring = getExpiringContracts(30);
  if (expiring.length === 0) {
    alertEl.innerHTML = '';
    return;
  }

  alertEl.innerHTML = `
    <div class="alert expiring-alert p-3 mb-3" data-testid="expiring-contracts-alert">
      <strong>⚠️ ${expiring.length} hợp đồng sắp hết hạn (trong 30 ngày):</strong>
      <ul class="mb-0 mt-2">
        ${expiring.map(c => {
          const room = getRoomById(c.roomId);
          const tenant = getTenantById(c.tenantId);
          return `<li>
            <strong>${room ? room.name : c.roomId}</strong> –
            ${tenant ? tenant.fullName : c.tenantId} –
            Hết hạn: ${c.endDate ? formatDateToDisplay(c.endDate) : 'N/A'}
          </li>`;
        }).join('')}
      </ul>
    </div>
  `;
}

// ─── POPULATE ROOM FILTER ──────────────────────────────────────

function populateRoomFilter() {
  const filterRoom = document.getElementById('filterRoom');
  if (!filterRoom) return;

  const rooms = getRooms();
  const options = rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;
}

// ─── RENDER CONTRACTS LIST ─────────────────────────────────────

function getFilteredContracts() {
  let contracts;

  if (currentKeyword) {
    contracts = searchContracts(currentKeyword);
  } else {
    contracts = getContracts();
  }

  // Apply filters
  if (currentFilters.status) {
    contracts = contracts.filter(c => c.status === currentFilters.status);
  }
  if (currentFilters.roomId) {
    contracts = contracts.filter(c => c.roomId === currentFilters.roomId);
  }

  // Sort: active first, then by startDate desc
  contracts.sort((a, b) => {
    const order = { active: 0, expired: 1, terminated: 2 };
    const diff = (order[a.status] || 3) - (order[b.status] || 3);
    if (diff !== 0) return diff;
    return new Date(b.startDate) - new Date(a.startDate);
  });

  return contracts;
}

function getStatusBadge(status) {
  const label = CONTRACT_STATUS_LABELS[status] || status;
  let cls = 'bg-secondary';
  if (status === CONTRACT_STATUS.ACTIVE) cls = 'badge-contract-active';
  if (status === CONTRACT_STATUS.EXPIRED) cls = 'badge-contract-expired';
  if (status === CONTRACT_STATUS.TERMINATED) cls = 'badge-contract-terminated';
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderContractsList() {
  const tbody = document.getElementById('contractsTableBody');
  const emptyEl = document.getElementById('contractsEmpty');
  if (!tbody) return;

  const contracts = getFilteredContracts();

  if (contracts.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = contracts.map(c => {
    const room = getRoomById(c.roomId);
    const tenant = getTenantById(c.tenantId);
    const roomName = room ? room.name : 'N/A';
    const tenantName = tenant ? tenant.fullName : 'N/A';
    const expiring = isContractExpiringSoon(c, new Date(), 30);
    const rowClass = expiring ? 'row-expiring' : '';

    // Action buttons depend on status
    const actions = buildActionButtons(c);

    return `
      <tr class="${rowClass}" data-testid="contract-row-${c.id}" data-id="${c.id}">
        <td>
          <a href="#" class="btn-view-contract text-primary text-decoration-none" data-id="${c.id}" data-testid="btn-view-contract-${c.id}">
            ${c.id.substring(0, 10)}…
          </a>
        </td>
        <td>${roomName}</td>
        <td>${tenantName}</td>
        <td>${c.startDate ? formatDateToDisplay(c.startDate) : 'N/A'}</td>
        <td>
          ${c.endDate ? formatDateToDisplay(c.endDate) : 'N/A'}
          ${expiring ? '<span class="badge bg-warning text-dark ms-1" title="Sắp hết hạn">⏰</span>' : ''}
        </td>
        <td>${formatCurrency(c.roomPrice)}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td>
          <div class="btn-group">${actions}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function buildActionButtons(contract) {
  const btns = [];

  // Xem chi tiết – always available
  btns.push(`<button class="btn btn-outline-info btn-action-view" data-id="${contract.id}" data-testid="btn-action-view" title="Xem">👁</button>`);

  if (contract.status === CONTRACT_STATUS.ACTIVE) {
    // Sửa
    btns.push(`<button class="btn btn-outline-primary btn-action-edit" data-id="${contract.id}" data-testid="btn-action-edit-${contract.id}" title="Sửa">✏️</button>`);
    // Gia hạn
    btns.push(`<button class="btn btn-outline-success btn-action-extend" data-id="${contract.id}" data-testid="btn-action-extend-${contract.id}" title="Gia hạn">📅</button>`);
    // Kết thúc
    btns.push(`<button class="btn btn-outline-warning btn-action-end" data-id="${contract.id}" data-testid="btn-action-end-${contract.id}" title="Kết thúc">🔚</button>`);
    // Hủy
    btns.push(`<button class="btn btn-outline-danger btn-action-cancel" data-id="${contract.id}" data-testid="btn-action-cancel-${contract.id}" title="Hủy/Thanh lý">✕</button>`);
  }

  if (contract.status === CONTRACT_STATUS.EXPIRED) {
    // Kích hoạt lại
    btns.push(`<button class="btn btn-outline-success btn-action-activate" data-id="${contract.id}" data-testid="btn-action-activate-${contract.id}" title="Kích hoạt lại">▶️</button>`);
  }

  return btns.join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents(container) {
  // Add contract
  const btnAdd = document.getElementById('btnAddContract');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openContractForm({
        contract: null,
        onSave: (data) => {
          try {
            createContract(data);
            showToast('Tạo hợp đồng thành công!', 'success');
            renderExpiringAlert();
            renderContractsList();
          } catch (err) {
            showToast(err.message, 'danger');
            throw err; // re-throw to keep form open
          }
        },
      });
    });
  }

  // Search
  const searchInput = document.getElementById('contractSearch');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentKeyword = searchInput.value.trim();
        renderContractsList();
      }, 300);
    });
  }

  // Filter status
  const filterStatus = document.getElementById('filterStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentFilters.status = filterStatus.value || undefined;
      renderContractsList();
    });
  }

  // Filter room
  const filterRoom = document.getElementById('filterRoom');
  if (filterRoom) {
    filterRoom.addEventListener('change', () => {
      currentFilters.roomId = filterRoom.value || undefined;
      renderContractsList();
    });
  }

  // Table actions (event delegation)
  const tbody = document.getElementById('contractsTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const target = e.target.closest('button, a');
      if (!target) return;

      const id = target.dataset.id;
      if (!id) return;

      e.preventDefault();

      if (target.classList.contains('btn-view-contract') || target.classList.contains('btn-action-view')) {
        handleView(id);
      } else if (target.classList.contains('btn-action-edit')) {
        handleEdit(id);
      } else if (target.classList.contains('btn-action-extend')) {
        handleExtend(id);
      } else if (target.classList.contains('btn-action-end')) {
        handleEnd(id);
      } else if (target.classList.contains('btn-action-cancel')) {
        handleCancel(id);
      } else if (target.classList.contains('btn-action-activate')) {
        handleActivate(id);
      }
    });
  }
}

// ─── ACTION HANDLERS ───────────────────────────────────────────

function handleView(id) {
  const contract = getContractById(id);
  if (contract) {
    openContractDetail(contract);
  }
}

function handleEdit(id) {
  const contract = getContractById(id);
  if (!contract) return;

  openContractForm({
    contract,
    onSave: (data) => {
      try {
        updateContract(id, data);
        showToast('Cập nhật hợp đồng thành công!', 'success');
        renderExpiringAlert();
        renderContractsList();
      } catch (err) {
        showToast(err.message, 'danger');
        throw err;
      }
    },
  });
}

function handleExtend(id) {
  const contract = getContractById(id);
  if (!contract) return;

  // Show extend modal
  const dialogContainer = document.getElementById('confirm-dialog-container');
  if (!dialogContainer) return;

  dialogContainer.innerHTML = `
    <div class="modal fade" id="extendModal" tabindex="-1" aria-hidden="true" data-testid="extend-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Gia hạn hợp đồng</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="extendError" class="alert alert-danger d-none" data-testid="extend-error"></div>
            <p class="extend-info">
              Ngày kết thúc hiện tại: <strong>${formatDateToDisplay(contract.endDate)}</strong>
            </p>
            <label for="newEndDate" class="form-label">Ngày kết thúc mới <span class="text-danger">*</span></label>
            <input type="date" class="form-control" id="newEndDate" data-testid="input-new-end-date"
              min="${contract.endDate}" required />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-success" id="btnConfirmExtend" data-testid="btn-confirm-extend">Gia hạn</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('extendModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  document.getElementById('btnConfirmExtend').addEventListener('click', () => {
    const newEndDate = document.getElementById('newEndDate').value;
    const errorEl = document.getElementById('extendError');

    try {
      extendContract(id, newEndDate);
      bsModal.hide();
      showToast('Gia hạn hợp đồng thành công!', 'success');
      renderExpiringAlert();
      renderContractsList();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
    }
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    dialogContainer.innerHTML = '';
  });

  bsModal.show();
}

function handleEnd(id) {
  const contract = getContractById(id);
  if (!contract) return;

  const room = getRoomById(contract.roomId);
  const roomName = room ? room.name : contract.roomId;

  showConfirmDialog(
    'Kết thúc hợp đồng',
    `Bạn có chắc muốn kết thúc hợp đồng phòng <strong>${roomName}</strong>?<br>Phòng sẽ được chuyển thành trống nếu không còn hợp đồng hiệu lực khác.`,
    () => {
      try {
        endContract(id);
        showToast('Đã kết thúc hợp đồng.', 'success');
        renderExpiringAlert();
        renderContractsList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleCancel(id) {
  const contract = getContractById(id);
  if (!contract) return;

  const room = getRoomById(contract.roomId);
  const roomName = room ? room.name : contract.roomId;

  showConfirmDialog(
    'Thanh lý hợp đồng',
    `Bạn có chắc muốn thanh lý hợp đồng phòng <strong>${roomName}</strong>?<br>Thao tác này không thể hoàn tác.`,
    () => {
      try {
        cancelContract(id);
        showToast('Đã thanh lý hợp đồng.', 'success');
        renderExpiringAlert();
        renderContractsList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleActivate(id) {
  showConfirmDialog(
    'Kích hoạt hợp đồng',
    'Bạn có chắc muốn kích hoạt lại hợp đồng này?<br>Phòng sẽ được chuyển thành đang thuê.',
    () => {
      try {
        activateContract(id);
        showToast('Đã kích hoạt hợp đồng.', 'success');
        renderExpiringAlert();
        renderContractsList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}
