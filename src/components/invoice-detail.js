// src/components/invoice-detail.js

import { getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getActiveContractByRoom } from '../services/contract-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';

// ─── Thông tin nhà trọ mặc định (có thể mở rộng lấy từ appSettings sau) ───
const PROPERTY_INFO = {
  name: 'NHÀ TRỌ ROOMMATE',
  address: '123 Đường ABC, Phường XYZ, Quận 1, TP.HCM',
  phone: '0901 234 567',
  bankName: 'Ngân hàng BIDV',
  bankAccount: '1234 5678 9012',
  bankOwner: 'NGUYEN VAN A'
};

/**
 * Mở modal xem chi tiết hóa đơn, hỗ trợ In hóa đơn chuẩn A4.
 *
 * @param {Object} invoice
 */
export function openInvoiceDetail(invoice) {
  if (!invoice) return;

  const room = getRoomById(invoice.roomId);
  const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : invoice.roomId;

  // Lấy tên người thuê
  const contract = getActiveContractByRoom(invoice.roomId);
  const tenant = contract ? getTenantById(contract.tenantId) : null;
  const tenantName = tenant ? tenant.fullName : 'N/A';

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

  // Bảng chi tiết phí dịch vụ
  const serviceDetails = invoice.serviceDetails || [];
  const subtotal = invoice.roomFee + invoice.electricityFee + invoice.waterFee + invoice.otherServicesFee;
  const invoiceIdShort = invoice.id.substring(0, 8).toUpperCase();

  container.innerHTML = `
    <div class="modal fade" id="invoiceDetailModal" tabindex="-1" aria-hidden="true" data-testid="invoice-detail-modal">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <!-- Phần hiển thị trên màn hình (không in) -->
          <div class="modal-header d-print-none d-flex justify-content-between align-items-center">
            <h5 class="modal-title" data-testid="invoice-detail-title">
              HÓA ĐƠN ${roomName}
            </h5>
            <span class="badge ${statusBadgeClass} p-2" data-testid="invoice-status-badge">${statusLabel}</span>
          </div>

          <!-- Vùng in hóa đơn A4 -->
          <div class="modal-body" id="invoicePrintArea">

            <!-- ═══════ HEADER IN ═══════ -->
            <div class="invoice-print-header">
              <div class="d-flex align-items-start justify-content-between mb-3">
                <div>
                  <div class="invoice-logo">🏠 RoomMate</div>
                  <h5 class="fw-bold mb-1">${PROPERTY_INFO.name}</h5>
                  <p class="mb-0 small text-muted">${PROPERTY_INFO.address}</p>
                  <p class="mb-0 small text-muted">ĐT: ${PROPERTY_INFO.phone}</p>
                </div>
                <div class="text-end">
                  <h4 class="fw-bold text-uppercase mb-1">Hóa Đơn Tiền Phòng</h4>
                  <p class="mb-0"><strong>Số:</strong> ${invoiceIdShort}</p>
                  <p class="mb-0"><strong>Tháng:</strong> ${invoice.month}/${invoice.year}</p>
                </div>
              </div>
              <hr class="my-2" />
            </div>

            <!-- ═══════ THÔNG TIN PHÒNG & NGƯỜI THUÊ ═══════ -->
            <div class="row g-2 mb-3">
              <div class="col-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted" width="40%">Phòng:</td><td><strong>${roomName}</strong></td></tr>
                  <tr><td class="text-muted">Người thuê:</td><td><strong>${tenantName}</strong></td></tr>
                </table>
              </div>
              <div class="col-6">
                <table class="table table-sm table-borderless mb-0">
                  <tr><td class="text-muted" width="50%">Thời gian sử dụng:</td><td>Tháng ${invoice.month}/${invoice.year}</td></tr>
                  <tr><td class="text-muted">Ngày lập:</td><td>${invoice.createdAt ? formatDateToDisplay(invoice.createdAt) : 'N/A'}</td></tr>
                </table>
              </div>
            </div>

            <!-- ═══════ BẢNG CHI TIẾT CÁC KHOẢN ═══════ -->
            <table class="table table-bordered invoice-print-table">
              <thead>
                <tr class="table-light">
                  <th width="5%" class="text-center">STT</th>
                  <th>Nội dung</th>
                  <th width="15%" class="text-end">Số lượng</th>
                  <th width="20%" class="text-end">Đơn giá</th>
                  <th width="20%" class="text-end">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <!-- 1. Tiền phòng -->
                <tr>
                  <td class="text-center">1</td>
                  <td><strong>Tiền thuê phòng</strong></td>
                  <td class="text-end">1 tháng</td>
                  <td class="text-end">${formatCurrency(invoice.roomFee)}</td>
                  <td class="text-end"><strong>${formatCurrency(invoice.roomFee)}</strong></td>
                </tr>

                <!-- Dịch vụ chi tiết -->
                ${serviceDetails.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 2}</td>
                    <td>${item.name}</td>
                    <td class="text-end">${item.usage} ${item.unit || ''}</td>
                    <td class="text-end">${formatCurrency(item.unitPrice)}</td>
                    <td class="text-end">${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- ═══════ TỔNG KẾT ═══════ -->
            <div class="row">
              <div class="col-7">
                <!-- Ghi chú -->
                ${invoice.note ? `
                  <div class="p-2 bg-light rounded small">
                    <strong>Ghi chú:</strong> ${invoice.note}
                  </div>
                ` : ''}
              </div>
              <div class="col-5">
                <table class="table table-sm table-borderless invoice-summary-table">
                  <tr>
                    <td class="text-muted">Tạm tính:</td>
                    <td class="text-end">${formatCurrency(subtotal)}</td>
                  </tr>
                  <tr class="text-danger">
                    <td>Giảm giá:</td>
                    <td class="text-end" data-testid="detail-discount">- ${formatCurrency(invoice.discount)}</td>
                  </tr>
                  <tr class="border-top">
                    <td class="fw-bold fs-6">Tổng cộng:</td>
                    <td class="text-end fw-bold fs-6 text-primary" data-testid="detail-total-amount">${formatCurrency(invoice.totalAmount)}</td>
                  </tr>
                  <tr class="text-success">
                    <td>Đã thanh toán:</td>
                    <td class="text-end" data-testid="detail-paid-amount">${formatCurrency(invoice.paidAmount)}</td>
                  </tr>
                  <tr class="text-danger fw-semibold">
                    <td>Còn nợ:</td>
                    <td class="text-end" data-testid="detail-remaining-debt">${formatCurrency(invoice.remainingDebt)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <hr />

            <!-- ═══════ HẠN THANH TOÁN & CHUYỂN KHOẢN ═══════ -->
            <div class="row g-3 mb-4">
              <div class="col-7">
                <div class="border rounded p-3 h-100">
                  <p class="fw-bold mb-2"><i class="bi bi-calendar-check"></i> Hạn thanh toán: <span class="text-danger">${formatDateToDisplay(invoice.dueDate)}</span></p>
                  <p class="mb-1 small"><strong>Thông tin chuyển khoản:</strong></p>
                  <table class="table table-sm table-borderless mb-0 small">
                    <tr><td class="text-muted" width="35%">Ngân hàng:</td><td>${PROPERTY_INFO.bankName}</td></tr>
                    <tr><td class="text-muted">Số tài khoản:</td><td><strong>${PROPERTY_INFO.bankAccount}</strong></td></tr>
                    <tr><td class="text-muted">Chủ tài khoản:</td><td>${PROPERTY_INFO.bankOwner}</td></tr>
                    <tr><td class="text-muted">Nội dung CK:</td><td><em>${roomName} T${invoice.month}</em></td></tr>
                  </table>
                </div>
              </div>
              <div class="col-5 text-center">
                <div class="border rounded p-3 h-100 d-flex flex-column align-items-center justify-content-center">
                  <div class="qr-placeholder mb-2">
                    <i class="bi bi-qr-code" style="font-size: 4rem; color: #ccc;"></i>
                  </div>
                  <p class="small text-muted mb-0">Quét QR để thanh toán</p>
                </div>
              </div>
            </div>

            <!-- ═══════ CHỮ KÝ ═══════ -->
            <div class="row text-center mt-4">
              <div class="col-6">
                <p class="fw-bold mb-0">Người lập hóa đơn</p>
                <p class="small text-muted">(Ký, ghi rõ họ tên)</p>
                <div style="height: 60px;"></div>
                <p class="fw-bold mb-0">___________________</p>
              </div>
              <div class="col-6">
                <p class="fw-bold mb-0">Người thanh toán</p>
                <p class="small text-muted">(Ký, ghi rõ họ tên)</p>
                <div style="height: 60px;"></div>
                <p class="fw-bold mb-0">___________________</p>
              </div>
            </div>

          </div>

          <!-- Footer modal (không in) -->
          <div class="modal-footer justify-content-between d-print-none">
            <button type="button" class="btn btn-outline-dark" id="btnPrintInvoice" data-testid="btn-print-invoice">
              <i class="bi bi-printer me-1"></i> In hóa đơn
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
      // Trích xuất vùng in ra khỏi modal (khắc phục lỗi trang trắng của Bootstrap Modal khi in)
      const printContainer = document.createElement('div');
      printContainer.id = 'print-container-temp';
      const clone = document.getElementById('invoicePrintArea').cloneNode(true);
      printContainer.appendChild(clone);
      document.body.appendChild(printContainer);
      
      window.print();
      
      document.body.removeChild(printContainer);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      container.innerHTML = '';
    });

    bsModal.show();
  }
}
