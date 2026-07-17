// src/components/service-config-form.js

import { CALC_METHODS, CALC_METHOD_LABELS } from '../business/service-config-validator.js';
import { formatCurrency } from '../utils/currency-utils.js';

/**
 * Mở modal form cấu hình dịch vụ.
 *
 * @param {Object} options
 * @param {Object|null} options.config - Dịch vụ cần sửa (null = tạo mới).
 * @param {Function} options.onSave - Callback khi lưu thành công, nhận data.
 */
export function openServiceConfigForm({ config = null, onSave }) {
  const isEdit = !!config;
  const title = isEdit ? 'Sửa cấu hình dịch vụ' : 'Thêm dịch vụ mới';

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  // Lấy ngày hôm nay định dạng YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const startDateVal = isEdit ? (config.startDate || today) : today;
  const endDateVal = isEdit ? (config.endDate || '') : '';
  const statusVal = isEdit ? (config.status || 'active') : 'active';
  const descriptionVal = isEdit ? (config.description || '') : '';

  container.innerHTML = `
    <div class="modal fade" id="serviceConfigFormModal" tabindex="-1" aria-hidden="true" data-testid="service-config-form-modal">
      <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-light">
            <h5 class="modal-title fw-bold text-dark" data-testid="service-config-form-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="serviceConfigForm" data-testid="service-config-form" novalidate>
              <div id="serviceConfigFormError" class="alert alert-danger d-none" data-testid="service-config-form-error"></div>

              <!-- Mã dịch vụ -->
              <div class="mb-3">
                <label for="serviceCode" class="form-label fw-semibold text-secondary small">Mã dịch vụ <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="serviceCode" data-testid="input-service-code"
                  placeholder="Ví dụ: DIEN, NUOC, WIFI"
                  value="${isEdit ? (config.code || config.id || '') : ''}"
                  ${isEdit ? 'readonly' : ''} required />
                <div class="form-text small text-muted">Mã viết liền không dấu, không cách (ví dụ: DIEN).</div>
              </div>

              <!-- Tên dịch vụ -->
              <div class="mb-3">
                <label for="serviceName" class="form-label fw-semibold text-secondary small">Tên dịch vụ <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="serviceName" data-testid="input-service-name"
                  placeholder="Ví dụ: Tiền điện, Tiền nước"
                  value="${isEdit ? config.name : ''}" required />
              </div>

              <!-- Cách tính -->
              <div class="mb-3">
                <label for="serviceCalcMethod" class="form-label fw-semibold text-secondary small">Cách tính <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="serviceCalcMethod" data-testid="select-calc-method" required>
                  <option value="">-- Chọn cách tính --</option>
                  ${Object.entries(CALC_METHOD_LABELS).map(([value, label]) => `
                    <option value="${value}" ${isEdit && config.calcMethod === value ? 'selected' : ''}>
                      ${label}
                    </option>
                  `).join('')}
                </select>
                
                <!-- Khung giải thích cách tính động -->
                <div class="alert alert-info mt-2 py-2 px-3 d-none small border-0 shadow-sm" id="explanationContainer">
                  <span id="explanationText"></span>
                </div>
              </div>

              <!-- Đơn vị tính -->
              <div class="mb-3">
                <label for="serviceUnit" class="form-label fw-semibold text-secondary small">Đơn vị tính <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="serviceUnit" data-testid="input-unit"
                  placeholder="Ví dụ: kWh, m³, phòng, người, xe..."
                  value="${isEdit ? config.unit : ''}" required />
              </div>

              <!-- Đơn giá -->
              <div class="mb-3">
                <label for="serviceUnitPrice" class="form-label fw-semibold text-secondary small">Đơn giá (VND) <span class="text-danger">*</span></label>
                <input type="number" class="form-control form-control-sm" id="serviceUnitPrice" data-testid="input-unit-price"
                  min="0" step="1000" placeholder="0"
                  value="${isEdit ? config.unitPrice : ''}" required />
              </div>

              <div class="row g-2">
                <!-- Ngày bắt đầu áp dụng -->
                <div class="col-md-6 mb-3">
                  <label for="serviceStartDate" class="form-label fw-semibold text-secondary small">Ngày bắt đầu áp dụng <span class="text-danger">*</span></label>
                  <input type="date" class="form-control form-control-sm" id="serviceStartDate" data-testid="input-start-date"
                    value="${startDateVal}" required />
                </div>

                <!-- Ngày kết thúc áp dụng -->
                <div class="col-md-6 mb-3">
                  <label for="serviceEndDate" class="form-label fw-semibold text-secondary small">Ngày kết thúc áp dụng</label>
                  <input type="date" class="form-control form-control-sm" id="serviceEndDate" data-testid="input-end-date"
                    value="${endDateVal}" />
                </div>
              </div>

              <div class="row g-2">
                <!-- Trạng thái -->
                <div class="col-md-6 mb-3">
                  <label for="serviceStatus" class="form-label fw-semibold text-secondary small">Trạng thái <span class="text-danger">*</span></label>
                  <select class="form-select form-select-sm" id="serviceStatus" data-testid="select-status" required>
                    <option value="active" ${statusVal === 'active' ? 'selected' : ''}>Đang áp dụng</option>
                    <option value="inactive" ${statusVal === 'inactive' ? 'selected' : ''}>Ngưng áp dụng</option>
                  </select>
                </div>
              </div>

              <!-- Ghi chú -->
              <div class="mb-3">
                <label for="serviceDescription" class="form-label fw-semibold text-secondary small">Ghi chú</label>
                <textarea class="form-control form-control-sm" id="serviceDescription" data-testid="input-service-desc" rows="2"
                  placeholder="Ghi chú thêm về dịch vụ...">${descriptionVal}</textarea>
              </div>

              <!-- Khung xem trước (Live Preview) -->
              <div class="card border border-primary-subtle bg-primary-subtle bg-opacity-10 rounded p-3 text-center" id="previewBox">
                <div class="small fw-semibold text-secondary text-uppercase mb-1" style="font-size: 10px; letter-spacing: 0.5px;">Xem trước cách tính</div>
                <strong class="fs-5 text-primary" id="previewText">0 ₫ / đơn vị</strong>
              </div>
            </form>
          </div>
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-secondary px-4 btn-sm" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary px-4 btn-sm" id="btnSaveServiceConfig" data-testid="btn-service-save">Lưu dịch vụ</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('serviceConfigFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  const selectCalcMethod = document.getElementById('serviceCalcMethod');
  const inputUnit = document.getElementById('serviceUnit');
  const inputPrice = document.getElementById('serviceUnitPrice');
  const btnSave = document.getElementById('btnSaveServiceConfig');
  const errorEl = document.getElementById('serviceConfigFormError');

  // --- HÀM CẬP NHẬT GIẢI THÍCH DƯỚI DROPDOWN ---
  function updateExplanation() {
    const calcMethod = selectCalcMethod.value;
    const explanationText = document.getElementById('explanationText');
    const explanationContainer = document.getElementById('explanationContainer');

    if (!explanationText || !explanationContainer) return;

    if (!calcMethod) {
      explanationContainer.classList.add('d-none');
      return;
    }

    explanationContainer.classList.remove('d-none');

    let text = '';
    if (calcMethod === CALC_METHODS.USAGE) {
      text = '💡 <strong>Theo lượng sử dụng:</strong> Tính phí dựa trên chênh lệch lượng tiêu thụ (chỉ số cuối - chỉ số đầu) trong kỳ. Thường dùng cho Điện (kWh), Nước (m³).';
    } else if (calcMethod === CALC_METHODS.FIXED) {
      text = '💡 <strong>Cố định theo phòng:</strong> Thu một mức giá cố định duy nhất cho cả phòng mỗi tháng, không phụ thuộc số lượng người hay xe (Ví dụ: Internet/WiFi).';
    } else if (calcMethod === CALC_METHODS.PER_PERSON) {
      text = '💡 <strong>Theo số người:</strong> Tính phí nhân với số người đang ở thực tế trong phòng (Ví dụ: Phí vệ sinh, Phí dịch vụ chung đầu người).';
    } else if (calcMethod === CALC_METHODS.PER_VEHICLE) {
      text = '💡 <strong>Theo số xe:</strong> Tính phí nhân với số lượng xe máy hoặc ô tô đăng ký của phòng đó (Ví dụ: Phí gửi xe).';
    } else if (calcMethod === CALC_METHODS.MANUAL) {
      text = '💡 <strong>Nhập thủ công:</strong> Cho phép tự điền số lượng tiêu dùng bằng tay khi lập hóa đơn hàng tháng (Ví dụ: Tiền phạt, Dịch vụ phát sinh).';
    }

    explanationText.innerHTML = text;
  }

  // --- HÀM CẬP NHẬT XEM TRƯỚC (LIVE PREVIEW) ---
  function updatePreview() {
    const priceVal = inputPrice.value.trim();
    const unitVal = inputUnit.value.trim() || 'đơn vị';
    const calcMethod = selectCalcMethod.value;
    const previewText = document.getElementById('previewText');

    if (!previewText) return;

    const formattedPrice = priceVal !== '' && !isNaN(priceVal)
      ? formatCurrency(Number(priceVal))
      : '0 ₫';

    let formula = '';
    if (calcMethod === CALC_METHODS.USAGE) {
      formula = `${formattedPrice} / ${unitVal} / tháng`;
    } else if (calcMethod === CALC_METHODS.FIXED) {
      formula = `${formattedPrice} / phòng / tháng`;
    } else if (calcMethod === CALC_METHODS.PER_PERSON) {
      formula = `${formattedPrice} / người / tháng`;
    } else if (calcMethod === CALC_METHODS.PER_VEHICLE) {
      formula = `${formattedPrice} / xe / tháng`;
    } else if (calcMethod === CALC_METHODS.MANUAL) {
      formula = `${formattedPrice} / ${unitVal} / lần`;
    } else {
      formula = `${formattedPrice} / ${unitVal}`;
    }

    previewText.textContent = formula;
  }

  // --- LẮNG NGHE SỰ KIỆN ĐỂ TỰ ĐỘNG GỢI Ý ĐƠN VỊ ---
  selectCalcMethod.addEventListener('change', () => {
    const method = selectCalcMethod.value;
    updateExplanation();

    if (!isEdit) { // Không đổi đơn vị tính khi đang sửa
      if (method === CALC_METHODS.USAGE) {
        inputUnit.value = 'kWh';
      } else if (method === CALC_METHODS.FIXED) {
        inputUnit.value = 'phòng';
      } else if (method === CALC_METHODS.PER_PERSON) {
        inputUnit.value = 'người';
      } else if (method === CALC_METHODS.PER_VEHICLE) {
        inputUnit.value = 'xe';
      } else if (method === CALC_METHODS.MANUAL) {
        inputUnit.value = 'lần';
      }
    }
    updatePreview();
  });

  // Sự kiện input đổi đơn giá & đơn vị để cập nhật preview
  inputPrice.addEventListener('input', updatePreview);
  inputUnit.addEventListener('input', updatePreview);

  // Chạy cập nhật giải thích và xem trước ban đầu
  updateExplanation();
  updatePreview();

  // Sự kiện click Lưu dịch vụ
  btnSave.addEventListener('click', () => {
    const data = {
      code: document.getElementById('serviceCode').value,
      name: document.getElementById('serviceName').value,
      calcMethod: selectCalcMethod.value,
      unitPrice: inputPrice.value,
      unit: inputUnit.value,
      startDate: document.getElementById('serviceStartDate').value,
      endDate: document.getElementById('serviceEndDate').value,
      status: document.getElementById('serviceStatus').value,
      description: document.getElementById('serviceDescription').value
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
