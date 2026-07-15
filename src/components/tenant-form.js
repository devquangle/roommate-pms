// src/components/tenant-form.js

import { getTenants } from '../services/tenant-service.js';
import { validateTenant } from '../business/tenant-validator.js';

/**
 * Mở modal thêm/sửa khách thuê.
 *
 * @param {Object} options
 * @param {Object|null} options.tenant - Khách thuê cần sửa (null nếu tạo mới).
 * @param {Function} options.onSave - Callback khi lưu thành công, nhận (data).
 */
export function openTenantForm({ tenant = null, onSave }) {
  const isEdit = !!tenant;
  const title = isEdit ? 'Chỉnh sửa thông tin khách thuê' : 'Thêm khách thuê mới';

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="tenantFormModal" tabindex="-1" aria-hidden="true" data-testid="tenant-form-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="tenant-form-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="tenantForm" class="tenant-form" data-testid="tenant-form" novalidate>
              <!-- Họ tên (fullName) -->
              <div class="mb-3">
                <label for="tenantFullName" class="form-label">Họ tên <span class="text-danger">*</span></label>
                <input type="text" class="form-control" id="tenantFullName" data-testid="input-tenant-name"
                  placeholder="Nhập họ và tên đầy đủ..."
                  value="${isEdit ? tenant.fullName : ''}" required />
                <div class="invalid-feedback-custom text-danger small" id="errorTenantName" data-testid="error-tenant-name"></div>
              </div>

              <!-- Số điện thoại (phone) -->
              <div class="mb-3">
                <label for="tenantPhone" class="form-label">Số điện thoại</label>
                <input type="tel" class="form-control" id="tenantPhone" data-testid="input-tenant-phone"
                  placeholder="Ví dụ: 0905123456"
                  value="${isEdit ? (tenant.phone || '') : ''}" />
                <div class="invalid-feedback-custom text-danger small" id="errorTenantPhone" data-testid="error-tenant-phone"></div>
              </div>

              <!-- Số CCCD (idCard) -->
              <div class="mb-3">
                <label for="tenantIdCard" class="form-label">Số CCCD / Hộ chiếu</label>
                <input type="text" class="form-control" id="tenantIdCard" data-testid="input-tenant-idcard"
                  placeholder="Ví dụ: 079200012345"
                  value="${isEdit ? (tenant.idCard || '') : ''}" />
                <div class="invalid-feedback-custom text-danger small" id="errorTenantIdCard" data-testid="error-tenant-idcard"></div>
              </div>

              <!-- Email -->
              <div class="mb-3">
                <label for="tenantEmail" class="form-label">Email</label>
                <input type="email" class="form-control" id="tenantEmail" data-testid="input-tenant-email"
                  placeholder="Ví dụ: nguyenvana@gmail.com"
                  value="${isEdit ? (tenant.email || '') : ''}" />
              </div>

              <!-- Địa chỉ thường trú (address) -->
              <div class="mb-3">
                <label for="tenantAddress" class="form-label">Quê quán / Địa chỉ thường trú</label>
                <textarea class="form-control" id="tenantAddress" data-testid="input-tenant-address" rows="2"
                  placeholder="Xã, Huyện, Tỉnh thường trú...">${isEdit ? (tenant.address || '') : ''}</textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary" id="btnSaveTenant" data-testid="btn-tenant-save">Lưu lại</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('tenantFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // ── Refs ──────────────────────────────────────────────────
  const inputName = document.getElementById('tenantFullName');
  const inputPhone = document.getElementById('tenantPhone');
  const inputIdCard = document.getElementById('tenantIdCard');
  const inputEmail = document.getElementById('tenantEmail');
  const inputAddress = document.getElementById('tenantAddress');

  const errName = document.getElementById('errorTenantName');
  const errPhone = document.getElementById('errorTenantPhone');
  const errIdCard = document.getElementById('errorTenantIdCard');

  const btnSave = document.getElementById('btnSaveTenant');

  function clearErrors() {
    [errName, errPhone, errIdCard].forEach(el => {
      el.textContent = '';
    });
  }

  // ── SAVE & VALIDATION ─────────────────────────────────────
  btnSave.addEventListener('click', () => {
    clearErrors();

    const data = {
      fullName: inputName.value,
      phone: inputPhone.value,
      idCard: inputIdCard.value,
      email: inputEmail.value,
      address: inputAddress.value
    };

    // Kiểm tra validation nghiệp vụ bằng validator thuần
    const existingTenants = getTenants({ includeArchived: true });
    const excludeId = isEdit ? tenant.id : null;
    const valResult = validateTenant(data, existingTenants, excludeId);

    if (!valResult.valid) {
      valResult.errors.forEach(err => {
        if (err.includes('Họ tên')) {
          errName.textContent = err;
        } else if (err.includes('Số điện thoại')) {
          errPhone.textContent = err;
        } else if (err.includes('CCCD')) {
          errIdCard.textContent = err;
        }
      });
      return;
    }

    try {
      if (typeof onSave === 'function') {
        onSave(data);
      }
      bsModal.hide();
    } catch (err) {
      errName.textContent = err.message;
    }
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}
export default openTenantForm;
