// src/pages/services-page.js

/**
 * Trang quản lý cấu hình dịch vụ.
 * Cho phép xem danh sách, tìm kiếm, lọc, thêm mới, cập nhật, ngưng áp dụng/kích hoạt lại, và xóa.
 */

import {
  getServiceConfigs,
  getServiceConfigById,
  createServiceConfig,
  updateServiceConfig,
  deleteServiceConfig,
  deactivateServiceConfig,
  activateServiceConfig,
  searchServiceConfigs,
  filterServiceConfigs
} from '../services/service-config-service.js';

import { CALC_METHOD_LABELS } from '../business/service-config-validator.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openServiceConfigForm } from '../components/service-config-form.js';

let currentKeyword = '';
let currentFilters = {};

export function renderServicesPage(container) {
  currentKeyword = '';
  currentFilters = {};

  container.innerHTML = `
    <div data-testid="services-page">
      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Cấu hình dịch vụ</h4>
        <button class="btn btn-primary btn-sm" id="btnAddService" data-testid="btn-add-service">
          + Thêm dịch vụ
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="d-flex flex-wrap align-items-center mb-3 gap-2">
        <input type="text" class="form-control form-control-sm" style="max-width: 250px;" id="serviceSearch" data-testid="input-search-service"
          placeholder="Tìm theo mã, tên dịch vụ..." />

        <select class="form-select form-select-sm" style="max-width: 180px;" id="filterServiceStatus" data-testid="filter-service-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang áp dụng</option>
          <option value="inactive">Ngưng áp dụng</option>
        </select>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-hover align-middle" data-testid="services-table">
          <thead class="table-light">
            <tr>
              <th>Mã dịch vụ</th>
              <th>Tên dịch vụ</th>
              <th>Cách tính</th>
              <th>Đơn giá</th>
              <th>Đơn vị</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="servicesTableBody" data-testid="services-table-body">
          </tbody>
        </table>
      </div>

      <div id="servicesEmpty" class="text-muted text-center d-none p-4" data-testid="services-empty">
        Không tìm thấy dịch vụ nào phù hợp.
      </div>
    </div>
  `;

  renderServicesList();
  bindEvents();
}

function getFilteredServices() {
  let list;
  if (currentKeyword) {
    list = searchServiceConfigs(currentKeyword);
  } else {
    list = getServiceConfigs();
  }

  if (currentFilters.status) {
    list = list.filter(item => item.status === currentFilters.status);
  }

  return list;
}

function renderServicesList() {
  const tbody = document.getElementById('servicesTableBody');
  const emptyEl = document.getElementById('servicesEmpty');
  if (!tbody) return;

  const list = getFilteredServices();

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    const calcMethodLabel = CALC_METHOD_LABELS[item.calcMethod] || item.calcMethod;
    const isInactive = item.status === 'inactive';
    const statusBadge = isInactive
      ? '<span class="badge bg-secondary">Ngưng áp dụng</span>'
      : '<span class="badge bg-success">Đang áp dụng</span>';

    // Xây dựng các nút thao tác
    const editBtn = `<button class="btn btn-outline-primary btn-sm btn-edit-service" data-id="${item.id}" data-testid="btn-edit-service-${item.id}" title="Sửa">✏️</button>`;
    const toggleStatusBtn = isInactive
      ? `<button class="btn btn-outline-success btn-sm btn-activate-service" data-id="${item.id}" data-testid="btn-activate-service-${item.id}" title="Kích hoạt lại">▶️</button>`
      : `<button class="btn btn-outline-warning btn-sm btn-deactivate-service" data-id="${item.id}" data-testid="btn-deactivate-service-${item.id}" title="Ngưng áp dụng">⏸</button>`;
    const deleteBtn = `<button class="btn btn-outline-danger btn-sm btn-delete-service" data-id="${item.id}" data-testid="btn-delete-service-${item.id}" title="Xóa">✕</button>`;

    return `
      <tr data-testid="service-row-${item.id}">
        <td><strong>${item.code || item.id}</strong></td>
        <td>${item.name}</td>
        <td>${calcMethodLabel}</td>
        <td>${formatCurrency(item.unitPrice)}</td>
        <td>${item.unit}</td>
        <td class="text-muted small">${item.description || ''}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="btn-group gap-1">
            ${editBtn}
            ${toggleStatusBtn}
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function bindEvents() {
  const btnAdd = document.getElementById('btnAddService');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openServiceConfigForm({
        config: null,
        onSave: (data) => {
          createServiceConfig(data);
          showToast('Thêm dịch vụ thành công!', 'success');
          renderServicesList();
        }
      });
    });
  }

  // Search input
  const searchInput = document.getElementById('serviceSearch');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentKeyword = searchInput.value.trim();
        renderServicesList();
      }, 300);
    });
  }

  // Filter Status
  const filterStatus = document.getElementById('filterServiceStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentFilters.status = filterStatus.value || undefined;
      renderServicesList();
    });
  }

  // Table actions delegation
  const tbody = document.getElementById('servicesTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-edit-service')) {
        handleEdit(id);
      } else if (btn.classList.contains('btn-deactivate-service')) {
        handleDeactivate(id);
      } else if (btn.classList.contains('btn-activate-service')) {
        handleActivate(id);
      } else if (btn.classList.contains('btn-delete-service')) {
        handleDelete(id);
      }
    });
  }
}

function handleEdit(id) {
  const config = getServiceConfigById(id);
  if (!config) return;

  openServiceConfigForm({
    config,
    onSave: (data) => {
      updateServiceConfig(id, data);
      showToast('Cập nhật dịch vụ thành công!', 'success');
      renderServicesList();
    }
  });
}

function handleDeactivate(id) {
  const config = getServiceConfigById(id);
  if (!config) return;

  showConfirmDialog(
    'Ngưng áp dụng dịch vụ',
    `Bạn có chắc chắn muốn ngưng áp dụng dịch vụ <strong>${config.name}</strong> không? Các hóa đơn hiện tại sẽ không bị ảnh hưởng.`,
    () => {
      try {
        deactivateServiceConfig(id);
        showToast('Đã ngưng áp dụng dịch vụ.', 'success');
        renderServicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleActivate(id) {
  const config = getServiceConfigById(id);
  if (!config) return;

  showConfirmDialog(
    'Kích hoạt lại dịch vụ',
    `Bạn có chắc chắn muốn kích hoạt lại dịch vụ <strong>${config.name}</strong>?`,
    () => {
      try {
        activateServiceConfig(id);
        showToast('Kích hoạt lại dịch vụ thành công.', 'success');
        renderServicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}

function handleDelete(id) {
  const config = getServiceConfigById(id);
  if (!config) return;

  showConfirmDialog(
    'Xóa dịch vụ',
    `Bạn có chắc chắn muốn xóa vĩnh viễn dịch vụ <strong>${config.name}</strong>? Thao tác này không thể hoàn tác.`,
    () => {
      try {
        deleteServiceConfig(id);
        showToast('Xóa dịch vụ thành công.', 'success');
        renderServicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}
