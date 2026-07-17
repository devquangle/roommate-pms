// src/components/contract-form.js

import { getRooms } from '../services/room-service.js';
import { getTenants } from '../services/tenant-service.js';
import { getContracts } from '../services/contract-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { ROOM_STATUS, CONTRACT_STATUS, ROOM_STATUS_LABELS } from '../constants/statuses.js';
import { openTenantForm } from './tenant-form.js';
import { hasOverlappingContract } from '../business/contract-utils.js';
import { initSearchableSelect } from './searchable-select.js';

export function openContractForm({ contract = null, onSave }) {
  const isEdit = !!contract;
  const title = isEdit ? 'Sửa hợp đồng' : 'Thêm hợp đồng mới';

  const allRooms = getRooms();
  const allTenants = getTenants();
  const allContracts = getContracts();

  const eligibleRooms = allRooms.filter(r =>
    r.status === ROOM_STATUS.AVAILABLE ||
    r.status === ROOM_STATUS.RENTED ||
    (isEdit && r.id === contract.roomId)
  );

  let selectedCoTenants = [];
  if (isEdit && Array.isArray(contract.coTenantIds)) {
    selectedCoTenants = [...contract.coTenantIds];
  }

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="contractFormModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header bg-light">
            <h5 class="modal-title fw-bold">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body bg-light">
            <form id="contractForm" class="contract-form" novalidate>
              <div id="contractFormError" class="alert alert-danger d-none shadow-sm"></div>

              <!-- SECTION 1: Chọn phòng -->
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="fw-bold text-primary mb-0"><i class="bi bi-door-open me-2"></i>1. Chọn phòng</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label">Phòng <span class="text-danger">*</span></label>
                      <select class="form-select form-select-sm" id="contractRoom" required>
                        <option value="">-- Chọn phòng --</option>
                        ${eligibleRooms.map(r => {
                          const nameText = r.name.startsWith('Phòng') ? r.name : 'Phòng ' + r.name;
                          const statusText = ROOM_STATUS_LABELS[r.status] || r.status;
                          return `
                            <option value="${r.id}" ${isEdit && contract.roomId === r.id ? 'selected' : ''}>
                              ${nameText} - ${formatCurrency(r.price)} (${statusText})
                            </option>
                          `;
                        }).join('')}
                      </select>
                    </div>
                    <div class="col-md-6">
                      <div id="roomInfoCard" class="p-3 bg-light rounded border d-none h-100">
                        <div class="row">
                          <div class="col-6 mb-2"><small class="text-muted">Giá thuê:</small><br><strong id="riPrice" class="text-dark"></strong></div>
                          <div class="col-6 mb-2"><small class="text-muted">Sức chứa:</small><br><strong id="riCapacity" class="text-dark"></strong></div>
                          <div class="col-6"><small class="text-muted">Trạng thái:</small><br><span id="riStatus" class="badge bg-secondary"></span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 2: Người thuê -->
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="fw-bold text-primary mb-0"><i class="bi bi-person-lines-fill me-2"></i>2. Người thuê</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-8">
                      <label class="form-label">Người đại diện <span class="text-danger">*</span></label>
                      <select class="form-select form-select-sm" id="contractTenant" required>
                        <option value="">-- Chọn người đại diện --</option>
                        ${allTenants.map(t => `
                          <option value="${t.id}" ${isEdit && contract.tenantId === t.id ? 'selected' : ''}>
                            ${t.fullName} – ${t.phone || 'N/A'}
                          </option>
                        `).join('')}
                      </select>
                    </div>
                    <div class="col-md-4 d-flex align-items-end">
                      <button type="button" class="btn btn-outline-primary w-100 btn-sm" id="btnQuickAddTenant">
                        <i class="bi bi-person-plus me-1"></i> Thêm nhanh
                      </button>
                    </div>
                    
                    <div class="col-12 mt-4">
                      <label class="form-label">Người ở cùng</label>
                      <div class="d-flex gap-2 mb-2">
                        <select class="form-select form-select-sm" id="coTenantSelect">
                          <option value="">-- Thêm người ở cùng --</option>
                        </select>
                        <button type="button" class="btn btn-secondary btn-sm" id="btnAddCoTenant">Thêm</button>
                      </div>
                      <div id="coTenantWarning" class="alert alert-warning py-2 small d-none mt-2 mb-2">
                        <i class="bi bi-exclamation-triangle me-1"></i> <span id="coTenantWarningText"></span>
                      </div>
                      <div class="d-flex flex-wrap gap-2 mt-2" id="coTenantList"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 3: Thông tin hợp đồng -->
              <div class="card border-0 shadow-sm mb-4">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="fw-bold text-primary mb-0"><i class="bi bi-file-earmark-text me-2"></i>3. Thông tin hợp đồng</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label">Ngày bắt đầu <span class="text-danger">*</span></label>
                      <input type="date" class="form-control form-control-sm" id="contractStartDate" value="${isEdit ? contract.startDate : ''}" required />
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Ngày kết thúc <span class="text-danger">*</span></label>
                      <input type="date" class="form-control form-control-sm" id="contractEndDate" value="${isEdit ? contract.endDate : ''}" required />
                    </div>
                    
                    <div class="col-md-6">
                      <label class="form-label">Giá thuê lúc ký <span class="text-danger">*</span></label>
                      <div class="input-group">
                        <input type="number" class="form-control form-control-sm" id="contractRoomPrice" min="0" step="100000" value="${isEdit ? contract.roomPrice : ''}" required />
                        <span class="input-group-text">VNĐ</span>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Tiền đặt cọc <span class="text-danger">*</span></label>
                      <div class="input-group">
                        <input type="number" class="form-control form-control-sm" id="contractDeposit" min="0" step="100000" value="${isEdit ? contract.deposit : ''}" required />
                        <span class="input-group-text">VNĐ</span>
                      </div>
                    </div>

                    <div class="col-md-6">
                      <label class="form-label">Ngày thanh toán hàng tháng</label>
                      <input type="number" class="form-control form-control-sm" id="contractPaymentDay" min="1" max="31" placeholder="Vd: 5" value="${isEdit && contract.paymentDay ? contract.paymentDay : 1}" />
                      <div class="form-text">Mặc định là ngày 1 hàng tháng</div>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Số lượng xe</label>
                      <input type="number" class="form-control form-control-sm" id="contractVehicles" min="0" value="${isEdit && contract.vehicles !== undefined ? contract.vehicles : 0}" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 4: Điều khoản và xác nhận -->
              <div class="card border-0 shadow-sm mb-2">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="fw-bold text-primary mb-0"><i class="bi bi-shield-check me-2"></i>4. Điều khoản và xác nhận</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label">Điều khoản bổ sung</label>
                      <textarea class="form-control form-control-sm" id="contractTerms" rows="3" placeholder="Các thỏa thuận riêng...">${isEdit && contract.terms ? contract.terms : ''}</textarea>
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Ghi chú nội bộ</label>
                      <textarea class="form-control form-control-sm" id="contractNotes" rows="3" placeholder="Chỉ quản lý xem được...">${isEdit && contract.notes ? contract.notes : ''}</textarea>
                    </div>
                    
                    <div class="col-12">
                      <div id="overlapWarning" class="alert alert-danger d-none py-2 small"></div>
                    </div>

                    <div class="col-12 mt-4">
                      <div class="p-3 bg-light rounded border border-info border-opacity-50">
                        <h6 class="fw-bold mb-2 text-info">Tóm tắt hợp đồng</h6>
                        <p class="mb-0 small text-secondary" id="contractSummary">Vui lòng điền đủ thông tin để xem tóm tắt.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </div>
          <div class="modal-footer bg-white">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Quay lại</button>
            <div class="ms-auto d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary" id="btnSaveDraft">Lưu bản nháp</button>
              <button type="button" class="btn btn-primary px-4" id="btnSaveActive">
                ${isEdit ? 'Cập nhật & Kích hoạt' : 'Tạo & Kích hoạt'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('contractFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl, { backdrop: 'static' });

  // Refs
  const selectRoom = document.getElementById('contractRoom');
  if (selectRoom) {
    initSearchableSelect(selectRoom);
  }
  const selectTenant = document.getElementById('contractTenant');
  if (selectTenant) {
    initSearchableSelect(selectTenant);
  }
  const coTenantSelect = document.getElementById('coTenantSelect');
  const coTenantListEl = document.getElementById('coTenantList');
  const coTenantWarning = document.getElementById('coTenantWarning');
  const coTenantWarningText = document.getElementById('coTenantWarningText');
  const btnAddCoTenant = document.getElementById('btnAddCoTenant');
  
  const roomInfoCard = document.getElementById('roomInfoCard');
  const riPrice = document.getElementById('riPrice');
  const riCapacity = document.getElementById('riCapacity');
  const riStatus = document.getElementById('riStatus');
  const inputRoomPrice = document.getElementById('contractRoomPrice');
  
  const btnQuickAddTenant = document.getElementById('btnQuickAddTenant');
  const errorEl = document.getElementById('contractFormError');
  const overlapWarning = document.getElementById('overlapWarning');
  const summaryEl = document.getElementById('contractSummary');

  const startDateEl = document.getElementById('contractStartDate');
  const endDateEl = document.getElementById('contractEndDate');
  const depositEl = document.getElementById('contractDeposit');

  // --- Live Summary & Validation ---
  function updateSummary() {
    const rId = selectRoom.value;
    const tId = selectTenant.value;
    const start = startDateEl.value;
    const end = endDateEl.value;
    
    // Check overlap
    overlapWarning.classList.add('d-none');
    if (rId && start && end) {
      const mockContract = { roomId: rId, startDate: start, endDate: end, id: isEdit ? contract.id : '' };
      const { overlap, conflictWith } = hasOverlappingContract(mockContract, allContracts);
      if (overlap) {
        overlapWarning.textContent = `Cảnh báo: Phòng đã được thuê từ ${conflictWith.startDate} đến ${conflictWith.endDate}. Hợp đồng sẽ bị trùng!`;
        overlapWarning.classList.remove('d-none');
      }
    }

    if (!rId || !tId || !start || !end) {
      summaryEl.textContent = 'Vui lòng điền đủ Phòng, Người đại diện, Ngày bắt đầu và kết thúc.';
      return;
    }
    const room = allRooms.find(r => r.id === rId);
    const tenant = allTenants.find(t => t.id === tId);
    if (!room || !tenant) return;
    
    const m1 = new Date(start);
    const m2 = new Date(end);
    let months = (m2.getFullYear() - m1.getFullYear()) * 12 + (m2.getMonth() - m1.getMonth());
    if (months <= 0) months = 1;
    
    const totalPpl = 1 + selectedCoTenants.length;
    summaryEl.innerHTML = `Hợp đồng phòng <strong>${room.name}</strong> cho <strong>${tenant.fullName}</strong> đại diện.<br>` +
      `Bao gồm <strong>${totalPpl}</strong> người ở, kéo dài khoảng <strong>${months} tháng</strong>.`;
  }

  // --- Room Info ---
  function updateRoomInfo() {
    const roomId = selectRoom.value;
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
      roomInfoCard.classList.remove('d-none');
      riPrice.textContent = formatCurrency(room.price);
      riCapacity.textContent = `Tối đa ${room.maxTenants} người`;
      
      if (room.status === ROOM_STATUS.AVAILABLE) {
        riStatus.className = 'badge bg-success';
        riStatus.textContent = 'Trống';
      } else {
        riStatus.className = 'badge bg-warning text-dark';
        riStatus.textContent = 'Đang thuê';
      }

      if (!isEdit && !inputRoomPrice.value) {
        inputRoomPrice.value = room.price;
      }
    } else {
      roomInfoCard.classList.add('d-none');
    }
    renderCoTenantList();
    updateSummary();
  }
  selectRoom.addEventListener('change', updateRoomInfo);
  updateRoomInfo();

  // --- Co-tenants ---
  function updateCoTenantDropdown() {
    const mainT = selectTenant.value;
    const available = allTenants.filter(t => t.id !== mainT && !selectedCoTenants.includes(t.id));
    coTenantSelect.innerHTML = '<option value="">-- Thêm người ở cùng --</option>' + 
      available.map(t => `<option value="${t.id}">${t.fullName} – ${t.phone || 'N/A'}</option>`).join('');
    
    initSearchableSelect(coTenantSelect);
  }

  function renderCoTenantList() {
    coTenantListEl.innerHTML = selectedCoTenants.map(id => {
      const t = allTenants.find(x => x.id === id);
      return `
        <span class="badge bg-secondary d-flex align-items-center p-2">
          ${t ? t.fullName : id}
          <i class="bi bi-x-circle ms-2 cursor-pointer btn-remove-cotenant" data-id="${id}" style="cursor:pointer"></i>
        </span>
      `;
    }).join('');

    const room = allRooms.find(r => r.id === selectRoom.value);
    const total = 1 + selectedCoTenants.length;
    if (room && total > room.maxTenants) {
      coTenantWarningText.textContent = `Vượt quá sức chứa! Phòng tối đa ${room.maxTenants} người, đang có ${total} người.`;
      coTenantWarning.classList.remove('d-none');
    } else {
      coTenantWarning.classList.add('d-none');
    }
    updateCoTenantDropdown();
    updateSummary();
  }

  selectTenant.addEventListener('change', () => {
    selectedCoTenants = selectedCoTenants.filter(id => id !== selectTenant.value);
    renderCoTenantList();
  });

  btnAddCoTenant.addEventListener('click', () => {
    const val = coTenantSelect.value;
    if (val && !selectedCoTenants.includes(val)) {
      selectedCoTenants.push(val);
      renderCoTenantList();
    }
  });

  coTenantListEl.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove-cotenant')) {
      const id = e.target.dataset.id;
      selectedCoTenants = selectedCoTenants.filter(x => x !== id);
      renderCoTenantList();
    }
  });

  // --- Triggers ---
  startDateEl.addEventListener('change', updateSummary);
  endDateEl.addEventListener('change', updateSummary);

  // --- Quick Add Tenant ---
  btnQuickAddTenant.addEventListener('click', () => {
    // Tạm ẩn modal hiện tại để mở modal kia không bị đè
    bsModal.hide();
    setTimeout(() => {
      openTenantForm({
        onSave: (newTenantData) => {
          import('../services/tenant-service.js').then(module => {
            const created = module.createTenant(newTenantData);
            allTenants.push(created);
            // Re-render select
            const option = document.createElement('option');
            option.value = created.id;
            option.textContent = `${created.fullName} - ${created.phone}`;
            selectTenant.appendChild(option);
            selectTenant.value = created.id;
            initSearchableSelect(selectTenant);
            
            // Restore modal
            bsModal.show();
            renderCoTenantList();
          });
        }
      });
      // Bắt sự kiện nếu người dùng cancel form tenant thì mở lại form HĐ
      const tModal = document.getElementById('tenantFormModal');
      if (tModal) {
        tModal.addEventListener('hidden.bs.modal', () => {
          bsModal.show();
        }, { once: true });
      }
    }, 400);
  });

  renderCoTenantList();

  // --- Save Logic ---
  function handleSave(status) {
    const data = {
      roomId: selectRoom.value,
      tenantId: selectTenant.value,
      startDate: startDateEl.value,
      endDate: endDateEl.value,
      roomPrice: inputRoomPrice.value,
      deposit: depositEl.value,
      coTenantIds: [...selectedCoTenants],
      paymentDay: document.getElementById('contractPaymentDay').value,
      vehicles: document.getElementById('contractVehicles').value,
      terms: document.getElementById('contractTerms').value,
      notes: document.getElementById('contractNotes').value,
      status: status
    };

    try {
      if (typeof onSave === 'function') {
        onSave(data);
      }
      bsModal.hide();
    } catch (err) {
      if (err.message.includes('trùng thời gian') || err.message.includes('trùng') || err.message.includes('overlap')) {
        import('./error-state.js').then(module => {
          errorEl.innerHTML = module.renderErrorState('overlapping-contract', {
            customMsg: err.message,
            showHomeBtn: false,
            actionId: 'btnErrorActionAdjustDates',
            actionText: '📅 Thay đổi thời gian thuê'
          });
          errorEl.classList.remove('d-none');
          
          setTimeout(() => {
            document.getElementById('btnErrorActionAdjustDates')?.addEventListener('click', () => {
              startDateEl.focus();
            });
          }, 0);
        });
      } else {
        errorEl.textContent = err.message;
        errorEl.classList.remove('d-none');
      }
      // Scroll to top
      document.querySelector('.modal-body').scrollTo(0, 0);
    }
  }

  document.getElementById('btnSaveDraft').addEventListener('click', () => handleSave(CONTRACT_STATUS.DRAFT));
  document.getElementById('btnSaveActive').addEventListener('click', () => handleSave(CONTRACT_STATUS.ACTIVE));

  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}
