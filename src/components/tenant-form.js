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
    <div class="modal fade" id="tenantFormModal" tabindex="-1" role="dialog" aria-modal="true" aria-hidden="true" data-testid="tenant-form-modal">
      <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content bg-light">
          <div class="modal-header border-0 pb-2">
            <h5 class="modal-title text-primary" data-testid="tenant-form-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body pt-0">
            <form id="tenantForm" class="tenant-form" data-testid="tenant-form" novalidate>
              
              <!-- SECTION 1: THÔNG TIN CÁ NHÂN -->
              <div class="card shadow-sm border-0 mb-3">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="text-primary mb-0"><i class="bi bi-person-vcard me-1"></i> Thông tin cá nhân</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="tenantFullName" class="form-label small fw-semibold">Họ và tên <span class="text-danger">*</span></label>
                      <input type="text" class="form-control form-control-sm" id="tenantFullName" data-testid="input-tenant-name"
                        placeholder="Nhập họ và tên đầy đủ..." value="${isEdit ? tenant.fullName : ''}" required />
                      <div class="invalid-feedback-custom text-danger small mt-1" id="errorTenantName" data-testid="error-tenant-name"></div>
                    </div>
                    <div class="col-md-3">
                      <label for="tenantDob" class="form-label small fw-semibold">Ngày sinh</label>
                      <input type="date" class="form-control form-control-sm" id="tenantDob" value="${isEdit ? (tenant.dob || '') : ''}" />
                    </div>
                    <div class="col-md-3">
                      <label for="tenantGender" class="form-label small fw-semibold">Giới tính</label>
                      <select class="form-select form-select-sm" id="tenantGender">
                        <option value="" ${!isEdit || !tenant.gender ? 'selected' : ''}>Chọn...</option>
                        <option value="Nam" ${isEdit && tenant.gender === 'Nam' ? 'selected' : ''}>Nam</option>
                        <option value="Nữ" ${isEdit && tenant.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
                        <option value="Khác" ${isEdit && tenant.gender === 'Khác' ? 'selected' : ''}>Khác</option>
                      </select>
                    </div>
                    <div class="col-md-6">
                      <label for="tenantPhone" class="form-label small fw-semibold">Số điện thoại <span class="text-danger">*</span></label>
                      <input type="tel" class="form-control form-control-sm" id="tenantPhone" data-testid="input-tenant-phone"
                        placeholder="0905123456" value="${isEdit ? (tenant.phone || '') : ''}" required />
                      <div class="invalid-feedback-custom text-danger small mt-1" id="errorTenantPhone" data-testid="error-tenant-phone"></div>
                    </div>
                    <div class="col-md-6">
                      <label for="tenantIdCard" class="form-label small fw-semibold">Số CCCD / Hộ chiếu <span class="text-danger">*</span></label>
                      <input type="text" class="form-control form-control-sm" id="tenantIdCard" data-testid="input-tenant-idcard"
                        placeholder="079200012345" value="${isEdit ? (tenant.idCard || '') : ''}" required />
                      <div class="invalid-feedback-custom text-danger small mt-1" id="errorTenantIdCard" data-testid="error-tenant-idcard"></div>
                    </div>
                    <div class="col-md-6">
                      <label for="tenantEmail" class="form-label small fw-semibold">Email</label>
                      <input type="email" class="form-control form-control-sm" id="tenantEmail"
                        placeholder="nguyenvana@gmail.com" value="${isEdit ? (tenant.email || '') : ''}" />
                    </div>
                    <div class="col-md-6">
                      <label for="tenantOccupation" class="form-label small fw-semibold">Nghề nghiệp</label>
                      <input type="text" class="form-control form-control-sm" id="tenantOccupation"
                        placeholder="Sinh viên, Nhân viên VP..." value="${isEdit ? (tenant.occupation || '') : ''}" />
                    </div>
                    <div class="col-12">
                      <label for="tenantAddress" class="form-label small fw-semibold">Địa chỉ thường trú</label>
                      <input type="text" class="form-control form-control-sm" id="tenantAddress"
                        placeholder="Số nhà, đường, phường, quận, tỉnh..." value="${isEdit ? (tenant.address || '') : ''}" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 2: THÔNG TIN PHƯƠNG TIỆN -->
              <div class="card shadow-sm border-0 mb-3">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="text-primary mb-0"><i class="bi bi-bicycle me-1"></i> Thông tin phương tiện</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label for="tenantLicensePlate" class="form-label small fw-semibold">Biển số xe</label>
                      <input type="text" class="form-control form-control-sm" id="tenantLicensePlate"
                        placeholder="VD: 59X1-123.45" value="${isEdit ? (tenant.licensePlate || '') : ''}" />
                    </div>
                    <div class="col-md-6">
                      <label for="tenantVehicleType" class="form-label small fw-semibold">Loại xe</label>
                      <input type="text" class="form-control form-control-sm" id="tenantVehicleType"
                        placeholder="VD: Honda AirBlade Đen" value="${isEdit ? (tenant.vehicleType || '') : ''}" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 3: LIÊN HỆ KHẨN CẤP -->
              <div class="card shadow-sm border-0 mb-3">
                <div class="card-header bg-white border-bottom-0 pt-3 pb-0">
                  <h6 class="text-primary mb-0"><i class="bi bi-telephone-plus me-1"></i> Liên hệ khẩn cấp</h6>
                </div>
                <div class="card-body">
                  <div class="row g-3">
                    <div class="col-md-5">
                      <label for="tenantEmergencyName" class="form-label small fw-semibold">Họ tên người liên hệ</label>
                      <input type="text" class="form-control form-control-sm" id="tenantEmergencyName"
                        placeholder="Họ tên người thân" value="${isEdit ? (tenant.emergencyName || '') : ''}" />
                    </div>
                    <div class="col-md-4">
                      <label for="tenantEmergencyPhone" class="form-label small fw-semibold">Số điện thoại</label>
                      <input type="tel" class="form-control form-control-sm" id="tenantEmergencyPhone"
                        placeholder="Số điện thoại" value="${isEdit ? (tenant.emergencyPhone || '') : ''}" />
                      <div class="invalid-feedback-custom text-danger small mt-1" id="errorTenantEmergencyPhone"></div>
                    </div>
                    <div class="col-md-3">
                      <label for="tenantEmergencyRelation" class="form-label small fw-semibold">Quan hệ</label>
                      <input type="text" class="form-control form-control-sm" id="tenantEmergencyRelation"
                        placeholder="Cha, Mẹ, Anh..." value="${isEdit ? (tenant.emergencyRelation || '') : ''}" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- SECTION 4: GHI CHÚ -->
              <div class="card shadow-sm border-0">
                <div class="card-body p-3">
                  <label for="tenantNotes" class="form-label small fw-semibold mb-1"><i class="bi bi-journal-text me-1 text-primary"></i> Ghi chú thêm</label>
                  <textarea class="form-control form-control-sm" id="tenantNotes" rows="2"
                    placeholder="Các lưu ý khác về khách thuê...">${isEdit ? (tenant.notes || '') : ''}</textarea>
                </div>
              </div>

            </form>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button type="button" class="btn btn-light" data-bs-dismiss="modal">Hủy</button>
            <button type="submit" form="tenantForm" class="btn btn-primary px-4" id="btnSaveTenant" data-testid="btn-tenant-save">Lưu khách thuê</button>
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
  const inputDob = document.getElementById('tenantDob');
  const inputGender = document.getElementById('tenantGender');
  const inputOccupation = document.getElementById('tenantOccupation');
  const inputLicensePlate = document.getElementById('tenantLicensePlate');
  const inputVehicleType = document.getElementById('tenantVehicleType');
  const inputEmergencyName = document.getElementById('tenantEmergencyName');
  const inputEmergencyPhone = document.getElementById('tenantEmergencyPhone');
  const inputEmergencyRelation = document.getElementById('tenantEmergencyRelation');
  const inputNotes = document.getElementById('tenantNotes');

  const errName = document.getElementById('errorTenantName');
  const errPhone = document.getElementById('errorTenantPhone');
  const errIdCard = document.getElementById('errorTenantIdCard');
  const errEmergencyPhone = document.getElementById('errorTenantEmergencyPhone');

  const btnSave = document.getElementById('btnSaveTenant');

  function clearErrors() {
    [errName, errPhone, errIdCard, errEmergencyPhone].forEach(el => {
      if (el) el.textContent = '';
    });
  }

  // ── SAVE & VALIDATION ─────────────────────────────────────
  const formEl = document.getElementById('tenantForm');
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();

    const data = {
      fullName: inputName.value,
      phone: inputPhone.value,
      idCard: inputIdCard.value,
      email: inputEmail.value,
      address: inputAddress.value,
      dob: inputDob.value,
      gender: inputGender.value,
      occupation: inputOccupation.value,
      licensePlate: inputLicensePlate.value,
      vehicleType: inputVehicleType.value,
      emergencyName: inputEmergencyName.value,
      emergencyPhone: inputEmergencyPhone.value,
      emergencyRelation: inputEmergencyRelation.value,
      notes: inputNotes.value,
    };

    // Kiểm tra validation nghiệp vụ bằng validator thuần
    const existingTenants = getTenants({ includeArchived: true });
    const excludeId = isEdit ? tenant.id : null;
    const valResult = validateTenant(data, existingTenants, excludeId);

    if (!valResult.valid) {
      valResult.errors.forEach(err => {
        if (err.includes('Họ tên')) {
          errName.textContent = err;
        } else if (err.includes('liên hệ khẩn cấp')) {
          errEmergencyPhone.textContent = err;
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
