// src/components/invoice-form.js

import { calculateInvoiceTotal } from '../business/invoice-calculator.js';
import { formatCurrency } from '../utils/currency-utils.js';

/**
 * Mở modal chỉnh sửa hóa đơn nháp (draft).
 *
 * @param {Object} options
 * @param {Object} options.invoice - Hóa đơn cần sửa.
 * @param {Function} options.onSave - Callback khi lưu thành công, nhận (data).
 */
export function openInvoiceForm({ invoice, onSave }) {
  if (!invoice) return;

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="invoiceFormModal" tabindex="-1" aria-hidden="true" data-testid="invoice-form-modal">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="invoice-form-title">Chỉnh sửa hóa đơn bản nháp</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="invoiceForm" data-testid="invoice-form" novalidate>
              <div id="invoiceFormError" class="alert alert-danger d-none" data-testid="invoice-form-error"></div>

              <div class="row g-3">
                <!-- Tiền phòng -->
                <div class="col-md-6">
                  <label for="invRoomFee" class="form-label">Tiền phòng (VND) <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="invRoomFee" data-testid="input-room-fee"
                    value="${invoice.roomFee}" min="0" required />
                </div>

                <!-- Tiền điện -->
                <div class="col-md-6">
                  <label for="invElecFee" class="form-label">Tiền điện (VND) <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="invElecFee" data-testid="input-electricity-fee"
                    value="${invoice.electricityFee}" min="0" required />
                </div>

                <!-- Tiền nước -->
                <div class="col-md-6">
                  <label for="invWaterFee" class="form-label">Tiền nước (VND) <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="invWaterFee" data-testid="input-water-fee"
                    value="${invoice.waterFee}" min="0" required />
                </div>

                <!-- Tiền dịch vụ khác -->
                <div class="col-md-6">
                  <label for="invOtherFee" class="form-label">Tiền dịch vụ khác (VND) <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="invOtherFee" data-testid="input-other-services-fee"
                    value="${invoice.otherServicesFee}" min="0" required />
                </div>

                <!-- Tiền giảm giá -->
                <div class="col-md-6">
                  <label for="invDiscount" class="form-label">Giảm giá (VND) <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" id="invDiscount" data-testid="input-discount"
                    value="${invoice.discount}" min="0" required />
                </div>

                <!-- Hạn thanh toán -->
                <div class="col-md-6">
                  <label for="invDueDate" class="form-label">Hạn thanh toán <span class="text-danger">*</span></label>
                  <input type="date" class="form-control" id="invDueDate" data-testid="input-due-date"
                    value="${invoice.dueDate}" required />
                </div>

                <!-- Ghi chú -->
                <div class="col-12">
                  <label for="invNote" class="form-label">Ghi chú</label>
                  <textarea class="form-control" id="invNote" data-testid="input-note" rows="2">${invoice.note || ''}</textarea>
                </div>
              </div>

              <!-- Tính toán hiển thị live -->
              <div class="mt-4 p-3 bg-light rounded d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small">Tạm tính:</span>
                  <strong class="d-block" id="liveSubtotalText">0 VND</strong>
                </div>
                <div>
                  <span class="text-muted small">Giảm giá:</span>
                  <strong class="d-block text-danger" id="liveDiscountText">0 VND</strong>
                </div>
                <div>
                  <span class="text-muted small">Tổng tiền thanh toán:</span>
                  <strong class="d-block text-primary fs-5" id="liveTotalText">0 VND</strong>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary" id="btnSaveInvoice" data-testid="btn-invoice-save">Cập nhật</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('invoiceFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // ── Refs ──────────────────────────────────────────────────
  const inputRoomFee = document.getElementById('invRoomFee');
  const inputElecFee = document.getElementById('invElecFee');
  const inputWaterFee = document.getElementById('invWaterFee');
  const inputOtherFee = document.getElementById('invOtherFee');
  const inputDiscount = document.getElementById('invDiscount');
  const inputDueDate = document.getElementById('invDueDate');
  const inputNote = document.getElementById('invNote');

  const textSubtotal = document.getElementById('liveSubtotalText');
  const textDiscount = document.getElementById('liveDiscountText');
  const textTotal = document.getElementById('liveTotalText');

  const btnSave = document.getElementById('btnSaveInvoice');
  const errorEl = document.getElementById('invoiceFormError');

  // ── LIVE CALCULATION ──────────────────────────────────────
  function updateLiveTotals() {
    const room = Number(inputRoomFee.value) || 0;
    const elec = Number(inputElecFee.value) || 0;
    const water = Number(inputWaterFee.value) || 0;
    const other = Number(inputOtherFee.value) || 0;
    const discount = Number(inputDiscount.value) || 0;

    const subtotal = room + elec + water + other;
    const finalDiscount = Math.min(subtotal, discount);
    const total = calculateInvoiceTotal(subtotal, finalDiscount);

    textSubtotal.textContent = formatCurrency(subtotal);
    textDiscount.textContent = `-${formatCurrency(finalDiscount)}`;
    textTotal.textContent = formatCurrency(total);
  }

  // Bind input events
  [inputRoomFee, inputElecFee, inputWaterFee, inputOtherFee, inputDiscount].forEach(input => {
    input.addEventListener('input', updateLiveTotals);
  });

  updateLiveTotals();

  // ── SAVE ──────────────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    const data = {
      roomFee: inputRoomFee.value,
      electricityFee: inputElecFee.value,
      waterFee: inputWaterFee.value,
      otherServicesFee: inputOtherFee.value,
      discount: inputDiscount.value,
      dueDate: inputDueDate.value,
      note: inputNote.value
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
