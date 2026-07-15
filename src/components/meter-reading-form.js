// src/components/meter-reading-form.js

import { getRooms } from '../services/room-service.js';
import {
  getPreviousReading,
  hasActiveContractInMonth,
  getRoomsWithoutReading
} from '../services/meter-reading-service.js';
import { detectAbnormalUsage } from '../business/meter-calculator.js';

/**
 * Mở form ghi nhận chỉ số điện nước.
 *
 * @param {Object} options
 * @param {Object|null} options.reading - Bản ghi chỉ số cần sửa (null nếu là thêm mới).
 * @param {number} options.defaultMonth - Tháng mặc định (1-12).
 * @param {number} options.defaultYear - Năm mặc định.
 * @param {Function} options.onSave - Callback khi lưu thành công, nhận (data).
 */
export function openMeterReadingForm({ reading = null, defaultMonth, defaultYear, onSave }) {
  const isEdit = !!reading;
  const title = isEdit ? 'Sửa chỉ số điện nước' : 'Ghi chỉ số mới';

  // Lấy danh sách tất cả phòng để hiển thị
  const allRooms = getRooms();

  // Tháng và năm hiện hành của form
  let selectedMonth = isEdit ? reading.month : defaultMonth;
  let selectedYear = isEdit ? reading.year : defaultYear;

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="meterReadingFormModal" tabindex="-1" aria-hidden="true" data-testid="meter-reading-form-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="meter-reading-form-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="meterReadingForm" data-testid="meter-reading-form" novalidate>
              <div id="meterReadingFormError" class="alert alert-danger d-none" data-testid="meter-reading-form-error"></div>

              <!-- Chọn thời gian -->
              <div class="row g-2 mb-3">
                <div class="col-6">
                  <label for="readingMonth" class="form-label">Tháng <span class="text-danger">*</span></label>
                  <select class="form-select" id="readingMonth" data-testid="select-month" ${isEdit ? 'disabled' : ''}>
                    ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                      <option value="${m}" ${selectedMonth === m ? 'selected' : ''}>Tháng ${m}</option>
                    `).join('')}
                  </select>
                </div>
                <div class="col-6">
                  <label for="readingYear" class="form-label">Năm <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="readingYear" data-testid="input-year"
                    value="${selectedYear}" ${isEdit ? 'readonly' : ''} required />
                </div>
              </div>

              <!-- Chọn phòng -->
              <div class="mb-3">
                <label for="readingRoom" class="form-label">Phòng <span class="text-danger">*</span></label>
                <select class="form-select" id="readingRoom" data-testid="select-room" ${isEdit ? 'disabled' : ''} required>
                  <option value="">-- Chọn phòng --</option>
                </select>
                <div class="form-text" id="roomContractHelp"></div>
              </div>

              <!-- Phần nhập điện -->
              <div class="card mb-3 bg-light border-0">
                <div class="card-body p-3">
                  <h6 class="card-title text-primary mb-3">Chỉ số Điện (kWh)</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label for="elecOld" class="form-label small">Số điện cũ</label>
                      <input type="number" class="form-control" id="elecOld" data-testid="input-elec-old"
                        value="${isEdit ? reading.electricityOld : ''}" required />
                    </div>
                    <div class="col-6">
                      <label for="elecNew" class="form-label small">Số điện mới <span class="text-danger">*</span></label>
                      <input type="number" class="form-control" id="elecNew" data-testid="input-elec-new"
                        value="${isEdit ? reading.electricityNew : ''}" required />
                    </div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mt-2">
                    <span class="small text-muted">Lượng điện dùng:</span>
                    <span class="calc-summary-badge" id="elecUsageText"><span class="calc-summary-highlight" id="elecUsageVal">0</span> kWh</span>
                  </div>
                  <div id="elecAbnormalWarning" class="usage-warning-box d-none" data-testid="elec-abnormal-warning"></div>
                </div>
              </div>

              <!-- Phần nhập nước -->
              <div class="card mb-3 bg-light border-0">
                <div class="card-body p-3">
                  <h6 class="card-title text-primary mb-3">Chỉ số Nước (m³)</h6>
                  <div class="row g-2">
                    <div class="col-6">
                      <label for="waterOld" class="form-label small">Số nước cũ</label>
                      <input type="number" class="form-control" id="waterOld" data-testid="input-water-old"
                        value="${isEdit ? reading.waterOld : ''}" required />
                    </div>
                    <div class="col-6">
                      <label for="waterNew" class="form-label small">Số nước mới <span class="text-danger">*</span></label>
                      <input type="number" class="form-control" id="waterNew" data-testid="input-water-new"
                        value="${isEdit ? reading.waterNew : ''}" required />
                    </div>
                  </div>
                  <div class="d-flex justify-content-between align-items-center mt-2">
                    <span class="small text-muted">Lượng nước dùng:</span>
                    <span class="calc-summary-badge" id="waterUsageText"><span class="calc-summary-highlight" id="waterUsageVal">0</span> m³</span>
                  </div>
                  <div id="waterAbnormalWarning" class="usage-warning-box d-none" data-testid="water-abnormal-warning"></div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary" id="btnSaveMeterReading" data-testid="btn-reading-save">Lưu lại</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('meterReadingFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // ── Refs ──────────────────────────────────────────────────
  const selectRoom = document.getElementById('readingRoom');
  const selectMonth = document.getElementById('readingMonth');
  const inputYear = document.getElementById('readingYear');
  const roomHelp = document.getElementById('roomContractHelp');

  const inputElecOld = document.getElementById('elecOld');
  const inputElecNew = document.getElementById('elecNew');
  const valElecUsage = document.getElementById('elecUsageVal');
  const warningElec = document.getElementById('elecAbnormalWarning');

  const inputWaterOld = document.getElementById('waterOld');
  const inputWaterNew = document.getElementById('waterNew');
  const valWaterUsage = document.getElementById('waterUsageVal');
  const warningWater = document.getElementById('waterAbnormalWarning');

  const btnSave = document.getElementById('btnSaveMeterReading');
  const errorEl = document.getElementById('meterReadingFormError');

  // Lưu trữ chỉ số tháng trước và mức tiêu thụ tháng trước của phòng được chọn
  let prevReadingRecord = null;

  // ── POPULATE ELIGIBLE ROOMS ───────────────────────────────
  function populateRooms() {
    if (isEdit) {
      const room = allRooms.find(r => r.id === reading.roomId);
      selectRoom.innerHTML = `<option value="${reading.roomId}" selected>${room ? room.name : reading.roomId}</option>`;
      updatePreviousReadingInfo();
      return;
    }

    const month = Number(selectMonth.value);
    const year = Number(inputYear.value);

    // Tìm các phòng chưa ghi chỉ số nhưng có hợp đồng hiệu lực
    const eligibleRooms = allRooms.filter(room => {
      const hasContract = hasActiveContractInMonth(room.id, month, year);
      return hasContract;
    });

    const options = eligibleRooms.map(r => `
      <option value="${r.id}">${r.name}</option>
    `).join('');

    selectRoom.innerHTML = '<option value="">-- Chọn phòng --</option>' + options;
    roomHelp.textContent = '';
  }

  // ── AUTO POPULATE INDEXES FROM PREVIOUS MONTH ─────────────
  function updatePreviousReadingInfo() {
    const roomId = selectRoom.value;
    const month = Number(selectMonth.value);
    const year = Number(inputYear.value);

    if (!roomId) {
      prevReadingRecord = null;
      if (!isEdit) {
        inputElecOld.value = '';
        inputWaterOld.value = '';
      }
      roomHelp.textContent = '';
      updateUsageCalculations();
      return;
    }

    // Kiểm tra hợp đồng
    const activeContract = hasActiveContractInMonth(roomId, month, year);
    if (!activeContract) {
      roomHelp.innerHTML = '<span class="text-danger">⚠️ Phòng này không có hợp đồng hiệu lực trong tháng này!</span>';
    } else {
      roomHelp.textContent = 'Phòng đủ điều kiện ghi chỉ số.';
    }

    // Lấy chỉ số tháng trước
    prevReadingRecord = getPreviousReading(roomId, month, year);
    if (prevReadingRecord) {
      if (!isEdit) {
        inputElecOld.value = prevReadingRecord.electricityNew;
        inputWaterOld.value = prevReadingRecord.waterNew;
      }
    } else {
      if (!isEdit) {
        inputElecOld.value = 0;
        inputWaterOld.value = 0;
      }
    }

    updateUsageCalculations();
  }

  // ── LIVE CALCULATIONS AND ABNORMAL DETECTIONS ─────────────
  function updateUsageCalculations() {
    const elecOld = Number(inputElecOld.value) || 0;
    const elecNew = Number(inputElecNew.value) || 0;
    const elecUsage = Math.max(0, elecNew - elecOld);
    valElecUsage.textContent = elecUsage;

    const waterOld = Number(inputWaterOld.value) || 0;
    const waterNew = Number(inputWaterNew.value) || 0;
    const waterUsage = Math.max(0, waterNew - waterOld);
    valWaterUsage.textContent = waterUsage;

    // Cảnh báo bất thường: So sánh với lượng dùng của tháng trước (prevReadingRecord.electricityUsage)
    if (prevReadingRecord) {
      const elecAbnormal = detectAbnormalUsage(elecUsage, prevReadingRecord.electricityUsage || 0);
      if (elecAbnormal.abnormal) {
        warningElec.textContent = `⚠️ ${elecAbnormal.message}`;
        warningElec.classList.remove('d-none');
      } else {
        warningElec.classList.add('d-none');
      }

      const waterAbnormal = detectAbnormalUsage(waterUsage, prevReadingRecord.waterUsage || 0);
      if (waterAbnormal.abnormal) {
        warningWater.textContent = `⚠️ ${waterAbnormal.message}`;
        warningWater.classList.remove('d-none');
      } else {
        warningWater.classList.add('d-none');
      }
    } else {
      warningElec.classList.add('d-none');
      warningWater.classList.add('d-none');
    }
  }

  // ── LISTENERS ─────────────────────────────────────────────
  if (!isEdit) {
    selectMonth.addEventListener('change', () => {
      populateRooms();
    });
    inputYear.addEventListener('input', () => {
      populateRooms();
    });
    selectRoom.addEventListener('change', () => {
      updatePreviousReadingInfo();
    });
  }

  inputElecOld.addEventListener('input', updateUsageCalculations);
  inputElecNew.addEventListener('input', updateUsageCalculations);
  inputWaterOld.addEventListener('input', updateUsageCalculations);
  inputWaterNew.addEventListener('input', updateUsageCalculations);

  // Khởi tạo ban đầu
  populateRooms();
  if (isEdit) {
    updateUsageCalculations();
  }

  // ── SAVE ──────────────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    const data = {
      roomId: selectRoom.value,
      month: selectMonth.value,
      year: inputYear.value,
      electricityOld: inputElecOld.value,
      electricityNew: inputElecNew.value,
      waterOld: inputWaterOld.value,
      waterNew: inputWaterNew.value
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

  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}
