// src/components/invoice-form.js

import { getRooms } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { getReadingByRoomAndMonth } from '../services/meter-reading-service.js';
import { getInvoiceByRoomAndMonth, createInvoice } from '../services/invoice-service.js';
import * as StorageService from '../services/storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { calculateElectricAmount, calculateWaterAmount, calculateFixedServiceAmount, calculatePerPersonAmount, calculatePerVehicleAmount, calculateSubtotal, calculateDiscount, calculateInvoiceTotal } from '../business/invoice-calculator.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { showToast } from './toast.js';
import { initSearchableSelect } from './searchable-select.js';
import { ROOM_STATUS_LABELS } from '../constants/statuses.js';
import { renderErrorState } from './error-state.js';

let modalInstance = null;
let containerEl = null;

// State của form
let state = {
  isEdit: false,
  onSaveCallback: null,
  roomId: '',
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  contract: null,
  tenant: null,
  reading: null,
  existingInvoice: null,
  dueDate: '',
  serviceDetails: [],
  discount: 0,
  subtotal: 0,
  total: 0
};

// ─── UTILS ─────────────────────────────────────────────────────────────

function getActiveContract(roomId, month, year) {
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);
  const targetStart = new Date(year, month - 1, 1);
  const targetEnd = new Date(year, month, 0, 23, 59, 59, 999);

  return contracts.find(c => {
    if (c.roomId !== roomId || c.status === 'terminated') return false;
    const cStart = new Date(c.startDate);
    const cEnd = new Date(c.endDate);
    return cStart <= targetEnd && cEnd >= targetStart;
  }) || null;
}

function getActiveServices() {
  const all = StorageService.getAll(STORAGE_KEYS.SERVICE_CONFIGS)
    .filter(s => s.status !== 'inactive'); // Bao gồm cả dịch vụ chưa có trường status

  // Sắp xếp: Điện → Nước → còn lại
  const order = { electricity: 0, water: 1 };
  return all.sort((a, b) => {
    const oa = order[a.type] ?? 99;
    const ob = order[b.type] ?? 99;
    return oa - ob;
  });
}

function buildDefaultDueDate(month, year) {
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`;
}

// ─── LOGIC ─────────────────────────────────────────────────────────────

function loadRoomData() {
  const { roomId, month, year } = state;
  if (!roomId) {
    state.contract = null;
    state.tenant = null;
    state.reading = null;
    state.existingInvoice = null;
    state.serviceDetails = [];
    renderForm();
    return;
  }

  // Lấy dữ liệu nghiệp vụ
  state.contract = getActiveContract(roomId, month, year);
  state.tenant = state.contract ? getTenantById(state.contract.tenantId) : null;
  state.reading = getReadingByRoomAndMonth(roomId, month, year);
  state.existingInvoice = getInvoiceByRoomAndMonth(roomId, month, year);
  
  if (!state.dueDate) {
    state.dueDate = buildDefaultDueDate(month, year);
  }

  // Build service details tự động nếu KHÔNG phải chế độ edit
  if (!state.isEdit) {
    state.serviceDetails = [];
    
    // 1. Tiền phòng
    if (state.contract) {
      state.serviceDetails.push({
        id: 'room_fee',
        name: 'Tiền thuê phòng',
        usage: 1,
        unit: 'tháng',
        unitPrice: state.contract.roomPrice,
        total: state.contract.roomPrice,
        type: 'room',
        isFixed: true
      });
    }

    // Tính số người và số xe từ hợp đồng
    const personCount = state.contract
      ? 1 + (state.contract.coTenantIds ? state.contract.coTenantIds.length : 0)
      : 0;
    const vehicleCount = state.contract ? (Number(state.contract.vehicles) || 0) : 0;

    // 2. Điện, Nước, Dịch vụ khác
    const services = getActiveServices();
    services.forEach(svc => {
      let usage = 1;
      let total = 0;
      
      if (svc.calcMethod === 'usage') {
        if (svc.code === 'DIEN' || svc.type === 'electricity') {
          usage = state.reading ? (state.reading.electricityUsage ?? 0) : 0;
          total = calculateElectricAmount(usage, svc.unitPrice);
        } else if (svc.code === 'NUOC' || svc.type === 'water') {
          usage = state.reading ? (state.reading.waterUsage ?? 0) : 0;
          total = calculateWaterAmount(usage, svc.unitPrice);
        }
      } else if (svc.calcMethod === 'fixed') {
        usage = 1;
        total = calculateFixedServiceAmount(svc.unitPrice);
      } else if (svc.calcMethod === 'perPerson') {
        usage = personCount;
        total = calculatePerPersonAmount(usage, svc.unitPrice);
      } else if (svc.calcMethod === 'perVehicle') {
        usage = vehicleCount;
        total = calculatePerVehicleAmount(usage, svc.unitPrice);
      } else if (svc.calcMethod === 'manual') {
        usage = 0;
        total = 0;
      }

      state.serviceDetails.push({
        id: svc.id,
        name: svc.name,
        usage: usage,
        unit: svc.unit || '',
        unitPrice: svc.unitPrice,
        total: total,
        type: 'service',
        isFixed: true
      });
    });
  }

  recalculateTotals();
  renderForm();
}

function recalculateTotals() {
  state.serviceDetails.forEach(item => {
    item.total = Number(item.usage) * Number(item.unitPrice);
  });
  const items = state.serviceDetails.map(s => s.total);
  state.subtotal = calculateSubtotal(items);
  const finalDiscount = Math.min(state.subtotal, Number(state.discount) || 0);
  state.total = calculateInvoiceTotal(items, finalDiscount);
}

// ─── RENDER ────────────────────────────────────────────────────────────

function renderForm() {
  const isReadOnly = state.isEdit; // Khóa chọn phòng/tháng/năm khi đang ở chế độ cập nhật

  const formHtml = `
    <div class="row mb-4">
      <div class="col-md-3 mb-3">
        <label class="form-label fw-bold">Chọn phòng ${isReadOnly ? '' : '<span class="text-danger">*</span>'}</label>
        <select class="form-select" id="icm-roomId" ${isReadOnly ? 'disabled' : ''}>
          <option value="">-- Chọn phòng --</option>
          ${getRooms().map(r => {
            const nameText = r.name.startsWith('Phòng') ? r.name : 'Phòng ' + r.name;
            const statusText = ROOM_STATUS_LABELS[r.status] || r.status;
            return `<option value="${r.id}" ${state.roomId === r.id ? 'selected' : ''}>${nameText} (${statusText})</option>`;
          }).join('')}
        </select>
      </div>
      <div class="col-md-3 mb-3">
        <label class="form-label fw-bold">Tháng lập HĐ</label>
        <div class="input-group">
          <select class="form-select" id="icm-month" ${isReadOnly ? 'disabled' : ''}>
            ${Array.from({length: 12}, (_, i) => i+1).map(m => `<option value="${m}" ${state.month === m ? 'selected' : ''}>Tháng ${m}</option>`).join('')}
          </select>
          <input type="number" class="form-control" id="icm-year" value="${state.year}" style="max-width: 80px;" ${isReadOnly ? 'disabled' : ''} />
        </div>
      </div>
      <div class="col-md-3 mb-3">
        <label class="form-label fw-bold text-muted">Người đại diện</label>
        <div class="form-control bg-light">${state.tenant ? state.tenant.fullName : '<span class="text-muted fst-italic">Chưa có</span>'}</div>
      </div>
      <div class="col-md-3 mb-3">
        <label class="form-label fw-bold">Hạn thanh toán <span class="text-danger">*</span></label>
        <input type="date" class="form-control" id="icm-dueDate" value="${state.dueDate}" />
      </div>
    </div>

    <!-- Cảnh báo -->
    ${state.roomId ? `
      ${(!state.isEdit && state.existingInvoice) ? `<div class="alert alert-danger py-2"><i class="bi bi-exclamation-triangle-fill me-2"></i> Đã tồn tại hóa đơn (Mã: ${state.existingInvoice.id}) cho phòng này trong tháng ${state.month}/${state.year}.</div>` : ''}
      ${!state.contract ? `<div class="mb-3">${renderErrorState('invoice-creation-failed', {
        showHomeBtn: false,
        actionId: 'btnErrorActionCheckContracts',
        actionText: '📝 Kiểm tra hợp đồng'
      })}</div>` : ''}
      ${(!state.isEdit && !state.reading) ? `<div class="alert alert-warning py-2"><i class="bi bi-exclamation-triangle-fill me-2"></i> Chưa chốt chỉ số điện nước cho tháng ${state.month}/${state.year}. (Tiền điện, nước sẽ tính bằng 0).</div>` : ''}
    ` : '<div class="alert alert-info py-2">Vui lòng chọn phòng để tải dữ liệu hóa đơn.</div>'}

    <!-- Bảng chi tiết -->
    <div class="card border-0 shadow-sm mb-4">
      <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
        <h6 class="mb-0 fw-bold">Chi tiết các khoản thu</h6>
        <button type="button" class="btn btn-sm btn-outline-primary" id="icm-add-item"><i class="bi bi-plus"></i> Thêm khoản phát sinh</button>
      </div>
      <div class="table-responsive">
        <table class="table table-bordered table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Nội dung</th>
              <th width="15%">Số lượng</th>
              <th width="10%">ĐVT</th>
              <th width="20%">Đơn giá (VND)</th>
              <th width="20%" class="text-end">Thành tiền</th>
              <th width="5%" class="text-center">Xóa</th>
            </tr>
          </thead>
          <tbody>
            ${state.serviceDetails.length === 0 ? `<tr><td colspan="6" class="text-center text-muted py-3">Không có khoản phí nào</td></tr>` : ''}
            ${state.serviceDetails.map((item, index) => `
              <tr>
                <td>
                  <input type="text" class="form-control form-control-sm border-0 icm-item-name" data-idx="${index}" value="${item.name}" ${item.isFixed ? 'readonly' : ''} />
                </td>
                <td>
                  <input type="number" class="form-control form-control-sm icm-item-usage" data-idx="${index}" value="${item.usage}" min="0" />
                </td>
                <td>
                  <input type="text" class="form-control form-control-sm border-0 icm-item-unit" data-idx="${index}" value="${item.unit}" ${item.isFixed ? 'readonly' : ''} />
                </td>
                <td>
                  <input type="number" class="form-control form-control-sm icm-item-price" data-idx="${index}" value="${item.unitPrice}" min="0" />
                </td>
                <td class="text-end fw-bold text-dark">
                  ${formatCurrency(item.total)}
                </td>
                <td class="text-center">
                  ${item.isFixed ? '-' : `<button type="button" class="btn btn-sm btn-outline-danger border-0 icm-remove-item" data-idx="${index}"><i class="bi bi-trash"></i></button>`}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tổng kết -->
    <div class="row">
      <div class="col-md-6 offset-md-6">
        <div class="card border-0 bg-light p-3">
          <div class="d-flex justify-content-between mb-2">
            <span class="text-muted">Tạm tính:</span>
            <strong class="text-dark">${formatCurrency(state.subtotal)}</strong>
          </div>
          <div class="d-flex justify-content-between mb-2 align-items-center">
            <span class="text-muted">Giảm giá (VND):</span>
            <input type="number" class="form-control form-control-sm text-end" id="icm-discount" value="${state.discount}" style="max-width: 150px;" min="0" />
          </div>
          <hr />
          <div class="d-flex justify-content-between mb-2">
            <span class="fs-5 fw-bold text-dark">Tổng cộng:</span>
            <span class="fs-5 fw-bold text-primary">${formatCurrency(state.total)}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('icm-body').innerHTML = formHtml;
  bindFormEvents();

  // Cập nhật trạng thái nút lưu nếu không có hợp đồng
  const btnDraft = document.getElementById('icm-btn-draft');
  const btnFinalize = document.getElementById('icm-btn-finalize');
  if (btnDraft && btnFinalize) {
    const disabled = !!state.roomId && !state.contract;
    btnDraft.disabled = disabled;
    btnFinalize.disabled = disabled;
  }

  // Gán sự kiện click cho nút Error State nếu hiển thị
  document.getElementById('btnErrorActionCheckContracts')?.addEventListener('click', (e) => {
    e.preventDefault();
    modalInstance?.hide();
    import('../router.js').then(router => {
      router.navigateTo('contracts');
    });
  });

  // Kích hoạt searchable-select cho ô chọn phòng (nếu không ở chế độ readonly)
  if (!isReadOnly) {
    const roomSelect = document.getElementById('icm-roomId');
    if (roomSelect) {
      initSearchableSelect(roomSelect);
    }
  }
}

function bindFormEvents() {
  if (!state.isEdit) {
    document.getElementById('icm-roomId')?.addEventListener('change', (e) => {
      state.roomId = e.target.value;
      loadRoomData();
    });
    document.getElementById('icm-month')?.addEventListener('change', (e) => {
      state.month = Number(e.target.value);
      loadRoomData();
    });
    document.getElementById('icm-year')?.addEventListener('input', (e) => {
      state.year = Number(e.target.value);
      if (state.year >= 2000) loadRoomData();
    });
  }

  document.getElementById('icm-dueDate')?.addEventListener('change', (e) => {
    state.dueDate = e.target.value;
  });

  // Table events (live update)
  document.querySelectorAll('.icm-item-usage, .icm-item-price, .icm-item-name, .icm-item-unit').forEach(el => {
    el.addEventListener('input', (e) => {
      const idx = e.target.dataset.idx;
      const val = e.target.value;
      if (e.target.classList.contains('icm-item-usage')) state.serviceDetails[idx].usage = Number(val) || 0;
      if (e.target.classList.contains('icm-item-price')) state.serviceDetails[idx].unitPrice = Number(val) || 0;
      if (e.target.classList.contains('icm-item-name')) state.serviceDetails[idx].name = val;
      if (e.target.classList.contains('icm-item-unit')) state.serviceDetails[idx].unit = val;
      
      recalculateTotals();
      renderForm(); 
    });
  });

  // Xóa khoản
  document.querySelectorAll('.icm-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.idx;
      state.serviceDetails.splice(idx, 1);
      recalculateTotals();
      renderForm();
    });
  });

  // Thêm khoản phát sinh
  document.getElementById('icm-add-item')?.addEventListener('click', () => {
    state.serviceDetails.push({
      id: 'extra_' + Date.now(),
      name: 'Khoản phát sinh mới',
      usage: 1,
      unit: 'Lần',
      unitPrice: 0,
      total: 0,
      type: 'extra',
      isFixed: false
    });
    recalculateTotals();
    renderForm();
  });

  // Giảm giá
  document.getElementById('icm-discount')?.addEventListener('input', (e) => {
    state.discount = Number(e.target.value) || 0;
    recalculateTotals();
    renderForm();
  });
}

function handleSave(status) {
  if (!state.roomId) {
    showToast('Vui lòng chọn phòng!', 'warning');
    return;
  }
  if (!state.dueDate) {
    showToast('Vui lòng chọn hạn thanh toán!', 'warning');
    return;
  }
  if (!state.isEdit && state.existingInvoice) {
    showToast('Hóa đơn tháng này đã tồn tại, không thể lập thêm!', 'danger');
    return;
  }

  // Chia tách tổng tiền thành các phí tương thích với báo cáo hệ thống
  let roomFee = 0, electricityFee = 0, waterFee = 0, otherServicesFee = 0;
  state.serviceDetails.forEach(item => {
    if (item.type === 'room') roomFee += item.total;
    else if (item.name.toLowerCase().includes('điện')) electricityFee += item.total;
    else if (item.name.toLowerCase().includes('nước')) waterFee += item.total;
    else otherServicesFee += item.total;
  });

  const invoiceData = {
    roomId: state.roomId,
    month: state.month,
    year: state.year,
    dueDate: state.dueDate,
    roomFee,
    electricityFee,
    waterFee,
    otherServicesFee,
    discount: state.discount,
    serviceDetails: state.serviceDetails,
    note: `Hóa đơn chi tiết tháng ${state.month}/${state.year}`
  };

  try {
    if (state.isEdit) {
      // Chế độ Cập nhật: gọi callback
      if (state.onSaveCallback) {
        invoiceData.status = status === 'unpaid' ? 'unpaid' : 'draft';
        state.onSaveCallback(invoiceData);
      }
      modalInstance.hide();
    } else {
      // Chế độ Tạo mới: lưu trực tiếp
      const inv = createInvoice(invoiceData);
      
      // Nếu chốt đơn, đánh dấu là unpaid
      if (status === 'unpaid') {
        const invoices = StorageService.getAll(STORAGE_KEYS.INVOICES);
        const index = invoices.findIndex(i => i.id === inv.id);
        if (index !== -1) {
          invoices[index].status = 'unpaid';
          StorageService.replaceAll(STORAGE_KEYS.INVOICES, invoices);
        }
      }
      
      showToast(status === 'draft' ? 'Lưu hóa đơn nháp thành công!' : 'Đã chốt hóa đơn thành công!', 'success');
      modalInstance.hide();
      
      // Gửi event để render lại trang invoices
      document.dispatchEvent(new CustomEvent('invoices-updated'));
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────

/**
 * Mở modal lập/sửa hóa đơn.
 * @param {Object} options 
 * @param {Object} options.invoice - (Tùy chọn) Hóa đơn cần sửa. Nếu có, form sẽ vào chế độ Update.
 * @param {Function} options.onSave - (Tùy chọn) Callback được gọi khi lưu (cho chế độ Update).
 */
export function openInvoiceForm({ invoice = null, onSave = null } = {}) {
  if (!containerEl) {
    containerEl = document.createElement('div');
    document.body.appendChild(containerEl);
  }

  // Khởi tạo state
  state = {
    isEdit: !!invoice,
    onSaveCallback: onSave,
    roomId: invoice ? invoice.roomId : '',
    month: invoice ? invoice.month : new Date().getMonth() + 1,
    year: invoice ? invoice.year : new Date().getFullYear(),
    contract: null,
    tenant: null,
    reading: null,
    existingInvoice: null,
    dueDate: invoice ? invoice.dueDate : '',
    serviceDetails: invoice ? JSON.parse(JSON.stringify(invoice.serviceDetails || [])) : [],
    discount: invoice ? invoice.discount : 0,
    subtotal: 0,
    total: 0
  };

  containerEl.innerHTML = `
    <div class="modal fade" id="invoiceFormModal" tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content bg-light">
          <div class="modal-header bg-white shadow-sm z-1">
            <h5 class="modal-title fw-bold text-primary"><i class="bi bi-receipt me-2"></i> ${state.isEdit ? 'Cập nhật hóa đơn' : 'Lập hóa đơn chi tiết'}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body p-4" id="icm-body">
            <!-- Nội dung form -->
          </div>
          <div class="modal-footer bg-white shadow-sm border-top-0 d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Hủy bỏ</button>
            <button type="button" class="btn btn-outline-primary px-4" id="icm-btn-draft"><i class="bi bi-save me-2"></i>Lưu bản nháp</button>
            <button type="button" class="btn btn-primary px-4" id="icm-btn-finalize"><i class="bi bi-check-circle me-2"></i>Chốt hóa đơn</button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (state.isEdit) {
    // Tải contract/tenant để hiển thị (không tự sinh serviceDetails mới)
    state.contract = getActiveContract(state.roomId, state.month, state.year);
    state.tenant = state.contract ? getTenantById(state.contract.tenantId) : null;
    recalculateTotals();
    renderForm();
  } else {
    // Tải form trống
    renderForm();
  }

  const modalEl = document.getElementById('invoiceFormModal');
  modalInstance = new window.bootstrap.Modal(modalEl);

  document.getElementById('icm-btn-draft').addEventListener('click', () => handleSave('draft'));
  document.getElementById('icm-btn-finalize').addEventListener('click', () => handleSave('unpaid'));

  modalEl.addEventListener('hidden.bs.modal', () => {
    containerEl.innerHTML = '';
  });

  modalInstance.show();
}
