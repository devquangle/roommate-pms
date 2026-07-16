// src/pages/meter-readings-page.js

/**
 * Trang ghi chỉ số điện nước.
 * Hỗ trợ chọn tháng, xem danh sách phòng, lọc, thêm/sửa/xóa chỉ số, hiển thị phòng chưa ghi chỉ số, cảnh báo bất thường.
 */

import '../styles/meter-readings.css';

import {
  getReadings,
  getReadingById,
  getReadingByRoomAndMonth,
  createReading,
  updateReading,
  deleteReading,
  getPreviousReading,
  getRoomsWithoutReading,
  filterReadings
} from '../services/meter-reading-service.js';

import { getRooms, getRoomById } from '../services/room-service.js';
import { detectAbnormalUsage } from '../business/meter-calculator.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';
import { openMeterReadingForm } from '../components/meter-reading-form.js';
import { initSearchableSelect } from '../components/searchable-select.js';

// ─── STATE ─────────────────────────────────────────────────────
let currentMonth = new Date().getMonth() + 1; // 1-12
let currentYear = new Date().getFullYear();
let currentRoomId = '';

export function renderMetersPage(container) {
  // Lấy các giá trị lọc từ bộ lọc cũ nếu có, nếu không mặc định tháng hiện tại
  currentRoomId = '';

  container.innerHTML = `
    <div data-testid="meters-page">
      <!-- Alert danh sách phòng chưa ghi chỉ số -->
      <div id="unrecordedRoomsAlert" class="mb-3" data-testid="unrecorded-rooms-alert"></div>

      <!-- Toolbar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h4 class="mb-0">Chỉ số điện nước</h4>
        <button class="btn btn-primary btn-sm" id="btnAddReading" data-testid="btn-add-reading">
          + Ghi chỉ số mới
        </button>
      </div>

      <!-- Bộ lọc và Tìm kiếm -->
      <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
        <!-- Lọc tháng -->
        <div class="d-flex align-items-center gap-1">
          <label for="filterMonth" class="small text-muted mb-0">Tháng:</label>
          <select class="form-select form-select-sm" style="max-width: 110px;" id="filterMonth" data-testid="filter-month">
            ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
              <option value="${m}" ${currentMonth === m ? 'selected' : ''}>Tháng ${m}</option>
            `).join('')}
          </select>
        </div>

        <!-- Lọc năm -->
        <div class="d-flex align-items-center gap-1">
          <label for="filterYear" class="small text-muted mb-0">Năm:</label>
          <input type="number" class="form-control form-control-sm" style="max-width: 100px;" id="filterYear" data-testid="filter-year"
            value="${currentYear}" />
        </div>

        <!-- Lọc phòng -->
        <div class="d-flex align-items-center gap-1">
          <label for="filterRoom" class="small text-muted mb-0">Phòng:</label>
          <select class="form-select form-select-sm" style="max-width: 160px;" id="filterRoom" data-testid="filter-room">
            <option value="">Tất cả phòng</option>
          </select>
        </div>
      </div>

      <!-- Danh sách chỉ số dưới dạng Cards và Table -->
      <div class="table-responsive">
        <table class="table table-hover align-middle" data-testid="meters-table">
          <thead class="table-light">
            <tr>
              <th>Phòng</th>
              <th>Thời gian</th>
              <th>Chỉ số điện (Cũ / Mới)</th>
              <th>Sử dụng điện</th>
              <th>Chỉ số nước (Cũ / Mới)</th>
              <th>Sử dụng nước</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="metersTableBody" data-testid="meters-table-body">
          </tbody>
        </table>
      </div>

      <div id="metersEmpty" class="text-muted text-center d-none p-4" data-testid="meters-empty">
        Không có dữ liệu chỉ số điện nước nào khớp bộ lọc.
      </div>
    </div>
  `;

  populateRoomFilter();
  renderUnrecordedAlert();
  renderMeterReadingsList();
  bindEvents();
}

// ─── POPULATE ROOM FILTER ──────────────────────────────────────

function populateRoomFilter() {
  const filterRoom = document.getElementById('filterRoom');
  if (!filterRoom) return;

  const rooms = getRooms();
  const options = rooms.map(r => `<option value="${r.id}" ${currentRoomId === r.id ? 'selected' : ''}>${r.name}</option>`).join('');
  filterRoom.innerHTML = '<option value="">Tất cả phòng</option>' + options;

  initSearchableSelect(filterRoom);
}

// ─── SHOW UNRECORDED ALERTS ───────────────────────────────────

function renderUnrecordedAlert() {
  const alertEl = document.getElementById('unrecordedRoomsAlert');
  if (!alertEl) return;

  const unrecordedRooms = getRoomsWithoutReading(currentMonth, currentYear);
  if (unrecordedRooms.length === 0) {
    alertEl.innerHTML = '';
    return;
  }

  alertEl.innerHTML = `
    <div class="alert alert-warning p-3" data-testid="unrecorded-alert-box">
      <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <span>
          <strong>⚠️ Phát hiện ${unrecordedRooms.length} phòng đang thuê chưa ghi chỉ số điện nước</strong> trong tháng ${currentMonth}/${currentYear}.
        </span>
        <span class="badge bg-danger p-2" data-testid="unrecorded-count">${unrecordedRooms.length} phòng</span>
      </div>
      <div class="mt-2 small">
        Danh sách phòng chưa ghi: ${unrecordedRooms.map(r => `<strong>${r.name}</strong>`).join(', ')}
      </div>
    </div>
  `;
}

// ─── RENDER LIST ───────────────────────────────────────────────

function renderMeterReadingsList() {
  const tbody = document.getElementById('metersTableBody');
  const emptyEl = document.getElementById('metersEmpty');
  if (!tbody) return;

  const filters = {
    month: currentMonth,
    year: currentYear,
    roomId: currentRoomId || undefined
  };

  const list = filterReadings(filters);

  if (list.length === 0) {
    tbody.innerHTML = '';
    emptyEl && emptyEl.classList.remove('d-none');
    return;
  }

  emptyEl && emptyEl.classList.add('d-none');

  tbody.innerHTML = list.map(item => {
    const room = getRoomById(item.roomId);
    const roomName = room ? room.name : item.roomId;

    // Kiểm tra bất thường dựa trên kỳ trước
    const prevReading = getPreviousReading(item.roomId, item.month, item.year);
    const elecAbnormal = prevReading ? detectAbnormalUsage(item.electricityUsage, prevReading.electricityUsage || 0) : { abnormal: false };
    const waterAbnormal = prevReading ? detectAbnormalUsage(item.waterUsage, prevReading.waterUsage || 0) : { abnormal: false };

    const elecBadge = elecAbnormal.abnormal
      ? `<span class="badge bg-warning text-dark" title="${elecAbnormal.message}">⚠️ Biến động</span>`
      : '';

    const waterBadge = waterAbnormal.abnormal
      ? `<span class="badge bg-warning text-dark" title="${waterAbnormal.message}">⚠️ Biến động</span>`
      : '';

    return `
      <tr data-testid="meter-row-${item.id}">
        <td><strong>${roomName}</strong></td>
        <td>Tháng ${item.month}/${item.year}</td>
        <td>
          <span class="text-muted">${item.electricityOld}</span>
          <span class="mx-1">→</span>
          <strong>${item.electricityNew}</strong>
        </td>
        <td>
          <span class="badge bg-primary">${item.electricityUsage} kWh</span>
          ${elecBadge}
        </td>
        <td>
          <span class="text-muted">${item.waterOld}</span>
          <span class="mx-1">→</span>
          <strong>${item.waterNew}</strong>
        </td>
        <td>
          <span class="badge bg-info text-dark">${item.waterUsage} m³</span>
          ${waterBadge}
        </td>
        <td>
          <div class="btn-group gap-1">
            <button class="btn btn-outline-primary btn-sm btn-edit-reading" data-id="${item.id}" data-testid="btn-edit-reading-${item.id}">✏️</button>
            <button class="btn btn-outline-danger btn-sm btn-delete-reading" data-id="${item.id}" data-testid="btn-delete-reading-${item.id}">✕</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  const btnAdd = document.getElementById('btnAddReading');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openMeterReadingForm({
        reading: null,
        defaultMonth: currentMonth,
        defaultYear: currentYear,
        onSave: (data) => {
          const res = createReading(data);
          if (res.warnings && res.warnings.length > 0) {
            showToast(res.warnings.join(' | '), 'warning');
          } else {
            showToast('Ghi nhận chỉ số điện nước thành công!', 'success');
          }
          renderUnrecordedAlert();
          renderMeterReadingsList();
        }
      });
    });
  }

  // Filter Month
  const filterMonth = document.getElementById('filterMonth');
  if (filterMonth) {
    filterMonth.addEventListener('change', () => {
      currentMonth = Number(filterMonth.value);
      renderUnrecordedAlert();
      renderMeterReadingsList();
    });
  }

  // Filter Year
  const filterYear = document.getElementById('filterYear');
  if (filterYear) {
    filterYear.addEventListener('input', () => {
      const year = Number(filterYear.value);
      if (!isNaN(year) && year >= 2000) {
        currentYear = year;
        renderUnrecordedAlert();
        renderMeterReadingsList();
      }
    });
  }

  // Filter Room
  const filterRoom = document.getElementById('filterRoom');
  if (filterRoom) {
    filterRoom.addEventListener('change', () => {
      currentRoomId = filterRoom.value;
      renderMeterReadingsList();
    });
  }

  // Table actions delegation
  const tbody = document.getElementById('metersTableBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('btn-edit-reading')) {
        handleEdit(id);
      } else if (btn.classList.contains('btn-delete-reading')) {
        handleDelete(id);
      }
    });
  }
}

function handleEdit(id) {
  const reading = getReadingById(id);
  if (!reading) return;

  openMeterReadingForm({
    reading,
    defaultMonth: currentMonth,
    defaultYear: currentYear,
    onSave: (data) => {
      const res = updateReading(id, data);
      if (res.warnings && res.warnings.length > 0) {
        showToast(res.warnings.join(' | '), 'warning');
      } else {
        showToast('Cập nhật chỉ số điện nước thành công!', 'success');
      }
      renderUnrecordedAlert();
      renderMeterReadingsList();
    }
  });
}

function handleDelete(id) {
  const reading = getReadingById(id);
  if (!reading) return;

  const room = getRoomById(reading.roomId);
  const roomName = room ? room.name : reading.roomId;

  showConfirmDialog(
    'Xóa bản ghi chỉ số',
    `Bạn có chắc chắn muốn xóa ghi nhận chỉ số tháng ${reading.month}/${reading.year} của phòng <strong>${roomName}</strong> không?`,
    () => {
      try {
        deleteReading(id);
        showToast('Xóa bản ghi chỉ số thành công.', 'success');
        renderUnrecordedAlert();
        renderMeterReadingsList();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  );
}
