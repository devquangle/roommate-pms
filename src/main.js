// src/main.js
import { renderLayout } from './components/layout.js';
import { showToast } from './components/toast.js';
import { showConfirmDialog } from './components/confirm-dialog.js';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app-root');
  
  // 1. Render layout chính
  renderLayout(root);

  // 2. Setup Routing
  const pageContent = document.getElementById('page-content');
  const headerTitle = document.getElementById('header-title');
  const menuLinks = document.querySelectorAll('#sidebar-menu .nav-link');

  const navigate = (page) => {
    // Đổi màu menu
    menuLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-page') === page) {
        link.classList.add('active');
        headerTitle.innerText = link.innerText;
      }
    });

    // Render nội dung trang
    if (page === 'dashboard') {
      pageContent.innerHTML = `
        <div class="card shadow-sm" data-testid="dashboard-page">
          <div class="card-body">
            <h5 class="card-title">Tổng quan hệ thống RoomMate</h5>
            <p class="card-text text-muted">Chào mừng bạn quay trở lại. Các số liệu thống kê sẽ hiển thị ở đây.</p>
            
            <!-- Demo các component dùng chung -->
            <hr class="my-4">
            <h6>Demo Components:</h6>
            <div class="d-flex gap-2">
              <button class="btn btn-success" id="demo-toast-btn" data-testid="demo-toast-btn">Test Toast</button>
              <button class="btn btn-danger" id="demo-confirm-btn" data-testid="demo-confirm-btn">Test Confirm Dialog</button>
            </div>
          </div>
        </div>
      `;

      // Gắn sự kiện cho các nút demo
      const toastBtn = document.getElementById('demo-toast-btn');
      if (toastBtn) {
        toastBtn.addEventListener('click', () => {
          showToast('Đây là thông báo thành công từ Toast component!', 'success');
        });
      }

      const confirmBtn = document.getElementById('demo-confirm-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          showConfirmDialog('Xóa dữ liệu', 'Bạn có chắc chắn muốn xóa bản ghi này không?', () => {
            showToast('Đã xóa dữ liệu thành công!', 'info');
          });
        });
      }
    } else {
      pageContent.innerHTML = `
        <div class="alert alert-info shadow-sm" data-testid="placeholder-page">
          Tính năng <strong>${page}</strong> đang được phát triển...
        </div>
      `;
    }
    
    // Tự động đóng sidebar trên mobile
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobile-overlay');
    if (window.innerWidth <= 768 && sidebar.classList.contains('show')) {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    }
  };

  // 3. Gắn sự kiện click vào menu
  menuLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.target.getAttribute('data-page');
      if (page) {
        navigate(page);
      }
    });
  });

  // 4. Khởi tạo mặc định
  navigate('dashboard');
});
