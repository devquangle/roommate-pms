// src/components/layout.js
export function renderLayout(rootElement) {
  rootElement.innerHTML = `
    <!-- Overlay cho mobile -->
    <div class="overlay" id="mobile-overlay" data-testid="mobile-overlay"></div>
    
    <!-- Sidebar -->
    <aside class="sidebar" id="sidebar" data-testid="sidebar">
      <div class="p-3 border-bottom border-secondary">
        <h4 class="mb-0">RoomMate</h4>
      </div>
      <nav class="nav flex-column mt-2" id="sidebar-menu">
        <a class="nav-link active" href="#" data-page="dashboard" data-testid="menu-dashboard">Dashboard</a>
        <a class="nav-link" href="#" data-page="rooms" data-testid="menu-rooms">Quản lý phòng</a>
        <a class="nav-link" href="#" data-page="tenants" data-testid="menu-tenants">Người thuê</a>
        <a class="nav-link" href="#" data-page="contracts" data-testid="menu-contracts">Hợp đồng</a>
        <a class="nav-link" href="#" data-page="meters" data-testid="menu-meters">Chỉ số điện nước</a>
        <a class="nav-link" href="#" data-page="services" data-testid="menu-services">Cấu hình dịch vụ</a>
        <a class="nav-link" href="#" data-page="invoices" data-testid="menu-invoices">Lập hóa đơn</a>
        <a class="nav-link" href="#" data-page="payments" data-testid="menu-payments">Thanh toán</a>
        <a class="nav-link" href="#" data-page="debts" data-testid="menu-debts">Công nợ</a>
        <a class="nav-link" href="#" data-page="reports" data-testid="menu-reports">Báo cáo</a>
        <a class="nav-link" href="#" data-page="export-import" data-testid="menu-export-import">Export/Import</a>
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
        <!-- Nội dung từng trang sẽ render vào đây -->
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
