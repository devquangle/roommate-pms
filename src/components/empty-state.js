// src/components/empty-state.js

/**
 * Cấu phần Empty State dùng chung cho ứng dụng RoomMate.
 * Cung cấp thiết kế giao diện đồng nhất, tinh tế cho các trường hợp trống dữ liệu hoặc không tìm thấy kết quả.
 *
 * @param {string} type - Loại empty state ('no-rooms' | 'no-tenants' | 'no-contracts' | 'no-invoices' | 'no-reports' | 'no-results' | 'no-readings' | 'no-payments' | 'no-debts')
 * @param {Object} [options] - Các cấu hình mở rộng
 * @param {string} [options.actionText] - Tên nút hành động tùy chỉnh
 * @param {string} [options.actionId] - ID của nút hành động
 * @param {string} [options.actionTestId] - data-testid cho nút hành động
 * @returns {string} Chuỗi HTML
 */
export function renderEmptyState(type, options = {}) {
  const configs = {
    'no-rooms': {
      icon: 'bi-house-door',
      iconColor: 'text-primary',
      title: 'Chưa có phòng trọ nào',
      description: 'Hệ thống hiện chưa ghi nhận phòng trọ nào. Hãy thêm phòng mới hoặc nạp dữ liệu mẫu để bắt đầu quản lý.',
      actionText: options.actionText || '➕ Thêm phòng trọ mới',
      actionId: options.actionId || 'btnEmptyActionAddRoom',
      actionTestId: options.actionTestId || 'btn-empty-add-room',
      btnClass: 'btn-primary'
    },
    'no-tenants': {
      icon: 'bi-people',
      iconColor: 'text-success',
      title: 'Chưa có khách thuê',
      description: 'Chưa có thông tin khách thuê nào được lưu trữ. Hãy đăng ký người thuê mới để lập hợp đồng và tính tiền phòng.',
      actionText: options.actionText || '👤 Thêm khách thuê mới',
      actionId: options.actionId || 'btnEmptyActionAddTenant',
      actionTestId: options.actionTestId || 'btn-empty-add-tenant',
      btnClass: 'btn-success'
    },
    'no-contracts': {
      icon: 'bi-file-earmark-text',
      iconColor: 'text-info',
      title: 'Chưa có hợp đồng thuê phòng',
      description: 'Không tìm thấy hợp đồng nào đang hoạt động. Hãy tạo hợp đồng mới để bắt đầu ràng buộc thuê phòng và tính tiền phòng tự động.',
      actionText: options.actionText || '📝 Lập hợp đồng mới',
      actionId: options.actionId || 'btnEmptyActionAddContract',
      actionTestId: options.actionTestId || 'btn-empty-add-contract',
      btnClass: 'btn-info text-white'
    },
    'no-invoices': {
      icon: 'bi-receipt',
      iconColor: 'text-warning',
      title: 'Chưa có hóa đơn nào',
      description: 'Chưa có hóa đơn nào được lập. Bạn có thể sử dụng chức năng lập hóa đơn hàng loạt hoặc lập hóa đơn thủ công.',
      actionText: options.actionText || '⚙️ Lập hóa đơn hàng loạt',
      actionId: options.actionId || 'btnEmptyActionCreateInvoices',
      actionTestId: options.actionTestId || 'btn-empty-create-invoices',
      btnClass: 'btn-warning text-dark'
    },
    'no-reports': {
      icon: 'bi-bar-chart-line',
      iconColor: 'text-secondary',
      title: 'Chưa có dữ liệu báo cáo',
      description: 'Không tìm thấy dữ liệu phát sinh nào trong khoảng thời gian đã chọn để lập báo cáo phân tích.',
      actionText: options.actionText || '🔄 Thay đổi bộ lọc lọc lại',
      actionId: options.actionId || 'btnEmptyActionResetFilter',
      actionTestId: options.actionTestId || 'btn-empty-reset-filter',
      btnClass: 'btn-outline-secondary'
    },
    'no-results': {
      icon: 'bi-search',
      iconColor: 'text-muted',
      title: 'Không tìm thấy kết quả phù hợp',
      description: 'Chúng tôi đã thử tìm kiếm khắp hệ thống nhưng không tìm thấy dữ liệu nào trùng khớp với từ khóa tìm kiếm của bạn.',
      actionText: options.actionText || '🧹 Xóa các bộ lọc tìm kiếm',
      actionId: options.actionId || 'btnEmptyActionClearFilters',
      actionTestId: options.actionTestId || 'btn-empty-clear-filters',
      btnClass: 'btn-light border text-secondary'
    },
    'no-readings': {
      icon: 'bi-lightning-charge',
      iconColor: 'text-danger',
      title: 'Chưa ghi chỉ số điện nước tháng này',
      description: 'Chưa ghi nhận chỉ số điện nước mới nhất cho kỳ chốt hiện tại. Vui lòng cập nhật chỉ số để làm cơ sở tính tiền phòng.',
      actionText: options.actionText || '⚡ Nhập chỉ số điện nước',
      actionId: options.actionId || 'btnEmptyActionRecordMeters',
      actionTestId: options.actionTestId || 'btn-empty-record-meters',
      btnClass: 'btn-danger'
    },
    'no-payments': {
      icon: 'bi-credit-card',
      iconColor: 'text-success',
      title: 'Chưa có giao dịch thanh toán nào',
      description: 'Chưa phát sinh giao dịch đóng tiền phòng nào cho hóa đơn này hoặc trong kỳ thống kê này.',
      actionText: options.actionText || '💳 Ghi nhận thanh toán mới',
      actionId: options.actionId || 'btnEmptyActionAddPayment',
      actionTestId: options.actionTestId || 'btn-empty-add-payment',
      btnClass: 'btn-success'
    },
    'no-debts': {
      icon: 'bi-wallet2',
      iconColor: 'text-muted',
      title: 'Không có công nợ cần thu',
      description: 'Tuyệt vời! Tất cả các phòng trọ hiện đã tất toán hóa đơn hoàn toàn, không có dư nợ quá hạn.',
      actionText: options.actionText || '📅 Xem lịch sử giao dịch',
      actionId: options.actionId || 'btnEmptyActionViewPayments',
      actionTestId: options.actionTestId || 'btn-empty-view-payments',
      btnClass: 'btn-outline-primary'
    }
  };

  const config = configs[type] || configs['no-results'];

  return `
    <div class="empty-state-container text-center py-5 px-4 my-3 bg-white rounded border" style="border: 1px solid #dee2e6; max-width: 600px; margin: 0 auto;">
      <!-- Biểu tượng / Minh họa -->
      <div class="empty-state-icon-wrapper d-inline-flex align-items-center justify-content-center mb-3 rounded-circle bg-light" style="width: 72px; height: 72px;">
        <i class="bi ${config.icon} ${config.iconColor} fs-2"></i>
      </div>
      
      <!-- Tiêu đề -->
      <h5 class="empty-state-title fw-bold text-dark mb-2">${config.title}</h5>
      
      <!-- Nội dung hướng dẫn -->
      <p class="empty-state-description text-muted small mx-auto mb-4" style="max-width: 460px; line-height: 1.5;">
        ${config.description}
      </p>
      
      <!-- Nút hành động -->
      ${config.actionText ? `
        <button type="button" class="btn ${config.btnClass} btn-sm px-4 py-2 fw-semibold shadow-sm" id="${config.actionId}" data-testid="${config.actionTestId}">
          ${config.actionText}
        </button>
      ` : ''}
    </div>
  `;
}
