// src/components/confirm-dialog.js
export function showConfirmDialog(title, message, onConfirm) {
  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  container.innerHTML = `
    <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true" data-testid="confirm-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmModalLabel" data-testid="confirm-modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" data-testid="btn-confirm-close-icon"></button>
          </div>
          <div class="modal-body" data-testid="confirm-modal-message">
            ${message}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-testid="btn-confirm-cancel">Hủy</button>
            <button type="button" class="btn btn-danger" id="btn-confirm-ok" data-testid="btn-confirm-ok">Xác nhận</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('confirmModal');
  
  if (window.bootstrap && window.bootstrap.Modal) {
    const bootstrapModal = new window.bootstrap.Modal(modalEl);
    
    // Bắt sự kiện click nút OK
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
      bootstrapModal.hide();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });

    // Tự động xóa DOM khi tắt modal để tránh rác
    modalEl.addEventListener('hidden.bs.modal', () => {
      container.innerHTML = '';
    });

    bootstrapModal.show();
  }
}
