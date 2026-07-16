// src/components/room-form.js

import { getRooms } from '../services/room-service.js';
import { validateRoom } from '../business/room-validator.js';
import { ROOM_STATUS } from '../constants/statuses.js';

/**
 * Mở modal thêm/sửa phòng trọ.
 *
 * @param {Object} options
 * @param {Object|null} options.room - Đối tượng phòng trọ cần sửa (null nếu tạo mới).
 * @param {Function} options.onSave - Callback khi lưu thành công, nhận (data).
 */
export function openRoomForm({ room = null, onSave }) {
  const isEdit = !!room;
  const title = isEdit ? 'Chỉnh sửa phòng trọ' : 'Thêm phòng mới';

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  // Helpers pre-fill
  const v = (field, fallback = '') => isEdit ? (room[field] ?? fallback) : fallback;
  const sel = (field, val) => isEdit && room[field] === val ? 'selected' : '';

  container.innerHTML = `
    <div class="modal fade" id="roomFormModal" tabindex="-1" aria-hidden="true" data-testid="room-form-modal">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">

          <!-- Header -->
          <div class="modal-header">
            <h5 class="modal-title" data-testid="room-form-title">
              <i class="bi bi-door-open me-2"></i>${title}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <form id="roomForm" class="room-form" data-testid="room-form" novalidate>
              <div class="row g-3">

                <!-- Hàng 1: Mã phòng + Tên phòng -->
                <div class="col-12 col-lg-6">
                  <label for="roomCode" class="form-label fw-semibold">
                    Mã phòng <span class="text-danger">*</span>
                  </label>
                  <input type="text" class="form-control" id="roomCode"
                    data-testid="input-room-code"
                    placeholder="VD: P101, A-201"
                    value="${v('id')}" ${isEdit ? 'disabled' : 'required'} />
                  <div class="text-danger small mt-1" id="errorRoomCode" data-testid="error-room-code"></div>
                </div>

                <div class="col-12 col-lg-6">
                  <label for="roomName" class="form-label fw-semibold">
                    Tên phòng <span class="text-danger">*</span>
                  </label>
                  <input type="text" class="form-control" id="roomName"
                    data-testid="input-room-name"
                    placeholder="VD: Phòng 101, Phòng Master"
                    value="${v('name')}" required />
                  <div class="text-danger small mt-1" id="errorRoomName" data-testid="error-room-name"></div>
                </div>

                <!-- Hàng 2: Khu vực / Tầng + Loại phòng -->
                <div class="col-12 col-lg-6">
                  <label for="roomFloor" class="form-label fw-semibold">
                    Khu vực / Tầng <span class="text-danger">*</span>
                  </label>
                  <input type="text" class="form-control" id="roomFloor"
                    data-testid="input-room-floor"
                    placeholder="VD: Tầng 1, Block A, Dãy B"
                    value="${v('floor')}" required />
                  <div class="text-danger small mt-1" id="errorRoomFloor" data-testid="error-room-floor"></div>
                </div>

                <div class="col-12 col-lg-6">
                  <label for="roomType" class="form-label fw-semibold">
                    Loại phòng <span class="text-danger">*</span>
                  </label>
                  <select class="form-select" id="roomType"
                    data-testid="select-room-type" required>
                    <option value="">— Chọn loại phòng —</option>
                    <option value="standard"   ${sel('type','standard')}>Standard – Phòng tiêu chuẩn</option>
                    <option value="deluxe"     ${sel('type','deluxe')}>Deluxe – Phòng cao cấp</option>
                    <option value="suite"      ${sel('type','suite')}>Suite – Phòng VIP</option>
                    <option value="dormitory"  ${sel('type','dormitory')}>Dormitory – Phòng ký túc xá</option>
                    <option value="studio"     ${sel('type','studio')}>Studio – Phòng studio</option>
                  </select>
                  <div class="text-danger small mt-1" id="errorRoomType" data-testid="error-room-type"></div>
                </div>

                <!-- Hàng 3: Diện tích + Giá thuê -->
                <div class="col-12 col-lg-6">
                  <label for="roomArea" class="form-label fw-semibold">
                    Diện tích <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="roomArea"
                      data-testid="input-room-area"
                      placeholder="VD: 25" min="1" step="0.5"
                      value="${v('area')}" required />
                    <span class="input-group-text">m²</span>
                  </div>
                  <div class="text-danger small mt-1" id="errorRoomArea" data-testid="error-room-area"></div>
                </div>

                <div class="col-12 col-lg-6">
                  <label for="roomPrice" class="form-label fw-semibold">
                    Giá thuê <span class="text-danger">*</span>
                  </label>
                  <div class="input-group">
                    <input type="number" class="form-control" id="roomPrice"
                      data-testid="input-room-price"
                      placeholder="VD: 2500000" min="0" step="100000"
                      value="${v('price')}" required />
                    <span class="input-group-text">VNĐ</span>
                  </div>
                  <div class="text-danger small mt-1" id="errorRoomPrice" data-testid="error-room-price"></div>
                </div>

                <!-- Hàng 3 tiếp: Số người tối đa -->
                <div class="col-12 col-lg-6">
                  <label for="roomMaxTenants" class="form-label fw-semibold">
                    Số người tối đa <span class="text-danger">*</span>
                  </label>
                  <input type="number" class="form-control" id="roomMaxTenants"
                    data-testid="input-room-max-tenants"
                    placeholder="VD: 3" min="1" max="20"
                    value="${v('maxTenants')}" required />
                  <div class="text-danger small mt-1" id="errorRoomMaxTenants" data-testid="error-room-max-tenants"></div>
                </div>

                <!-- Hàng 4: Trạng thái ban đầu -->
                <div class="col-12 col-lg-6">
                  <label for="roomStatus" class="form-label fw-semibold">
                    Trạng thái ban đầu
                  </label>
                  <select class="form-select" id="roomStatus" data-testid="select-room-status">
                    <option value="${ROOM_STATUS.AVAILABLE}" ${sel('status', ROOM_STATUS.AVAILABLE) || (!isEdit ? 'selected' : '')}>
                      Trống – Sẵn sàng cho thuê
                    </option>
                    <option value="${ROOM_STATUS.RENTED}" ${sel('status', ROOM_STATUS.RENTED)}>
                      Đang thuê
                    </option>
                    <option value="${ROOM_STATUS.MAINTENANCE}" ${sel('status', ROOM_STATUS.MAINTENANCE)}>
                      Bảo trì – Tạm ngưng
                    </option>
                  </select>
                  <div class="text-danger small mt-1" id="errorRoomStatus" data-testid="error-room-status"></div>
                </div>

                <!-- Hàng 5: Ghi chú -->
                <div class="col-12">
                  <label for="roomDescription" class="form-label fw-semibold">Ghi chú</label>
                  <textarea class="form-control" id="roomDescription"
                    data-testid="input-room-desc" rows="2"
                    placeholder="VD: Có ban công, máy lạnh, nội thất cơ bản...">${v('description')}</textarea>
                </div>

              </div><!-- /row -->
            </form>
          </div><!-- /modal-body -->

          <!-- Footer -->
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
              <i class="bi bi-x-lg me-1"></i>Hủy
            </button>
            <button type="button" class="btn btn-primary" id="btnSaveRoom" data-testid="btn-room-save">
              <i class="bi bi-floppy me-1"></i>Lưu phòng
            </button>
          </div>

        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('roomFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // ── DOM Refs ──────────────────────────────────────────────
  const inputCode        = document.getElementById('roomCode');
  const inputName        = document.getElementById('roomName');
  const inputFloor       = document.getElementById('roomFloor');
  const selectType       = document.getElementById('roomType');
  const inputArea        = document.getElementById('roomArea');
  const inputPrice       = document.getElementById('roomPrice');
  const inputMaxTenants  = document.getElementById('roomMaxTenants');
  const selectStatus     = document.getElementById('roomStatus');
  const inputDesc        = document.getElementById('roomDescription');

  const errCode        = document.getElementById('errorRoomCode');
  const errName        = document.getElementById('errorRoomName');
  const errFloor       = document.getElementById('errorRoomFloor');
  const errType        = document.getElementById('errorRoomType');
  const errArea        = document.getElementById('errorRoomArea');
  const errPrice       = document.getElementById('errorRoomPrice');
  const errMaxTenants  = document.getElementById('errorRoomMaxTenants');
  const errStatus      = document.getElementById('errorRoomStatus');

  const btnSave = document.getElementById('btnSaveRoom');

  // ── Clear errors ──────────────────────────────────────────
  function clearErrors() {
    [errCode, errName, errFloor, errType, errArea, errPrice, errMaxTenants, errStatus]
      .forEach(el => { if (el) el.textContent = ''; });
  }

  // ── Inline validation (required fields) ──────────────────
  function validateLocal() {
    clearErrors();
    let ok = true;

    if (!inputCode.value.trim()) {
      errCode.textContent = 'Mã phòng không được để trống.';
      ok = false;
    }
    if (!inputName.value.trim()) {
      errName.textContent = 'Tên phòng không được để trống.';
      ok = false;
    }
    if (!inputFloor.value.trim()) {
      errFloor.textContent = 'Khu vực / tầng không được để trống.';
      ok = false;
    }
    if (!selectType.value) {
      errType.textContent = 'Vui lòng chọn loại phòng.';
      ok = false;
    }
    const areaVal = Number(inputArea.value);
    if (!inputArea.value || areaVal <= 0) {
      errArea.textContent = 'Diện tích phải lớn hơn 0.';
      ok = false;
    }
    const priceVal = Number(inputPrice.value);
    if (!inputPrice.value || priceVal < 0) {
      errPrice.textContent = 'Giá thuê không hợp lệ.';
      ok = false;
    }
    const maxVal = Number(inputMaxTenants.value);
    if (!inputMaxTenants.value || maxVal < 1) {
      errMaxTenants.textContent = 'Số người tối đa phải ít nhất là 1.';
      ok = false;
    }

    return ok;
  }

  // ── SAVE handler ──────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    // 1. Local inline validation trước
    if (!validateLocal()) return;

    const data = {
      id:          inputCode.value.trim(),
      name:        inputName.value.trim(),
      floor:       inputFloor.value.trim(),
      type:        selectType.value,
      area:        Number(inputArea.value),
      price:       Number(inputPrice.value),
      maxTenants:  Number(inputMaxTenants.value),
      status:      selectStatus.value,
      description: inputDesc.value.trim(),
    };

    // 2. Business-level validation (trùng mã phòng, v.v.)
    const existingRooms = getRooms();
    const excludeId = isEdit ? room.id : null;
    const valResult = validateRoom(data, existingRooms, excludeId);

    if (!valResult.valid) {
      valResult.errors.forEach(err => {
        if (err.includes('Mã phòng'))        errCode.textContent = err;
        else if (err.includes('Tên phòng'))  errName.textContent = err;
        else if (err.includes('Giá thuê'))   errPrice.textContent = err;
        else if (err.includes('Số người'))   errMaxTenants.textContent = err;
        else                                  errStatus.textContent = err;
      });
      return;
    }

    // 3. Gọi callback rồi đóng modal
    try {
      if (typeof onSave === 'function') onSave(data);
      bsModal.hide();
    } catch (err) {
      errStatus.textContent = err.message;
    }
  });

  // Cleanup khi đóng
  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}

export default openRoomForm;
