// src/components/contract-detail.js

/**
 * Component xem chi tiết hợp đồng.
 * Hiển thị trong Bootstrap Modal (read-only).
 */

import { getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import {
  CONTRACT_STATUS,
  CONTRACT_STATUS_LABELS,
  ROOM_STATUS_LABELS,
} from '../constants/statuses.js';
import { isContractExpiringSoon } from '../business/contract-utils.js';

/**
 * Lấy class CSS cho badge trạng thái hợp đồng.
 */
function getStatusBadgeClass(status) {
  switch (status) {
    case CONTRACT_STATUS.ACTIVE: return 'badge-contract-active';
    case CONTRACT_STATUS.EXPIRED: return 'badge-contract-expired';
    case CONTRACT_STATUS.TERMINATED: return 'badge-contract-terminated';
    default: return 'bg-secondary';
  }
}

/**
 * Mở modal chi tiết hợp đồng.
 *
 * @param {Object} contract - Hợp đồng cần xem.
 */
export function openContractDetail(contract) {
  if (!contract) return;

  const room = getRoomById(contract.roomId);
  const tenant = getTenantById(contract.tenantId);

  const roomName = room ? room.name : 'N/A';
  const roomStatus = room ? (ROOM_STATUS_LABELS[room.status] || room.status) : 'N/A';
  const tenantName = tenant ? tenant.fullName : 'N/A';
  const tenantPhone = tenant ? (tenant.phone || 'N/A') : 'N/A';
  const tenantIdCard = tenant ? (tenant.idCard || 'N/A') : 'N/A';
  const statusLabel = CONTRACT_STATUS_LABELS[contract.status] || contract.status;
  const badgeClass = getStatusBadgeClass(contract.status);

  const expiringSoon = isContractExpiringSoon(contract, new Date(), 30);
  const expiringBadge = expiringSoon
    ? '<span class="badge bg-warning text-dark ms-2">Sắp hết hạn</span>'
    : '';

  // Người ở cùng
  let coTenantHtml = '<span class="text-muted">Không có</span>';
  if (Array.isArray(contract.coTenantIds) && contract.coTenantIds.length > 0) {
    coTenantHtml = '<ul class="mb-0 ps-3">' +
      contract.coTenantIds.map(id => {
        const ct = getTenantById(id);
        return `<li>${ct ? ct.fullName : id}</li>`;
      }).join('') +
      '</ul>';
  }

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="contractDetailModal" tabindex="-1" aria-hidden="true" data-testid="contract-detail-modal">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" data-testid="contract-detail-title">
              Chi tiết hợp đồng
              <span class="badge ${badgeClass} ms-2">${statusLabel}</span>
              ${expiringBadge}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <!-- Thông tin phòng -->
            <div class="contract-detail-section" data-testid="detail-room-section">
              <h6>Thông tin phòng</h6>
              <div class="detail-row">
                <span class="detail-label">Phòng</span>
                <span class="detail-value" data-testid="detail-room-name">${roomName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Trạng thái phòng</span>
                <span class="detail-value">${roomStatus}</span>
              </div>
            </div>

            <!-- Thông tin người thuê -->
            <div class="contract-detail-section" data-testid="detail-tenant-section">
              <h6>Người đại diện</h6>
              <div class="detail-row">
                <span class="detail-label">Họ tên</span>
                <span class="detail-value" data-testid="detail-tenant-name">${tenantName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Điện thoại</span>
                <span class="detail-value">${tenantPhone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">CCCD</span>
                <span class="detail-value">${tenantIdCard}</span>
              </div>
            </div>

            <!-- Người ở cùng -->
            <div class="contract-detail-section" data-testid="detail-co-tenants-section">
              <h6>Người ở cùng</h6>
              ${coTenantHtml}
            </div>

            <!-- Thông tin hợp đồng -->
            <div class="contract-detail-section" data-testid="detail-contract-section">
              <h6>Thông tin hợp đồng</h6>
              <div class="detail-row">
                <span class="detail-label">Mã hợp đồng</span>
                <span class="detail-value" data-testid="detail-contract-id">${contract.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ngày bắt đầu</span>
                <span class="detail-value" data-testid="detail-start-date">${formatDateToDisplay(contract.startDate)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Ngày kết thúc</span>
                <span class="detail-value" data-testid="detail-end-date">${formatDateToDisplay(contract.endDate)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Giá thuê (trên HĐ)</span>
                <span class="detail-value" data-testid="detail-room-price">${formatCurrency(contract.roomPrice)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Tiền cọc</span>
                <span class="detail-value" data-testid="detail-deposit">${formatCurrency(contract.deposit)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Trạng thái</span>
                <span class="detail-value"><span class="badge ${badgeClass}">${statusLabel}</span></span>
              </div>
            </div>

            <!-- Thời gian -->
            <div class="contract-detail-section">
              <h6>Thời gian hệ thống</h6>
              <div class="detail-row">
                <span class="detail-label">Tạo lúc</span>
                <span class="detail-value">${contract.createdAt ? formatDateToDisplay(contract.createdAt) : 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Cập nhật lần cuối</span>
                <span class="detail-value">${contract.updatedAt ? formatDateToDisplay(contract.updatedAt) : 'N/A'}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-testid="btn-detail-close">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('contractDetailModal');
  if (window.bootstrap && window.bootstrap.Modal) {
    const bsModal = new window.bootstrap.Modal(modalEl);
    modalEl.addEventListener('hidden.bs.modal', () => {
      container.innerHTML = '';
    });
    bsModal.show();
  }
}
