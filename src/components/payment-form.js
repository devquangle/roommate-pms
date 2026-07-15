// src/components/payment-form.js

import { filterInvoices } from '../services/invoice-service.js';
import { getRoomById } from '../services/room-service.js';
import { formatCurrency } from '../utils/currency-utils.js';

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
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="payment-form-title">Ghi nhận thanh toán</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="paymentForm" data-testid="payment-form" novalidate>
              <div id="paymentFormError" class="alert alert-danger d-none" data-testid="payment-form-error"></div>

              <!-- Chọn hóa đơn -->
              <div class="mb-3">
                <label for="payInvoiceId" class="form-label">Chọn hóa đơn còn nợ <span class="text-danger">*</span></label>
                <select class="form-select" id="payInvoiceId" data-testid="select-invoice" ${defaultInvoiceId ? 'disabled' : ''} required>
                  <option value="">-- Chọn hóa đơn --</option>
                  ${eligibleInvoices.map(inv => {
                    const room = getRoomById(inv.roomId);
                    const roomName = room ? room.name : inv.roomId;
                    return `
                      <option value="${inv.id}" ${defaultInvoiceId === inv.id ? 'selected' : ''}>
                        Phòng ${roomName} - Tháng ${inv.month}/${inv.year} (Nợ: ${formatCurrency(inv.remainingDebt)})
                      </option>
                    `;
                  }).join('')}
                </select>
              </div>

              <!-- Tóm tắt hóa đơn được chọn -->
              <div class="payment-invoice-summary d-none" id="invoiceSummaryBox" data-testid="invoice-summary-box">
                <div class="payment-summary-row">
                  <span class="summary-label">Tổng hóa đơn:</span>
                  <span class="summary-val" id="sumTotalAmount" data-testid="sum-total-amount">0 ₫</span>
                </div>
                <div class="payment-summary-row text-success">
                  <span class="summary-label">Đã thanh toán:</span>
                  <span class="summary-val" id="sumPaidAmount" data-testid="sum-paid-amount">0 ₫</span>
                </div>
                <div class="payment-summary-row text-danger">
                  <span class="summary-label">Còn nợ lại:</span>
                  <span class="summary-val" id="sumRemainingDebt" data-testid="sum-remaining-debt">0 ₫</span>
                </div>
              </div>

              <!-- Số tiền đóng -->
              <div class="mb-3">
                <label for="payAmount" class="form-label">Số tiền thanh toán (VND) <span class="text-danger">*</span></label>
                <input type="number" class="form-control" id="payAmount" data-testid="input-amount"
                  placeholder="Nhập số tiền đóng..." min="1" required />
                <div class="form-text" id="payAmountHelp"></div>
              </div>

              <!-- Phương thức -->
              <div class="mb-3">
                <label for="payMethod" class="form-label">Phương thức thanh toán <span class="text-danger">*</span></label>
                <select class="form-select" id="payMethod" data-testid="select-method" required>
                  <option value="transfer">Chuyển khoản ngân hàng</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </div>

              <!-- Ngày thanh toán -->
              <div class="mb-3">
                <label for="payDate" class="form-label">Ngày đóng tiền <span class="text-danger">*</span></label>
                <input type="date" class="form-control" id="payDate" data-testid="input-date" value="${today}" required />
              </div>

              <!-- Ghi chú -->
              <div class="mb-3">
                <label for="payNote" class="form-label">Ghi chú</label>
                <textarea class="form-control" id="payNote" data-testid="input-note" rows="2" placeholder="Ví dụ: Anh An chuyển khoản tiền nhà..."></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
            <button type="button" class="btn btn-primary" id="btnSavePayment" data-testid="btn-payment-save">Xác nhận đóng</button>
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
  const amountHelp = document.getElementById('payAmountHelp');
  const btnSave = document.getElementById('btnSavePayment');
  const errorEl = document.getElementById('paymentFormError');

  // ID hóa đơn thực tế được dùng (hỗ trợ cả khi bị disabled)
  const activeInvoiceId = defaultInvoiceId || selectInvoice.value;
  let currentInvoiceRecord = null;

  // ── UPDATE SUMMARY INFO ───────────────────────────────────
  function updateInvoiceSummary() {
    const invId = defaultInvoiceId || selectInvoice.value;
    if (!invId) {
      summaryBox.classList.add('d-none');
      inputAmount.value = '';
      amountHelp.textContent = '';
      currentInvoiceRecord = null;
      return;
    }

    currentInvoiceRecord = allInvoices.find(inv => inv.id === invId);
    if (currentInvoiceRecord) {
      txtTotal.textContent = formatCurrency(currentInvoiceRecord.totalAmount);
      txtPaid.textContent = formatCurrency(currentInvoiceRecord.paidAmount);
      txtDebt.textContent = formatCurrency(currentInvoiceRecord.remainingDebt);
      summaryBox.classList.remove('d-none');

      // Gợi ý đóng đủ số nợ còn lại
      if (!inputAmount.value) {
        inputAmount.value = currentInvoiceRecord.remainingDebt;
      }
      amountHelp.textContent = `Gợi ý đóng đủ nợ: ${formatCurrency(currentInvoiceRecord.remainingDebt)}`;
    }
  }

  selectInvoice.addEventListener('change', updateInvoiceSummary);
  updateInvoiceSummary();

  // ── SAVE ──────────────────────────────────────────────────
  btnSave.addEventListener('click', () => {
    const data = {
      invoiceId: defaultInvoiceId || selectInvoice.value,
      amount: inputAmount.value,
      method: document.getElementById('payMethod').value,
      date: document.getElementById('payDate').value,
      note: document.getElementById('payNote').value
    };

    try {
      // Validate cấm nhập vượt công nợ ngay tại client để thân thiện với user
      if (currentInvoiceRecord) {
        const amt = Number(data.amount);
        if (amt > currentInvoiceRecord.remainingDebt) {
          throw new Error(`Số tiền đóng (${formatCurrency(amt)}) vượt quá số tiền còn nợ (${formatCurrency(currentInvoiceRecord.remainingDebt)}).`);
        }
      }

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
