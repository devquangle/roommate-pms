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
import { renderPagination } from '../components/pagination.js';
import { renderEmptyState } from '../components/empty-state.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { isValidDate } from '../utils/validation-utils.js';
import {
  CONTRACT_STATUS,
  CONTRACT_STATUS_LABELS,
  ROOM_STATUS_LABELS,
} from '../constants/statuses.js';
import { isContractExpiringSoon } from '../business/contract-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openContractForm } from '../components/contract-form.js';
import { openContractDetail } from '../components/contract-detail.js';
import { printContract } from '../utils/print-utils.js';
import { initSearchableSelect } from '../components/searchable-select.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = '';
let currentFilters = {};
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

// ─── MAIN RENDER ───────────────────────────────────────────────

export function renderContractsPage(container) {
  const urlParams = new URLSearchParams(window.location.search);
  currentKeyword = urlParams.get('search') || '';
  currentFilters = {};
  currentPage = 1;

  container.innerHTML = `
    <div data-testid="contracts-page">
      <!-- Cảnh báo sắp hết hạn -->
      <div id="expiringAlert" data-testid="expiring-alert"></div>

      <!-- Header -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Quản lý hợp đồng</h4>
        <button class="btn btn-primary btn-sm" id="btnAddContract" data-testid="btn-add-contract">
          <i class="bi bi-plus-circle me-1"></i> Thêm hợp đồng
        </button>
      </div>

      <!-- Statistic Cards -->
      <div class="row g-2 mb-4" id="statsContainer"></div>

      <!-- Filters -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3 bg-light p-2 rounded contracts-filter-bar" data-testid="contracts-filter-bar">
        <!-- Tìm kiếm -->
        <input type="text" class="form-control form-control-sm flex-grow-1" id="contractSearch" data-testid="input-search-contract"
          placeholder="Tìm theo mã, phòng, người thuê..." />
        
        <!-- Lọc phòng -->
        <select class="form-select form-select-sm" style="width: auto;" id="filterRoom" data-testid="filter-room">
          <option value="">Tất cả phòng</option>
        </select>
        
        <!-- Lọc trạng thái -->
        <select class="form-select form-select-sm" style="width: auto;" id="filterStatus" data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hiệu lực</option>
          <option value="expired">Hết hạn</option>
          <option value="terminated">Đã hủy/Thanh lý</option>
        </select>
        
        <!-- Chọn khoảng ngày -->
        <div class="d-flex align-items-center gap-1">
          <input type="date" class="form-control form-control-sm" id="filterFromDate" title="Từ ngày (Bắt đầu)" />
          <span class="text-muted">-</span>
          <input type="date" class="form-control form-control-sm" id="filterToDate" title="Đến ngày (Bắt đầu)" />
        </div>
      </div>

      <!-- Bảng danh sách -->
      <div class="table-responsive">
        <table class="table table-hover align-middle contracts-table" data-testid="contracts-table">
          <thead class="table-light">
            <tr>
              <th>Mã HĐ</th>
              <th>Phòng</th>
              <th>Người đại diện</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Giá thuê</th>
              <th>Tiền cọc</th>
              <th>Trạng thái</th>
              <th class="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody id="contractsTableBody" data-testid="contracts-table-body">
          </tbody>
        </table>
      </div>
      <div id="paginationContainer" class="mt-3"></div>

      <div id="contractsEmpty" class="text-muted text-center d-none p-4" data-testid="contracts-empty">
        Không tìm thấy hợp đồng nào phù hợp bộ lọc.
      </div>
    </div>
  `;

  // Populate room filter
  populateRoomFilter();

  // Render data
  renderStats();
  renderExpiringAlert();
  renderContractsList();

  // Event listeners
  bindEvents(container);
}

// ─── STATISTICS ────────────────────────────────────────────────
function renderStats() {
  const el = document.getElementById('statsContainer');
  if (!el) return;

  const allContracts = getContracts();
  const activeCount = allContracts.filter(c => c.status === CONTRACT_STATUS.ACTIVE).length;
  const expiringCount = getExpiringContracts(30).length;
  const expiredCount = allContracts.filter(c => c.status === CONTRACT_STATUS.EXPIRED).length;
  const cancelledCount = allContracts.filter(c => c.status === CONTRACT_STATUS.TERMINATED).length;

  el.innerHTML = `
    <div class="col-6 col-md-3">
      <div class="card text-bg-primary">
        <div class="card-body p-2">
          <h6 class="card-title text-uppercase text-white-50 mb-1" style="font-size: 0.75rem;">Đang hiệu lực</h6>
          <h3 class="mb-0">${activeCount}</h3>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card text-bg-warning">
        <div class="card-body p-2">
          <h6 class="card-title text-uppercase text-dark-50 mb-1" style="font-size: 0.75rem;">Sắp hết hạn</h6>
          <h3 class="mb-0 text-dark">${expiringCount}</h3>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card text-bg-secondary">
        <div class="card-body p-2">
          <h6 class="card-title text-uppercase text-white-50 mb-1" style="font-size: 0.75rem;">Hết hạn</h6>
          <h3 class="mb-0">${expiredCount}</h3>
        </div>
      </div>
    </div>
    <div class="col-6 col-md-3">
      <div class="card text-bg-danger">
        <div class="card-body p-2">
          <h6 class="card-title text-uppercase text-white-50 mb-1" style="font-size: 0.75rem;">Đã hủy/Thanh lý</h6>
          <h3 class="mb-0">${cancelledCount}</h3>
        </div>
      </div>
    </div>
  `;
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
  const options = rooms.map(r => {
    const nameText = r.name.startsWith('Phòng') ? r.name : 'Phòng ' + r.name;
    const statusText = ROOM_STATUS_LABELS[r.status] || r.status;
    return `<option value="${r.id}">${nameText} (${statusText})</option>`;
  }).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;

  initSearchableSelect(filterRoom);
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
  if (currentFilters.fromDate) {
    contracts = contracts.filter(c => c.startDate >= currentFilters.fromDate);
  }
  if (currentFilters.toDate) {
    contracts = contracts.filter(c => c.startDate <= currentFilters.toDate);
  }

  // Sort: Theo ngày tạo mới nhất lên đầu
  const originalContracts = getContracts();
  const indexMap = new Map(originalContracts.map((c, i) => [c.id, i]));

  contracts.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    
    if (timeA !== timeB) {
      return timeB - timeA;
    }
    
    const idxA = indexMap.has(a.id) ? indexMap.get(a.id) : 0;
    const idxB = indexMap.has(b.id) ? indexMap.get(b.id) : 0;
    return idxB - idxA;
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
  const paginationContainer = document.getElementById('paginationContainer');
  if (!tbody) return;

  const allFiltered = getFilteredContracts();

  if (allFiltered.length === 0) {
    tbody.innerHTML = '';
    if (emptyEl) {
      const hasFilters = currentKeyword || currentFilters.roomId || currentFilters.status || currentFilters.startDate || currentFilters.endDate;
      emptyEl.innerHTML = renderEmptyState(hasFilters ? 'no-results' : 'no-contracts', {
        actionId: hasFilters ? 'btnEmptyActionClearFilters' : 'btnEmptyActionAddContract',
        actionText: hasFilters ? '🧹 Xóa các bộ lọc tìm kiếm' : '📝 Lập hợp đồng mới'
      });
      emptyEl.classList.remove('d-none');
    }
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  // Phân trang
  const totalPages = Math.ceil(allFiltered.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const list = allFiltered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  tbody.innerHTML = list.map(c => {
    const room = getRoomById(c.roomId);
    const tenant = getTenantById(c.tenantId);
    const roomName = room ? `<strong>${room.name}</strong>` : 'N/A';
    const tenantName = tenant ? tenant.fullName : 'N/A';
    const expiring = isContractExpiringSoon(c, new Date(), 30);
    const rowClass = expiring ? 'table-warning' : ''; // Làm nổi bật dòng sắp hết hạn

    // Action buttons depend on status
    const actions = buildActionButtons(c);

    return `
      <tr class="${rowClass}" data-testid="contract-row-${c.id}" data-id="${c.id}">
        <td>
          <a href="#" class="btn-view-contract fw-bold text-decoration-none" data-id="${c.id}" data-testid="btn-view-contract-${c.id}">
            ${c.id.substring(0, 8).toUpperCase()}
          </a>
        </td>
        <td>${roomName}</td>
        <td>${tenantName}</td>
        <td>${c.startDate ? formatDateToDisplay(c.startDate) : 'N/A'}</td>
        <td>
          ${c.endDate ? formatDateToDisplay(c.endDate) : 'N/A'}
          ${expiring ? '<span class="badge bg-danger ms-1" title="Sắp hết hạn">⏰</span>' : ''}
        </td>
        <td>${formatCurrency(c.roomPrice)}</td>
        <td>${formatCurrency(c.deposit)}</td>
        <td>${getStatusBadge(c.status)}</td>
        <td class="text-end">
          <div class="dropdown">
            <button class="btn btn-light btn-sm rounded-circle p-1" type="button" data-bs-toggle="dropdown" data-bs-boundary="window" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              ${actions}
            </ul>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (paginationContainer) {
    paginationContainer.innerHTML = renderPagination(currentPage, allFiltered.length, ITEMS_PER_PAGE);
  }
}

function buildActionButtons(contract) {
  const btns = [];

  // Xem chi tiết – always available
  btns.push(`<li><a class="dropdown-item btn-action-view" href="#" data-action="view" data-id="${contract.id}"><i class="bi bi-eye text-primary me-2"></i> Xem chi tiết</a></li>`);

  if (contract.status === CONTRACT_STATUS.ACTIVE) {
    // Sửa
    btns.push(`<li><a class="dropdown-item btn-action-edit" href="#" data-action="edit" data-id="${contract.id}"><i class="bi bi-pencil me-2"></i> Sửa thông tin</a></li>`);
    // Gia hạn
    btns.push(`<li><a class="dropdown-item btn-action-extend" href="#" data-action="extend" data-id="${contract.id}"><i class="bi bi-calendar-plus text-success me-2"></i> Gia hạn hợp đồng</a></li>`);
    btns.push(`<li><hr class="dropdown-divider"></li>`);
    // Kết thúc
    btns.push(`<li><a class="dropdown-item btn-action-end text-warning" href="#" data-action="end" data-id="${contract.id}"><i class="bi bi-check2-square me-2"></i> Kết thúc bình thường</a></li>`);
    // Hủy
    btns.push(`<li><a class="dropdown-item btn-action-cancel text-danger" href="#" data-action="cancel" data-id="${contract.id}"><i class="bi bi-x-circle me-2"></i> Hủy / Thanh lý sớm</a></li>`);
  }

  if (contract.status === CONTRACT_STATUS.EXPIRED) {
    // Kích hoạt lại
    btns.push(`<li><a class="dropdown-item btn-action-activate text-success" href="#" data-action="activate" data-id="${contract.id}"><i class="bi bi-play-circle me-2"></i> Kích hoạt lại</a></li>`);
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
    searchInput.value = currentKeyword;
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
      currentPage = 1;
      renderContractsList();
    });
  }

  // Filter From Date
  const filterFromDate = document.getElementById('filterFromDate');
  if (filterFromDate) {
    filterFromDate.addEventListener('change', () => {
      currentFilters.fromDate = filterFromDate.value || undefined;
      currentPage = 1;
      renderContractsList();
    });
  }

  // Filter To Date
  const filterToDate = document.getElementById('filterToDate');
  if (filterToDate) {
    filterToDate.addEventListener('change', () => {
      currentFilters.toDate = filterToDate.value || undefined;
      currentPage = 1;
      renderContractsList();
    });
  }

  // Pagination delegation
  const paginationContainer = document.getElementById('paginationContainer');
  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const pageLink = e.target.closest('.btn-page');
      if (pageLink) {
        e.preventDefault();
        const page = parseInt(pageLink.dataset.page);
        if (!isNaN(page)) {
          currentPage = page;
          renderContractsList();
        }
      }
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

  // Xử lý Empty State click actions
  const emptyEl = document.getElementById('contractsEmpty');
  if (emptyEl) {
    emptyEl.addEventListener('click', (e) => {
      const btnAdd = e.target.closest('#btnEmptyActionAddContract');
      if (btnAdd) {
        e.preventDefault();
        document.getElementById('btnAddContract')?.click();
      }
      const btnClear = e.target.closest('#btnEmptyActionClearFilters');
      if (btnClear) {
        e.preventDefault();
        currentKeyword = '';
        currentFilters = {};
        currentPage = 1;

        const searchInput = document.getElementById('contractSearch');
        if (searchInput) searchInput.value = '';
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) filterStatus.value = '';
        
        const filterRoom = document.getElementById('filterRoom');
        if (filterRoom) {
          filterRoom.value = '';
          if (filterRoom.dataset.searchableSelectInitialized) {
            import('../components/searchable-select.js').then(SS => {
              SS.initSearchableSelect(filterRoom);
            });
          }
        }
        
        const filterFromDate = document.getElementById('filterFromDate');
        if (filterFromDate) filterFromDate.value = '';
        const filterToDate = document.getElementById('filterToDate');
        if (filterToDate) filterToDate.value = '';

        renderContractsList();
      }
    });
  }
}

// ─── ACTION HANDLERS ───────────────────────────────────────────

function handleView(id) {
  const contract = getContractById(id);
  if (contract) {
    openContractDetail({
      contract,
      onExtend: () => handleExtend(id),
      onEnd: () => handleEnd(id),
      onPrint: () => {
        const r = getRoomById(contract.roomId);
        const t = getTenantById(contract.tenantId);
        const coT = Array.isArray(contract.coTenantIds)
          ? contract.coTenantIds.map(cid => getTenantById(cid)).filter(Boolean)
          : [];
        printContract(contract, r, t, coT);
      }
    });
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
