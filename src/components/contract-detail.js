// src/components/contract-detail.js

/**
 * Component xem chi tiết hợp đồng.
 * Hiển thị dạng thẻ (card), timeline dọc và tích hợp các nút gia hạn, kết thúc, in hợp đồng.
 */

import { getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { printContract } from '../utils/print-utils.js';
import {
  CONTRACT_STATUS,
  CONTRACT_STATUS_LABELS,
  ROOM_STATUS_LABELS,
} from '../constants/statuses.js';

/**
 * Lấy class CSS cho badge trạng thái hợp đồng.
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case CONTRACT_STATUS.ACTIVE: return 'bg-success text-white';
    case CONTRACT_STATUS.EXPIRED: return 'bg-secondary text-white';
    case CONTRACT_STATUS.TERMINATED: return 'bg-danger text-white';
    case CONTRACT_STATUS.DRAFT: return 'bg-warning text-dark';
    default: return 'bg-secondary text-white';
  }
}

/**
 * Mở modal chi tiết hợp đồng.
 *
 * @param {Object|Object} optionsOrContract - Hợp đồng hoặc đối tượng cấu hình chứa callback.
 */
export function openContractDetail(optionsOrContract) {
  let contract, onExtend, onEnd, onPrint;

  if (optionsOrContract && optionsOrContract.contract) {
    contract = optionsOrContract.contract;
    onExtend = optionsOrContract.onExtend;
    onEnd = optionsOrContract.onEnd;
    onPrint = optionsOrContract.onPrint;
  } else {
    contract = optionsOrContract;
  }

  if (!contract) return;

  const room = getRoomById(contract.roomId);
  const tenant = getTenantById(contract.tenantId);

  const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : 'N/A';
  const roomStatus = room ? (ROOM_STATUS_LABELS[room.status] || room.status) : 'N/A';
  const tenantName = tenant ? tenant.fullName : 'N/A';
  const tenantPhone = tenant ? (tenant.phone || 'N/A') : 'N/A';
  const tenantIdCard = tenant ? (tenant.idCard || 'N/A') : 'N/A';
  const tenantEmail = tenant ? (tenant.email || 'N/A') : 'N/A';
  const tenantAddress = tenant ? (tenant.address || 'N/A') : 'N/A';
  const statusLabel = CONTRACT_STATUS_LABELS[contract.status] || contract.status;
  const badgeClass = getStatusBadgeClass(contract.status);

  // Tính ngày cảnh báo hết hạn
  const diffTime = new Date(contract.endDate) - new Date();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpiringSoon = contract.status === CONTRACT_STATUS.ACTIVE && diffDays > 0 && diffDays <= 15;

  // Thành viên cùng phòng (Người ở cùng)
  const coTenants = Array.isArray(contract.coTenantIds)
    ? contract.coTenantIds.map(id => getTenantById(id)).filter(Boolean)
    : [];

  let coTenantsHtml = '<p class="text-muted small mb-0">Không có người ở cùng.</p>';
  if (coTenants.length > 0) {
    coTenantsHtml = `
      <div class="table-responsive">
        <table class="table table-sm table-borderless mb-0">
          <thead>
            <tr class="text-muted small border-bottom">
              <th>Họ tên</th>
              <th>Số điện thoại</th>
              <th>CCCD</th>
            </tr>
          </thead>
          <tbody>
            ${coTenants.map(ct => `
              <tr>
                <td><strong>${ct.fullName}</strong></td>
                <td>${ct.phone || '—'}</td>
                <td>${ct.idCard || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // --- Tạo danh sách Mốc Thời gian Timeline ---
  const timelineItems = [];

  // Mốc 1: Ngày tạo
  const createdDate = contract.createdAt || contract.startDate;
  timelineItems.push({
    date: createdDate,
    title: 'Ngày tạo hợp đồng',
    description: contract.status === CONTRACT_STATUS.DRAFT ? 'Khởi tạo bản nháp hợp đồng trên hệ thống.' : 'Khởi tạo hợp đồng.',
    color: 'bg-primary'
  });

  // Mốc 2: Ngày kích hoạt hiệu lực
  if (contract.status !== CONTRACT_STATUS.DRAFT) {
    timelineItems.push({
      date: contract.startDate,
      title: 'Kích hoạt hợp đồng',
      description: 'Hợp đồng chính thức có hiệu lực hoạt động.',
      color: 'bg-success'
    });
  }

  // Mốc 3: Lấy từ history nếu có các lần gia hạn
  if (Array.isArray(contract.history)) {
    contract.history.forEach(h => {
      if (h.title === 'Gia hạn hợp đồng') {
        timelineItems.push({
          date: h.date,
          title: h.title,
          description: h.description,
          color: 'bg-info'
        });
      }
    });
  }

  // Mốc 4: Ngày kết thúc / Ngày thanh lý hoặc dự kiến
  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    const endD = contract.actualEndDate || contract.endDate;
    timelineItems.push({
      date: endD,
      title: 'Kết thúc hợp đồng',
      description: 'Hợp đồng được thanh lý hoặc hủy bỏ trước hạn.',
      color: 'bg-danger'
    });
  } else if (contract.status === CONTRACT_STATUS.EXPIRED) {
    timelineItems.push({
      date: contract.endDate,
      title: 'Hợp đồng hết hạn',
      description: 'Hợp đồng kết thúc thời hạn hiệu lực theo lịch biểu.',
      color: 'bg-secondary'
    });
  } else if (contract.status === CONTRACT_STATUS.ACTIVE) {
    timelineItems.push({
      date: contract.endDate,
      title: 'Thời hạn hết hạn dự kiến',
      description: 'Ngày hết hạn thỏa thuận ban đầu.',
      color: 'bg-secondary'
    });
  }

  // Sắp xếp timeline tăng dần theo thời gian
  timelineItems.sort((a, b) => new Date(a.date) - new Date(b.date));

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <style>
      .detail-card {
        border: none;
        box-shadow: 0 0.125rem 0.25rem rgba(0, 0, 0, 0.05);
        border-radius: 0.5rem;
        height: 100%;
        background-color: #fff;
      }
      .detail-card .card-header {
        background-color: #fff;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        font-weight: bold;
        color: #495057;
      }
      .detail-label {
        font-weight: 500;
        color: #6c757d;
      }
      .detail-value {
        font-weight: 600;
        color: #212529;
      }
      /* Vertical Timeline styles */
      .timeline {
        position: relative;
        padding-left: 20px;
        margin-left: 10px;
        border-left: 2px solid #e9ecef;
      }
      .timeline-item {
        position: relative;
        padding-left: 20px;
        padding-bottom: 1.25rem;
      }
      .timeline-item:last-child {
        padding-bottom: 0;
      }
      .timeline-marker {
        position: absolute;
        left: -29px;
        top: 4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 3px solid #fff;
        box-shadow: 0 0 0 2px #e9ecef;
      }
      .timeline-marker.bg-primary { box-shadow: 0 0 0 2px #0d6efd; }
      .timeline-marker.bg-success { box-shadow: 0 0 0 2px #198754; }
      .timeline-marker.bg-info { box-shadow: 0 0 0 2px #0dcaf0; }
      .timeline-marker.bg-danger { box-shadow: 0 0 0 2px #dc3545; }
      .timeline-marker.bg-secondary { box-shadow: 0 0 0 2px #6c757d; }
    </style>

    <div class="modal fade" id="contractDetailModal" tabindex="-1" aria-hidden="true" data-testid="contract-detail-modal">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content border-0 shadow">
          <div class="modal-header bg-light">
            <h5 class="modal-title fw-bold text-dark" data-testid="contract-detail-title">
              <i class="bi bi-file-earmark-text me-2 text-primary"></i>Chi tiết hợp đồng
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div class="modal-body bg-light-subtle">
            <!-- Alert cảnh báo nếu sắp hết hạn dưới 15 ngày -->
            ${isExpiringSoon ? `
              <div class="alert alert-warning border-0 shadow-sm d-flex align-items-center mb-3 py-3" role="alert">
                <i class="bi bi-exclamation-triangle-fill fs-4 text-warning me-3"></i>
                <div>
                  <strong class="text-dark">Hợp đồng sắp hết hạn!</strong><br>
                  <span class="text-muted small">Hợp đồng này sẽ chính thức hết hạn sau <strong>${diffDays} ngày</strong>. Hãy thực hiện gia hạn nếu người thuê muốn tiếp tục ở.</span>
                </div>
              </div>
            ` : ''}

            <!-- Thanh Header thông tin mã & hành động -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 p-3 bg-white border rounded shadow-sm">
              <div class="d-flex align-items-center gap-2">
                <span class="fs-5 fw-bold text-dark" data-testid="detail-contract-id">${contract.id}</span>
                <span class="badge ${badgeClass} px-3 py-2 rounded-pill fs-7">${statusLabel}</span>
              </div>
              <div class="d-flex gap-2">
                ${contract.status === CONTRACT_STATUS.ACTIVE ? `
                  <button class="btn btn-outline-success btn-sm d-flex align-items-center gap-1" id="btnDetailExtend">
                    <i class="bi bi-calendar-plus"></i> Gia hạn
                  </button>
                  <button class="btn btn-outline-danger btn-sm d-flex align-items-center gap-1" id="btnDetailEnd">
                    <i class="bi bi-stop-circle"></i> Kết thúc
                  </button>
                ` : ''}
                <button class="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" id="btnDetailPrint">
                  <i class="bi bi-printer"></i> In hợp đồng
                </button>
              </div>
            </div>

            <div class="row g-3">
              <!-- Card 1: Thông tin phòng -->
              <div class="col-md-6" data-testid="detail-room-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-door-open me-2 text-primary"></i>1. Thông tin phòng</div>
                  <div class="card-body">
                    <div class="mb-2"><span class="detail-label">Phòng:</span> <span class="detail-value" data-testid="detail-room-name">${roomName}</span></div>
                    <div class="mb-2"><span class="detail-label">Tầng:</span> <span class="detail-value">${room ? room.floor : 'N/A'}</span></div>
                    <div class="mb-2"><span class="detail-label">Sức chứa tối đa:</span> <span class="detail-value">Tối đa ${room ? room.maxTenants : 0} người</span></div>
                    <div class="mb-2"><span class="detail-label">Trạng thái phòng:</span> <span class="badge bg-light text-dark border">${roomStatus}</span></div>
                    ${room && room.description ? `<div><span class="detail-label">Mô tả:</span> <span class="text-muted small">${room.description}</span></div>` : ''}
                  </div>
                </div>
              </div>

              <!-- Card 2: Người đại diện -->
              <div class="col-md-6" data-testid="detail-tenant-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-person-badge me-2 text-primary"></i>2. Người đại diện</div>
                  <div class="card-body">
                    <div class="mb-2"><span class="detail-label">Họ và tên:</span> <span class="detail-value" data-testid="detail-tenant-name">${tenantName}</span></div>
                    <div class="mb-2"><span class="detail-label">Số điện thoại:</span> <span class="detail-value">${tenantPhone}</span></div>
                    <div class="mb-2"><span class="detail-label">Số CCCD:</span> <span class="detail-value">${tenantIdCard}</span></div>
                    <div class="mb-2"><span class="detail-label">Email:</span> <span class="text-dark small">${tenantEmail}</span></div>
                    <div><span class="detail-label">Địa chỉ:</span> <span class="text-muted small">${tenantAddress}</span></div>
                  </div>
                </div>
              </div>

              <!-- Card 3: Người ở cùng -->
              <div class="col-md-6" data-testid="detail-co-tenants-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-people me-2 text-primary"></i>3. Người ở cùng</div>
                  <div class="card-body">
                    ${coTenantsHtml}
                  </div>
                </div>
              </div>

              <!-- Card 4: Thời hạn hợp đồng -->
              <div class="col-md-6" data-testid="detail-duration-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-calendar-range me-2 text-primary"></i>4. Thời hạn hợp đồng</div>
                  <div class="card-body">
                    <div class="mb-2"><span class="detail-label">Ngày bắt đầu:</span> <span class="detail-value" data-testid="detail-start-date">${formatDateToDisplay(contract.startDate)}</span></div>
                    <div class="mb-2"><span class="detail-label">Ngày kết thúc:</span> <span class="detail-value" data-testid="detail-end-date">${formatDateToDisplay(contract.endDate)}</span></div>
                    <div class="mb-2"><span class="detail-label">Đóng tiền hàng tháng:</span> <span class="detail-value">Ngày ${contract.paymentDay || 1} hàng tháng</span></div>
                    <div><span class="detail-label">Số xe đăng ký:</span> <span class="detail-value">${contract.vehicles || 0} xe</span></div>
                  </div>
                </div>
              </div>

              <!-- Card 5: Giá thuê và tiền cọc -->
              <div class="col-md-6" data-testid="detail-finance-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-cash-coin me-2 text-primary"></i>5. Giá thuê & Tiền cọc</div>
                  <div class="card-body">
                    <div class="mb-3">
                      <span class="detail-label">Giá thuê hiện tại:</span><br>
                      <strong class="fs-5 text-danger" data-testid="detail-room-price">${formatCurrency(contract.roomPrice)}</strong> <span class="text-muted small">/ tháng</span>
                    </div>
                    <div>
                      <span class="detail-label">Tiền đặt cọc phòng:</span><br>
                      <strong class="fs-5 text-success" data-testid="detail-deposit">${formatCurrency(contract.deposit)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card 6: Điều khoản & Ghi chú -->
              <div class="col-md-6" data-testid="detail-terms-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-file-earmark-check me-2 text-primary"></i>6. Điều khoản bổ sung</div>
                  <div class="card-body">
                    <div class="mb-2">
                      <span class="detail-label">Điều khoản hợp đồng:</span>
                      <p class="text-muted small mb-0 border-start ps-2 py-1 bg-light rounded" style="white-space: pre-wrap;">${contract.terms || 'Không có điều khoản bổ sung.'}</p>
                    </div>
                    <div>
                      <span class="detail-label">Ghi chú hành chính:</span>
                      <p class="text-muted small mb-0 font-italic" style="white-space: pre-wrap;">${contract.notes || 'Không có ghi chú.'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Card 7: Lịch sử thay đổi / Timeline -->
              <div class="col-12" data-testid="detail-history-section">
                <div class="card detail-card">
                  <div class="card-header"><i class="bi bi-clock-history me-2 text-primary"></i>7. Lịch sử thay đổi & Mốc thời gian</div>
                  <div class="card-body">
                    <div class="timeline mt-2">
                      ${timelineItems.map(item => `
                        <div class="timeline-item">
                          <div class="timeline-marker ${item.color}"></div>
                          <div class="timeline-content">
                            <div class="d-flex justify-content-between align-items-center">
                              <h6 class="mb-1 fw-bold text-dark">${item.title}</h6>
                              <span class="text-muted small">${formatDateToDisplay(item.date)}</span>
                            </div>
                            <p class="text-muted small mb-0">${item.description}</p>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer bg-light">
            <button type="button" class="btn btn-secondary px-4 btn-sm" data-bs-dismiss="modal" data-testid="btn-detail-close">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('contractDetailModal');
  if (window.bootstrap && window.bootstrap.Modal) {
    const bsModal = new window.bootstrap.Modal(modalEl);

    // Xử lý sự kiện click nút Gia hạn
    const btnExtend = document.getElementById('btnDetailExtend');
    if (btnExtend) {
      btnExtend.addEventListener('click', () => {
        bsModal.hide();
        if (typeof onExtend === 'function') {
          setTimeout(onExtend, 350);
        }
      });
    }

    // Xử lý sự kiện click nút Kết thúc
    const btnEnd = document.getElementById('btnDetailEnd');
    if (btnEnd) {
      btnEnd.addEventListener('click', () => {
        bsModal.hide();
        if (typeof onEnd === 'function') {
          setTimeout(onEnd, 350);
        }
      });
    }

    // Xử lý sự kiện click nút In hợp đồng
    const btnPrint = document.getElementById('btnDetailPrint');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        if (typeof onPrint === 'function') {
          onPrint();
        } else {
          printContract(contract, room, tenant, coTenants);
        }
      });
    }

    modalEl.addEventListener('hidden.bs.modal', () => {
      container.innerHTML = '';
    });
    bsModal.show();
  }
}
