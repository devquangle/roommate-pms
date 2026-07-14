// src/components/layout.js

/**
 * Render khung giao diện chính: sidebar, header, vùng content.
 * Menu sử dụng href="/page" + data-link để tích hợp với History API router.
 */
export function renderLayout(rootElement) {
  rootElement.innerHTML = `
    <!-- Overlay cho mobile -->
    <div class="overlay" id="mobile-overlay" data-testid="mobile-overlay"></div>

    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar" data-testid="sidebar">
      <div class="p-3 border-bottom border-secondary">
        <a href="/dashboard" data-link class="text-white text-decoration-none">
          <h4 class="mb-0">RoomMate</h4>
        </a>
      </div>
      <nav class="nav flex-column mt-2" id="sidebar-menu" data-testid="sidebar-menu">
        <a class="nav-link" href="/dashboard"  data-link data-page="dashboard"  data-testid="menu-dashboard">Dashboard</a>
        <a class="nav-link" href="/rooms"      data-link data-page="rooms"      data-testid="menu-rooms">Quản lý phòng</a>
        <a class="nav-link" href="/tenants"    data-link data-page="tenants"    data-testid="menu-tenants">Người thuê</a>
        <a class="nav-link" href="/contracts"  data-link data-page="contracts"  data-testid="menu-contracts">Hợp đồng</a>
        <a class="nav-link" href="/meters"     data-link data-page="meters"     data-testid="menu-meters">Chỉ số điện nước</a>
        <a class="nav-link" href="/services"   data-link data-page="services"   data-testid="menu-services">Cấu hình dịch vụ</a>
        <a class="nav-link" href="/invoices"   data-link data-page="invoices"   data-testid="menu-invoices">Lập hóa đơn</a>
        <a class="nav-link" href="/payments"   data-link data-page="payments"   data-testid="menu-payments">Thanh toán</a>
        <a class="nav-link" href="/debts"      data-link data-page="debts"      data-testid="menu-debts">Công nợ</a>
        <a class="nav-link" href="/reports"    data-link data-page="reports"    data-testid="menu-reports">Báo cáo</a>
        <a class="nav-link" href="/settings"   data-link data-page="settings"   data-testid="menu-settings">Cài đặt</a>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="navbar navbar-light bg-white border-bottom px-3 d-flex align-items-center">
        <button class="btn btn-outline-secondary d-md-none me-3" id="btn-toggle-sidebar" data-testid="btn-toggle-sidebar">
          ☰
        </button>
        <h5 class="mb-0" id="header-title" data-testid="header-title">Dashboard</h5>
      </header>

      <div class="content-area" id="page-content" data-testid="page-content">
        <!-- Router sẽ render nội dung trang vào đây -->
      </div>
    </main>
  `;

  // Xử lý bật/tắt Sidebar trên Mobile
  const btnToggle = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-overlay');

  const toggleSidebar = () => {
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
  };

  if (btnToggle && overlay) {
    btnToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);
  }
}
