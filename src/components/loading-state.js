// src/components/loading-state.js

/**
 * Cấu phần Loading State và Skeletons dùng chung cho ứng dụng RoomMate.
 * Tận dụng các lớp placeholder nguyên bản của Bootstrap 5 để tạo hiệu ứng nhịp thở nhẹ nhàng, sang trọng.
 */

/**
 * Skeleton cho trang Dashboard (Các card thống kê và biểu đồ giả lập)
 * @returns {string} Chuỗi HTML
 */
export function renderDashboardSkeleton() {
  return `
    <div class="dashboard-skeleton-wrapper" aria-hidden="true">
      <!-- Hàng card thống kê -->
      <div class="row g-3 mb-4">
        ${Array.from({ length: 4 }).map(() => `
          <div class="col-md-3">
            <div class="card border-0 shadow-sm p-3">
              <div class="d-flex align-items-center mb-2">
                <div class="placeholder rounded-circle me-3" style="width: 40px; height: 40px; background-color: #e9ecef;"></div>
                <div class="w-100 placeholder-glow">
                  <span class="placeholder col-6 bg-secondary opacity-25 rounded" style="height: 12px;"></span>
                </div>
              </div>
              <div class="placeholder-glow">
                <span class="placeholder col-8 bg-primary opacity-25 rounded" style="height: 24px;"></span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Hàng biểu đồ -->
      <div class="row g-4 mb-4">
        <div class="col-md-8">
          <div class="card border-0 shadow-sm p-4" style="height: 350px;">
            <div class="placeholder-glow mb-3">
              <span class="placeholder col-4 bg-secondary opacity-25 rounded" style="height: 18px;"></span>
            </div>
            <div class="w-100 h-100 placeholder-glow d-flex align-items-end gap-2 px-3 pb-2" style="background-color: #f8f9fa; border-radius: 6px;">
              ${Array.from({ length: 12 }).map(() => `
                <div class="placeholder w-100 bg-secondary opacity-25 rounded-top" style="height: ${Math.floor(Math.random() * 60) + 20}%;"></div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card border-0 shadow-sm p-4" style="height: 350px;">
            <div class="placeholder-glow mb-3">
              <span class="placeholder col-6 bg-secondary opacity-25 rounded" style="height: 18px;"></span>
            </div>
            <div class="d-flex justify-content-center align-items-center h-100">
              <div class="placeholder rounded-circle bg-secondary opacity-25" style="width: 180px; height: 180px; clip-path: circle(50% at 50% 50%);"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Skeleton cho bảng phòng trọ (Bao gồm cột và dòng giả lập)
 * @returns {string} Chuỗi HTML
 */
export function renderRoomsTableSkeleton() {
  return `
    <div class="table-responsive placeholder-glow" aria-hidden="true">
      <table class="table table-hover align-middle mb-0 border">
        <thead class="table-light">
          <tr>
            <th width="10%"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
            <th width="20%"><span class="placeholder col-8 bg-secondary opacity-50"></span></th>
            <th width="15%"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
            <th width="15%"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
            <th width="15%"><span class="placeholder col-7 bg-secondary opacity-50"></span></th>
            <th width="15%"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
            <th width="10%" class="text-center"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 5 }).map(() => `
            <tr>
              <td><span class="placeholder col-8 bg-secondary opacity-25"></span></td>
              <td>
                <span class="placeholder col-5 bg-secondary opacity-50 mb-1 d-block"></span>
                <span class="placeholder col-8 bg-secondary opacity-25 d-block" style="height: 10px;"></span>
              </td>
              <td><span class="placeholder col-6 bg-secondary opacity-25"></span></td>
              <td><span class="placeholder col-7 bg-secondary opacity-25"></span></td>
              <td><span class="placeholder col-8 bg-secondary opacity-25"></span></td>
              <td><span class="placeholder col-6 bg-secondary opacity-25"></span></td>
              <td class="text-center"><span class="placeholder col-6 bg-secondary opacity-50"></span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Skeleton cho bảng hóa đơn (Bao gồm chi tiết giả lập)
 * @returns {string} Chuỗi HTML
 */
export function renderInvoicesTableSkeleton() {
  return `
    <div class="table-responsive placeholder-glow" aria-hidden="true">
      <table class="table table-hover align-middle mb-0 border">
        <thead class="table-light">
          <tr>
            <th width="15%"><span class="placeholder col-8 bg-secondary opacity-50"></span></th>
            <th width="20%"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
            <th width="15%"><span class="placeholder col-7 bg-secondary opacity-50"></span></th>
            <th width="25%"><span class="placeholder col-6 bg-secondary opacity-50"></span></th>
            <th width="15%" class="text-center"><span class="placeholder col-7 bg-secondary opacity-50"></span></th>
            <th width="10%" class="text-center"><span class="placeholder col-5 bg-secondary opacity-50"></span></th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 5 }).map(() => `
            <tr>
              <td><span class="placeholder col-7 bg-secondary opacity-25"></span></td>
              <td>
                <span class="placeholder col-6 bg-secondary opacity-50 mb-1 d-block"></span>
                <span class="placeholder col-8 bg-secondary opacity-25 d-block" style="height: 10px;"></span>
              </td>
              <td><span class="placeholder col-8 bg-secondary opacity-25"></span></td>
              <td>
                <div class="d-flex justify-content-between mb-1" style="max-width: 180px;">
                  <span class="placeholder col-4 bg-secondary opacity-25"></span>
                  <span class="placeholder col-3 bg-secondary opacity-25"></span>
                </div>
                <div class="d-flex justify-content-between" style="max-width: 180px;">
                  <span class="placeholder col-5 bg-secondary opacity-25"></span>
                  <span class="placeholder col-4 bg-secondary opacity-25"></span>
                </div>
              </td>
              <td class="text-center"><span class="placeholder col-6 bg-secondary opacity-50"></span></td>
              <td class="text-center"><span class="placeholder col-6 bg-secondary opacity-50"></span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Trả về mã HTML của Spinner phụ thuộc văn bản dùng cho nút Lưu/Thực thi
 * @param {string} [text='Đang xử lý...'] - Văn bản đi kèm loading
 * @returns {string} Chuỗi HTML
 */
export function getButtonLoadingHtml(text = 'Đang lưu...') {
  return `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${text}`;
}

/**
 * Kết xuất giao diện Progress Bar cho xử lý danh sách nhiều phòng
 * @param {number} percent - Phần trăm tiến trình (0 - 100)
 * @param {string} [statusText='Đang xử lý dữ liệu phòng...'] - Nội dung trạng thái hiển thị
 * @returns {string} Chuỗi HTML
 */
export function renderProgressBar(percent, statusText = 'Đang xử lý dữ liệu phòng...') {
  return `
    <div class="progress-bar-container py-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small text-muted fw-semibold">${statusText}</span>
        <span class="small text-primary fw-bold" id="progressBarPercentText">${percent}%</span>
      </div>
      <div class="progress" style="height: 8px; background-color: #f1f3f5; border-radius: 4px; overflow: hidden;">
        <div class="progress-bar progress-bar-striped progress-bar-animated bg-success" 
          role="progressbar" 
          id="progressBarElement"
          style="width: ${percent}%; transition: width 0.2s ease;" 
          aria-valuenow="${percent}" 
          aria-valuemin="0" 
          aria-valuemax="100">
        </div>
      </div>
    </div>
  `;
}

/**
 * Giao diện overlay loading khi import dữ liệu
 * @param {string} [message='Đang nhập khẩu và xác thực dữ liệu...'] - Tin nhắn loading
 * @returns {string} Chuỗi HTML
 */
export function renderImportLoadingOverlay(message = 'Đang nhập khẩu và xác thực dữ liệu...') {
  return `
    <div class="d-flex flex-column align-items-center justify-content-center p-5 text-center bg-white rounded border" style="border: 1px solid #dee2e6;">
      <div class="spinner-border text-success mb-3" role="status" style="width: 3rem; height: 3rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <h5 class="fw-bold text-dark mb-1">${message}</h5>
      <p class="text-muted small mb-0">Vui lòng giữ kết nối, hệ thống đang đồng bộ và tính toán lại công nợ.</p>
    </div>
  `;
}

/**
 * Giao diện loading và progress khi tạo hóa đơn hàng loạt
 * @param {number} current - Số phòng đã xử lý xong
 * @param {total} total - Tổng số phòng cần xử lý
 * @returns {string} Chuỗi HTML
 */
export function renderBatchInvoiceProgress(current, total) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  return `
    <div class="batch-invoice-progress-card p-4 text-center bg-white rounded border" style="border: 1px solid #dee2e6;">
      <div class="spinner-border text-primary mb-3" role="status" style="width: 2.5rem; height: 2.5rem;">
        <span class="visually-hidden">Loading...</span>
      </div>
      <h5 class="fw-bold text-dark mb-2">Đang khởi tạo hóa đơn hàng loạt</h5>
      <p class="text-muted small mb-3">Hệ thống đang tự động tổng hợp phí dịch vụ, tiền xe và tiền phòng...</p>
      
      <!-- Progress Bar -->
      <div class="text-start mb-2" style="max-width: 480px; margin: 0 auto;">
        ${renderProgressBar(percent, `Đang xử lý: ${current} / ${total} phòng`)}
      </div>
    </div>
  `;
}
