// src/pages/meter-readings-page.js

/**
 * Trang ghi chỉ số điện nước (Spreadsheet-like Inline Editor).
 * Hỗ trợ nhập trực tiếp trong bảng, tự động tính tiêu thụ, cảnh báo tức thời, lọc và lưu hàng loạt.
 */

import '../styles/meter-readings.css';

import {
  getReadings,
  getReadingById,
  getReadingByRoomAndMonth,
  createReading,
  updateReading,
  getPreviousReading,
  hasActiveContractInMonth
} from '../services/meter-reading-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { getTenantById } from '../services/tenant-service.js';
import { detectAbnormalUsage } from '../business/meter-calculator.js';
import { showToast } from '../components/toast.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import * as StorageService from '../services/storage-service.js';
import { renderEmptyState } from '../components/empty-state.js';

// ─── STATE ─────────────────────────────────────────────────────
// Mặc định chọn tháng 7 năm 2026 như yêu cầu thiết kế
let currentMonth = 7;
let currentYear = 2026;
let showOnlyUnrecorded = false; // Trạng thái bộ lọc "Chỉ hiển thị phòng chưa ghi"
let tableRows = []; // Chứa trạng thái các dòng hiện hành của bảng nhập liệu

export function renderMetersPage(container) {
  container.innerHTML = `
    <div data-testid="meters-page">
      <!-- Toolbar đầu trang -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4 p-3 bg-white border rounded shadow-sm">
        <div class="d-flex flex-wrap align-items-center gap-3">
          <!-- Chọn tháng/năm -->
          <div class="d-flex align-items-center gap-2 flex-nowrap">
            <label for="filterMonth" class="fw-bold text-dark mb-0 text-nowrap"><i class="bi bi-calendar3 me-1 text-primary"></i>Kỳ ghi:</label>
            <select class="form-select form-select-sm" style="max-width: 120px;" id="filterMonth" data-testid="filter-month">
              ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                <option value="${m}" ${currentMonth === m ? 'selected' : ''}>Tháng ${String(m).padStart(2, '0')}</option>
              `).join('')}
            </select>
            <select class="form-select form-select-sm" style="width: 130px;" id="filterYear" data-testid="filter-year">
              ${[2024, 2025, 2026, 2027, 2028].map(y => `
                <option value="${y}" ${currentYear === y ? 'selected' : ''}>Năm ${y}</option>
              `).join('')}
            </select>
          </div>

          <!-- Bộ lọc "Chỉ hiện phòng chưa ghi" -->
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch" id="filterUnrecorded" data-testid="filter-unrecorded" ${showOnlyUnrecorded ? 'checked' : ''}>
            <label class="form-check-label fw-bold text-muted small" style="cursor: pointer;" for="filterUnrecorded">Chỉ hiện phòng chưa ghi</label>
          </div>
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm d-flex align-items-center gap-1" id="btnGenerateList" data-testid="btn-generate-list">
            <i class="bi bi-file-earmark-plus"></i> Tạo danh sách phòng
          </button>
          <button class="btn btn-success btn-sm d-flex align-items-center gap-1" id="btnSaveAll" data-testid="btn-save-all">
            <i class="bi bi-save"></i> Lưu tất cả
          </button>
        </div>
      </div>

      <!-- Các card tổng quan -->
      <div class="row g-3 mb-4">
        <!-- Phòng cần ghi -->
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded p-3 text-center bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">Phòng cần ghi</div>
            <div class="fs-2 fw-bold text-primary" id="summaryRoomsNeed" data-testid="summary-rooms-need">0</div>
          </div>
        </div>

        <!-- Đã ghi -->
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded p-3 text-center bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">Đã ghi</div>
            <div class="fs-2 fw-bold text-success" id="summaryRecorded" data-testid="summary-recorded">0</div>
          </div>
        </div>

        <!-- Chưa ghi -->
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded p-3 text-center bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">Chưa ghi</div>
            <div class="fs-2 fw-bold text-danger" id="summaryUnrecorded" data-testid="summary-unrecorded">0</div>
          </div>
        </div>

        <!-- Có cảnh báo -->
        <div class="col-6 col-md-3">
          <div class="card border-0 shadow-sm rounded p-3 text-center bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">Có cảnh báo</div>
            <div class="fs-2 fw-bold text-warning" id="summaryWarning" data-testid="summary-warning">0</div>
          </div>
        </div>
      </div>

      <!-- Bảng nhập liệu Spreadsheet -->
      <div class="card border-0 shadow-sm rounded overflow-hidden">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0" data-testid="meters-table">
            <thead class="table-light border-bottom">
              <tr>
                <th style="min-width: 120px;">Phòng</th>
                <th style="min-width: 150px;">Người thuê</th>
                <th style="max-width: 90px;" class="text-center">Điện cũ</th>
                <th style="max-width: 100px;" class="text-center">Điện mới</th>
                <th style="min-width: 110px;" class="text-center">Điện tiêu thụ</th>
                <th style="max-width: 90px;" class="text-center">Nước cũ</th>
                <th style="max-width: 100px;" class="text-center">Nước mới</th>
                <th style="min-width: 110px;" class="text-center">Nước tiêu thụ</th>
                <th style="min-width: 130px;">Cảnh báo</th>
                <th style="min-width: 90px;" class="text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody id="metersTableBody" data-testid="meters-table-body">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  initializeTable();
  bindEvents();
}

// ─── TẢI VÀ KHỞI TẠO BẢNG ──────────────────────────────────────

function initializeTable() {
  const rooms = getRooms();
  const readings = getReadings();
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);

  // Chỉ lấy phòng có hợp đồng hiệu lực trong kỳ này
  const activeRooms = rooms.filter(r => hasActiveContractInMonth(r.id, currentMonth, currentYear));

  tableRows = activeRooms.map(room => {
    // Tìm người đại diện
    const activeContract = contracts.find(c =>
      c.roomId === room.id &&
      c.status === 'active' &&
      hasActiveContractInMonth(room.id, currentMonth, currentYear)
    );
    const tenant = activeContract ? getTenantById(activeContract.tenantId) : null;
    const tenantName = tenant ? tenant.fullName : 'Không có đại diện';

    const existingReading = readings.find(r => r.roomId === room.id && r.month === currentMonth && r.year === currentYear);

    if (existingReading) {
      const row = {
        id: existingReading.id,
        roomId: room.id,
        roomName: room.name,
        tenantName: tenantName,
        electricityOld: existingReading.electricityOld,
        electricityNew: existingReading.electricityNew,
        electricityUsage: existingReading.electricityUsage,
        waterOld: existingReading.waterOld,
        waterNew: existingReading.waterNew,
        waterUsage: existingReading.waterUsage,
        isSaved: true,
        error: '',
        isAbnormal: false,
        warning: ''
      };
      validateAndCalculateRow(row);
      return row;
    } else {
      const prevReading = getPreviousReading(room.id, currentMonth, currentYear);
      const elecOld = prevReading ? prevReading.electricityNew : 0;
      const waterOld = prevReading ? prevReading.waterNew : 0;

      return {
        id: `temp-${room.id}`,
        roomId: room.id,
        roomName: room.name,
        tenantName: tenantName,
        electricityOld: elecOld,
        electricityNew: '',
        electricityUsage: 0,
        waterOld: waterOld,
        waterNew: '',
        waterUsage: 0,
        isSaved: false,
        error: '',
        isAbnormal: false,
        warning: ''
      };
    }
  });

  filterTableRows();
  updateSummaryCards();
}

// ─── TÍNH TOÁN VÀ KIỂM TRA LỖI TRỰC TIẾP ───────────────────────

function validateAndCalculateRow(row) {
  row.error = '';
  row.warning = '';
  row.isAbnormal = false;

  // 1. Kiểm tra & Tính tiêu thụ điện
  const elecNew = row.electricityNew;
  if (elecNew !== '' && !isNaN(elecNew) && elecNew !== null) {
    const val = Number(elecNew);
    if (val < row.electricityOld) {
      row.error = 'Điện mới nhỏ hơn điện cũ!';
    } else {
      row.electricityUsage = val - row.electricityOld;
    }
  } else {
    row.electricityUsage = 0;
  }

  // 2. Kiểm tra & Tính tiêu thụ nước
  const waterNew = row.waterNew;
  if (waterNew !== '' && !isNaN(waterNew) && waterNew !== null) {
    const val = Number(waterNew);
    if (val < row.waterOld) {
      row.error = row.error ? row.error + ' | Nước mới nhỏ hơn nước cũ!' : 'Nước mới nhỏ hơn nước cũ!';
    } else {
      row.waterUsage = val - row.waterOld;
    }
  } else {
    row.waterUsage = 0;
  }

  // 3. Kiểm tra bất thường so với tháng liền kề trước (nếu không có lỗi trị nhỏ hơn)
  if (!row.error) {
    const prevReading = getPreviousReading(row.roomId, currentMonth, currentYear);
    if (prevReading) {
      if (elecNew !== '' && !isNaN(elecNew)) {
        const prevElecUsage = prevReading.electricityUsage || 0;
        const elecAbnormal = detectAbnormalUsage(row.electricityUsage, prevElecUsage);
        if (elecAbnormal.abnormal) {
          row.isAbnormal = true;
          row.warning = elecAbnormal.message;
        }
      }

      if (waterNew !== '' && !isNaN(waterNew)) {
        const prevWaterUsage = prevReading.waterUsage || 0;
        const waterAbnormal = detectAbnormalUsage(row.waterUsage, prevWaterUsage);
        if (waterAbnormal.abnormal) {
          row.isAbnormal = true;
          row.warning = row.warning ? row.warning + ' | ' + waterAbnormal.message : waterAbnormal.message;
        }
      }
    }
  }
}

// ─── CẬP NHẬT TRỰC QUAN TỪNG HÀNG (GIỮ CON TRỎ CHỮ) ─────────────

function updateRowUI(row) {
  const tr = document.querySelector(`tr[data-room-id="${row.roomId}"]`);
  if (!tr) return;

  // Cột Điện tiêu thụ
  const elecUsageCell = tr.querySelector('.cell-elec-usage');
  if (elecUsageCell) {
    elecUsageCell.innerHTML = `<span class="badge bg-primary">${row.electricityUsage} kWh</span>`;
  }

  // Cột Nước tiêu thụ
  const waterUsageCell = tr.querySelector('.cell-water-usage');
  if (waterUsageCell) {
    waterUsageCell.innerHTML = `<span class="badge bg-info text-dark">${row.waterUsage} m³</span>`;
  }

  // Cột Cảnh báo
  const warningCell = tr.querySelector('.cell-warning');
  if (warningCell) {
    if (row.error) {
      warningCell.innerHTML = `<span class="text-danger small fw-bold" title="${row.error}"><i class="bi bi-x-circle-fill me-1"></i>Chỉ số giảm</span>`;
    } else if (row.isAbnormal) {
      warningCell.innerHTML = `<span class="text-warning small fw-bold" title="${row.warning}"><i class="bi bi-exclamation-triangle-fill me-1"></i>Biến động</span>`;
    } else {
      warningCell.innerHTML = `<span class="text-success small"><i class="bi bi-check-circle-fill me-1"></i>Ổn định</span>`;
    }
  }

  // Cột Trạng thái lưu
  const saveCell = tr.querySelector('.cell-save-status');
  if (saveCell) {
    if (row.isSaved) {
      saveCell.innerHTML = `<span class="text-success fs-5" title="Đã lưu"><i class="bi bi-check-lg"></i></span>`;
    } else {
      saveCell.innerHTML = `<span class="text-muted fs-6" title="Chưa lưu"><i class="bi bi-dash-circle"></i></span>`;
    }
  }
}

// ─── RENDER DANH SÁCH RA BẢNG ──────────────────────────────────

function filterTableRows() {
  const tbody = document.getElementById('metersTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  let filtered = tableRows;
  if (showOnlyUnrecorded) {
    filtered = tableRows.filter(r => !r.isSaved || r.electricityNew === '' || r.waterNew === '');
  }

  if (filtered.length === 0) {
    let emptyHtml = '';
    if (tableRows.length === 0) {
      emptyHtml = renderEmptyState('no-rooms');
    } else if (showOnlyUnrecorded) {
      // Đã ghi hết điện nước
      emptyHtml = `
        <div class="empty-state-container text-center py-5 px-4 my-3 bg-white rounded border" style="border: 1px solid #dee2e6; max-width: 600px; margin: 0 auto;">
          <div class="empty-state-icon-wrapper d-inline-flex align-items-center justify-content-center mb-3 rounded-circle bg-light" style="width: 72px; height: 72px;">
            <i class="bi bi-check-circle-fill text-success fs-2"></i>
          </div>
          <h5 class="empty-state-title fw-bold text-dark mb-2">Đã ghi chỉ số điện nước tháng này</h5>
          <p class="empty-state-description text-muted small mx-auto mb-4" style="max-width: 460px; line-height: 1.5;">
            Tất cả các phòng thuê trong kỳ tháng ${currentMonth}/${currentYear} đã được cập nhật chỉ số điện nước đầy đủ.
          </p>
          <button type="button" class="btn btn-outline-secondary btn-sm px-4 py-2 fw-semibold shadow-sm" id="btnEmptyActionClearFilters">
            🧹 Xem tất cả các phòng
          </button>
        </div>
      `;
    } else {
      emptyHtml = renderEmptyState('no-results');
    }

    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center py-4">
          ${emptyHtml}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const errorHtml = row.error
      ? `<span class="text-danger small fw-bold" title="${row.error}"><i class="bi bi-x-circle-fill me-1"></i>Chỉ số giảm</span>`
      : (row.isAbnormal
          ? `<span class="text-warning small fw-bold" title="${row.warning}"><i class="bi bi-exclamation-triangle-fill me-1"></i>Biến động</span>`
          : `<span class="text-success small"><i class="bi bi-check-circle-fill me-1"></i>Ổn định</span>`);

    const saveHtml = row.isSaved
      ? `<span class="text-success fs-5" title="Đã lưu"><i class="bi bi-check-lg"></i></span>`
      : `<span class="text-muted fs-6" title="Chưa lưu"><i class="bi bi-dash-circle"></i></span>`;

    return `
      <tr data-room-id="${row.roomId}" data-testid="meter-row-${row.roomId}">
        <td><strong>${row.roomName.startsWith('Phòng') ? row.roomName : 'Phòng ' + row.roomName}</strong></td>
        <td><small class="text-muted">${row.tenantName}</small></td>
        
        <!-- Điện cũ -->
        <td style="max-width: 90px;" class="text-center">
          <input type="number" class="form-control form-control-sm text-center bg-light border-0" value="${row.electricityOld}" disabled />
        </td>
        
        <!-- Điện mới -->
        <td style="max-width: 110px;" class="text-center">
          <input type="number" class="form-control form-control-sm text-center input-elec-new" 
            data-room-id="${row.roomId}" data-type="electricityNew" min="0"
            value="${row.electricityNew}" placeholder="Nhập số" data-testid="input-elec-new-${row.roomId}" />
        </td>
        
        <!-- Điện tiêu thụ -->
        <td class="cell-elec-usage text-center">
          <span class="badge bg-primary">${row.electricityUsage} kWh</span>
        </td>
        
        <!-- Nước cũ -->
        <td style="max-width: 90px;" class="text-center">
          <input type="number" class="form-control form-control-sm text-center bg-light border-0" value="${row.waterOld}" disabled />
        </td>
        
        <!-- Nước mới -->
        <td style="max-width: 110px;" class="text-center">
          <input type="number" class="form-control form-control-sm text-center input-water-new" 
            data-room-id="${row.roomId}" data-type="waterNew" min="0"
            value="${row.waterNew}" placeholder="Nhập số" data-testid="input-water-new-${row.roomId}" />
        </td>
        
        <!-- Nước tiêu thụ -->
        <td class="cell-water-usage text-center">
          <span class="badge bg-info text-dark">${row.waterUsage} m³</span>
        </td>
        
        <!-- Cảnh báo -->
        <td class="cell-warning">${errorHtml}</td>
        
        <!-- Trạng thái lưu -->
        <td class="cell-save-status text-center">${saveHtml}</td>
      </tr>
    `;
  }).join('');
}

// ─── CẬP NHẬT THẺ TỔNG QUAN ────────────────────────────────────

function updateSummaryCards() {
  const cardRoomNeed = document.getElementById('summaryRoomsNeed');
  const cardRecorded = document.getElementById('summaryRecorded');
  const cardUnrecorded = document.getElementById('summaryUnrecorded');
  const cardWarning = document.getElementById('summaryWarning');

  if (!cardRoomNeed || !cardRecorded || !cardUnrecorded || !cardWarning) return;

  const rooms = getRooms();
  const readings = getReadings();

  // 1. Số phòng có HĐ cần ghi
  const roomsNeed = rooms.filter(r => hasActiveContractInMonth(r.id, currentMonth, currentYear)).length;
  
  // 2. Số phòng đã ghi (đã có record trong storage)
  const recorded = readings.filter(r => r.month === currentMonth && r.year === currentYear).length;

  // 3. Số phòng chưa ghi
  const unrecorded = Math.max(0, roomsNeed - recorded);

  // 4. Số phòng đang gặp lỗi hoặc có cảnh báo biến động trên bảng
  const warningCount = tableRows.filter(r => r.error || r.isAbnormal).length;

  cardRoomNeed.textContent = roomsNeed;
  cardRecorded.textContent = recorded;
  cardUnrecorded.textContent = unrecorded;
  cardWarning.textContent = warningCount;
}

// ─── XỬ LÝ SỰ KIỆN NÚT VÀ LỌC ──────────────────────────────────

function bindEvents() {
  // Bộ lọc Tháng
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    filterMonth.addEventListener('change', () => {
      currentMonth = Number(filterMonth.value);
      initializeTable();
    });
  }

  // Bộ lọc Năm
  const filterYear = document.getElementById('filterYear');
  if (filterYear) {
    filterYear.addEventListener('change', () => {
      currentYear = Number(filterYear.value);
      initializeTable();
    });
  }

  // Checkbox chỉ hiện phòng chưa ghi
  const filterUnrecorded = document.getElementById('filterUnrecorded');
  if (filterUnrecorded) {
    filterUnrecorded.addEventListener('change', () => {
      showOnlyUnrecorded = filterUnrecorded.checked;
      filterTableRows();
    });
  }

  // Nút "Tạo danh sách phòng"
  const btnGenerateList = document.getElementById('btnGenerateList');
  if (btnGenerateList) {
    btnGenerateList.addEventListener('click', handleGenerateList);
  }

  // Nút "Lưu tất cả"
  const btnSaveAll = document.getElementById('btnSaveAll');
  if (btnSaveAll) {
    btnSaveAll.addEventListener('click', handleSaveAll);
  }

  // Gán sự kiện input trên table body để nhập số tức thời (bằng cơ chế Event Delegation)
  const tbody = document.getElementById('metersTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btnClear = e.target.closest('#btnEmptyActionClearFilters');
      if (btnClear) {
        e.preventDefault();
        showOnlyUnrecorded = false;
        const filterUnrecorded = document.getElementById('filterUnrecorded');
        if (filterUnrecorded) filterUnrecorded.checked = false;
        filterTableRows();
      }
    });

    tbody.addEventListener('input', (e) => {
      const input = e.target;
      if (input.tagName !== 'INPUT' || !input.dataset.roomId) return;

      const roomId = input.dataset.roomId;
      const type = input.dataset.type; // 'electricityNew' or 'waterNew'
      const value = input.value.trim();

      const row = tableRows.find(r => r.roomId === roomId);
      if (!row) return;

      row[type] = value === '' ? '' : Number(value);
      row.isSaved = false; // Đánh dấu chưa lưu vì đã thay đổi

      // Chạy tính toán, kiểm lỗi và cảnh báo bất thường
      validateAndCalculateRow(row);

      // Cập nhật giao diện của hàng hiện tại
      updateRowUI(row);
      updateSummaryCards();
    });
  }
}

// ─── LOGIC TẠO DANH SÁCH PHÒNG ─────────────────────────────────

function handleGenerateList() {
  const rooms = getRooms();
  const activeRooms = rooms.filter(r => hasActiveContractInMonth(r.id, currentMonth, currentYear));
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);

  let addedCount = 0;

  activeRooms.forEach(room => {
    // Nếu phòng chưa có trong hàng hiển thị bảng
    const exists = tableRows.some(r => r.roomId === room.id);
    if (!exists) {
      const activeContract = contracts.find(c =>
        c.roomId === room.id &&
        c.status === 'active' &&
        hasActiveContractInMonth(room.id, currentMonth, currentYear)
      );
      const tenant = activeContract ? getTenantById(activeContract.tenantId) : null;
      const tenantName = tenant ? tenant.fullName : 'Không có đại diện';

      const prevReading = getPreviousReading(room.id, currentMonth, currentYear);
      const elecOld = prevReading ? prevReading.electricityNew : 0;
      const waterOld = prevReading ? prevReading.waterNew : 0;

      tableRows.push({
        id: `temp-${room.id}`,
        roomId: room.id,
        roomName: room.name,
        tenantName: tenantName,
        electricityOld: elecOld,
        electricityNew: '',
        electricityUsage: 0,
        waterOld: waterOld,
        waterNew: '',
        waterUsage: 0,
        isSaved: false,
        error: '',
        isAbnormal: false,
        warning: ''
      });
      addedCount++;
    }
  });

  if (addedCount > 0) {
    showToast(`Đã nạp ${addedCount} phòng cần ghi vào bảng nhập liệu.`, 'success');
    filterTableRows();
    updateSummaryCards();
  } else {
    showToast('Tất cả phòng cần ghi trong kỳ này đã có sẵn trong bảng.', 'info');
  }
}

// ─── LOGIC LƯU HÀNG LOẠT ───────────────────────────────────────

function handleSaveAll() {
  const unsavedRows = tableRows.filter(r => !r.isSaved);
  if (unsavedRows.length === 0) {
    showToast('Tất cả các dòng hiện tại đã được lưu vào hệ thống.', 'info');
    return;
  }

  // 1. Kiểm tra nếu có bất kỳ hàng nào chứa lỗi số mới nhỏ hơn cũ
  const errorRow = unsavedRows.find(r => r.error);
  if (errorRow) {
    showToast(`Vui lòng sửa lỗi chỉ số của ${errorRow.roomName} trước khi lưu!`, 'danger');
    return;
  }

  // 2. Kiểm tra nếu có hàng nào điền dở dang (chỉ điền một chỉ số mới)
  const incompleteRow = unsavedRows.find(r => r.electricityNew === '' || r.waterNew === '');
  if (incompleteRow) {
    showToast(`Vui lòng điền đủ cả chỉ số điện và nước cho ${incompleteRow.roomName}!`, 'warning');
    return;
  }

  let saveCount = 0;
  const warnMessages = [];

  unsavedRows.forEach(row => {
    const data = {
      roomId: row.roomId,
      month: currentMonth,
      year: currentYear,
      electricityOld: row.electricityOld,
      electricityNew: Number(row.electricityNew),
      waterOld: row.waterOld,
      waterNew: Number(row.waterNew)
    };

    try {
      if (row.id && !row.id.startsWith('temp-')) {
        // Cập nhật bản ghi cũ
        const res = updateReading(row.id, data);
        if (res.warnings && res.warnings.length > 0) {
          warnMessages.push(...res.warnings);
        }
      } else {
        // Tạo mới bản ghi
        const res = createReading(data);
        row.id = res.reading.id;
        if (res.warnings && res.warnings.length > 0) {
          warnMessages.push(...res.warnings);
        }
      }
      row.isSaved = true;
      saveCount++;
    } catch (err) {
      showToast(`Lỗi khi lưu phòng ${row.roomName}: ${err.message}`, 'danger');
    }
  });

  if (saveCount > 0) {
    if (warnMessages.length > 0) {
      showToast(`Đã lưu ${saveCount} phòng. Phát hiện biến động: ${warnMessages.slice(0, 2).join(' | ')}`, 'warning');
    } else {
      showToast(`Đã lưu thành công chỉ số cho ${saveCount} phòng!`, 'success');
    }

    // Làm mới bảng và tính toán lại tổng quan
    initializeTable();
  }
}
