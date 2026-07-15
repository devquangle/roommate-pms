// src/pages/tenants-page.js

/**
 * Trang quản lý người thuê (Tenants).
 * Cho phép xem danh sách, tìm kiếm, lọc theo trạng thái, thêm, sửa, lưu trữ (archive), xóa và xem lịch sử thuê của khách trọ.
 */

import '../styles/tenants.css';

import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  archiveTenant,
  deleteTenant,
  searchTenants,
  getTenantRentalHistory,
  getCurrentRoomOfTenant
} from '../services/tenant-service.js';

import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openTenantForm } from '../components/tenant-form.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = '';
let showArchived = false; // Mặc định chỉ hiện khách hàng hoạt động (active)

export function renderTenantsPage(container) {
  currentKeyword = '';
  showArchived = false;

  container.innerHTML = `
    <div data-testid="tenants-page">
      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Quản lý khách thuê</h4>
        <button class="btn btn-primary btn-sm" id="btnAddTenant" data-testid="btn-add-tenant">
          + Thêm khách thuê
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <!-- Tìm kiếm -->
        <input type="text" class="form-control form-control-sm" style="max-width: 250px;" id="tenantSearch" data-testid="input-search-tenant"
          placeholder="Tìm theo họ tên, SĐT, CCCD..." />

        <!-- Lọc trạng thái lưu trữ -->
        <div class="form-check form-switch ms-2">
          <input class="form-check-input" type="checkbox" id="filterArchived" data-testid="filter-archived" />
          <label class="form-check-label small" for="filterArchived">Hiển thị cả khách đã rời (Lưu trữ)</label>
        </div>
      </div>

      <!-- Bảng danh sách người thuê -->
      <div class="table-responsive">
        <table class="table table-hover align-middle" data-testid="tenants-table">
          <thead class="table-light">
            <tr>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>Số CCCD</th>
              <th>Email</th>
              <th>Phòng hiện tại</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="tenantsTableBody" data-testid="tenants-table-body">
          </tbody>
        </table>
      </div>

      <div id="tenantsEmpty" class="text-muted text-center d-none p-4" data-testid="tenants-empty">
        Không tìm thấy khách thuê nào.
      </div>
    </div>
  `;

  renderTenantsList();
  bindEvents();
}

// ─── RENDER LIST ───────────────────────────────────────────────

function getProcessedTenants() {
  const options = { includeArchived: showArchived };

  if (currentKeyword) {
    return searchTenants(currentKeyword, options);
  }
  return getTenants(options);
}

function renderTenantsList() {
  const tbody = document.getElementById('tenantsTableBody');
  const emptyEl = document.getElementById('tenantsEmpty');
  if (!tbody) return;

  const list = getProcessedTenants();

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    // Tìm phòng hiện tại
    const currentRoom = getCurrentRoomOfTenant(item.id);
    const roomName = currentRoom ? `<strong>Phòng ${currentRoom.room.name}</strong>` : '<span class="text-muted small">Chưa thuê</span>';

    const isInactive = item.status === 'inactive';
    const statusBadge = isInactive
      ? '<span class="badge badge-tenant-inactive">Đã rời (Lưu trữ)</span>'
      : '<span class="badge badge-tenant-active">Đang thuê</span>';

    // Nút lưu trữ (chỉ hiện khi khách còn đang active)
    const archiveBtn = !isInactive
      ? `<button class="btn btn-outline-warning btn-sm btn-archive-tenant" data-id="${item.id}" data-testid="btn-archive-tenant-${item.id}" title="Lưu trữ khách trọ">⏸</button>`
      : '';

    return `
      <tr data-testid="tenant-row-${item.id}">
        <td><strong>${item.fullName}</strong></td>
        <td>${item.phone || '<span class="text-muted small">Chưa có thông tin</span>'}</td>
        <td><code>${item.idCard || 'Chưa có thông tin'}</code></td>
        <td><span class="small">${item?.email || 'Chưa có thông tin'}</span></td>
        <td>${roomName}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group gap-1">
            <!-- Xem lịch sử thuê -->
            <button class="btn btn-outline-info btn-sm btn-history-tenant" data-id="${item.id}" data-testid="btn-history-tenant-${item.id}" title="Lịch sử thuê phòng">📜</button>
            <!-- Sửa -->
            <button class="btn btn-outline-primary btn-sm btn-edit-tenant" data-id="${item.id}" data-testid="btn-edit-tenant-${item.id}" title="Sửa thông tin">✏️</button>
            <!-- Lưu trữ -->
            ${archiveBtn}
            <!-- Xóa -->
            <button class="btn btn-outline-danger btn-sm btn-delete-tenant" data-id="${item.id}" data-testid="btn-delete-tenant-${item.id}" title="Xóa vĩnh viễn">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Thêm khách thuê
  const btnAdd = document.getElementById('btnAddTenant');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openTenantForm({
        tenant: null,
        onSave: (data) => {
          createTenant(data);
          showToast('Thêm khách thuê thành công!', 'success');
          renderTenantsList();
        }
      });
    });
  }

  // Tìm kiếm
  const searchInput = document.getElementById('tenantSearch');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentKeyword = searchInput.value.trim();
        renderTenantsList();
      }, 300);
    });
  }

  // Lọc lưu trữ
  const filterArchived = document.getElementById('filterArchived');
  if (filterArchived) {
    filterArchived.addEventListener('change', () => {
      showArchived = filterArchived.checked;
      renderTenantsList();
    });
  }

  // Table action delegation
  const tbody = document.getElementById('tenantsTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-history-tenant')) {
        handleHistory(id);
      } else if (btn.classList.contains('btn-edit-tenant')) {
        handleEdit(id);
      } else if (btn.classList.contains('btn-archive-tenant')) {
        handleArchive(id);
      } else if (btn.classList.contains('btn-delete-tenant')) {
        handleDelete(id);
      }
    });
  }
}

// ─── ACTION HANDLERS ───────────────────────────────────────────

function handleHistory(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  const history = getTenantRentalHistory(id);
  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  let historyHtml = '<p class="text-muted small text-center p-3">Chưa có lịch sử hợp đồng thuê phòng nào.</p>';
  if (history.length > 0) {
    historyHtml = `
      <div class="rental-history-list" style="max-height: 300px; overflow-y: auto;">
        ${history.map(h => {
          const roomName = h.room ? h.room.name : 'Chưa có thông tin';
          const isActive = h.contract.status === 'active';
          const badgeLabel = isActive ? 'Đang thuê' : (h.contract.status === 'expired' ? 'Đã hết hạn' : 'Đã thanh lý');
          const badgeClass = isActive ? 'bg-success' : 'bg-secondary';

          return `
            <div class="rental-history-item ${isActive ? 'history-active' : ''}">
              <div class="d-flex justify-content-between mb-1 fw-bold">
                <span>Phòng ${roomName}</span>
                <span class="badge ${badgeClass}">${badgeLabel}</span>
              </div>
              <div class="small text-muted">
                • Thời gian: ${formatDateToDisplay(h.contract.startDate)} - ${formatDateToDisplay(h.contract.endDate)}<br>
                • Giá thuê: ${formatCurrency(h.contract.roomPrice)} / tháng<br>
                • Tiền cọc: ${formatCurrency(h.contract.deposit)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="modal fade" id="tenantHistoryModal" tabindex="-1" aria-hidden="true" data-testid="tenant-history-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="tenant-history-title">Lịch sử thuê phòng - ${tenant.fullName}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ${historyHtml}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-testid="btn-history-close">Đóng lại</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('tenantHistoryModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}

function handleEdit(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  openTenantForm({
    tenant,
    onSave: (data) => {
      updateTenant(id, data);
      showToast('Cập nhật thông tin khách thuê thành công!', 'success');
      renderTenantsList();
    }
  });
}

function handleArchive(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  showConfirmDialog(
    'Lưu trữ thông tin khách',
    `Bạn có chắc chắn muốn lưu trữ khách thuê <strong>${tenant.fullName}</strong> không? Khách sẽ được đánh dấu đã rời và ẩn khỏi danh sách chính.`,
    () => {
      try {
        archiveTenant(id);
        showToast('Đã lưu trữ hồ sơ khách thuê.', 'success');
        renderTenantsList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleDelete(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  showConfirmDialog(
    'Xóa khách thuê',
    `Bạn có chắc chắn muốn xóa vĩnh viễn khách thuê <strong>${tenant.fullName}</strong> không? Thao tác này không thể hoàn tác.`,
    () => {
      try {
        deleteTenant(id);
        showToast('Xóa khách thuê thành công.', 'success');
        renderTenantsList();
      } catch (err) {
        // Hiển thị lỗi từ service (bao gồm gợi ý lưu trữ thay vì xóa khi có hợp đồng đang trói buộc)
        showToast(err.message, 'danger');
      }
    }
  );
}
