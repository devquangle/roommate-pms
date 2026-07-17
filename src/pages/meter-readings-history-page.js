// src/pages/meter-readings-history-page.js

/**
 * Trang Lịch sử điện nước.
 * Hiển thị biểu đồ đường xu hướng tiêu thụ, các thẻ so sánh và bảng lịch sử chi tiết.
 */

import Chart from 'chart.js/auto';
import { getRooms } from '../services/room-service.js';
import { getReadings, getPreviousReading } from '../services/meter-reading-service.js';
import { getServiceConfigs } from '../services/service-config-service.js';
import { detectAbnormalUsage } from '../business/meter-calculator.js';
import { formatCurrency } from '../utils/currency-utils.js';
import { initSearchableSelect } from '../components/searchable-select.js';
import { showToast } from '../components/toast.js';

// ─── STATE ─────────────────────────────────────────────────────
let selectedRoomId = '';
let startMonth = 1;
let startYear = 2026;
let endMonth = 12;
let endYear = 2026;
let dataType = 'electricity'; // 'electricity' hoặc 'water'
let chartInstance = null;

export function renderMetersHistoryPage(container) {
  // Lấy danh sách phòng để chọn mặc định
  const rooms = getRooms();
  if (rooms.length > 0 && !selectedRoomId) {
    selectedRoomId = rooms[0].id;
  }

  container.innerHTML = `
    <div data-testid="meters-history-page">
      <!-- Bộ lọc -->
      <div class="card border-0 shadow-sm rounded mb-4">
        <div class="card-body">
          <div class="row g-3 align-items-end">
            <!-- Chọn phòng -->
            <div class="col-md-3">
              <label for="historyRoomSelect" class="form-label fw-bold small text-muted">Chọn phòng</label>
              <select class="form-select form-select-sm" id="historyRoomSelect" data-testid="history-room-select">
                ${rooms.map(r => `
                  <option value="${r.id}" ${selectedRoomId === r.id ? 'selected' : ''}>
                    ${r.name.startsWith('Phòng') ? r.name : 'Phòng ' + r.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Từ kỳ -->
            <div class="col-md-3">
              <label class="form-label fw-bold small text-muted">Từ kỳ</label>
              <div class="d-flex gap-1">
                <select class="form-select form-select-sm" id="startMonth">
                  ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                    <option value="${m}" ${startMonth === m ? 'selected' : ''}>Tháng ${String(m).padStart(2, '0')}</option>
                  `).join('')}
                </select>
                <select class="form-select form-select-sm" id="startYear">
                  ${[2024, 2025, 2026, 2027, 2028].map(y => `
                    <option value="${y}" ${startYear === y ? 'selected' : ''}>${y}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Đến kỳ -->
            <div class="col-md-3">
              <label class="form-label fw-bold small text-muted">Đến kỳ</label>
              <div class="d-flex gap-1">
                <select class="form-select form-select-sm" id="endMonth">
                  ${Array.from({ length: 12 }, (_, i) => i + 1).map(m => `
                    <option value="${m}" ${endMonth === m ? 'selected' : ''}>Tháng ${String(m).padStart(2, '0')}</option>
                  `).join('')}
                </select>
                <select class="form-select form-select-sm" id="endYear">
                  ${[2024, 2025, 2026, 2027, 2028].map(y => `
                    <option value="${y}" ${endYear === y ? 'selected' : ''}>${y}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <!-- Loại dữ liệu -->
            <div class="col-md-2">
              <label for="historyDataType" class="form-label fw-bold small text-muted">Loại dữ liệu</label>
              <select class="form-select form-select-sm" id="historyDataType" data-testid="history-data-type">
                <option value="electricity" ${dataType === 'electricity' ? 'selected' : ''}>Điện (kWh)</option>
                <option value="water" ${dataType === 'water' ? 'selected' : ''}>Nước (m³)</option>
              </select>
            </div>

            <!-- Nút Lọc -->
            <div class="col-md-1">
              <button class="btn btn-primary btn-sm w-100" id="btnFilterHistory" data-testid="btn-filter-history">
                <i class="bi bi-filter"></i> Lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Các card so sánh tổng quan -->
      <div class="row g-3 mb-4">
        <!-- Mức tiêu thụ tháng này (kỳ gần nhất trong khoảng lọc) -->
        <div class="col-md-4">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">Tiêu thụ kỳ gần nhất</div>
            <div class="fs-3 fw-bold text-dark d-flex align-items-baseline gap-1" id="statLatest">
              0 <span class="fs-6 text-muted font-normal" id="unitLatest">kWh</span>
            </div>
            <div class="small text-muted mt-1" id="labelLatest">Kỳ: N/A</div>
          </div>
        </div>

        <!-- So sánh tháng trước -->
        <div class="col-md-4">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">So sánh kỳ trước</div>
            <div class="fs-3 fw-bold" id="statCompare">
              N/A
            </div>
            <div class="small text-muted mt-1" id="labelCompare">So với kỳ liền kề trước đó</div>
          </div>
        </div>

        <!-- Tiêu thụ trung bình -->
        <div class="col-md-4">
          <div class="card border-0 shadow-sm rounded p-3 bg-white h-100">
            <div class="small text-muted fw-bold text-uppercase mb-1">Tiêu thụ trung bình</div>
            <div class="fs-3 fw-bold text-dark d-flex align-items-baseline gap-1" id="statAverage">
              0 <span class="fs-6 text-muted font-normal" id="unitAverage">kWh</span>
            </div>
            <div class="small text-muted mt-1">Trong khoảng thời gian lọc</div>
          </div>
        </div>
      </div>

      <!-- Biểu đồ xu hướng -->
      <div class="card border-0 shadow-sm rounded mb-4">
        <div class="card-header bg-white border-0 pt-3 fw-bold text-dark">
          <i class="bi bi-graph-up me-2 text-primary"></i>Biểu đồ xu hướng mức tiêu thụ
        </div>
        <div class="card-body">
          <div style="position: relative; height: 320px; width: 100%;">
            <canvas id="historyChartCanvas"></canvas>
          </div>
        </div>
      </div>

      <!-- Bảng Lịch sử -->
      <div class="card border-0 shadow-sm rounded overflow-hidden">
        <div class="card-header bg-white border-0 pt-3 fw-bold text-dark pb-0">
          <i class="bi bi-table me-2 text-primary"></i>Bảng số liệu chi tiết
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0" data-testid="history-table">
            <thead class="table-light border-bottom">
              <tr>
                <th>Tháng</th>
                <th class="text-center">Chỉ số cũ</th>
                <th class="text-center">Chỉ số mới</th>
                <th class="text-center">Tiêu thụ</th>
                <th class="text-end">Đơn giá</th>
                <th class="text-end">Thành tiền</th>
                <th>Ghi chú</th>
                <th class="text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody id="historyTableBody" data-testid="history-table-body">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Khởi tạo select tìm kiếm nhanh cho phòng
  const historyRoomSelect = document.getElementById('historyRoomSelect');
  if (historyRoomSelect) {
    initSearchableSelect(historyRoomSelect);
  }

  // Đăng ký sự kiện
  bindEvents();

  // Load dữ liệu ban đầu
  loadHistoryData();
}

// ─── ĐĂNG KÝ SỰ KIỆN ───────────────────────────────────────────

function bindEvents() {
  const btnFilter = document.getElementById('btnFilterHistory');
  if (btnFilter) {
    btnFilter.addEventListener('click', () => {
      const roomSel = document.getElementById('historyRoomSelect');
      const startMSel = document.getElementById('startMonth');
      const startYSel = document.getElementById('startYear');
      const endMSel = document.getElementById('endMonth');
      const endYSel = document.getElementById('endYear');
      const dataTSel = document.getElementById('historyDataType');

      selectedRoomId = roomSel.value;
      startMonth = Number(startMSel.value);
      startYear = Number(startYSel.value);
      endMonth = Number(endMSel.value);
      endYear = Number(endYSel.value);
      dataType = dataTSel.value;

      loadHistoryData();
    });
  }
}

// ─── TẢI DỮ LIỆU & TÍNH TOÁN ───────────────────────────────────

function loadHistoryData() {
  if (!selectedRoomId) return;

  const startKey = startYear * 12 + startMonth;
  const endKey = endYear * 12 + endMonth;

  if (startKey > endKey) {
    showToast('Thời gian bắt đầu không thể sau thời gian kết thúc!', 'danger');
    return;
  }

  const readings = getReadings();
  // Lọc chỉ số của phòng trong khoảng thời gian đã chọn
  let filtered = readings.filter(r => {
    if (r.roomId !== selectedRoomId) return false;
    const key = r.year * 12 + r.month;
    return key >= startKey && key <= endKey;
  });

  // Lấy đơn giá điện/nước từ cấu hình dịch vụ
  const serviceConfigs = getServiceConfigs();
  const elecConfig = serviceConfigs.find(c => c.code === 'dien' || c.code === 'electricity');
  const waterConfig = serviceConfigs.find(c => c.code === 'nuoc' || c.code === 'water');
  
  const elecPrice = elecConfig ? elecConfig.unitPrice : 3500;
  const waterPrice = waterConfig ? waterConfig.unitPrice : 20000;
  const currentPrice = dataType === 'electricity' ? elecPrice : waterPrice;

  // Bản đồ hóa các dòng dữ liệu lịch sử
  const historyData = filtered.map(r => {
    const oldVal = dataType === 'electricity' ? r.electricityOld : r.waterOld;
    const newVal = dataType === 'electricity' ? r.electricityNew : r.waterNew;
    const usage = dataType === 'electricity' ? r.electricityUsage : r.waterUsage;
    const unit = dataType === 'electricity' ? 'kWh' : 'm³';
    const amount = usage * currentPrice;

    // Lấy chỉ số tháng trước để so sánh bất thường
    const prevR = getPreviousReading(r.roomId, r.month, r.year);
    const prevUsage = prevR ? (dataType === 'electricity' ? prevR.electricityUsage : prevR.waterUsage) : 0;
    const abnormalRes = prevR ? detectAbnormalUsage(usage, prevUsage) : { abnormal: false };

    return {
      id: r.id,
      month: r.month,
      year: r.year,
      oldVal,
      newVal,
      usage,
      unit,
      price: currentPrice,
      amount,
      isAbnormal: abnormalRes.abnormal,
      warningMessage: abnormalRes.message,
      note: abnormalRes.abnormal ? 'Biến động bất thường: ' + abnormalRes.message : ''
    };
  });

  // Sắp xếp giảm dần (mới nhất lên đầu) cho Bảng
  const tableData = [...historyData].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
  // Sắp xếp tăng dần (cũ nhất lên trước) cho Biểu đồ
  const chartData = [...historyData].sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));

  // Render Thẻ thống kê
  renderSummaryCards(tableData);

  // Render Biểu đồ đường
  renderTrendChart(chartData);

  // Render Bảng Lịch sử
  renderHistoryTable(tableData);
}

// ─── RENDER BIỂU ĐỒ ───────────────────────────────────────────

function renderTrendChart(chartData) {
  const canvas = document.getElementById('historyChartCanvas');
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const labels = chartData.map(d => `T${String(d.month).padStart(2, '0')}/${d.year}`);
  const datasetData = chartData.map(d => d.usage);
  const labelText = dataType === 'electricity' ? 'Tiêu thụ điện (kWh)' : 'Tiêu thụ nước (m³)';
  const themeColor = dataType === 'electricity' ? '#0d6efd' : '#0dcaf0';

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: labelText,
        data: datasetData,
        borderColor: themeColor,
        backgroundColor: themeColor + '20', // Màu mờ
        borderWidth: 3,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: themeColor,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#e9ecef'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// ─── RENDER SUMMARY CARDS ──────────────────────────────────────

function renderSummaryCards(tableData) {
  const statLatest = document.getElementById('statLatest');
  const unitLatest = document.getElementById('unitLatest');
  const labelLatest = document.getElementById('labelLatest');
  const statCompare = document.getElementById('statCompare');
  const statAverage = document.getElementById('statAverage');
  const unitAverage = document.getElementById('unitAverage');

  const unitText = dataType === 'electricity' ? 'kWh' : 'm³';
  if (unitLatest) unitLatest.textContent = unitText;
  if (unitAverage) unitAverage.textContent = unitText;

  if (tableData.length === 0) {
    if (statLatest) statLatest.innerHTML = `0 <span class="fs-6 text-muted font-normal">${unitText}</span>`;
    if (labelLatest) labelLatest.textContent = 'Kỳ: N/A';
    if (statCompare) statCompare.innerHTML = `<span class="text-muted fs-5">N/A</span>`;
    if (statAverage) statAverage.innerHTML = `0 <span class="fs-6 text-muted font-normal">${unitText}</span>`;
    return;
  }

  // 1. Kỳ gần nhất (dòng đầu tiên vì đã sort giảm dần)
  const latest = tableData[0];
  if (statLatest) {
    statLatest.innerHTML = `${latest.usage} <span class="fs-6 text-muted font-normal">${unitText}</span>`;
  }
  if (labelLatest) {
    labelLatest.textContent = `Kỳ: Tháng ${String(latest.month).padStart(2, '0')}/${latest.year}`;
  }

  // 2. So sánh kỳ trước
  const prevReading = getPreviousReading(selectedRoomId, latest.month, latest.year);
  if (prevReading) {
    const prevUsage = dataType === 'electricity' ? prevReading.electricityUsage : prevReading.waterUsage;
    if (prevUsage > 0) {
      const percent = ((latest.usage - prevUsage) / prevUsage) * 100;
      const formattedPercent = percent.toFixed(1);

      if (percent > 0) {
        statCompare.innerHTML = `<span class="text-danger"><i class="bi bi-arrow-up-right"></i> +${formattedPercent}%</span>`;
      } else if (percent < 0) {
        statCompare.innerHTML = `<span class="text-success"><i class="bi bi-arrow-down-left"></i> ${formattedPercent}%</span>`;
      } else {
        statCompare.innerHTML = `<span class="text-muted"><i class="bi bi-dash"></i> 0%</span>`;
      }
    } else {
      statCompare.innerHTML = `<span class="text-muted fs-5">N/A (Kỳ trước bằng 0)</span>`;
    }
  } else {
    statCompare.innerHTML = `<span class="text-muted fs-5">N/A (Thiếu dữ liệu trước)</span>`;
  }

  // 3. Tiêu thụ trung bình
  const totalUsage = tableData.reduce((sum, d) => sum + d.usage, 0);
  const avgUsage = (totalUsage / tableData.length).toFixed(1);
  if (statAverage) {
    statAverage.innerHTML = `${avgUsage} <span class="fs-6 text-muted font-normal">${unitText}</span>`;
  }
}

// ─── RENDER BẢNG LỊCH SỬ ───────────────────────────────────────

function renderHistoryTable(tableData) {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  if (tableData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          Không có số liệu lịch sử điện nước nào trong kỳ đã chọn.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = tableData.map(d => {
    // Làm nổi bật hàng nếu có mức tăng tiêu thụ bất thường
    const trClass = d.isAbnormal ? 'table-warning border-warning-subtle' : '';
    const warningIcon = d.isAbnormal 
      ? `<span class="badge bg-warning text-dark ms-2" title="${d.warningMessage}">
           <i class="bi bi-exclamation-triangle-fill"></i> Tăng vọt
         </span>`
      : '';

    return `
      <tr class="${trClass}" data-testid="history-row-${d.month}-${d.year}">
        <td><strong>Tháng ${String(d.month).padStart(2, '0')}/${d.year}</strong></td>
        <td class="text-center text-muted">${d.oldVal}</td>
        <td class="text-center fw-bold">${d.newVal}</td>
        <td class="text-center">
          <span class="badge ${d.isAbnormal ? 'bg-danger' : 'bg-secondary'}">${d.usage} ${d.unit}</span>
          ${warningIcon}
        </td>
        <td class="text-end text-muted">${formatCurrency(d.price)}</td>
        <td class="text-end fw-bold text-dark">${formatCurrency(d.amount)}</td>
        <td>
          <small class="${d.isAbnormal ? 'text-danger fw-bold' : 'text-muted'}">
            ${d.note || 'Bình thường'}
          </small>
        </td>
        <td class="text-center">
          <button class="btn btn-outline-primary btn-xs px-2 py-1 btn-detail-history" 
            data-month="${d.month}" data-year="${d.year}" data-usage="${d.usage}" data-unit="${d.unit}" data-old="${d.oldVal}" data-new="${d.newVal}">
            <i class="bi bi-info-circle"></i> Xem
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Lắng nghe sự kiện click xem chi tiết chỉ số
  const buttons = tbody.querySelectorAll('.btn-detail-history');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const ds = e.currentTarget.dataset;
      showToast(`Chỉ số kỳ T${ds.month}/${ds.year}: Cũ: ${ds.old} | Mới: ${ds.new} | Tiêu thụ: ${ds.usage} ${ds.unit}`, 'info');
    });
  });
}
