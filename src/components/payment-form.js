// src/components/payment-form.js

import { filterInvoices } from '../services/invoice-service.js';
import { getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getActiveContractByRoom, getContractById } from '../services/contract-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { renderErrorState } from './error-state.js';

/**
 * Mở modal ghi nhận giao dịch thanh toán.
 *
 * @param {Object} options
 * @param {string|null} [options.defaultInvoiceId=null] - ID hóa đơn được chọn sẵn (nếu gọi từ trang hóa đơn).
 * @param {Function} options.onSave - Callback khi lưu giao dịch thành công.
 */
export function openPaymentForm({ defaultInvoiceId = null, onSave }) {
  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  // Lấy danh sách các hóa đơn còn nợ (chưa thanh toán xong và đã chốt)
  const allInvoices = filterInvoices();
  const eligibleInvoices = allInvoices.filter(inv =>
    (inv.status === 'unpaid' || inv.status === 'partial') &&
    inv.remainingDebt > 0
  );

  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="modal fade" id="paymentFormModal" tabindex="-1" aria-hidden="true" data-testid="payment-form-modal">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title fw-bold" data-testid="payment-form-title">
              <i class="bi bi-credit-card me-2 text-primary"></i>Ghi nhận thanh toán
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4">
            <form id="paymentForm" data-testid="payment-form" novalidate>
              <div id="paymentFormError" class="alert alert-danger d-none" data-testid="payment-form-error"></div>

              <!-- Chọn hóa đơn -->
              <div class="mb-3">
                <label for="payInvoiceId" class="form-label small fw-bold">Chọn hóa đơn còn nợ <span class="text-danger">*</span></label>
                <select class="form-select" id="payInvoiceId" data-testid="select-invoice" ${defaultInvoiceId ? 'disabled' : ''} required>
                  <option value="">-- Chọn hóa đơn --</option>
                  ${eligibleInvoices.map(inv => {
                    const room = getRoomById(inv.roomId);
                    const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : inv.roomId;
                    return `
                      <option value="${inv.id}" ${defaultInvoiceId === inv.id ? 'selected' : ''}>
                        ${roomName} - Tháng ${inv.month}/${inv.year} (Nợ: ${formatCurrency(inv.remainingDebt)})
                      </option>
                    `;
                  }).join('')}
                </select>
              </div>

              <!-- Tóm tắt hóa đơn được chọn (Hiển thị 6 thông tin yêu cầu) -->
              <div class="card border-0 bg-light p-3 mb-4 d-none" id="invoiceSummaryBox" data-testid="invoice-summary-box">
                <h6 class="fw-bold text-muted small text-uppercase mb-2">Thông tin hóa đơn</h6>
                <div class="row g-3 small">
                  <div class="col-md-4 col-6">
                    <span class="text-muted d-block">Mã hóa đơn:</span>
                    <strong class="text-dark" id="sumInvoiceId">-</strong>
                  </div>
                  <div class="col-md-4 col-6">
                    <span class="text-muted d-block">Phòng:</span>
                    <strong class="text-dark" id="sumRoomName">-</strong>
                  </div>
                  <div class="col-md-4 col-6">
                    <span class="text-muted d-block">Người thuê:</span>
                    <strong class="text-dark" id="sumTenantName">-</strong>
                  </div>
                  <div class="col-md-4 col-6">
                    <span class="text-muted d-block">Tổng hóa đơn:</span>
                    <strong class="text-primary" id="sumTotalAmount">0 ₫</strong>
                  </div>
                  <div class="col-md-4 col-6">
                    <span class="text-muted d-block">Đã thanh toán:</span>
                    <strong class="text-success" id="sumPaidAmount">0 ₫</strong>
                  </div>
                  <div class="col-md-4 col-6">
                    <span class="text-muted d-block">Còn nợ:</span>
                    <strong class="text-danger" id="sumRemainingDebt">0 ₫</strong>
                  </div>
                </div>
              </div>

              <div class="row g-3">
                <!-- Số tiền đóng -->
                <div class="col-md-6">
                  <label for="payAmount" class="form-label small fw-bold">Số tiền thanh toán (VND) <span class="text-danger">*</span></label>
                  <div class="input-group input-group-sm">
                    <input type="number" class="form-control" id="payAmount" data-testid="input-amount"
                      placeholder="Nhập số tiền..." min="1" required />
                    <button class="btn btn-outline-primary fw-semibold" type="button" id="btnPayFull" disabled>Thanh toán toàn bộ</button>
                  </div>
                  <!-- Cảnh báo số tiền không hợp lệ -->
                  <div class="text-danger mt-1 small d-none" id="amountWarning" style="font-size: 0.8rem;"></div>
                  <!-- Còn lại sau thanh toán -->
                  <div class="form-text mt-2 d-none" id="remainingAfterPaymentBox">
                    Còn nợ sau thanh toán: <strong class="text-dark" id="txtRemainingAfter">0 ₫</strong>
                  </div>
                </div>

                <!-- Phương thức -->
                <div class="col-md-6">
                  <label for="payMethod" class="form-label small fw-bold">Phương thức thanh toán <span class="text-danger">*</span></label>
                  <select class="form-select form-select-sm" id="payMethod" data-testid="select-method" required>
                    <option value="transfer">Chuyển khoản ngân hàng</option>
                    <option value="cash">Tiền mặt</option>
                  </select>
                </div>

                <!-- Ngày thanh toán -->
                <div class="col-md-6">
                  <label for="payDate" class="form-label small fw-bold">Ngày thanh toán <span class="text-danger">*</span></label>
                  <input type="date" class="form-control form-control-sm" id="payDate" data-testid="input-date" value="${today}" required />
                </div>

                <!-- Mã giao dịch -->
                <div class="col-md-6">
                  <label for="payTransactionId" class="form-label small fw-bold">Mã giao dịch (nếu có)</label>
                  <input type="text" class="form-control form-control-sm" id="payTransactionId" placeholder="Ví dụ: FT25000..." />
                </div>

                <!-- Nội dung đóng tiền -->
                <div class="col-12">
                  <label for="payContent" class="form-label small fw-bold">Nội dung thanh toán</label>
                  <input type="text" class="form-control form-control-sm" id="payContent" placeholder="Ví dụ: Chuyển khoản tiền nhà tháng 7..." />
                </div>

                <!-- Ghi chú nội bộ -->
                <div class="col-12">
                  <label for="payNote" class="form-label small fw-bold">Ghi chú</label>
                  <textarea class="form-control form-control-sm" id="payNote" data-testid="input-note" rows="2" placeholder="Nhập thêm ghi chú nội bộ..."></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary btn-sm" id="btnSavePayment" data-testid="btn-payment-save" disabled>Xác nhận thanh toán</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('paymentFormModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // ── Refs ──────────────────────────────────────────────────
  const selectInvoice = document.getElementById('payInvoiceId');
  const summaryBox = document.getElementById('invoiceSummaryBox');
  const txtTotal = document.getElementById('sumTotalAmount');
  const txtPaid = document.getElementById('sumPaidAmount');
  const txtDebt = document.getElementById('sumRemainingDebt');

  const inputAmount = document.getElementById('payAmount');
  const btnPayFull = document.getElementById('btnPayFull');
  const amountWarning = document.getElementById('amountWarning');
  const remainingAfterBox = document.getElementById('remainingAfterPaymentBox');
  const txtRemainingAfter = document.getElementById('txtRemainingAfter');

  const btnSave = document.getElementById('btnSavePayment');
  const errorEl = document.getElementById('paymentFormError');

  let currentInvoiceRecord = null;

  // ── VALIDATE AMOUNT ON INPUT ──────────────────────────────
  function validateAmount() {
    if (!currentInvoiceRecord) {
      btnSave.disabled = true;
      remainingAfterBox.classList.add('d-none');
      amountWarning.classList.add('d-none');
      inputAmount.classList.remove('is-invalid', 'is-valid');
      return;
    }

    const amt = Number(inputAmount.value);
    const debt = currentInvoiceRecord.remainingDebt;

    if (inputAmount.value === '') {
      btnSave.disabled = true;
      remainingAfterBox.classList.add('d-none');
      amountWarning.classList.add('d-none');
      inputAmount.classList.remove('is-invalid', 'is-valid');
      return;
    }

    if (isNaN(amt) || amt <= 0 || amt > debt) {
      btnSave.disabled = true;
      remainingAfterBox.classList.add('d-none');
      amountWarning.classList.remove('d-none');
      inputAmount.classList.add('is-invalid');
      inputAmount.classList.remove('is-valid');

      if (amt > debt) {
        amountWarning.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>Số tiền đóng (${formatCurrency(amt)}) không được vượt quá số nợ còn lại (${formatCurrency(debt)})!`;
      } else {
        amountWarning.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-1"></i>Số tiền thanh toán phải lớn hơn 0!`;
      }
    } else {
      btnSave.disabled = false;
      amountWarning.classList.add('d-none');
      inputAmount.classList.remove('is-invalid');
      inputAmount.classList.add('is-valid');

      const remainingAfter = debt - amt;
      txtRemainingAfter.textContent = formatCurrency(remainingAfter);
      remainingAfterBox.classList.remove('d-none');
    }
  }

  // ── UPDATE SUMMARY INFO ───────────────────────────────────
  function updateInvoiceSummary() {
    const invId = defaultInvoiceId || selectInvoice.value;
    if (!invId) {
      summaryBox.classList.add('d-none');
      inputAmount.value = '';
      btnPayFull.disabled = true;
      remainingAfterBox.classList.add('d-none');
      amountWarning.classList.add('d-none');
      inputAmount.classList.remove('is-invalid', 'is-valid');
      btnSave.disabled = true;
      currentInvoiceRecord = null;
      return;
    }

    currentInvoiceRecord = allInvoices.find(inv => inv.id === invId);
    if (currentInvoiceRecord) {
      const room = getRoomById(currentInvoiceRecord.roomId);
      const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : currentInvoiceRecord.roomId;
      
      const contract = currentInvoiceRecord.contractId 
        ? getContractById(currentInvoiceRecord.contractId)
        : getActiveContractByRoom(currentInvoiceRecord.roomId);
      const tenant = contract ? getTenantById(contract.tenantId) : null;
      const tenantName = tenant ? tenant.fullName : 'N/A';

      document.getElementById('sumInvoiceId').textContent = currentInvoiceRecord.id.substring(0, 8).toUpperCase() + '…';
      document.getElementById('sumRoomName').textContent = roomName;
      document.getElementById('sumTenantName').textContent = tenantName;
      
      txtTotal.textContent = formatCurrency(currentInvoiceRecord.totalAmount);
      txtPaid.textContent = formatCurrency(currentInvoiceRecord.paidAmount);
      txtDebt.textContent = formatCurrency(currentInvoiceRecord.remainingDebt);
      
      summaryBox.classList.remove('d-none');
      btnPayFull.disabled = false;

      // Gợi ý điền đầy đủ nợ
      inputAmount.value = currentInvoiceRecord.remainingDebt;
      validateAmount();
    }
  }

  selectInvoice.addEventListener('change', updateInvoiceSummary);
  inputAmount.addEventListener('input', validateAmount);

  // Click thanh toán toàn bộ
  btnPayFull.addEventListener('click', () => {
    if (currentInvoiceRecord) {
      inputAmount.value = currentInvoiceRecord.remainingDebt;
      validateAmount();
    }
  });

  // Chạy lần đầu tiên để load dữ liệu nếu có sẵn defaultInvoiceId
  updateInvoiceSummary();

  // ── SAVE ──────────────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    const data = {
      invoiceId: defaultInvoiceId || selectInvoice.value,
      amount: inputAmount.value,
      method: document.getElementById('payMethod').value,
      date: document.getElementById('payDate').value,
      transactionId: document.getElementById('payTransactionId').value,
      content: document.getElementById('payContent').value,
      note: document.getElementById('payNote').value
    };

    try {
      if (currentInvoiceRecord) {
        const amt = Number(data.amount);
        if (isNaN(amt) || amt <= 0) {
          throw new Error('Số tiền thanh toán phải lớn hơn 0.');
        }
        if (amt > currentInvoiceRecord.remainingDebt) {
          throw new Error(`Số tiền thanh toán (${formatCurrency(amt)}) vượt quá số tiền còn nợ (${formatCurrency(currentInvoiceRecord.remainingDebt)}).`);
        }
      }

      if (typeof onSave === 'function') {
        onSave(data);
      }
      bsModal.hide();
    } catch (err) {
      errorEl.className = 'p-0 mb-3 border-0 bg-transparent';
      errorEl.innerHTML = renderErrorState('payment-failed', {
        customMsg: err.message,
        showHomeBtn: false,
        actionId: 'btnErrorActionRetryPayment',
        actionText: '✏️ Nhập lại số tiền'
      });
      errorEl.classList.remove('d-none');

      setTimeout(() => {
        document.getElementById('btnErrorActionRetryPayment')?.addEventListener('click', () => {
          document.getElementById('payAmount')?.focus();
        });
      }, 0);
    }
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}
