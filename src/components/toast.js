// src/components/toast.js
let toastCount = 0;

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  toastCount++;
  const toastId = `toast-${toastCount}`;
  
  // Chuyển đổi type sang class của Bootstrap
  let bgClass = 'text-bg-primary';
  if (type === 'success') bgClass = 'text-bg-success';
  if (type === 'danger' || type === 'error') bgClass = 'text-bg-danger';
  if (type === 'warning') bgClass = 'text-bg-warning';
  if (type === 'info') bgClass = 'text-bg-info';

  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0" role="alert" aria-live="assertive" aria-atomic="true" data-testid="toast-message">
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  // Append HTML vào container
  container.insertAdjacentHTML('beforeend', toastHtml);

  // Khởi tạo và hiển thị qua Bootstrap JS
  const toastEl = document.getElementById(toastId);
  if (window.bootstrap && window.bootstrap.Toast) {
    const bootstrapToast = new window.bootstrap.Toast(toastEl, { delay: 3000 });
    bootstrapToast.show();

    // Dọn dẹp DOM khi ẩn
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }
}
