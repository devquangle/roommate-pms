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

  container.innerHTML = `
    <div class="modal fade" id="serviceConfigFormModal" tabindex="-1" aria-hidden="true" data-testid="service-config-form-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="service-config-form-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="serviceConfigForm" data-testid="service-config-form" novalidate>
              <div id="serviceConfigFormError" class="alert alert-danger d-none" data-testid="service-config-form-error"></div>

              <!-- Mã dịch vụ -->
              <div class="mb-3">
                <label for="serviceCode" class="form-label">Mã dịch vụ <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="serviceCode" data-testid="input-service-code"
                  placeholder="Ví dụ: DIEN, NUOC, WIFI"
                  value="${isEdit ? (config.code || config.id || '') : ''}"
                  ${isEdit ? 'readonly' : ''} required />
                <div class="form-text">Mã viết liền không dấu, không khoảng cách (ví dụ: DIEN).</div>
              </div>

              <!-- Tên dịch vụ -->
              <div class="mb-3">
                <label for="serviceName" class="form-label">Tên dịch vụ <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="serviceName" data-testid="input-service-name"
                  placeholder="Ví dụ: Tiền điện, Tiền nước"
                  value="${isEdit ? config.name : ''}" required />
              </div>

              <!-- Cách tính -->
              <div class="mb-3">
                <label for="serviceCalcMethod" class="form-label">Cách tính <span class="text-danger">*</span></label>
                <select class="form-select" id="serviceCalcMethod" data-testid="select-calc-method" required>
                  <option value="">-- Chọn cách tính --</option>
                  ${Object.entries(CALC_METHOD_LABELS).map(([value, label]) => `
                    <option value="${value}" ${isEdit && config.calcMethod === value ? 'selected' : ''}>
                      ${label}
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Đơn giá -->
              <div class="mb-3">
                <label for="serviceUnitPrice" class="form-label">Đơn giá (VND) <span class="text-danger">*</span></label>
                <input type="number" class="form-control" id="serviceUnitPrice" data-testid="input-unit-price"
                  min="0" step="1000" placeholder="0"
                  value="${isEdit ? config.unitPrice : ''}" required />
              </div>

              <!-- Đơn vị tính -->
              <div class="mb-3">
                <label for="serviceUnit" class="form-label">Đơn vị tính <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="serviceUnit" data-testid="input-unit"
                  placeholder="Ví dụ: kWh, m3, phòng, người, xe"
                  value="${isEdit ? config.unit : ''}" required />
              </div>

              <!-- Mô tả -->
              <div class="mb-3">
                <label for="serviceDescription" class="form-label">Mô tả</label>
                <textarea class="form-control" id="serviceDescription" data-testid="input-service-desc" rows="2"
                  placeholder="Ghi chú thêm về dịch vụ...">${isEdit ? (config.description || '') : ''}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary" id="btnSaveServiceConfig" data-testid="btn-service-save">Lưu</button>
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
  const btnSave = document.getElementById('btnSaveServiceConfig');
  const errorEl = document.getElementById('serviceConfigFormError');

  // Tự động gợi ý đơn vị tính khi chọn cách tính
  selectCalcMethod.addEventListener('change', () => {
    const method = selectCalcMethod.value;
    if (isEdit) return; // Không đổi đơn vị tính khi đang sửa
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
  });

  btnSave.addEventListener('click', () => {
    const data = {
      code: document.getElementById('serviceCode').value,
      name: document.getElementById('serviceName').value,
      calcMethod: selectCalcMethod.value,
      unitPrice: document.getElementById('serviceUnitPrice').value,
      unit: inputUnit.value,
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
