// src/components/tenant-profile.js

import { getTenantById, getCurrentRoomOfTenant, getTenantRentalHistory } from '../services/tenant-service.js';
import { getInvoices } from '../services/invoice-service.js';
import { getPayments } from '../services/payment-service.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { formatDateToDisplay } from '../utils/date-utils.js';
import { openTenantForm } from './tenant-form.js';
import { showToast } from './toast.js';

/**
 * Hiển thị Modal Hồ sơ Khách Thuê
 *
 * @param {string} tenantId - ID của khách thuê
 */
export function openTenantProfile(tenantId) {
  const tenant = getTenantById(tenantId);
  if (!tenant) return;

  const currentRoomInfo = getCurrentRoomOfTenant(tenantId);
  const roomName = currentRoomInfo ? `Phòng ${currentRoomInfo.room.name}` : 'Không có phòng';
  const moveInDate = currentRoomInfo && currentRoomInfo.contract ? formatDateToDisplay(currentRoomInfo.contract.startDate) : '—';
  
  const isInactive = tenant.status === 'inactive' || tenant.status === 'archived';
  let statusBadge = '';
  if (isInactive) {
    statusBadge = '<span class="badge bg-secondary">Đã trả phòng</span>';
  } else if (currentRoomInfo) {
    statusBadge = '<span class="badge bg-success">Đang thuê</span>';
  } else {
    statusBadge = '<span class="badge bg-warning text-dark">Chưa có phòng</span>';
  }
    
  const initial = tenant.fullName.charAt(0).toUpperCase();

  const container = document.getElementById('confirm-dialog-container');
  if (!container) return;

  // Render Layout chính của Modal
  container.innerHTML = `
    <div class="modal fade" id="tenantProfileModal" tabindex="-1" aria-hidden="true" data-testid="tenant-profile-modal">
      <div class="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div class="modal-content bg-light">
          
          <!-- HEADER -->
          <div class="modal-header border-0 bg-white shadow-sm pb-0" style="z-index: 10;">
            <div class="w-100">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="d-flex align-items-center gap-3">
                  <div class="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fs-2 fw-bold shadow-sm" style="width: 80px; height: 80px;">
                    ${initial}
                  </div>
                  <div>
                    <h4 class="mb-1 text-primary fw-bold">${tenant.fullName}</h4>
                    <div class="d-flex gap-2 align-items-center flex-wrap">
                      <span class="badge bg-light text-dark border"><i class="bi bi-telephone text-primary"></i> ${tenant.phone || '—'}</span>
                      <span class="badge bg-light text-dark border"><i class="bi bi-person-vcard text-primary"></i> ${tenant.idCard || '—'}</span>
                      <span class="badge bg-light text-dark border"><i class="bi bi-door-open text-primary"></i> ${roomName}</span>
                      ${statusBadge}
                      <span class="text-muted small ms-2"><i class="bi bi-calendar-check text-success"></i> Ngày vào ở: <strong>${moveInDate}</strong></span>
                    </div>
                  </div>
                </div>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-outline-primary btn-sm" id="btnEditProfile">
                    <i class="bi bi-pencil-square"></i> Sửa hồ sơ
                  </button>
                  <button type="button" class="btn btn-primary btn-sm" id="btnCreateContract">
                    <i class="bi bi-file-earmark-plus"></i> Tạo hợp đồng
                  </button>
                  <button type="button" class="btn-close ms-3" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
              </div>

              <!-- NAV TABS -->
              <ul class="nav nav-tabs nav-tabs-custom border-bottom-0" role="tablist">
                <li class="nav-item" role="presentation">
                  <button class="nav-link active fw-semibold" id="tab-personal" data-bs-toggle="tab" data-bs-target="#pane-personal" type="button" role="tab">
                    Thông tin cá nhân
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link fw-semibold" id="tab-contracts" data-bs-toggle="tab" data-bs-target="#pane-contracts" type="button" role="tab">
                    Hợp đồng
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link fw-semibold" id="tab-history" data-bs-toggle="tab" data-bs-target="#pane-history" type="button" role="tab">
                    Lịch sử thuê
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link fw-semibold" id="tab-invoices" data-bs-toggle="tab" data-bs-target="#pane-invoices" type="button" role="tab">
                    Hóa đơn
                  </button>
                </li>
                <li class="nav-item" role="presentation">
                  <button class="nav-link fw-semibold" id="tab-payments" data-bs-toggle="tab" data-bs-target="#pane-payments" type="button" role="tab">
                    Thanh toán
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <!-- BODY TABS -->
          <div class="modal-body p-4 bg-light">
            <div class="tab-content">
              <!-- Tab Cá Nhân -->
              <div class="tab-pane fade show active" id="pane-personal" role="tabpanel">
                ${renderPersonalInfo(tenant)}
              </div>
              
              <!-- Tab Hợp Đồng -->
              <div class="tab-pane fade" id="pane-contracts" role="tabpanel">
                ${renderContractsTab(tenantId)}
              </div>
              
              <!-- Tab Lịch Sử Thuê -->
              <div class="tab-pane fade" id="pane-history" role="tabpanel">
                ${renderHistoryTab(tenantId)}
              </div>
              
              <!-- Tab Hóa Đơn -->
              <div class="tab-pane fade" id="pane-invoices" role="tabpanel">
                ${renderInvoicesTab(tenantId)}
              </div>
              
              <!-- Tab Thanh Toán -->
              <div class="tab-pane fade" id="pane-payments" role="tabpanel">
                ${renderPaymentsTab(tenantId)}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('tenantProfileModal');
  if (!window.bootstrap || !window.bootstrap.Modal) return;
  const bsModal = new window.bootstrap.Modal(modalEl);

  // Sự kiện
  document.getElementById('btnEditProfile')?.addEventListener('click', () => {
    bsModal.hide(); // Đóng profile modal trước
    setTimeout(() => {
      openTenantForm({
        tenant,
        onSave: () => {
          showToast('Cập nhật thông tin thành công!', 'success');
          openTenantProfile(tenantId); 
          if (typeof window.refreshTenantsList === 'function') {
            window.refreshTenantsList();
          }
        }
      });
    }, 400);
  });

  document.getElementById('btnCreateContract')?.addEventListener('click', () => {
    showToast('Chức năng tạo hợp đồng từ hồ sơ đang phát triển', 'info');
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    container.innerHTML = '';
  });

  bsModal.show();
}

// ─── RENDER HELPER FUNCTIONS ─────────────────────────────────────

function renderPersonalInfo(tenant) {
  return `
    <div class="row g-4">
      <div class="col-md-6">
        <div class="card shadow-sm h-100 border-0">
          <div class="card-body">
            <h6 class="card-title text-primary mb-3"><i class="bi bi-person-lines-fill me-2"></i>Chi tiết cơ bản</h6>
            <table class="table table-sm table-borderless mb-0">
              <tbody>
                <tr><td class="text-muted w-25">Ngày sinh</td><td class="fw-semibold">${tenant.dob ? formatDateToDisplay(tenant.dob) : '—'}</td></tr>
                <tr><td class="text-muted">Giới tính</td><td class="fw-semibold">${tenant.gender || '—'}</td></tr>
                <tr><td class="text-muted">Email</td><td class="fw-semibold">${tenant.email || '—'}</td></tr>
                <tr><td class="text-muted">Quê quán</td><td class="fw-semibold">${tenant.address || '—'}</td></tr>
                <tr><td class="text-muted">Nghề nghiệp</td><td class="fw-semibold">${tenant.occupation || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card shadow-sm border-0 mb-4">
          <div class="card-body">
            <h6 class="card-title text-primary mb-3"><i class="bi bi-bicycle me-2"></i>Phương tiện</h6>
            <table class="table table-sm table-borderless mb-0">
              <tbody>
                <tr><td class="text-muted w-25">Loại xe</td><td class="fw-semibold">${tenant.vehicleType || '—'}</td></tr>
                <tr><td class="text-muted">Biển số</td><td class="fw-semibold"><span class="badge bg-light text-dark border">${tenant.licensePlate || '—'}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="card shadow-sm border-0">
          <div class="card-body">
            <h6 class="card-title text-danger mb-3"><i class="bi bi-telephone-plus me-2"></i>Liên hệ khẩn cấp</h6>
            <table class="table table-sm table-borderless mb-0">
              <tbody>
                <tr><td class="text-muted w-25">Họ tên</td><td class="fw-semibold">${tenant.emergencyName || '—'}</td></tr>
                <tr><td class="text-muted">SĐT</td><td class="fw-semibold">${tenant.emergencyPhone || '—'}</td></tr>
                <tr><td class="text-muted">Quan hệ</td><td class="fw-semibold">${tenant.emergencyRelation || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card shadow-sm border-0 bg-light-subtle">
          <div class="card-body">
            <h6 class="card-title text-primary mb-2"><i class="bi bi-journal-text me-2"></i>Ghi chú</h6>
            <p class="mb-0 text-dark small">${tenant.notes || '<span class="text-muted fst-italic">Không có ghi chú.</span>'}</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderContractsTab(tenantId) {
  const history = getTenantRentalHistory(tenantId); 
  
  if (!history || history.length === 0) {
    return `<div class="text-center p-5 text-muted">Không có hợp đồng nào.</div>`;
  }

  const rows = history.map(h => {
    const c = h.contract;
    const rName = h.room ? h.room.name : '—';
    const isActive = c.status === 'active';
    const badge = isActive ? '<span class="badge bg-success">Hiệu lực</span>' 
                : (c.status === 'expired' ? '<span class="badge bg-secondary">Hết hạn</span>' : '<span class="badge bg-danger">Thanh lý</span>');
                
    return `
      <tr>
        <td><code>${c.id}</code></td>
        <td class="fw-semibold">Phòng ${rName}</td>
        <td>${formatDateToDisplay(c.startDate)}</td>
        <td>${formatDateToDisplay(c.endDate)}</td>
        <td>${badge}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Mã HĐ</th>
              <th>Phòng</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderHistoryTab(tenantId) {
  const history = getTenantRentalHistory(tenantId);
  
  if (!history || history.length === 0) {
    return `<div class="text-center p-5 text-muted">Chưa có lịch sử thuê.</div>`;
  }

  const timelineItems = history.map(h => {
    const c = h.contract;
    const rName = h.room ? h.room.name : '—';
    const isActive = c.status === 'active';
    
    return `
      <div class="d-flex mb-4 position-relative">
        <div class="me-3 d-flex flex-column align-items-center">
          <div class="rounded-circle d-flex align-items-center justify-content-center text-white ${isActive ? 'bg-success' : 'bg-secondary'}" style="width: 40px; height: 40px; z-index: 2;">
            <i class="bi bi-door-open-fill"></i>
          </div>
          <div class="bg-light w-25 h-100 position-absolute" style="left: 19px; top: 40px; border-left: 2px dashed #dee2e6; z-index: 1;"></div>
        </div>
        <div class="card shadow-sm border-0 flex-grow-1">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0 text-primary">Phòng ${rName}</h6>
              <span class="small text-muted">${formatDateToDisplay(c.startDate)} - ${formatDateToDisplay(c.endDate)}</span>
            </div>
            <div class="small text-dark">
              Giá thuê: <strong>${formatCurrency(c.roomPrice)}/tháng</strong> <br>
              Tiền cọc: <strong>${formatCurrency(c.deposit)}</strong> <br>
              Trạng thái HĐ: ${isActive ? 'Đang hiệu lực' : 'Đã kết thúc'}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="p-2">${timelineItems}</div>`;
}

function getInvoicesForTenant(tenantId) {
  const allInvoices = getInvoices();
  const history = getTenantRentalHistory(tenantId);
  
  return allInvoices.filter(inv => {
    const invDate = new Date(inv.year, inv.month - 1, 15);
    
    return history.some(h => {
      if (h.contract.roomId !== inv.roomId) return false;
      const start = new Date(h.contract.startDate);
      const end = new Date(h.contract.endDate);
      return invDate >= start && invDate <= end;
    });
  }).sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
}

function renderInvoicesTab(tenantId) {
  const invoices = getInvoicesForTenant(tenantId);

  if (invoices.length === 0) {
    return `<div class="text-center p-5 text-muted">Không có hóa đơn nào.</div>`;
  }

  const rows = invoices.map(inv => {
    let statusHtml = '';
    switch (inv.status) {
      case 'paid': statusHtml = '<span class="badge bg-success">Đã thanh toán</span>'; break;
      case 'partial': statusHtml = '<span class="badge bg-warning text-dark">Thanh toán 1 phần</span>'; break;
      case 'unpaid': statusHtml = '<span class="badge bg-danger">Chưa thanh toán</span>'; break;
      case 'overdue': statusHtml = '<span class="badge bg-dark">Quá hạn</span>'; break;
      case 'cancelled': statusHtml = '<span class="badge bg-secondary">Đã hủy</span>'; break;
      default: statusHtml = '<span class="badge bg-light text-dark">Nháp</span>';
    }

    return `
      <tr>
        <td class="fw-semibold">Tháng ${inv.month}/${inv.year}</td>
        <td class="text-primary fw-bold">${formatCurrency(inv.totalAmount)}</td>
        <td class="text-success">${formatCurrency(inv.paidAmount || 0)}</td>
        <td class="text-danger fw-semibold">${formatCurrency(inv.remainingDebt || 0)}</td>
        <td>${statusHtml}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Tháng</th>
              <th>Tổng tiền</th>
              <th>Đã trả</th>
              <th>Còn nợ</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPaymentsTab(tenantId) {
  const invoices = getInvoicesForTenant(tenantId);
  const invoiceIds = invoices.map(i => i.id);
  
  const allPayments = getPayments();
  const payments = allPayments.filter(p => invoiceIds.includes(p.invoiceId))
                              .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  if (payments.length === 0) {
    return `<div class="text-center p-5 text-muted">Không có lịch sử thanh toán nào.</div>`;
  }

  const rows = payments.map(p => {
    const inv = invoices.find(i => i.id === p.invoiceId);
    const monthStr = inv ? `${inv.month}/${inv.year}` : '—';
    
    let methodHtml = '';
    switch(p.method) {
      case 'cash': methodHtml = '<i class="bi bi-cash text-success me-1"></i> Tiền mặt'; break;
      case 'transfer': methodHtml = '<i class="bi bi-bank text-primary me-1"></i> Chuyển khoản'; break;
      default: methodHtml = p.method;
    }

    return `
      <tr>
        <td><code>${p.id}</code></td>
        <td>${formatDateToDisplay(p.paymentDate)}</td>
        <td>Hóa đơn T${monthStr}</td>
        <td class="fw-bold text-success">+ ${formatCurrency(p.amount)}</td>
        <td>${methodHtml}</td>
        <td>${p.notes || '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="card shadow-sm border-0">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Mã GD</th>
              <th>Ngày thanh toán</th>
              <th>Hóa đơn</th>
              <th>Số tiền</th>
              <th>Hình thức</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
