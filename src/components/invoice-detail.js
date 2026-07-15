// src/components/invoice-detail.js

import { getRoomById } from '../services/room-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';

/**
 * Mở modal xem chi tiết hóa đơn, hỗ trợ In hóa đơn.
 *
 * @param {Object} invoice
 */
export function openInvoiceDetail(invoice) {
  if (!invoice) return;

  const room = getRoomById(invoice.roomId);
  const roomName = room ? room.name : invoice.roomId;

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  let statusBadgeClass = 'badge-invoice-draft';
  let statusLabel = 'Bản nháp';

  if (invoice.status === 'unpaid') {
    statusBadgeClass = 'badge-invoice-unpaid';
    statusLabel = 'Chưa thanh toán';
  } else if (invoice.status === 'partial') {
    statusBadgeClass = 'badge-invoice-partial';
    statusLabel = 'Thanh toán một phần';
  } else if (invoice.status === 'paid') {
    statusBadgeClass = 'badge-invoice-paid';
    statusLabel = 'Đã thanh toán';
  } else if (invoice.status === 'cancelled') {
    statusBadgeClass = 'badge-invoice-cancelled';
    statusLabel = 'Đã hủy';
  }

  // Lập bảng chi tiết phí dịch vụ
  const serviceDetails = invoice.serviceDetails || [];

  container.innerHTML = `
    <div class="modal fade" id="invoiceDetailModal" tabindex="-1" aria-hidden="true" data-testid="invoice-detail-modal">
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <!-- Vùng in hóa đơn sẽ bọc quanh nội dung chính -->
        <div class="modal-content" id="invoicePrintArea">
          <div class="modal-header d-flex justify-content-between align-items-center">
            <h5 class="modal-title" data-testid="invoice-detail-title">
              HÓA ĐƠN TIỀN NHÀ PHÒNG ${roomName}
            </h5>
            <span class="badge ${statusBadgeClass} p-2" data-testid="invoice-status-badge">${statusLabel}</span>
          </div>
          <div class="modal-body">
            <!-- Thông tin hóa đơn tổng quan -->
            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <p class="mb-1 text-muted small">Mã hóa đơn:</p>
                <h6 data-testid="detail-invoice-id">${invoice.id}</h6>
              </div>
              <div class="col-md-6 text-md-end">
                <p class="mb-1 text-muted small">Thời gian:</p>
                <h6>Tháng ${invoice.month}/${invoice.year}</h6>
              </div>
              <div class="col-md-6">
                <p class="mb-1 text-muted small">Hạn thanh toán:</p>
                <h6>${formatDateToDisplay(invoice.dueDate)}</h6>
              </div>
              <div class="col-md-6 text-md-end">
                <p class="mb-1 text-muted small">Ngày lập:</p>
                <h6>${invoice.createdAt ? formatDateToDisplay(invoice.createdAt) : 'N/A'}</h6>
              </div>
            </div>

            <!-- Bảng chi tiết hóa đơn -->
            <div class="table-responsive mb-4">
              <table class="table table-bordered invoice-detail-table" data-testid="invoice-detail-table">
                <thead class="table-light">
                  <tr>
                    <th>Mục phí</th>
                    <th class="text-end">Số lượng / Chỉ số</th>
                    <th class="text-end">Đơn giá</th>
                    <th class="text-end">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Tiền phòng -->
                  <tr>
                    <td><strong>Tiền thuê phòng</strong></td>
                    <td class="text-end">1 tháng</td>
                    <td class="text-end">${formatCurrency(invoice.roomFee)}</td>
                    <td class="text-end" data-testid="detail-room-fee">${formatCurrency(invoice.roomFee)}</td>
                  </tr>
                  
                  <!-- Tiền dịch vụ chi tiết -->
                  ${serviceDetails.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td class="text-end">${item.usage} ${item.unit || ''}</td>
                      <td class="text-end">${formatCurrency(item.unitPrice)}</td>
                      <td class="text-end">${formatCurrency(item.total)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- Tổng kết tiền -->
            <div class="row justify-content-end">
              <div class="col-md-5">
                <div class="d-flex justify-content-between mb-2">
                  <span class="text-muted">Tạm tính:</span>
                  <span>${formatCurrency(invoice.roomFee + invoice.electricityFee + invoice.waterFee + invoice.otherServicesFee)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2 text-danger">
                  <span>Giảm giá:</span>
                  <span data-testid="detail-discount">-${formatCurrency(invoice.discount)}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between mb-2 fs-6 fw-bold text-primary">
                  <span>Tổng thanh toán:</span>
                  <span data-testid="detail-total-amount">${formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2 text-success">
                  <span>Đã thanh toán:</span>
                  <span data-testid="detail-paid-amount">${formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div class="d-flex justify-content-between mb-2 text-danger fw-semibold">
                  <span>Còn nợ:</span>
                  <span data-testid="detail-remaining-debt">${formatCurrency(invoice.remainingDebt)}</span>
                </div>
              </div>
            </div>

            <!-- Ghi chú -->
            ${invoice.note ? `
              <div class="mt-4 p-3 bg-light rounded">
                <span class="text-muted small d-block">Ghi chú:</span>
                <p class="mb-0 small">${invoice.note}</p>
              </div>
            ` : ''}
          </div>
          <div class="modal-footer justify-content-between">
            <button type="button" class="btn btn-outline-dark" id="btnPrintInvoice" data-testid="btn-print-invoice">
              🖨️ In hóa đơn
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-testid="btn-detail-close">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('invoiceDetailModal');
  if (window.bootstrap && window.bootstrap.Modal) {
    const bsModal = new window.bootstrap.Modal(modalEl);

    // Xử lý sự kiện click In hóa đơn
    document.getElementById('btnPrintInvoice').addEventListener('click', () => {
      window.print();
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      container.innerHTML = '';
    });

    bsModal.show();
  }
}
