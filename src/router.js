// src/router.js

/**
 * Router sử dụng History API (pushState / popstate).
 * URL sạch: /dashboard, /rooms, /tenants...
 * Không sử dụng hash (#).
 */

// Import tất cả page modules
import { renderDashboardPage } from './pages/dashboard-page.js';
import { renderRoomsPage } from './pages/rooms-page.js';
import { renderTenantsPage } from './pages/tenants-page.js';
import { renderContractsPage } from './pages/contracts-page.js';
import { renderMetersPage } from './pages/meter-readings-page.js';
import { renderMetersHistoryPage } from './pages/meter-readings-history-page.js';
import { renderServicesPage } from './pages/services-page.js';
import { renderInvoicesPage } from './pages/invoices-page.js';
import { renderPaymentsPage } from './pages/payments-page.js';
import { renderDebtsPage } from './pages/debts-page.js';
import { renderReportsPage } from './pages/reports-page.js';
import { renderSettingsPage } from './pages/settings-page.js';

/**
 * Bảng định tuyến: mỗi key là path segment,
 * value là object chứa title hiển thị trên header và hàm render.
 */
const routes = {
  'dashboard':  { title: 'Dashboard',          render: renderDashboardPage },
  'rooms':      { title: 'Quản lý phòng',      render: renderRoomsPage },
  'tenants':    { title: 'Người thuê',          render: renderTenantsPage },
  'contracts':  { title: 'Hợp đồng',           render: renderContractsPage },
  'meters':     { title: 'Chỉ số điện nước',    render: renderMetersPage },
  'meters-history': { title: 'Lịch sử điện nước', render: renderMetersHistoryPage },
  'services':   { title: 'Cấu hình dịch vụ',   render: renderServicesPage },
  'invoices':   { title: 'Lập hóa đơn',        render: renderInvoicesPage },
  'payments':   { title: 'Thanh toán',          render: renderPaymentsPage },
  'debts':      { title: 'Công nợ',             render: renderDebtsPage },
  'reports':    { title: 'Báo cáo',             render: renderReportsPage },
  'backup':     { title: 'Sao lưu dữ liệu',    render: renderSettingsPage },
  'settings':   { title: 'Cài đặt',             render: renderSettingsPage },
};

/**
 * Render trang 404 khi không tìm thấy route.
 */
function renderNotFoundPage(container) {
  container.innerHTML = `
    <div class="d-flex flex-column align-items-center justify-content-center"  data-testid="not-found-page">
      <h1 class="display-1 text-muted">404</h1>
      <p class="lead text-muted">Trang bạn tìm không tồn tại.</p>
      <a href="/dashboard" class="btn btn-primary mt-3" data-link data-testid="btn-back-dashboard">Về Dashboard</a>
    </div>
  `;
}

/**
 * Lấy path hiện tại từ location.pathname.
 * Ví dụ: "/rooms" -> "rooms", "/" -> "dashboard"
 */
function getCurrentPath() {
  const pathname = window.location.pathname;
  // Loại bỏ dấu "/" ở đầu, nếu rỗng thì mặc định là "dashboard"
  const path = pathname.replace(/^\//, '').replace(/\/$/, '');
  return path || 'dashboard';
}

/**
 * Đánh dấu menu item đang active dựa trên path hiện tại.
 */
function updateActiveMenu(path) {
  const menuLinks = document.querySelectorAll('#sidebar-menu .nav-link');
  menuLinks.forEach(link => {
    const linkPage = link.getAttribute('data-page');
    if (linkPage === path) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Đóng sidebar trên mobile sau khi chuyển trang.
 */
function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobile-overlay');
  if (sidebar && overlay && window.innerWidth <= 768) {
    sidebar.classList.remove('show');
    overlay.classList.remove('show');
  }
}

/**
 * Hàm chính: xử lý điều hướng – đọc path và render trang tương ứng.
 */
function handleRouteChange() {
  const path = getCurrentPath();
  const pageContent = document.getElementById('page-content');
  const headerTitle = document.getElementById('header-title');

  if (!pageContent || !headerTitle) return;

  const route = routes[path];

  if (route) {
    headerTitle.textContent = route.title;
    updateActiveMenu(path);
    route.render(pageContent);
  } else {
    headerTitle.textContent = 'Không tìm thấy';
    updateActiveMenu('');
    renderNotFoundPage(pageContent);
  }

  closeMobileSidebar();
}

/**
 * Chuyển hướng bằng History API.
 * Có thể gọi từ bất kỳ module nào: navigateTo('rooms')
 */
export function navigateTo(path) {
  window.history.pushState(null, '', `/${path}`);
  handleRouteChange();
}

/**
 * Khởi tạo router:
 * - Lắng nghe popstate (nút back/forward của trình duyệt).
 * - Chặn click vào các link có thuộc tính [data-link] để dùng pushState.
 * - Nếu đang ở "/" thì redirect về "/dashboard".
 * - Render trang đầu tiên.
 */
export function initRouter() {
  // Lắng nghe nút back/forward
  window.addEventListener('popstate', handleRouteChange);

  // Delegate click: chặn tất cả <a data-link> để điều hướng bằng pushState
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        window.history.pushState(null, '', href);
        handleRouteChange();
      }
    }
  });

  // Nếu đang ở root "/" thì chuyển về "/dashboard" (không reload)
  if (window.location.pathname === '/' || window.location.pathname === '') {
    window.history.replaceState(null, '', '/dashboard');
  }

  // Render trang hiện tại
  handleRouteChange();
}
