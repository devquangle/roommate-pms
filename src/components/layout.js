// src/components/layout.js

/**
 * Render khung giao diện chính: sidebar, topbar, vùng content.
 * Menu sử dụng href="/page" + data-link để tích hợp với History API router.
 */
export function renderLayout(rootElement) {
  rootElement.innerHTML = `
    <!-- Overlay cho mobile -->
    <div class="overlay" id="mobile-overlay" data-testid="mobile-overlay"></div>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar" data-testid="sidebar">
      <div class="sidebar-header d-flex align-items-center justify-content-between p-3 border-bottom border-secondary">
        <a href="/dashboard" data-link class="text-white text-decoration-none d-flex align-items-center gap-2">
          <i class="bi bi-house-door-fill fs-4 text-primary"></i>
          <h4 class="mb-0 fw-bold sidebar-title">RoomMate</h4>
        </a>
      </div>
      <nav class="nav flex-column" id="sidebar-menu" data-testid="sidebar-menu">
        <a class="nav-link d-flex align-items-center" href="/dashboard" data-link data-page="dashboard" data-testid="menu-dashboard">
          <i class="bi bi-speedometer2 me-2"></i>
          <span class="menu-text">Tổng quan</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/rooms" data-link data-page="rooms" data-testid="menu-rooms">
          <i class="bi bi-door-open me-2"></i>
          <span class="menu-text">Phòng trọ</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/tenants" data-link data-page="tenants" data-testid="menu-tenants">
          <i class="bi bi-people me-2"></i>
          <span class="menu-text">Người thuê</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/contracts" data-link data-page="contracts" data-testid="menu-contracts">
          <i class="bi bi-file-earmark-text me-2"></i>
          <span class="menu-text">Hợp đồng</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/meters" data-link data-page="meters" data-testid="menu-meters">
          <i class="bi bi-lightning-charge me-2"></i>
          <span class="menu-text">Điện nước</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/meters-history" data-link data-page="meters-history" data-testid="menu-meters-history">
          <i class="bi bi-clock-history me-2"></i>
          <span class="menu-text">Lịch sử điện nước</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/services" data-link data-page="services" data-testid="menu-services">
          <i class="bi bi-gear-wide-connected me-2"></i>
          <span class="menu-text">Dịch vụ</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/invoices" data-link data-page="invoices" data-testid="menu-invoices">
          <i class="bi bi-receipt me-2"></i>
          <span class="menu-text">Hóa đơn</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/payments" data-link data-page="payments" data-testid="menu-payments">
          <i class="bi bi-cash-stack me-2"></i>
          <span class="menu-text">Thanh toán</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/debts" data-link data-page="debts" data-testid="menu-debts">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <span class="menu-text">Công nợ</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/reports" data-link data-page="reports" data-testid="menu-reports">
          <i class="bi bi-bar-chart-line me-2"></i>
          <span class="menu-text">Báo cáo</span>
        </a>
        <a class="nav-link d-flex align-items-center" href="/backup" data-link data-page="backup" data-testid="menu-backup">
          <i class="bi bi-database-down me-2"></i>
          <span class="menu-text">Sao lưu dữ liệu</span>
        </a>
        <a class="nav-link d-flex align-items-center border-top border-secondary mt-2 pt-2" href="/settings" data-link data-page="settings" data-testid="menu-settings">
          <i class="bi bi-gear me-2"></i>
          <span class="menu-text">Cài đặt</span>
        </a>
      </nav>
    </aside>

    <!-- Main Content Wrapper -->
    <main class="main-content">
      <!-- Topbar Header -->
      <header class="navbar navbar-light bg-white border-bottom px-3 d-flex align-items-center justify-content-between shadow-sm py-2">
        
        <!-- Left area: Collapse Button & Header Title -->
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center p-2 border" id="btn-toggle-sidebar" data-testid="btn-toggle-sidebar" style="width: 36px; height: 36px;">
            <i class="bi bi-list fs-5"></i>
          </button>
          <h5 class="mb-0 fw-bold text-dark d-none d-sm-block" id="header-title" data-testid="header-title">Dashboard</h5>
        </div>

        <!-- Middle/Right area: Search, Notification, Profile -->
        <div class="d-flex align-items-center gap-3">
          
          <!-- Quick Search -->
          <div class="position-relative d-none d-md-block" style="width: 250px;">
            <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>
            <input type="text" class="form-control form-control-sm ps-5 pe-3 rounded-pill bg-light border-0" id="topbar-search" placeholder="Tìm kiếm nhanh..." style="height: 36px;" />
          </div>

          <!-- Notification Bell -->
          <div class="position-relative cursor-pointer" id="topbar-notifications" style="width: 36px; height: 36px;">
            <button class="btn btn-light btn-sm rounded-circle d-flex align-items-center justify-content-center p-0 border position-relative" style="width: 36px; height: 36px;">
              <i class="bi bi-bell fs-5 text-secondary"></i>
              <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style="margin-left: -5px; margin-top: 5px;">
                <span class="visually-hidden">New alerts</span>
              </span>
            </button>
          </div>

          <!-- Manager Profile Avatar -->
          <div class="dropdown" id="topbar-avatar">
            <button class="btn btn-link p-0 d-flex align-items-center text-decoration-none dropdown-toggle no-caret" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80" alt="Manager Avatar" class="rounded-circle border" style="width: 36px; height: 36px; object-fit: cover;" />
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
              <li class="p-3 border-bottom">
                <div class="fw-bold text-dark">Quản lý trọ</div>
                <div class="text-muted small">admin@roommate.com</div>
              </li>
              <li><a class="dropdown-item py-2 small" href="/settings" data-link><i class="bi bi-person me-2 text-muted"></i>Hồ sơ</a></li>
              <li><a class="dropdown-item py-2 small" href="/settings" data-link><i class="bi bi-gear me-2 text-muted"></i>Cài đặt</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item py-2 small text-danger" href="#" id="btn-logout"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
            </ul>
          </div>

        </div>
      </header>

      <div class="content-area" id="page-content" data-testid="page-content">
        <!-- Router sẽ render nội dung trang vào đây -->
      </div>
    </main>
  `;

  // Xử lý bật/tắt Sidebar trên Mobile và Thu gọn trên Desktop
  const btnToggle = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-overlay');

  // Khôi phục tùy chọn thu gọn sidebar từ localStorage (chỉ áp dụng cho màn hình lớn)
  if (window.innerWidth > 768) {
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
    }
  }

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('show');
      overlay.classList.toggle('show');
    } else {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    }
  };

  if (btnToggle) {
    btnToggle.addEventListener('click', toggleSidebar);
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('show');
      overlay.classList.remove('show');
    });
  }

  // Demo tìm kiếm nhanh trên topbar
  const topbarSearch = document.getElementById('topbar-search');
  if (topbarSearch) {
    topbarSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = topbarSearch.value.trim();
        if (query) {
          // Điều hướng đến trang hợp đồng hoặc phòng trọ và điền query vào ô search của trang đó
          window.history.pushState(null, '', `/contracts?search=${encodeURIComponent(query)}`);
          // Gọi popstate event thủ công để Router nhận diện chuyển trang
          window.dispatchEvent(new Event('popstate'));
        }
      }
    });
  }

  // Đăng xuất demo
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Chức năng đăng xuất sẽ được tích hợp với hệ thống xác thực của bạn.');
    });
  }
}
