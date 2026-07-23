// src/pages/tenants-page.js

/**
 * Trang quản lý người thuê (Tenants).
 * Cho phép xem danh sách, tìm kiếm, lọc theo trạng thái, thêm, sửa, lưu trữ (archive), xóa và xem lịch sử thuê của khách trọ.
 */

import "../styles/tenants.css";

import {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  archiveTenant,
  deleteTenant,
  searchTenants,
  getTenantRentalHistory,
  getCurrentRoomOfTenant,
} from "../services/tenant-service.js";

import { formatCurrency } from "../utils/currency-utils.js";
import { formatDateToDisplay } from "../utils/date-utils.js";
import { showToast } from "../components/toast.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { openTenantForm } from "../components/tenant-form.js";
import { openTenantProfile } from "../components/tenant-profile.js";
import { renderPagination } from "../components/pagination.js";
import { renderEmptyState } from "../components/empty-state.js";
import { getRooms } from "../services/room-service.js";
import { initSearchableSelect } from "../components/searchable-select.js";
import { ROOM_STATUS_LABELS } from "../constants/statuses.js";
import { renderTenantsTableRowsSkeleton } from "../components/loading-state.js";
import { openContractDetail } from "../components/contract-detail.js";

// ─── STATE ─────────────────────────────────────────────────────
let currentKeyword = "";
let currentStatus = ""; // '' | 'active' | 'inactive'
let currentRoomId = "";
let currentPage = 1;
const ITEMS_PER_PAGE = 8;

export function renderTenantsPage(container) {
  currentKeyword = "";
  currentStatus = "";
  currentRoomId = "";
  currentPage = 1;

  const rooms = getRooms();
  const roomOptions = rooms
    .map((r) => {
      const nameText = r.name.startsWith("Phòng") ? r.name : "Phòng " + r.name;
      const statusText = ROOM_STATUS_LABELS[r.status] || r.status;
      return `<option value="${r.id}">${nameText} (${statusText})</option>`;
    })
    .join("");

  container.innerHTML = `
    <div data-testid="tenants-page">
      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
        <div>
          <h4 class="mb-1">Quản lý người thuê</h4>
          <p class="text-muted small mb-0">Theo dõi trạng thái và thông tin khách thuê phòng</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btnAddTenant" data-testid="btn-add-tenant">
          <i class="bi bi-person-plus"></i> Thêm người thuê
        </button>
      </div>

      <!-- Filters & Search -->
      <div class="d-flex flex-wrap align-items-center gap-3 mb-4 p-3 bg-white border rounded ">
        <!-- Tìm kiếm -->
        <input type="text" class="form-control form-control-sm" style="max-width: 250px;" id="tenantSearch" data-testid="input-search-tenant"
          placeholder="Tìm theo họ tên, SĐT, CCCD..." />

        <!-- Lọc trạng thái -->
        <select class="form-select form-select-sm" style="width: auto;" id="filterStatus" data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang thuê</option>
          <option value="inactive">Đã rời đi (Lưu trữ)</option>
        </select>

        <!-- Lọc phòng -->
        <select class="form-select form-select-sm" style="width: auto;" id="filterRoom" data-testid="filter-room">
          <option value="">Tất cả phòng</option>
          ${roomOptions}
        </select>
      </div>

      <!-- Bảng danh sách người thuê -->
      <div class="table-responsive">
        <table class="table table-hover align-middle m-0" data-testid="tenants-table">
          <thead class="table-light">
            <tr>
              <th width="50"></th>
              <th>Họ và tên</th>
              <th>Số điện thoại</th>
              <th>CCCD</th>
              <th>Phòng hiện tại</th>
              <th>Ngày vào ở</th>
              <th>Trạng thái</th>
              <th class="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody id="tenantsTableBody" data-testid="tenants-table-body">
          </tbody>
        </table>
      
      </div>
        <div id="paginationContainer" class="p-3 bg-light border-top"></div>

      <div id="tenantsEmpty" class="text-muted text-center d-none p-4" data-testid="tenants-empty">
        Không tìm thấy khách thuê nào.
      </div>
    </div>
  `;

  renderTenantsList();
  bindEvents();

  const filterRoom = document.getElementById("filterRoom");
  if (filterRoom) {
    initSearchableSelect(filterRoom);
  }
}

// ─── RENDER LIST ───────────────────────────────────────────────

function getProcessedTenants() {
  const options = { includeArchived: true };
  let list = currentKeyword
    ? searchTenants(currentKeyword, options)
    : getTenants(options);

  if (currentStatus) {
    list = list.filter((t) => t.status === currentStatus);
  }

  // Cần lọc theo phòng (dựa vào currentRoom)
  if (currentRoomId) {
    list = list.filter((t) => {
      const room = getCurrentRoomOfTenant(t.id);
      return room && room.room.id === currentRoomId;
    });
  }

  // Sắp xếp mặc định theo ngày tạo mới nhất lên đầu
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return list;
}

function renderTenantsList() {
  const tbody = document.getElementById("tenantsTableBody");
  const emptyEl = document.getElementById("tenantsEmpty");
  const paginationContainer = document.getElementById("paginationContainer");
  if (!tbody) return;

  // Render skeleton loading
  tbody.innerHTML = renderTenantsTableRowsSkeleton();
  if (emptyEl) emptyEl.classList.add("d-none");
  if (paginationContainer) paginationContainer.innerHTML = "";

  setTimeout(() => {
    const allList = getProcessedTenants();

    if (allList.length === 0) {
      tbody.innerHTML = "";
      if (emptyEl) {
        const hasFilters = currentKeyword || currentStatus || currentRoomId;
        emptyEl.innerHTML = renderEmptyState(
          hasFilters ? "no-results" : "no-tenants",
          {
            actionId: hasFilters
              ? "btnEmptyActionClearFilters"
              : "btnEmptyActionAddTenant",
            actionText: hasFilters
              ? "🧹 Xóa các bộ lọc tìm kiếm"
              : "👤 Thêm khách thuê mới",
          },
        );
        emptyEl.classList.remove("d-none");
      }
      if (paginationContainer) paginationContainer.innerHTML = "";
      return;
    }

    emptyEl && emptyEl.classList.add("d-none");

    // Phân trang
    const totalPages = Math.ceil(allList.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const list = allList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    tbody.innerHTML = list
      .map((item) => {
        // Tìm phòng hiện tại và ngày vào ở
        const currentRoomInfo = getCurrentRoomOfTenant(item.id);
        const roomName = currentRoomInfo
          ? `<strong>${currentRoomInfo.room.name}</strong>`
          : '<span class="text-muted small">Không có phòng</span>';
        const moveInDate =
          currentRoomInfo && currentRoomInfo.contract
            ? formatDateToDisplay(currentRoomInfo.contract.startDate)
            : '<span class="text-muted small">—</span>';

        const isInactive = item.status === "inactive" || item.status === "archived";
        let statusBadge = "";
        if (isInactive) {
          statusBadge = '<span class="badge badge-tenant-inactive">Đã trả phòng</span>';
        } else if (currentRoomInfo) {
          statusBadge = '<span class="badge badge-tenant-active">Đang thuê</span>';
        } else {
          statusBadge = '<span class="badge badge-tenant-unassigned">Chưa có phòng</span>';
        }

        const initial = item.fullName.charAt(0).toUpperCase();

        return `
      <tr data-testid="tenant-row-${item.id}">
        <td>
          <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
            ${initial}
          </div>
        </td>
        <td><strong>${item.fullName}</strong></td>
        <td>${item.phone || '<span class="text-muted small">—</span>'}</td>
        <td>${item.idCard || '<span class="text-muted small">—</span>'}</td>
        <td>${roomName}</td>
        <td>${moveInDate}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <div class="dropdown">
            <button class="btn btn-light btn-sm rounded-circle p-1" type="button" data-bs-toggle="dropdown" data-bs-boundary="window" data-bs-popper-config='{"strategy":"fixed"}' aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li><a class="dropdown-item btn-action-tenant" href="#" data-action="view" data-id="${item.id}"><i class="bi bi-eye text-primary me-2"></i> Xem chi tiết</a></li>
              <li><a class="dropdown-item btn-action-tenant" href="#" data-action="edit" data-id="${item.id}"><i class="bi bi-pencil me-2"></i> Sửa</a></li>
              <li><a class="dropdown-item btn-action-tenant" href="#" data-action="contracts" data-id="${item.id}"><i class="bi bi-file-earmark-text text-success me-2"></i> Xem hợp đồng</a></li>
              <li><a class="dropdown-item btn-action-tenant" href="#" data-action="history" data-id="${item.id}"><i class="bi bi-clock-history text-info me-2"></i> Xem lịch sử</a></li>
              ${!isInactive ? `<li><hr class="dropdown-divider"></li><li><a class="dropdown-item btn-action-tenant text-warning" href="#" data-action="archive" data-id="${item.id}"><i class="bi bi-archive me-2"></i> Lưu trữ</a></li>` : ""}
            </ul>
          </div>
        </td>
      </tr>
    `;
      })
      .join("");

    if (paginationContainer) {
      paginationContainer.innerHTML = renderPagination(
        currentPage,
        allList.length,
        ITEMS_PER_PAGE,
      );
    }
  }, 300); // Giả lập độ trễ tải dữ liệu để hiển thị skeleton
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // Thêm khách thuê
  const btnAdd = document.getElementById("btnAddTenant");
  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      openTenantForm({
        tenant: null,
        onSave: (data) => {
          createTenant(data);
          showToast("Thêm khách thuê thành công!", "success");
          renderTenantsList();
        },
      });
    });
  }

  // Tìm kiếm
  const searchInput = document.getElementById("tenantSearch");
  if (searchInput) {
    let debounce;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        currentKeyword = searchInput.value.trim();
        currentPage = 1;
        renderTenantsList();
      }, 300);
    });
  }

  // Lọc trạng thái
  document.getElementById("filterStatus")?.addEventListener("change", (e) => {
    currentStatus = e.target.value;
    currentPage = 1;
    renderTenantsList();
  });

  // Lọc phòng
  document.getElementById("filterRoom")?.addEventListener("change", (e) => {
    currentRoomId = e.target.value;
    currentPage = 1;
    renderTenantsList();
  });

  // Table action delegation & Pagination
  const container = document.querySelector('[data-testid="tenants-page"]');
  if (container) {
    container.addEventListener("click", (e) => {
      // Phân trang
      const pageLink = e.target.closest(".btn-page");
      if (pageLink) {
        e.preventDefault();
        const page = parseInt(pageLink.dataset.page);
        if (!isNaN(page)) {
          currentPage = page;
          renderTenantsList();
        }
        return;
      }

      // Nút action
      const btn = e.target.closest(".btn-action-tenant");
      if (!btn) return;
      e.preventDefault();

      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (!id || !action) return;

      switch (action) {
        case "view":
          openTenantProfile(id);
          break;
        case "edit":
          handleEdit(id);
          break;
        case "contracts":
          handleContracts(id);
          break;
        case "history":
          handleHistory(id);
          break;
        case "archive":
          handleArchive(id);
          break;
      }
    });
  }

  // Xử lý Empty State click actions
  const emptyEl = document.getElementById("tenantsEmpty");
  if (emptyEl) {
    emptyEl.addEventListener("click", (e) => {
      const btnAdd = e.target.closest("#btnEmptyActionAddTenant");
      if (btnAdd) {
        e.preventDefault();
        document.getElementById("btnAddTenant")?.click();
      }
      const btnClear = e.target.closest("#btnEmptyActionClearFilters");
      if (btnClear) {
        e.preventDefault();
        currentKeyword = "";
        currentStatus = "";
        currentRoomId = "";
        currentPage = 1;

        const searchInput = document.getElementById("tenantSearch");
        if (searchInput) searchInput.value = "";
        const filterStatus = document.getElementById("filterStatus");
        if (filterStatus) filterStatus.value = "";

        // Reset room filter
        const filterRoom = document.getElementById("filterRoom");
        if (filterRoom) {
          filterRoom.value = "";
          // Cần cập nhật lại giá trị searchable select nếu có
          if (filterRoom.dataset.searchableSelectInitialized) {
            import("../components/searchable-select.js").then((SS) => {
              SS.initSearchableSelect(filterRoom);
            });
          }
        }

        renderTenantsList();
      }
    });
  }
}

// ─── ACTION HANDLERS ───────────────────────────────────────────

function handleContracts(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  const currentRoomInfo = getCurrentRoomOfTenant(id);
  if (currentRoomInfo && currentRoomInfo.contract) {
    openContractDetail({ contract: currentRoomInfo.contract });
    return;
  }

  const history = getTenantRentalHistory(id);
  if (history.length > 0 && history[0].contract) {
    openContractDetail({ contract: history[0].contract });
    return;
  }

  showToast(`Khách thuê "${tenant.fullName}" chưa có hợp đồng nào trong hệ thống.`, "info");
}

function handleHistory(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  const history = getTenantRentalHistory(id);
  const container = document.getElementById("confirm-dialog-container");
  if (!container) return;

  let historyHtml =
    '<p class="text-muted small text-center p-3">Chưa có lịch sử hợp đồng thuê phòng nào.</p>';
  if (history.length > 0) {
    historyHtml = `
      <div class="rental-history-list" style="max-height: 300px; overflow-y: auto;">
        ${history
          .map((h) => {
            const roomName = h.room ? h.room.name : "Chưa có thông tin";
            const isActive = h.contract.status === "active";
            const badgeLabel = isActive
              ? "Đang thuê"
              : h.contract.status === "expired"
                ? "Đã hết hạn"
                : "Đã thanh lý";
            const badgeClass = isActive ? "bg-success" : "bg-secondary";

            return `
            <div class="rental-history-item ${isActive ? "history-active" : ""}">
              <div class="d-flex justify-content-between mb-1 fw-bold">
                <span>${roomName.startsWith("Phòng") ? roomName : "Phòng " + roomName}</span>
                <span class="badge ${badgeClass}">${badgeLabel}</span>
              </div>
              <div class="small text-muted">
                • Thời gian: ${formatDateToDisplay(h.contract.startDate)} - ${formatDateToDisplay(h.contract.endDate)}<br>
                • Giá thuê: ${formatCurrency(h.contract.roomPrice)} / tháng<br>
                • Tiền cọc: ${formatCurrency(h.contract.deposit)}
              </div>
            </div>
          `;
          })
          .join("")}
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

  const modalEl = document.getElementById("tenantHistoryModal");
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  modalEl.addEventListener("hidden.bs.modal", () => {
    container.innerHTML = "";
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
      showToast("Cập nhật thông tin khách thuê thành công!", "success");
      renderTenantsList();
    },
  });
}

function handleArchive(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  showConfirmDialog(
    "Lưu trữ thông tin khách",
    `Bạn có chắc chắn muốn lưu trữ khách thuê <strong>${tenant.fullName}</strong> không? Khách sẽ được đánh dấu đã rời và ẩn khỏi danh sách chính.`,
    () => {
      try {
        archiveTenant(id);
        showToast("Đã lưu trữ hồ sơ khách thuê.", "success");
        renderTenantsList();
      } catch (err) {
        showToast(err.message, "danger");
      }
    },
  );
}

function handleDelete(id) {
  const tenant = getTenantById(id);
  if (!tenant) return;

  showConfirmDialog(
    "Xóa khách thuê",
    `Bạn có chắc chắn muốn xóa vĩnh viễn khách thuê <strong>${tenant.fullName}</strong> không? Thao tác này không thể hoàn tác.`,
    () => {
      try {
        deleteTenant(id);
        showToast("Xóa khách thuê thành công.", "success");
        renderTenantsList();
      } catch (err) {
        // Hiển thị lỗi từ service (bao gồm gợi ý lưu trữ thay vì xóa khi có hợp đồng đang trói buộc)
        showToast(err.message, "danger");
      }
    },
  );
}
