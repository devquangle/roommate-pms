// src/pages/services-page.js

/**
 * Trang quản lý cấu hình dịch vụ.
 * Cho phép xem danh sách (có phân trang), tìm kiếm, lọc, thêm mới, cập nhật, ngưng áp dụng/kích hoạt lại, và xóa.
 */

import {
  getServiceConfigs,
  getServiceConfigById,
  createServiceConfig,
  updateServiceConfig,
  deleteServiceConfig,
  deactivateServiceConfig,
  activateServiceConfig,
  searchServiceConfigs
} from '../services/service-config-service.js';

import { CALC_METHOD_LABELS } from '../business/service-config-validator.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openServiceConfigForm } from '../components/service-config-form.js';
import { renderPagination } from '../components/pagination.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = '';
let currentFilters = {};
let currentPage = 1;
const ITEMS_PER_PAGE = 5; // Có 6 dịch vụ mẫu mặc định, 5 items/trang giúp thể hiện phân trang rõ ràng

export function renderServicesPage(container) {
  currentKeyword = '';
  currentFilters = {};
  currentPage = 1;

  container.innerHTML = `
    <div data-testid="services-page">
      <!-- Banner Cảnh báo thay đổi đơn giá -->
      <div class="alert alert-warning border-0 shadow-sm d-flex align-items-center mb-4 p-3 rounded" role="alert" data-testid="services-warning-alert">
        <i class="bi bi-exclamation-triangle-fill fs-5 text-warning me-3"></i>
        <div>
          <strong class="text-dark">Lưu ý quan trọng:</strong> 
          <span class="text-muted small">Thay đổi đơn giá dịch vụ tại đây sẽ chỉ áp dụng cho các hóa đơn lập mới. Thay đổi này <strong>không làm thay đổi hóa đơn đã chốt</strong> từ trước.</span>
        </div>
      </div>

      <!-- Toolbar hành động -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <h4 class="mb-0 fw-bold text-dark">Cấu hình dịch vụ</h4>
        <button class="btn btn-primary btn-sm d-flex align-items-center gap-1" id="btnAddService" data-testid="btn-add-service">
          <i class="bi bi-plus-circle"></i> Thêm dịch vụ
        </button>
      </div>

      <!-- Bộ lọc và Tìm kiếm -->
      <div class="d-flex flex-wrap align-items-center gap-3 mb-4 p-3 bg-white border rounded shadow-sm">
        <div style="flex: 1; min-width: 250px;">
          <input type="text" class="form-control form-control-sm" id="serviceSearch" data-testid="input-search-service"
            placeholder="Tìm theo mã hoặc tên dịch vụ..." />
        </div>
        <div style="width: 200px;">
          <select class="form-select form-select-sm" id="filterServiceStatus" data-testid="filter-service-status">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang áp dụng</option>
            <option value="inactive">Ngưng áp dụng</option>
          </select>
        </div>
      </div>

      <!-- Bảng cấu hình dịch vụ -->
      <div class="card border-0 shadow-sm rounded overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0" data-testid="services-table">
            <thead class="table-light border-bottom">
              <tr>
                <th style="min-width: 110px;">Mã dịch vụ</th>
                <th style="min-width: 140px;">Tên dịch vụ</th>
                <th>Cách tính</th>
                <th>Đơn vị</th>
                <th class="text-end">Đơn giá</th>
                <th class="text-center">Ngày áp dụng</th>
                <th class="text-center">Trạng thái</th>
                <th class="text-center" style="min-width: 130px;">Thao tác</th>
              </tr>
            </thead>
            <tbody id="servicesTableBody" data-testid="services-table-body">
            </tbody>
          </table>
        </div>
      </div>

      <!-- Phân trang container -->
      <div id="paginationContainer" class="mt-3"></div>

      <div id="servicesEmpty" class="text-muted text-center d-none p-5 bg-white border rounded shadow-sm mt-3" data-testid="services-empty">
        <i class="bi bi-clipboard-x fs-1 text-muted mb-2"></i>
        <p class="mb-0">Không tìm thấy dịch vụ nào phù hợp với bộ lọc.</p>
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

  // Sắp xếp theo ngày tạo (createdAt) giảm dần (mới nhất lên đầu)
  list.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return list;
}

function renderServicesList() {
  const tbody = document.getElementById('servicesTableBody');
  const emptyEl = document.getElementById('servicesEmpty');
  const paginationContainer = document.getElementById('paginationContainer');
  if (!tbody) return;

  const list = getFilteredServices();
  const totalItems = list.length;

  if (totalItems === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  // Phân trang dữ liệu dạng mảng slice
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const pageList = list.slice(start, end);

  tbody.innerHTML = pageList.map(item => {
    let calcMethodLabel = CALC_METHOD_LABELS[item.calcMethod] || item.calcMethod;
    if (!calcMethodLabel) {
      if (item.type === 'electricity' || item.type === 'water') {
        calcMethodLabel = 'Theo lượng sử dụng';
      } else if (item.isPerRoom) {
        calcMethodLabel = 'Cố định theo phòng';
      } else if (item.isPerPerson) {
        calcMethodLabel = 'Theo số người';
      } else {
        calcMethodLabel = 'Cố định theo phòng';
      }
    }
    const isInactive = item.status === 'inactive';
    const statusBadge = isInactive
      ? '<span class="badge bg-secondary px-2.5 py-1.5 rounded-pill small">Ngưng áp dụng</span>'
      : '<span class="badge bg-success px-2.5 py-1.5 rounded-pill small">Đang áp dụng</span>';

    // Định dạng ngày áp dụng
    const effectiveDate = item.startDate ? formatDateToDisplay(item.startDate) : (item.createdAt ? formatDateToDisplay(item.createdAt) : '01/12/2025');

    // Xây dựng các nút thao tác kích thước btn-sm
    const editBtn = `<button class="btn btn-outline-primary btn-sm btn-edit-service" data-id="${item.id}" data-testid="btn-edit-service-${item.id}" title="Sửa"><i class="bi bi-pencil"></i></button>`;
    const toggleStatusBtn = isInactive
      ? `<button class="btn btn-outline-success btn-sm btn-activate-service" data-id="${item.id}" data-testid="btn-activate-service-${item.id}" title="Kích hoạt lại"><i class="bi bi-play-fill"></i></button>`
      : `<button class="btn btn-outline-warning btn-sm btn-deactivate-service" data-id="${item.id}" data-testid="btn-deactivate-service-${item.id}" title="Ngưng áp dụng"><i class="bi bi-pause-fill"></i></button>`;
    const deleteBtn = `<button class="btn btn-outline-danger btn-sm btn-delete-service" data-id="${item.id}" data-testid="btn-delete-service-${item.id}" title="Xóa"><i class="bi bi-trash"></i></button>`;

    const displayCode = item.code || (item.type === 'electricity' ? 'DIEN' : (item.type === 'water' ? 'NUOC' : (item.type === 'wifi' ? 'WIFI' : (item.type === 'garbage' ? 'RAC' : item.id.toUpperCase()))));

    return `
      <tr data-testid="service-row-${item.id}">
        <td><strong>${displayCode}</strong></td>
        <td><strong>${item.name}</strong></td>
        <td>${calcMethodLabel}</td>
        <td>${item.unit}</td>
        <td class="text-end fw-bold text-dark">${formatCurrency(item.unitPrice)}</td>
        <td class="text-center text-muted small">${effectiveDate}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">
          <div class="btn-group gap-1">
            ${editBtn}
            ${toggleStatusBtn}
            ${deleteBtn}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Vẽ phân trang
  if (paginationContainer) {
    paginationContainer.innerHTML = renderPagination(currentPage, totalItems, ITEMS_PER_PAGE);
  }
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
          // Reset về trang 1 để thấy dòng mới thêm
          currentPage = 1;
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
        currentPage = 1; // Reset về trang đầu khi tìm kiếm
        renderServicesList();
      }, 300);
    });
  }

  // Filter Status
  const filterStatus = document.getElementById('filterServiceStatus');
  if (filterStatus) {
    filterStatus.addEventListener('change', () => {
      currentFilters.status = filterStatus.value || undefined;
      currentPage = 1; // Reset về trang đầu khi lọc
      renderServicesList();
    });
  }

  // Phân trang click delegation
  const paginationContainer = document.getElementById('paginationContainer');
  if (paginationContainer) {
    paginationContainer.addEventListener('click', (e) => {
      const pageLink = e.target.closest('.btn-page');
      if (pageLink) {
        e.preventDefault();
        const page = parseInt(pageLink.dataset.page);
        if (!isNaN(page)) {
          currentPage = page;
          renderServicesList();
        }
      }
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
        // Nếu xóa phần tử cuối cùng trên trang, lùi lại trang trước
        const list = getFilteredServices();
        const maxPages = Math.ceil(list.length / ITEMS_PER_PAGE);
        if (currentPage > maxPages && currentPage > 1) {
          currentPage = maxPages;
        }
        renderServicesList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}
