// src/components/stat-card.js

/**
 * Component hiển thị thẻ thống kê (Stat Card).
 *
 * @param {Object} options
 * @param {string} options.title - Tiêu đề chỉ số.
 * @param {string|number} options.value - Giá trị hiển thị.
 * @param {string} options.icon - Ký tự emoji hoặc icon HTML.
 * @param {string} [options.iconBg='bg-primary-subtle'] - Class background của icon.
 * @param {string} [options.iconColor='text-primary'] - Class màu sắc của icon.
 * @param {string} options.testId - data-testid phục vụ test.
 * @returns {string} Chuỗi HTML của card.
 */
export function renderStatCard({ title, value, icon, iconBg = 'bg-primary-subtle', iconColor = 'text-primary', testId }) {
  return `
    <div class="card stat-card-custom p-3" data-testid="${testId}">
      <div class="d-flex align-items-center justify-content-between">
        <div>
          <span class="text-muted small d-block">${title}</span>
          <h4 class="fw-bold mb-0 mt-1" data-testid="${testId}-value">${value}</h4>
        </div>
        <div class="stat-icon-wrapper ${iconBg} ${iconColor}">
          ${icon}
        </div>
      </div>
    </div>
  `;
}
export default renderStatCard;
