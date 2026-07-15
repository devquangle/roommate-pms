// src/components/contract-form.js

/**
 * Component form tạo/sửa hợp đồng.
 * Hiển thị trong Bootstrap Modal.
 * Gọi callback onSave khi lưu thành công.
 */

import { getRooms } from '../services/room-service.js';
import { getTenants } from '../services/tenant-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { ROOM_STATUS } from '../constants/statuses.js';

/**
 * Mở modal form hợp đồng.
 *
 * @param {Object} options
 * @param {Object|null} options.contract  - Hợp đồng cần sửa (null = tạo mới).
 * @param {Function}    options.onSave    - Callback khi form được submit hợp lệ, nhận data.
 */
export function openContractForm({ contract = null, onSave }) {
  const isEdit = !!contract;
  const title = isEdit ? 'Sửa hợp đồng' : 'Thêm hợp đồng mới';

  // Lấy danh sách phòng và người thuê
  const allRooms = getRooms();
  const allTenants = getTenants();

  // Phòng phù hợp: available HOẶC chính phòng đang được chọn (khi sửa)
  const eligibleRooms = allRooms.filter(r =>
    r.status === ROOM_STATUS.AVAILABLE ||
    (isEdit && r.id === contract.roomId)
  );

  // Người ở cùng đã chọn (khi sửa)
  let selectedCoTenants = [];
  if (isEdit && Array.isArray(contract.coTenantIds)) {
    selectedCoTenants = [...contract.coTenantIds];
  }

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="contractFormModal" tabindex="-1" aria-hidden="true" data-testid="contract-form-modal">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="contract-form-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="contractForm" class="contract-form" data-testid="contract-form" novalidate>
              <div id="contractFormError" class="alert alert-danger d-none" data-testid="contract-form-error"></div>

              <div class="row g-3">
                <!-- Chọn phòng -->
                <div class="col-md-6">
                  <label for="contractRoom" class="form-label">Phòng <span class="text-danger">*</span></label>
                  <select class="form-select" id="contractRoom" data-testid="select-room" required>
                    <option value="">-- Chọn phòng --</option>
                    ${eligibleRooms.map(r => `
                      <option value="${r.id}" ${isEdit && contract.roomId === r.id ? 'selected' : ''}>
                        ${r.name} – ${formatCurrency(r.price)} (Tối đa ${r.maxTenants} người)
                      </option>
                    `).join('')}
                  </select>
                </div>

                <!-- Người đại diện -->
                <div class="col-md-6">
                  <label for="contractTenant" class="form-label">Người đại diện <span class="text-danger">*</span></label>
                  <select class="form-select" id="contractTenant" data-testid="select-tenant" required>
                    <option value="">-- Chọn người thuê --</option>
                    ${allTenants.map(t => `
                      <option value="${t.id}" ${isEdit && contract.tenantId === t.id ? 'selected' : ''}>
                        ${t.fullName} – ${t.phone || 'N/A'}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <!-- Ngày bắt đầu -->
                <div class="col-md-6">
                  <label for="contractStartDate" class="form-label">Ngày bắt đầu <span class="text-danger">*</span></label>
                  <input type="date" class="form-control" id="contractStartDate" data-testid="input-start-date"
                    value="${isEdit ? contract.startDate : ''}" required />
                </div>

                <!-- Ngày kết thúc -->
                <div class="col-md-6">
                  <label for="contractEndDate" class="form-label">Ngày kết thúc <span class="text-danger">*</span></label>
                  <input type="date" class="form-control" id="contractEndDate" data-testid="input-end-date"
                    value="${isEdit ? contract.endDate : ''}" required />
                </div>

                <!-- Giá thuê trên HĐ -->
                <div class="col-md-6">
                  <label for="contractRoomPrice" class="form-label">Giá thuê (trên HĐ) <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="contractRoomPrice" data-testid="input-room-price"
                    min="0" step="100000" value="${isEdit ? contract.roomPrice : ''}" required />
                  <div class="form-text" id="roomPriceHint"></div>
                </div>

                <!-- Tiền cọc -->
                <div class="col-md-6">
                  <label for="contractDeposit" class="form-label">Tiền cọc <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="contractDeposit" data-testid="input-deposit"
                    min="0" step="100000" value="${isEdit ? contract.deposit : ''}" required />
                </div>

                <!-- Người ở cùng -->
                <div class="col-12">
                  <label class="form-label">Người ở cùng</label>
                  <div class="d-flex gap-2 mb-2">
                    <select class="form-select" id="coTenantSelect" data-testid="select-co-tenant">
                      <option value="">-- Thêm người ở cùng --</option>
                    </select>
                    <button type="button" class="btn btn-outline-primary btn-sm" id="btnAddCoTenant" data-testid="btn-add-co-tenant">Thêm</button>
                  </div>
                  <ul class="co-tenant-list" id="coTenantList" data-testid="co-tenant-list"></ul>
                  <div id="coTenantWarning" class="text-danger small d-none" data-testid="co-tenant-warning"></div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-testid="btn-contract-cancel">Hủy</button>
            <button type="button" class="btn btn-primary" id="btnSaveContract" data-testid="btn-contract-save">
              ${isEdit ? 'Cập nhật' : 'Tạo hợp đồng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('contractFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // ── Refs ──────────────────────────────────────────────────
  const selectRoom = document.getElementById('contractRoom');
  const selectTenant = document.getElementById('contractTenant');
  const coTenantSelect = document.getElementById('coTenantSelect');
  const coTenantListEl = document.getElementById('coTenantList');
  const coTenantWarning = document.getElementById('coTenantWarning');
  const btnAddCoTenant = document.getElementById('btnAddCoTenant');
  const btnSave = document.getElementById('btnSaveContract');
  const errorEl = document.getElementById('contractFormError');
  const priceHint = document.getElementById('roomPriceHint');

  // ── Room selection → auto fill price hint ────────────────
  function updatePriceHint() {
    const roomId = selectRoom.value;
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
      priceHint.textContent = `Giá phòng hiện tại: ${formatCurrency(room.price)}`;
      // Auto fill giá khi tạo mới
      const priceInput = document.getElementById('contractRoomPrice');
      if (!isEdit && priceInput && !priceInput.value) {
        priceInput.value = room.price;
      }
    } else {
      priceHint.textContent = '';
    }
    updateCoTenantOptions();
  }
  selectRoom.addEventListener('change', updatePriceHint);
  updatePriceHint();

  // ── Co-tenant management ─────────────────────────────────
  function getSelectedMainTenant() {
    return selectTenant.value;
  }

  function updateCoTenantOptions() {
    const mainTenantId = getSelectedMainTenant();
    const availableTenants = allTenants.filter(t =>
      t.id !== mainTenantId && !selectedCoTenants.includes(t.id)
    );
    coTenantSelect.innerHTML = '<option value="">-- Thêm người ở cùng --</option>' +
      availableTenants.map(t => `<option value="${t.id}">${t.fullName} – ${t.phone || 'N/A'}</option>`).join('');
  }

  function renderCoTenantList() {
    coTenantListEl.innerHTML = selectedCoTenants.map(id => {
      const tenant = allTenants.find(t => t.id === id);
      const name = tenant ? tenant.fullName : id;
      return `
        <li data-testid="co-tenant-item">
          <span>${name}</span>
          <button type="button" class="btn btn-link btn-remove-co-tenant" data-id="${id}" data-testid="btn-remove-co-tenant">✕</button>
        </li>
      `;
    }).join('');

    // Check occupancy
    const roomId = selectRoom.value;
    const room = allRooms.find(r => r.id === roomId);
    const totalPeople = 1 + selectedCoTenants.length; // đại diện + ở cùng
    if (room && totalPeople > room.maxTenants) {
      coTenantWarning.textContent = `Vượt quá sức chứa! Phòng tối đa ${room.maxTenants} người, đã chọn ${totalPeople} người.`;
      coTenantWarning.classList.remove('d-none');
    } else {
      coTenantWarning.classList.add('d-none');
    }

    updateCoTenantOptions();
  }

  selectTenant.addEventListener('change', () => {
    updateCoTenantOptions();
    renderCoTenantList();
  });

  btnAddCoTenant.addEventListener('click', () => {
    const id = coTenantSelect.value;
    if (id && !selectedCoTenants.includes(id)) {
      selectedCoTenants.push(id);
      renderCoTenantList();
    }
  });

  coTenantListEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-co-tenant');
    if (btn) {
      const id = btn.dataset.id;
      selectedCoTenants = selectedCoTenants.filter(cid => cid !== id);
      renderCoTenantList();
    }
  });

  renderCoTenantList();

  // ── Save ─────────────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    const data = {
      roomId: selectRoom.value,
      tenantId: selectTenant.value,
      startDate: document.getElementById('contractStartDate').value,
      endDate: document.getElementById('contractEndDate').value,
      roomPrice: document.getElementById('contractRoomPrice').value,
      deposit: document.getElementById('contractDeposit').value,
      coTenantIds: [...selectedCoTenants],
    };

    try {
      if (typeof onSave === 'function') {
        onSave(data);
      }
      bsModal.hide();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('d-none');
    }
  });

  // Cleanup
  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}
