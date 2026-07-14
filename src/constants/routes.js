// src/constants/routes.js

/**
 * Định nghĩa tất cả route trong ứng dụng.
 * path  : segment dùng trong router (ví dụ "rooms")
 * href  : đường dẫn đầy đủ dùng cho href (ví dụ "/rooms")
 * label : nhãn tiếng Việt hiển thị trên menu / header
 */
export const ROUTES = Object.freeze({
  DASHBOARD:  Object.freeze({ path: 'dashboard',  href: '/dashboard',  label: 'Dashboard' }),
  ROOMS:      Object.freeze({ path: 'rooms',      href: '/rooms',      label: 'Quản lý phòng' }),
  TENANTS:    Object.freeze({ path: 'tenants',    href: '/tenants',    label: 'Người thuê' }),
  CONTRACTS:  Object.freeze({ path: 'contracts',  href: '/contracts',  label: 'Hợp đồng' }),
  METERS:     Object.freeze({ path: 'meters',     href: '/meters',     label: 'Chỉ số điện nước' }),
  SERVICES:   Object.freeze({ path: 'services',   href: '/services',   label: 'Cấu hình dịch vụ' }),
  INVOICES:   Object.freeze({ path: 'invoices',   href: '/invoices',   label: 'Lập hóa đơn' }),
  PAYMENTS:   Object.freeze({ path: 'payments',   href: '/payments',   label: 'Thanh toán' }),
  DEBTS:      Object.freeze({ path: 'debts',      href: '/debts',      label: 'Công nợ' }),
  REPORTS:    Object.freeze({ path: 'reports',     href: '/reports',    label: 'Báo cáo' }),
  SETTINGS:   Object.freeze({ path: 'settings',   href: '/settings',   label: 'Cài đặt & Sao lưu' }),
});

/**
 * Route mặc định khi path rỗng hoặc không hợp lệ.
 */
export const DEFAULT_ROUTE = ROUTES.DASHBOARD;
