import { TenantService } from '../../services/tenantService.js';

export function renderTenantsPage(container) {
  container.innerHTML = `
    <div class="tenants-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>Quản lý người thuê</h2>
      <button class="btn btn-primary" id="btn-add-tenant">+ Thêm người thuê</button>
    </div>
    
    <div id="tenant-alert" style="color: var(--danger); margin-bottom: 10px; font-weight: 500;"></div>

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Họ và Tên</th>
            <th>Số Điện Thoại</th>
            <th>CCCD/CMND</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody id="tenants-tbody">
        </tbody>
      </table>
    </div>
  `;

  loadTenantsTable();

  document.getElementById('btn-add-tenant').addEventListener('click', () => {
    const fullName = prompt('Nhập họ tên người thuê:');
    if (!fullName) return;
    const phone = prompt('Nhập số điện thoại (10-11 số):');
    if (!phone) return;
    const idCard = prompt('Nhập CCCD/CMND:');
    if (!idCard) return;

    try {
      TenantService.createTenant({ fullName, phone, idCard });
      loadTenantsTable();
      document.getElementById('tenant-alert').innerText = '';
    } catch (error) {
      document.getElementById('tenant-alert').innerText = error.message;
    }
  });
}

function loadTenantsTable() {
  const tbody = document.getElementById('tenants-tbody');
  if (!tbody) return;

  const tenants = TenantService.getAllTenants();
  if (tenants.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">Chưa có dữ liệu người thuê</td></tr>';
    return;
  }

  tbody.innerHTML = tenants.map(tenant => {
    return `
      <tr>
        <td><strong>${tenant.fullName}</strong></td>
        <td>${tenant.phone}</td>
        <td>${tenant.idCard}</td>
        <td>
          <button class="btn btn-delete-tenant" data-id="${tenant.id}" style="color: var(--danger); background: none; border: none; cursor: pointer; text-decoration: underline;">Xóa</button>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.btn-delete-tenant').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Bạn có chắc chắn muốn xóa người thuê này?')) {
        try {
          TenantService.deleteTenant(id);
          loadTenantsTable();
          document.getElementById('tenant-alert').innerText = '';
        } catch (error) {
          document.getElementById('tenant-alert').innerText = error.message;
        }
      }
    });
  });
}
