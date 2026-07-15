// src/pages/settings-page.js

/**
 * Trang cài đặt và sao lưu dữ liệu.
 * Cho phép thống kê số lượng phần tử, xuất dữ liệu JSON, chọn file nhập dữ liệu (gộp/ghi đè), khôi phục dữ liệu mẫu, và xóa toàn bộ dữ liệu trọ.
 */

import '../styles/settings.css';

import * as StorageService from '../services/storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import {
  downloadBackup,
  readJsonFile,
  importData,
  resetAllData,
  restoreSeedData
} from '../services/backup-service.js';
import { validateBackupData } from '../business/import-validator.js';
import { showToast } from '../components/toast.js';
import { showConfirmDialog } from '../components/confirm-dialog.js';

// Lưu trữ dữ liệu JSON đã đọc từ file tải lên
let uploadedBackupData = null;

export function renderSettingsPage(container) {
  uploadedBackupData = null;

  container.innerHTML = `
    <div data-testid="settings-page">
      <h4 class="mb-3">Cài đặt & Sao lưu hệ thống</h4>

      <!-- ─── CARD 1: THỐNG KÊ DỮ LIỆU HIỆN TẠI ─── -->
      <div class="card settings-card" data-testid="card-stats">
        <div class="settings-card-header">📊 Thống kê dữ liệu hiện tại</div>
        <div class="settings-card-body">
          <div class="stats-list" id="databaseStatsList">
            <!-- Render động bằng JS -->
          </div>
        </div>
      </div>

      <!-- ─── CARD 2: SAO LƯU & PHỤC HỒI (IMPORT/EXPORT) ─── -->
      <div class="card settings-card" data-testid="card-backup">
        <div class="settings-card-header">💾 Sao lưu và Phục hồi dữ liệu</div>
        <div class="settings-card-body">
          <div class="row g-4">
            <!-- Cột xuất dữ liệu (Export) -->
            <div class="col-md-6 border-end">
              <h6>Xuất bản sao lưu (Export)</h6>
              <p class="text-muted small">Tải toàn bộ cơ sở dữ liệu hiện tại của hệ thống RoomMate (bao gồm thông tin phòng, người thuê, hợp đồng, hóa đơn, lịch sử chốt điện nước, thanh toán...) về máy tính dưới dạng file JSON.</p>
              <button class="btn btn-primary btn-sm" id="btnExportData" data-testid="btn-export-data">
                📥 Tải file sao lưu (.json)
              </button>
            </div>

            <!-- Cột nhập dữ liệu (Import) -->
            <div class="col-md-6">
              <h6>Nhập dữ liệu sao lưu (Import)</h6>
              <p class="text-muted small">Tải lên file dữ liệu JSON đã sao lưu trước đó để khôi phục trạng thái hệ thống.</p>
              
              <div class="mb-3">
                <input type="file" class="form-control form-control-sm" id="importFileInput" accept=".json" data-testid="input-import-file" />
              </div>

              <!-- Xem trước thông tin file đã tải lên -->
              <div id="importFilePreview" class="file-info-preview mb-3 d-none" data-testid="file-preview-box">
                <!-- Hiển thị động bằng JS -->
              </div>

              <!-- Các nút hành động import -->
              <div id="importActions" class="d-flex gap-2 d-none">
                <button type="button" class="btn btn-success btn-sm" id="btnMergeImport" data-testid="btn-merge-import">
                  ➕ Gộp dữ liệu
                </button>
                <button type="button" class="btn btn-outline-danger btn-sm" id="btnOverwriteImport" data-testid="btn-overwrite-import">
                  ⚠️ Ghi đè dữ liệu
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── CARD 3: VÙNG DỮ LIỆU NGUY HIỂM (DANGER ZONE) ─── -->
      <div class="card settings-card danger-zone" data-testid="card-danger-zone">
        <div class="settings-card-header">⚠️ Danger Zone (Thao tác nguy hiểm)</div>
        <div class="settings-card-body">
          <div class="row g-3">
            <div class="col-md-6 border-end">
              <h6>Khôi phục Dữ liệu mẫu (Seed Data)</h6>
              <p class="text-muted small">Xóa sạch toàn bộ dữ liệu hiện tại và nạp lại dữ liệu mẫu gốc ban đầu (10 phòng, 15 khách, các hợp đồng và hóa đơn mẫu) để dùng thử hoặc reset hệ thống.</p>
              <button class="btn btn-warning btn-sm fw-semibold" id="btnRestoreSeed" data-testid="btn-restore-seed">
                🔄 Reset về dữ liệu mẫu
              </button>
            </div>
            <div class="col-md-6">
              <h6>Xóa toàn bộ cơ sở dữ liệu</h6>
              <p class="text-muted small text-danger">Cảnh báo: Hành động này sẽ xóa sạch vĩnh viễn toàn bộ dữ liệu trọ trong LocalStorage. Hãy chắc chắn bạn đã tải file sao lưu về máy trước khi bấm nút.</p>
              <button class="btn btn-danger btn-sm fw-semibold" id="btnResetDatabase" data-testid="btn-reset-database">
                🗑️ Xóa vĩnh viễn dữ liệu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderStats();
  bindEvents();
}

// ─── THỐNG KÊ SỐ LƯỢNG BẢN GHI ──────────────────────────────────

function renderStats() {
  const statsList = document.getElementById('databaseStatsList');
  if (!statsList) return;

  const stats = [
    { label: 'Phòng trọ (Rooms)', count: StorageService.getAll(STORAGE_KEYS.ROOMS).length, testId: 'count-rooms' },
    { label: 'Khách thuê (Tenants)', count: StorageService.getAll(STORAGE_KEYS.TENANTS).length, testId: 'count-tenants' },
    { label: 'Hợp đồng (Contracts)', count: StorageService.getAll(STORAGE_KEYS.CONTRACTS).length, testId: 'count-contracts' },
    { label: 'Chỉ số điện nước (Meter Readings)', count: StorageService.getAll(STORAGE_KEYS.METER_READINGS).length, testId: 'count-readings' },
    { label: 'Cấu hình dịch vụ (Services)', count: StorageService.getAll(STORAGE_KEYS.SERVICE_CONFIGS).length, testId: 'count-services' },
    { label: 'Hóa đơn (Invoices)', count: StorageService.getAll(STORAGE_KEYS.INVOICES).length, testId: 'count-invoices' },
    { label: 'Thanh toán (Payments)', count: StorageService.getAll(STORAGE_KEYS.PAYMENTS).length, testId: 'count-payments' }
  ];

  statsList.innerHTML = stats.map(item => `
    <div class="stats-item" data-testid="${item.testId}">
      <span class="stats-label">${item.label}</span>
      <span class="stats-count" data-testid="${item.testId}-value">${item.count}</span>
    </div>
  `).join('');
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  // 1. Export dữ liệu
  const btnExport = document.getElementById('btnExportData');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      downloadBackup();
      showToast('Đang chuẩn bị tải xuống file sao lưu...', 'success');
    });
  }

  // 2. File input chọn file import
  const fileInput = document.getElementById('importFileInput');
  const previewBox = document.getElementById('importFilePreview');
  const actionsBox = document.getElementById('importActions');

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) {
        previewBox.classList.add('d-none');
        actionsBox.classList.add('d-none');
        uploadedBackupData = null;
        return;
      }

      try {
        // Đọc dữ liệu thông qua BackupService
        const parsedData = await readJsonFile(file);
        
        // Chạy kiểm tra dữ liệu trước khi import
        const checkResult = validateBackupData(parsedData);

        if (!checkResult.valid) {
          previewBox.innerHTML = `
            <div class="text-danger small">
              <strong>❌ File không đúng định dạng dữ liệu RoomMate:</strong><br>
              ${checkResult.errors.map(err => `• ${err}`).join('<br>')}
            </div>
          `;
          previewBox.classList.remove('d-none');
          actionsBox.classList.add('d-none');
          uploadedBackupData = null;
          return;
        }

        // File dữ liệu chuẩn, hiển thị thông tin thống kê xem trước
        uploadedBackupData = parsedData;
        const fileSizeKB = (file.size / 1024).toFixed(1);

        previewBox.innerHTML = `
          <div class="text-success small">
            <strong>✅ File hợp lệ sẵn sàng nạp:</strong><br>
            • Tên file: <code>${file.name}</code> (${fileSizeKB} KB)<br>
            • Số phòng trọ: <strong>${parsedData.rooms?.length || 0}</strong><br>
            • Số khách thuê: <strong>${parsedData.tenants?.length || 0}</strong><br>
            • Số hợp đồng: <strong>${parsedData.contracts?.length || 0}</strong><br>
            • Số hóa đơn: <strong>${parsedData.invoices?.length || 0}</strong>
          </div>
        `;
        previewBox.classList.remove('d-none');
        actionsBox.classList.remove('d-none');
      } catch (err) {
        previewBox.innerHTML = `<span class="text-danger small">⚠️ Lỗi: ${err.message}</span>`;
        previewBox.classList.remove('d-none');
        actionsBox.classList.add('d-none');
        uploadedBackupData = null;
      }
    });
  }

  // 3. Thực hiện gộp dữ liệu (Merge Import)
  const btnMerge = document.getElementById('btnMergeImport');
  if (btnMerge) {
    btnMerge.addEventListener('click', () => {
      if (!uploadedBackupData) return;
      try {
        const res = importData(uploadedBackupData, { merge: true });
        if (res.success) {
          showToast('Gộp dữ liệu sao lưu thành công!', 'success');
          // Reset file input
          fileInput.value = '';
          previewBox.classList.add('d-none');
          actionsBox.classList.add('d-none');
          uploadedBackupData = null;
          renderStats(); // Vẽ lại số lượng bản ghi mới
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }

  // 4. Thực hiện ghi đè dữ liệu (Overwrite Import)
  const btnOverwrite = document.getElementById('btnOverwriteImport');
  if (btnOverwrite) {
    btnOverwrite.addEventListener('click', () => {
      if (!uploadedBackupData) return;

      showConfirmDialog(
        'Ghi đè dữ liệu hệ thống',
        '<span class="text-danger">⚠️ CẢNH BÁO NGUY HIỂM:</span><br>Ghi đè sẽ xóa sạch toàn bộ dữ liệu phòng trọ, hóa đơn và khách thuê hiện tại để thay thế bằng dữ liệu trong file sao lưu. Bạn có chắc chắn muốn tiến hành?',
        () => {
          try {
            const res = importData(uploadedBackupData, { overwrite: true });
            if (res.success) {
              showToast('Ghi đè dữ liệu sao lưu thành công! Đã tạo bản phục hồi dự phòng.', 'success');
              fileInput.value = '';
              previewBox.classList.add('d-none');
              actionsBox.classList.add('d-none');
              uploadedBackupData = null;
              renderStats();
            }
          } catch (err) {
            showToast(err.message, 'danger');
          }
        }
      );
    });
  }

  // 5. Khôi phục dữ liệu mẫu (Seed Data)
  const btnRestoreSeed = document.getElementById('btnRestoreSeed');
  if (btnRestoreSeed) {
    btnRestoreSeed.addEventListener('click', () => {
      showConfirmDialog(
        'Reset về Dữ liệu mẫu',
        'Hệ thống sẽ xóa toàn bộ phòng và hóa đơn hiện tại để nạp lại bộ dữ liệu mẫu gốc dùng thử. Bạn có chắc chắn muốn khôi phục dữ liệu mẫu?',
        () => {
          restoreSeedData();
          showToast('Khôi phục dữ liệu mẫu thành công!', 'success');
          renderStats();
        }
      );
    });
  }

  // 6. Xóa sạch cơ sở dữ liệu
  const btnResetDatabase = document.getElementById('btnResetDatabase');
  if (btnResetDatabase) {
    btnResetDatabase.addEventListener('click', () => {
      showConfirmDialog(
        'XÓA SẠCH DỮ LIỆU HỆ THỐNG',
        '<span class="text-danger">⚠️ CẢNH BÁO CỰC KỲ NGUY HIỂM:</span><br>Bạn sẽ mất vĩnh viễn toàn bộ phòng trọ, khách thuê, hóa đơn và lịch sử đóng tiền. Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa hết?',
        () => {
          resetAllData();
          showToast('Đã xóa sạch cơ sở dữ liệu. Hệ thống hiện đang trống.', 'info');
          renderStats();
        }
      );
    });
  }
}
