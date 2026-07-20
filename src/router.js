// src/router.js

/**
 * Router sử dụng Hash (#) để điều hướng.
 * URL dạng: /#/dashboard, /#/rooms, /#/tenants...
 * Hoạt động trên cả local dev và GitHub Pages.
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
import { renderErrorState } from './components/error-state.js';

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
  container.innerHTML = renderErrorState('page-not-found', {
    showHomeBtn: false,
    actionId: 'btnErrorActionGoHome',
    actionText: '🏠 Quay lại Dashboard'
  });

  setTimeout(() => {
    document.getElementById('btnErrorActionGoHome')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('dashboard');
    });
  }, 0);
}

/**
 * Lấy path hiện tại từ location.hash.
 * Ví dụ: "#/rooms" -> "rooms", "" -> "dashboard"
 */
function getCurrentPath() {
  // 1️⃣ If URL contains a hash (hash mode) → dùng hash
  const hash = window.location.hash;
  if (hash) {
    const path = hash.replace(/^#\/?/, '').replace(/\/$/, '').split('?')[0];
    return path || 'dashboard';
  }

  // 2️⃣ Nếu không có hash (history mode – dùng khi chạy tests hoặc dev server) → dựa vào pathname
  const base = import.meta.env.BASE_URL || '/';
  let pathname = window.location.pathname;
  if (pathname.startsWith(base)) {
    pathname = pathname.substring(base.length);
  }
  const path = pathname.replace(/^\//, '').replace(/\/$/, '').split('?')[0];
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
 * Chuyển hướng bằng hash.
 * Có thể gọi từ bất kỳ module nào: navigateTo('rooms')
 */
export function navigateTo(path) {
  // Use History API for clean URLs (e.g., /dashboard)
  const newUrl = `${import.meta.env.BASE_URL}${path}`;
  history.pushState(null, '', newUrl);
  handleRouteChange();
}

/**
 * Khởi tạo router:
 * - Lắng nghe hashchange (chế độ hash router).
 * - Chặn click vào các link có thuộc tính [data-link] để dùng hash.
 * - Nếu không có hash thì redirect về "#/dashboard".
 * - Render trang đầu tiên.
 */
export function initRouter() {
  // Lắng nghe sự kiện đổi route (hash hoặc pathname)
  window.addEventListener('hashchange', handleRouteChange);
  window.addEventListener('popstate', handleRouteChange);

  // Delegate click: chặn tất cả <a data-link> để điều hướng bằng hash
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        // Hỗ trợ cả href="#/page" và href="/page"
        const path = href.replace(/^#?\/?/, '');
        navigateTo(path);
      }
    }
  });

  // Nếu không có hash và pathname là root → tự chuyển tới dashboard (để đồng nhất UI)
  if (!window.location.hash && (window.location.pathname === '/' || window.location.pathname === import.meta.env.BASE_URL)) {
    navigateTo('dashboard');
    return;
  }

  // Render trang hiện tại
  handleRouteChange();
}
