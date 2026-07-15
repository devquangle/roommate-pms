// src/components/report-filters.js

/**
 * Component bộ lọc thời gian cho báo cáo.
 *
 * @param {HTMLElement} container
 * @param {Object} options
 * @param {number} options.defaultMonth - Tháng mặc định.
 * @param {number} options.defaultYear - Năm mặc định.
 * @param {Function} options.onChange - Callback khi giá trị lọc thay đổi, nhận ({ month, year }).
 */
export function renderReportFilters(container, { defaultMonth, defaultYear, onChange }) {
  if (!container) return;

  container.innerHTML = `
    <div class="report-filter-panel" data-testid="report-filter-panel">
      <div class="row g-3 align-items-end">
        <div class="col-md-4 col-sm-6">
          <label for="reportMonth" class="form-label small text-muted">Chọn Tháng thống kê</label>
          <select class="form-select form-select-sm" id="reportMonth" data-testid="select-report-month">
            ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
              <option value="${m}" ${defaultMonth === m ? 'selected' : ''}>Tháng ${m}</option>
            `).join('')}
          </select>
        </div>
        
        <div class="col-md-4 col-sm-6">
          <label for="reportYear" class="form-label small text-muted">Chọn Năm thống kê</label>
          <input type="number" class="form-control form-control-sm" id="reportYear" data-testid="input-report-year"
            value="${defaultYear}" min="2000" required />
        </div>
        
        <div class="col-md-4 col-12 text-md-end">
          <button type="button" class="btn btn-outline-primary btn-sm w-100 w-md-auto" id="btnUpdateReport" data-testid="btn-update-report">
            🔄 Cập nhật báo cáo
          </button>
        </div>
      </div>
    </div>
  `;

  const btnUpdate = document.getElementById('btnUpdateReport');
  if (btnUpdate) {
    btnUpdate.addEventListener('click', () => {
      const month = Number(document.getElementById('reportMonth').value);
      const year = Number(document.getElementById('reportYear').value);

      if (typeof onChange === 'function') {
        onChange({ month, year });
      }
    });
  }
}
export default renderReportFilters;
