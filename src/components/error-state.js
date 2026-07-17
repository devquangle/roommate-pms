// src/components/error-state.js

/**
 * Cấu phần Error State dùng chung cho ứng dụng RoomMate.
 * Cung cấp thiết kế giao diện đồng nhất, trực quan cho các trường hợp gặp sự cố hoặc thao tác không hợp lệ.
 *
 * @param {string} type - Loại lỗi ('storage-error' | 'invalid-import' | 'corrupted-data' | 'page-not-found' | 'invoice-creation-failed' | 'payment-failed' | 'overlapping-contract')
 * @param {Object} [options] - Các cấu hình mở rộng
 * @param {string} [options.actionText] - Tên nút hành động thử lại tùy chỉnh
 * @param {string} [options.actionId] - ID của nút hành động thử lại
 * @param {string} [options.customMsg] - Tin nhắn lỗi chi tiết bổ sung
 * @param {boolean} [options.showHomeBtn=true] - Hiển thị nút quay về Dashboard
 * @returns {string} Chuỗi HTML
 */
export function renderErrorState(type, options = {}) {
  const showHomeBtn = options.showHomeBtn !== false;
  
  const configs = {
    'storage-error': {
      icon: 'bi-hdd-network',
      iconColor: 'text-danger',
      title: 'Lỗi truy cập bộ nhớ trình duyệt',
      description: 'Không thể đọc hoặc ghi dữ liệu vào LocalStorage. Nguyên nhân có thể do trình duyệt đang ở chế độ ẩn danh nghiêm ngặt hoặc bộ nhớ đã đầy.',
      suggestion: 'Vui lòng kiểm tra lại quyền truy cập cookie/local storage của trình duyệt, tắt chế độ ẩn danh hoặc dọn dẹp bộ nhớ máy và thử lại.',
      actionText: options.actionText || '🔄 Thử truy cập lại',
      actionId: options.actionId || 'btnErrorActionRetryStorage',
      btnClass: 'btn-danger'
    },
    'invalid-import': {
      icon: 'bi-file-earmark-x',
      iconColor: 'text-warning',
      title: 'File import không hợp lệ',
      description: 'Cấu trúc file sao lưu tải lên bị lỗi, thiếu các bảng dữ liệu bắt buộc hoặc không đúng định dạng JSON chuẩn của RoomMate.',
      suggestion: 'Vui lòng kiểm tra lại tệp tin tải lên. Hãy chắc chắn rằng đây là tệp tin được xuất từ chức năng "Xuất dữ liệu" của hệ thống RoomMate.',
      actionText: options.actionText || '📁 Chọn file khác',
      actionId: options.actionId || 'btnErrorActionResetImport',
      btnClass: 'btn-warning text-dark'
    },
    'corrupted-data': {
      icon: 'bi-exclamation-triangle',
      iconColor: 'text-danger',
      title: 'Dữ liệu hệ thống bị lỗi',
      description: 'Phát hiện sự bất thường hoặc không nhất quán trong cơ sở dữ liệu phòng trọ hiện hành (ví dụ: hóa đơn không tìm thấy phòng tương ứng).',
      suggestion: 'Vui lòng khôi phục lại dữ liệu mẫu gốc hoặc nạp một file sao lưu JSON hợp lệ gần nhất để đưa hệ thống về trạng thái ổn định.',
      actionText: options.actionText || '🔄 Khôi phục dữ liệu mẫu',
      actionId: options.actionId || 'btnErrorActionRestoreSeed',
      btnClass: 'btn-danger'
    },
    'page-not-found': {
      icon: 'bi-signpost-split',
      iconColor: 'text-secondary',
      title: 'Không tìm thấy trang yêu cầu',
      description: 'Đường dẫn bạn đang truy cập không tồn tại trong hệ thống RoomMate hoặc đã bị thay đổi.',
      suggestion: 'Vui lòng kiểm tra lại địa chỉ URL hoặc click vào nút bên dưới để quay lại màn hình tổng quan chính của ứng dụng.',
      actionText: options.actionText || '🏠 Quay lại Dashboard',
      actionId: options.actionId || 'btnErrorActionGoHome',
      btnClass: 'btn-primary'
    },
    'invoice-creation-failed': {
      icon: 'bi-calculator-fill',
      iconColor: 'text-danger',
      title: 'Không thể tạo hóa đơn tính tiền',
      description: 'Quá trình lập hóa đơn tự động bị từ chối do phát hiện phòng chưa có khách thuê đại diện hoặc hợp đồng thuê phòng đã hết hạn.',
      suggestion: 'Vui lòng đảm bảo phòng trọ đã được lập hợp đồng thuê còn thời hạn hoạt động và đã chốt chỉ số điện nước tháng này.',
      actionText: options.actionText || '📝 Kiểm tra hợp đồng',
      actionId: options.actionId || 'btnErrorActionCheckContracts',
      btnClass: 'btn-outline-danger'
    },
    'payment-failed': {
      icon: 'bi-credit-card-2-back-fill',
      iconColor: 'text-danger',
      title: 'Ghi nhận thanh toán thất bại',
      description: 'Giao dịch thanh toán không hợp lệ do số tiền nhập vượt quá công nợ còn lại hoặc hóa đơn thanh toán đã bị hủy bỏ trước đó.',
      suggestion: 'Vui lòng kiểm tra kỹ số tiền cần thu của hóa đơn, cập nhật lại số tiền đóng và đảm bảo trạng thái hóa đơn đang chờ đóng tiền.',
      actionText: options.actionText || '✏️ Nhập lại số tiền',
      actionId: options.actionId || 'btnErrorActionRetryPayment',
      btnClass: 'btn-danger'
    },
    'overlapping-contract': {
      icon: 'bi-calendar-range',
      iconColor: 'text-warning',
      title: 'Hợp đồng bị trùng thời gian',
      description: 'Không thể tạo hoặc cập nhật hợp đồng. Thời gian thuê yêu cầu bị trùng lặp với một hợp đồng đang hoạt động khác của phòng trọ này.',
      suggestion: 'Vui lòng kiểm tra lại ngày bắt đầu và ngày kết thúc thuê của phòng. Mỗi phòng trọ chỉ được phép có duy nhất một hợp đồng có hiệu lực tại một thời điểm.',
      actionText: options.actionText || '📅 Thay đổi thời gian thuê',
      actionId: options.actionId || 'btnErrorActionAdjustDates',
      btnClass: 'btn-warning text-dark'
    }
  };

  const config = configs[type] || configs['corrupted-data'];
  const errorDetail = options.customMsg ? `<div class="alert alert-light border small text-start text-dark mb-4 py-2 px-3"><code>Lỗi chi tiết: ${options.customMsg}</code></div>` : '';

  return `
    <div class="error-state-container text-center py-5 px-4 my-4 bg-white rounded border shadow-sm" style="border: 1px solid #f8d7da; max-width: 650px; margin: 0 auto;" data-testid="error-state-${type}">
      <!-- Biểu tượng lỗi -->
      <div class="error-state-icon-wrapper d-inline-flex align-items-center justify-content-center mb-3 rounded-circle bg-light" style="width: 80px; height: 80px;">
        <i class="bi ${config.icon} ${config.iconColor} fs-1"></i>
      </div>
      
      <!-- Tiêu đề lỗi -->
      <h4 class="error-state-title fw-bold text-dark mb-2">${config.title}</h4>
      
      <!-- Mô tả lỗi -->
      <p class="error-state-description text-muted small mx-auto mb-3" style="max-width: 500px; line-height: 1.6;">
        ${config.description}
      </p>

      <!-- Chi tiết lỗi kỹ thuật nếu có -->
      ${errorDetail}

      <!-- Hướng dẫn khắc phục -->
      <div class="error-suggestion-box bg-light rounded p-3 text-start small text-secondary border mb-4" style="line-height: 1.5;">
        <strong class="text-dark d-block mb-1"><i class="bi bi-info-circle me-1"></i> Hướng dẫn khắc phục:</strong>
        ${config.suggestion}
      </div>
      
      <!-- Bộ nút điều hướng/hành động -->
      <div class="d-flex justify-content-center gap-2">
        ${config.actionText ? `
          <button type="button" class="btn ${config.btnClass} btn-sm px-4 py-2 fw-semibold shadow-sm" id="${config.actionId}">
            ${config.actionText}
          </button>
        ` : ''}
        
        ${showHomeBtn && type !== 'page-not-found' ? `
          <button type="button" class="btn btn-outline-secondary btn-sm px-4 py-2 fw-semibold" id="btnErrorGoDashboard">
            <i class="bi bi-house me-1"></i> Về Dashboard
          </button>
        ` : ''}
      </div>
    </div>
  `;
}
