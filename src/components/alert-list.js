// src/components/alert-list.js

import { getExpiringContractsReport } from '../services/report-service.js';
import { getRoomsWithoutReading } from '../services/meter-reading-service.js';
import { getOutstandingInvoices, calculateDaysOverdue } from '../services/debt-service.js';
import { getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import * as StorageService from '../services/storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { ROOM_STATUS, CONTRACT_STATUS, INVOICE_STATUS } from '../constants/statuses.js';

/**
 * Render danh sách cảnh báo lên container.
 *
 * @param {HTMLElement} container - Vùng chứa danh sách cảnh báo.
 */
export function renderAlertList(container) {
  if (!container) return;

  const alerts = [];
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // 1. Thu thập hóa đơn quá hạn (Danger)
  const outstanding = getOutstandingInvoices();
  outstanding.forEach(inv => {
    const days = calculateDaysOverdue(inv.dueDate, today);
    if (days > 0) {
      const room = getRoomById(inv.roomId);
      const roomName = room ? room.name : inv.roomId;
      alerts.push({
        type: 'danger',
        class: 'alert-item-danger',
        icon: '🚨',
        title: `Hóa đơn trễ hạn - Phòng ${roomName}`,
        message: `Hóa đơn tháng ${inv.month}/${inv.year} quá hạn đóng ${days} ngày (Hạn: ${formatDateToDisplay(inv.dueDate)}).`
      });
    }
  });

  // 2. Thu thập hợp đồng sắp hết hạn (Warning)
  const expiringContracts = getExpiringContractsReport();
  expiringContracts.forEach(c => {
    const room = getRoomById(c.roomId);
    const roomName = room ? room.name : c.roomId;
    const tenant = getTenantById(c.tenantId);
    const tenantName = tenant ? tenant.fullName : c.tenantId;

    alerts.push({
      type: 'warning',
      class: 'alert-item-warning',
      icon: '📅',
      title: `Hợp đồng sắp hết hạn - Phòng ${roomName}`,
      message: `Hợp đồng của ${tenantName} sắp hết hạn vào ngày ${formatDateToDisplay(c.endDate)}.`
    });
  });

  // 3. Thu thập phòng đang thuê chưa ghi chỉ số (Info)
  const unrecordedRooms = getRoomsWithoutReading(currentMonth, currentYear);
  unrecordedRooms.forEach(room => {
    alerts.push({
      type: 'info',
      class: 'alert-item-info',
      icon: '⚡',
      title: `Chưa chốt điện nước - Phòng ${room.name}`,
      message: `Chưa ghi nhận chỉ số điện nước tháng ${currentMonth}/${currentYear}.`
    });
  });

  const rooms = StorageService.getAll(STORAGE_KEYS.ROOMS) || [];
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS) || [];
  const invoices = StorageService.getAll(STORAGE_KEYS.INVOICES) || [];

  // 4. Phòng trống lâu ngày (Info)
  rooms.forEach(room => {
    if (room.status === ROOM_STATUS.AVAILABLE) {
      alerts.push({
        type: 'info',
        class: 'alert-item-info',
        icon: '🏠',
        title: `Phòng trống - ${room.name}`,
        message: `Phòng đang ở trạng thái trống, chưa có hợp đồng thuê.`
      });
    }
  });

  // 5. Hợp đồng chờ hiệu lực (Info)
  contracts.forEach(c => {
    if (c.status === CONTRACT_STATUS.PENDING) {
      const room = getRoomById(c.roomId);
      const roomName = room ? room.name : c.roomId;
      alerts.push({
        type: 'info',
        class: 'alert-item-info',
        icon: '⏳',
        title: `Hợp đồng chờ hiệu lực - Phòng ${roomName}`,
        message: `Hợp đồng sắp bắt đầu vào ngày ${formatDateToDisplay(c.startDate)}.`
      });
    }
  });

  // 6. Hóa đơn chưa thanh toán (Warning - Not overdue yet)
  invoices.forEach(inv => {
    if (inv.status === INVOICE_STATUS.UNPAID || inv.status === INVOICE_STATUS.PARTIAL) {
      const days = calculateDaysOverdue(inv.dueDate, today);
      if (days <= 0) { // Not overdue
        const room = getRoomById(inv.roomId);
        const roomName = room ? room.name : inv.roomId;
        alerts.push({
          type: 'warning',
          class: 'alert-item-warning',
          icon: '⏳',
          title: `Chờ thanh toán - Phòng ${roomName}`,
          message: `Hóa đơn tháng ${inv.month}/${inv.year} còn nợ ${inv.remainingDebt?.toLocaleString('vi-VN')} đ (Hạn: ${formatDateToDisplay(inv.dueDate)}).`
        });
      }
    }
  });

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="text-muted text-center py-4" data-testid="alerts-empty">
        ✅ Hiện tại không có cảnh báo nào cần xử lý.
      </div>
    `;
    return;
  }

  // Sắp xếp: Nguy cấp (danger) trước, cảnh báo (warning) sau, thông tin (info) sau cùng
  const order = { danger: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.type] - order[b.type]);

  container.innerHTML = `
    <div class="alert-list-wrapper" style="max-height: 380px; overflow-y: auto;" data-testid="alert-list">
      ${alerts.map(item => `
        <div class="alert-item-custom ${item.class} d-flex align-items-start gap-2" data-testid="alert-item-${item.type}">
          <span class="fs-5">${item.icon}</span>
          <div>
            <strong class="d-block mb-1">${item.title}</strong>
            <span class="text-muted">${item.message}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
export default renderAlertList;
