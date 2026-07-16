// src/components/pagination.js

/**
 * Trả về chuỗi HTML của component phân trang Bootstrap.
 * Các nút chuyển trang sẽ có class 'btn-page' và data-page="..."
 * Caller cần dùng event delegation để bắt sự kiện click và xử lý chuyển trang.
 *
 * @param {number} currentPage Trang hiện tại (1-indexed)
 * @param {number} totalItems Tổng số bản ghi
 * @param {number} itemsPerPage Số bản ghi trên 1 trang
 * @returns {string} Chuỗi HTML
 */
export function renderPagination(currentPage, totalItems, itemsPerPage) {
  if (totalItems === 0) return '';

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  let html = `
    <div class="d-flex flex-column flex-md-row justify-content-between align-items-center w-100 gap-2">
      <div class="text-muted small">
        Hiển thị <strong>${start}</strong> - <strong>${end}</strong> của <strong>${totalItems}</strong>
      </div>
  `;

  // Chỉ hiển thị các nút phân trang nếu có nhiều hơn 1 trang
  if (totalPages > 1) {
    html += '<nav aria-label="Page navigation"><ul class="pagination mb-0 pagination-sm">';

    // Nút Previous
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `
      <li class="page-item ${prevDisabled}">
        <a class="page-link btn-page" href="#" data-page="${currentPage - 1}" ${prevDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}>Trước</a>
      </li>
    `;

    // Các nút số
    for (let i = 1; i <= totalPages; i++) {
      const activeClass = i === currentPage ? 'active' : '';
      html += `
        <li class="page-item ${activeClass}">
          <a class="page-link btn-page" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    // Nút Next
    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `
      <li class="page-item ${nextDisabled}">
        <a class="page-link btn-page" href="#" data-page="${currentPage + 1}" ${nextDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}>Sau</a>
      </li>
    `;

    html += '</ul></nav>';
  } else {
    html += '<div></div>'; // placeholder để d-flex justify-content-between hoạt động đúng
  }

  html += '</div>';
  return html;
}
