// src/pages/settings-page.js

/**
 * Trang cài đặt, sao lưu và khôi phục dữ liệu cho RoomMate.
 * Gồm các card chức năng xuất/nhập dữ liệu, dữ liệu mẫu, xóa dữ liệu, 
 * kéo thả file JSON, bảng thống kê số lượng bản ghi và modal xác nhận thao tác nguy hiểm.
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
import { renderErrorState } from '../components/error-state.js';
import { renderImportLoadingOverlay, getButtonLoadingHtml } from '../components/loading-state.js';
import {
  SEED_ROOMS,
  SEED_TENANTS,
  SEED_CONTRACTS,
  SEED_METER_READINGS,
  SEED_SERVICE_CONFIGS,
  SEED_INVOICES,
  SEED_PAYMENTS,
  SEED_APP_SETTINGS
} from '../data/seed-data.js';

// Khai báo biến lưu trữ file và dữ liệu tạm thời
let selectedBackupFile = null;
let parsedBackupData = null;

export function renderSettingsPage(container) {
  selectedBackupFile = null;
  parsedBackupData = null;

  // Lấy thời gian sao lưu gần nhất từ localStorage
  const lastBackupStr = localStorage.getItem('roommate_last_backup_time');
  const lastBackupText = lastBackupStr ? lastBackupStr : 'Chưa thực hiện sao lưu nào gần đây';

  container.innerHTML = `
    <div data-testid="settings-page" class="pb-5">
      <h4 class="mb-4 fw-bold"><i class="bi bi-gear-fill text-secondary me-2"></i>Cấu hình & Sao lưu dữ liệu</h4>

      <div class="row g-4">
        <!-- Cột trái: Các card chức năng -->
        <div class="col-lg-8">
          
          <!-- CARD 1: XUẤT DỮ LIỆU -->
          <div class="card border-0 shadow-sm mb-4" id="card-export">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="card-title mb-0 fw-bold"><i class="bi bi-cloud-download text-primary me-2"></i>1. Xuất dữ liệu hệ thống</h5>
            </div>
            <div class="card-body pt-0">
              <p class="text-muted small">Tải toàn bộ cơ sở dữ liệu hiện tại của hệ thống RoomMate (phòng trọ, khách thuê, hợp đồng, hóa đơn, chỉ số điện nước, thanh toán...) về máy tính dưới dạng file sao lưu JSON.</p>
              <div class="alert alert-light border small py-2 mb-3">
                <i class="bi bi-clock me-1 text-secondary"></i> Thời gian sao lưu gần nhất: 
                <strong id="lastBackupTime" class="text-dark">${lastBackupText}</strong>
              </div>
              <button class="btn btn-primary btn-sm fw-semibold" id="btnExportData" data-testid="btn-export-data">
                <i class="bi bi-download me-1"></i> Tải file sao lưu (.json)
              </button>
            </div>
          </div>

          <!-- CARD 2: NHẬP DỮ LIỆU -->
          <div class="card border-0 shadow-sm mb-4" id="card-import">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="card-title mb-0 fw-bold"><i class="bi bi-cloud-upload text-success me-2"></i>2. Nhập dữ liệu phục hồi</h5>
            </div>
            <div class="card-body pt-0">
              <p class="text-muted small">Nhập dữ liệu từ file JSON đã tải về trước đó để phục hồi trạng thái hệ thống.</p>
              
              <!-- Vùng kéo thả file -->
              <div id="importDropzone" class="p-4 text-center bg-light border-dashed rounded cursor-pointer mb-3" style="border: 2px dashed #dee2e6; transition: border-color 0.2s;">
                <i class="bi bi-file-earmark-arrow-up fs-2 text-muted mb-2 d-block"></i>
                <span class="small text-muted d-block">Kéo thả file sao lưu .json vào đây hoặc</span>
                <button type="button" class="btn btn-outline-secondary btn-sm mt-2" id="btnSelectFile">
                  Chọn file từ máy tính
                </button>
                <input type="file" id="importFileInput" accept=".json" class="d-none" />
              </div>

              <!-- Hiển thị tên file và dung lượng -->
              <div id="importFileInfo" class="alert alert-secondary py-2 px-3 small d-none mb-3">
                <!-- Nội dung cập nhật bằng JS -->
              </div>

              <!-- Chọn chế độ Dropdown -->
              <div class="mb-3 d-none" id="importModeContainer">
                <label class="form-label small text-muted fw-bold">Chọn phương thức nhập dữ liệu:</label>
                <div class="d-flex gap-3">
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="importMode" id="modeMerge" value="merge" checked>
                    <label class="form-check-label small" for="modeMerge">➕ Gộp dữ liệu (Giữ dữ liệu cũ, chỉ cập nhật trùng ID)</label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="importMode" id="modeOverwrite" value="overwrite">
                    <label class="form-check-label small text-danger" for="modeOverwrite">⚠️ Ghi đè (Xóa sạch toàn bộ dữ liệu cũ)</label>
                  </div>
                </div>
              </div>

              <!-- Nút kiểm tra và Import -->
              <div class="d-flex gap-2 d-none" id="importActionButtons">
                <button class="btn btn-info btn-sm text-white fw-semibold" id="btnCheckData">
                  <i class="bi bi-shield-check me-1"></i> Kiểm tra dữ liệu
                </button>
                <button class="btn btn-success btn-sm fw-semibold" id="btnImportSubmit" disabled>
                  <i class="bi bi-box-arrow-in-down me-1"></i> Bắt đầu Import
                </button>
              </div>
            </div>
          </div>

          <!-- CARD 3: DỮ LIỆU MẪU -->
          <div class="card border-0 shadow-sm mb-4" id="card-seed">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="card-title mb-0 fw-bold"><i class="bi bi-database-fill-gear text-warning me-2"></i>3. Dữ liệu mẫu (Seed Data)</h5>
            </div>
            <div class="card-body pt-0">
              <p class="text-muted small">Cung cấp bộ dữ liệu mẫu chuẩn (bao gồm 7 phòng thuê, 3 phòng trống, thông tin khách, dịch vụ điện nước, hóa đơn, thanh toán...) để dùng thử hệ thống.</p>
              <div class="d-flex gap-2">
                <button class="btn btn-warning btn-sm fw-semibold" id="btnCreateSeedData">
                  <i class="bi bi-plus-circle me-1"></i> Tạo dữ liệu mẫu (Gộp thêm)
                </button>
                <button class="btn btn-outline-warning btn-sm fw-semibold" id="btnRestoreSeed">
                  <i class="bi bi-arrow-counterclockwise me-1"></i> Khôi phục dữ liệu mẫu (Ghi đè)
                </button>
              </div>
            </div>
          </div>

          <!-- CARD 4: XÓA DỮ LIỆU (DANGER ZONE) -->
          <div class="card border-0 shadow-sm danger-zone" id="card-danger" style="border: 1px solid #f5c2c7; background-color: #fff8f8;">
            <div class="card-header py-3 border-0" style="background-color: #fff8f8;">
              <h5 class="card-title mb-0 fw-bold text-danger"><i class="bi bi-exclamation-octagon-fill me-2"></i>4. Danger Zone (Thao tác nguy hiểm)</h5>
            </div>
            <div class="card-body pt-0">
              <p class="text-muted small text-danger">Cảnh báo: Hành động này sẽ xóa sạch vĩnh viễn toàn bộ dữ liệu trong LocalStorage. Hãy chắc chắn bạn đã xuất dữ liệu dự phòng trước khi bấm nút.</p>
              <button class="btn btn-danger btn-sm fw-semibold" id="btnResetDatabase">
                <i class="bi bi-trash3-fill me-1"></i> Xóa toàn bộ dữ liệu
              </button>
            </div>
          </div>

        </div>

        <!-- Cột phải: Bảng thống kê -->
        <div class="col-lg-4">
          <div class="card border-0 shadow-sm h-100" id="card-stats">
            <div class="card-header bg-white py-3 border-0">
              <h5 class="card-title mb-0 fw-bold"><i class="bi bi-grid-3x3-gap text-secondary me-2"></i>Thống kê bản ghi</h5>
            </div>
            <div class="card-body pt-0">
              <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th class="small py-2 text-muted fw-bold">STT</th>
                      <th class="small py-2 text-muted fw-bold">Loại dữ liệu</th>
                      <th class="small py-2 text-muted fw-bold text-center">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td class="py-2 text-muted small">1</td>
                      <td class="py-2 small fw-semibold">Phòng trọ</td>
                      <td class="py-2 text-center fw-bold text-primary" id="statRooms">0</td>
                    </tr>
                    <tr>
                      <td class="py-2 text-muted small">2</td>
                      <td class="py-2 small fw-semibold">Người thuê</td>
                      <td class="py-2 text-center fw-bold text-primary" id="statTenants">0</td>
                    </tr>
                    <tr>
                      <td class="py-2 text-muted small">3</td>
                      <td class="py-2 small fw-semibold">Hợp đồng</td>
                      <td class="py-2 text-center fw-bold text-primary" id="statContracts">0</td>
                    </tr>
                    <tr>
                      <td class="py-2 text-muted small">4</td>
                      <td class="py-2 small fw-semibold">Chỉ số điện nước</td>
                      <td class="py-2 text-center fw-bold text-primary" id="statReadings">0</td>
                    </tr>
                    <tr>
                      <td class="py-2 text-muted small">5</td>
                      <td class="py-2 small fw-semibold">Hóa đơn</td>
                      <td class="py-2 text-center fw-bold text-primary" id="statInvoices">0</td>
                    </tr>
                    <tr>
                      <td class="py-2 text-muted small">6</td>
                      <td class="py-2 small fw-semibold">Thanh toán</td>
                      <td class="py-2 text-center fw-bold text-primary" id="statPayments">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL XÁC NHẬN THAO TÁC NGUY HIỂM -->
    <div class="modal fade" id="dangerConfirmModal" tabindex="-1" role="dialog" aria-modal="true" aria-hidden="true" data-testid="danger-confirm-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Xác nhận thao tác nguy hiểm</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p id="dangerModalMessage" class="fw-semibold text-dark mb-3"></p>
            <div class="mb-2">
              <label for="dangerConfirmInput" class="form-label small text-muted">Vui lòng nhập chính xác chuỗi <strong class="text-danger">XACNHAN</strong> để xác nhận hành động này:</label>
              <input type="text" class="form-control form-control-sm" id="dangerConfirmInput" placeholder="XACNHAN" autocomplete="off" />
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Hủy bỏ</button>
            <button type="button" class="btn btn-danger btn-sm" id="btnDangerConfirmSubmit" disabled>Xác nhận thực hiện</button>
          </div>
        </div>
      </div>
    </div>
  `;

  renderRecordStats();
  bindEvents();
}

// ─── THỐNG KÊ SỐ LƯỢNG BẢN GHI ──────────────────────────────────

function renderRecordStats() {
  const rooms = StorageService.getAll(STORAGE_KEYS.ROOMS) || [];
  const tenants = StorageService.getAll(STORAGE_KEYS.TENANTS) || [];
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS) || [];
  const readings = StorageService.getAll(STORAGE_KEYS.METER_READINGS) || [];
  const invoices = StorageService.getAll(STORAGE_KEYS.INVOICES) || [];
  const payments = StorageService.getAll(STORAGE_KEYS.PAYMENTS) || [];

  const statRoomsEl = document.getElementById('statRooms');
  const statTenantsEl = document.getElementById('statTenants');
  const statContractsEl = document.getElementById('statContracts');
  const statReadingsEl = document.getElementById('statReadings');
  const statInvoicesEl = document.getElementById('statInvoices');
  const statPaymentsEl = document.getElementById('statPayments');

  if (statRoomsEl) statRoomsEl.textContent = rooms.length;
  if (statTenantsEl) statTenantsEl.textContent = tenants.length;
  if (statContractsEl) statContractsEl.textContent = contracts.length;
  if (statReadingsEl) statReadingsEl.textContent = readings.length;
  if (statInvoicesEl) statInvoicesEl.textContent = invoices.length;
  if (statPaymentsEl) statPaymentsEl.textContent = payments.length;
}

// ─── EVENT BINDING ─────────────────────────────────────────────

function bindEvents() {
  const fileInput = document.getElementById('importFileInput');
  const dropzone = document.getElementById('importDropzone');
  const btnSelectFile = document.getElementById('btnSelectFile');
  const fileInfo = document.getElementById('importFileInfo');
  const modeContainer = document.getElementById('importModeContainer');
  const actionButtons = document.getElementById('importActionButtons');
  const btnCheckData = document.getElementById('btnCheckData');
  const btnImportSubmit = document.getElementById('btnImportSubmit');

  let dangerActionCallback = null;
  const dangerModal = new bootstrap.Modal(document.getElementById('dangerConfirmModal'));
  const dangerConfirmInput = document.getElementById('dangerConfirmInput');
  const dangerConfirmSubmit = document.getElementById('btnDangerConfirmSubmit');

  // Hàm gọi hiển thị Modal cảnh báo nguy hiểm yêu cầu nhập chữ
  const triggerDangerAction = (message, callback) => {
    const msgEl = document.getElementById('dangerModalMessage');
    if (msgEl) msgEl.innerHTML = message;
    
    dangerConfirmInput.value = '';
    dangerConfirmSubmit.disabled = true;
    dangerActionCallback = callback;
    dangerModal.show();
  };

  // Event cho ô xác thực nguy hiểm
  if (dangerConfirmInput) {
    dangerConfirmInput.addEventListener('input', () => {
      dangerConfirmSubmit.disabled = dangerConfirmInput.value.trim() !== 'XACNHAN';
    });
  }

  if (dangerConfirmSubmit) {
    dangerConfirmSubmit.addEventListener('click', () => {
      if (typeof dangerActionCallback === 'function') {
        dangerActionCallback();
      }
      dangerModal.hide();
    });
  }

  // 1. Xuất dữ liệu (Export)
  const btnExport = document.getElementById('btnExportData');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      downloadBackup();
      
      // Lưu lại mốc thời gian xuất file sao lưu
      const now = new Date();
      const timeStr = `${now.toLocaleTimeString('vi-VN')} ngày ${now.toLocaleDateString('vi-VN')}`;
      localStorage.setItem('roommate_last_backup_time', timeStr);
      
      const lastBackupTimeEl = document.getElementById('lastBackupTime');
      if (lastBackupTimeEl) lastBackupTimeEl.textContent = timeStr;

      showToast('Tải file sao lưu thành công!', 'success');
    });
  }

  // 2. Kéo thả file sao lưu (Drag & Drop)
  if (btnSelectFile && fileInput) {
    btnSelectFile.addEventListener('click', () => fileInput.click());
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#0d6efd';
      dropzone.style.backgroundColor = '#f8f9ff';
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '#dee2e6';
      dropzone.style.backgroundColor = '#f8f9fa';
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#dee2e6';
      dropzone.style.backgroundColor = '#f8f9fa';

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        fileInput.files = files;
        fileInput.dispatchEvent(new Event('change'));
      }
    });
  }

  // 3. Xử lý File tải lên
  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) {
        fileInfo.classList.add('d-none');
        modeContainer.classList.add('d-none');
        actionButtons.classList.add('d-none');
        selectedBackupFile = null;
        parsedBackupData = null;
        return;
      }

      selectedBackupFile = file;
      parsedBackupData = null;
      btnImportSubmit.disabled = true; // Bắt buộc phải bấm kiểm tra lại

      const sizeKB = (file.size / 1024).toFixed(1);
      fileInfo.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="bi bi-filetype-json fs-4 text-primary me-2"></i>
          <div>
            <strong>File đã chọn:</strong> <code>${file.name}</code> (${sizeKB} KB)<br>
            <span class="text-warning small fst-italic"><i class="bi bi-info-circle me-1"></i>Hãy nhấn "Kiểm tra dữ liệu" để đảm bảo tính an toàn của cấu trúc file.</span>
          </div>
        </div>
      `;
      fileInfo.className = 'alert alert-secondary py-2 px-3 small mb-3';
      fileInfo.classList.remove('d-none');
      modeContainer.classList.remove('d-none');
      actionButtons.classList.remove('d-none');
    });
  }

  // 4. Kiểm tra dữ liệu (Check Data)
  if (btnCheckData) {
    btnCheckData.addEventListener('click', async () => {
      if (!selectedBackupFile) return;

      try {
        const parsed = await readJsonFile(selectedBackupFile);
        const checkResult = validateBackupData(parsed);

        if (!checkResult.valid) {
          fileInfo.className = 'p-0 mb-3 border-0 bg-transparent';
          fileInfo.innerHTML = renderErrorState('invalid-import', {
            customMsg: checkResult.errors.join(' | '),
            showHomeBtn: false,
            actionId: 'btnErrorActionResetImport',
            actionText: '📁 Chọn file khác'
          });
          
          setTimeout(() => {
            document.getElementById('btnErrorActionResetImport')?.addEventListener('click', () => {
              document.getElementById('importFileInput')?.click();
            });
          }, 0);

          btnImportSubmit.disabled = true;
          parsedBackupData = null;
          return;
        }

        // Dữ liệu hợp lệ
        parsedBackupData = parsed;
        fileInfo.className = 'alert alert-success py-2 px-3 small mb-3';
        fileInfo.innerHTML = `
          <strong>✅ File dữ liệu hợp lệ, sẵn sàng import:</strong><br>
          • Số phòng trọ: <strong>${parsed.rooms?.length || 0}</strong><br>
          • Số khách thuê: <strong>${parsed.tenants?.length || 0}</strong><br>
          • Số hợp đồng: <strong>${parsed.contracts?.length || 0}</strong><br>
          • Số hóa đơn: <strong>${parsed.invoices?.length || 0}</strong>
        `;
        btnImportSubmit.disabled = false;
        showToast('Kiểm tra dữ liệu thành công! Bản sao hợp lệ.', 'success');
      } catch (err) {
        fileInfo.className = 'alert alert-danger py-2 px-3 small mb-3';
        fileInfo.innerHTML = `<strong>⚠️ Lỗi khi đọc file:</strong> ${err.message}`;
        btnImportSubmit.disabled = true;
        parsedBackupData = null;
      }
    });
  }

  // 5. Submit Import dữ liệu
  if (btnImportSubmit) {
    btnImportSubmit.addEventListener('click', () => {
      if (!parsedBackupData) return;

      const mode = document.querySelector('input[name="importMode"]:checked').value;
      const isOverwrite = mode === 'overwrite';

      const executeImport = () => {
        const cardImport = document.getElementById('card-import');
        if (!cardImport) return;

        // Tạo overlay che phủ card import
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.zIndex = '10';
        overlay.style.background = 'rgba(255, 255, 255, 0.95)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.innerHTML = renderImportLoadingOverlay(
          isOverwrite ? 'Đang ghi đè dữ liệu mới...' : 'Đang gộp dữ liệu phục hồi...'
        );
        
        cardImport.style.position = 'relative';
        cardImport.appendChild(overlay);

        setTimeout(() => {
          try {
            const res = importData(parsedBackupData, {
              overwrite: isOverwrite,
              merge: !isOverwrite
            });

            if (res.success) {
              showToast(
                isOverwrite 
                  ? 'Ghi đè dữ liệu thành công! Đang tải lại dữ liệu...' 
                  : 'Gộp dữ liệu phục hồi thành công! Đang tải lại dữ liệu...', 
                'success'
              );

              // Làm mới trang sau 800ms để nạp lại dữ liệu đồng bộ
              setTimeout(() => {
                window.location.reload();
              }, 800);
            }
          } catch (err) {
            showToast(err.message, 'danger');
            overlay.remove();
          }
        }, 1000);
      };

      if (isOverwrite) {
        triggerDangerAction(
          '<span class="text-danger">⚠️ CẢNH BÁO CỰC KỲ NGUY HIỂM:</span><br>Ghi đè sẽ xóa sạch toàn bộ cơ sở dữ liệu hiện tại để nạp dữ liệu từ file sao lưu. Hành động này không thể hoàn tác nếu không có file rollback.',
          executeImport
        );
      } else {
        executeImport();
      }
    });
  }

  // 6. Tạo dữ liệu mẫu (Gộp thêm)
  const btnCreateSeed = document.getElementById('btnCreateSeedData');
  if (btnCreateSeed) {
    btnCreateSeed.addEventListener('click', () => {
      const originalHtml = btnCreateSeed.innerHTML;
      btnCreateSeed.disabled = true;
      btnCreateSeed.innerHTML = getButtonLoadingHtml('Đang tạo dữ liệu mẫu...');
      
      setTimeout(() => {
        try {
          const seedDataObj = {
            rooms: SEED_ROOMS,
            tenants: SEED_TENANTS,
            contracts: SEED_CONTRACTS,
            meterReadings: SEED_METER_READINGS,
            serviceConfigs: SEED_SERVICE_CONFIGS,
            invoices: SEED_INVOICES,
            payments: SEED_PAYMENTS,
            appSettings: SEED_APP_SETTINGS
          };

          const res = importData(seedDataObj, { overwrite: false, merge: true });
          if (res.success) {
            showToast('Đã gộp thêm dữ liệu mẫu dùng thử thành công!', 'success');
            renderRecordStats();
          }
        } catch (err) {
          showToast(err.message, 'danger');
        } finally {
          btnCreateSeed.disabled = false;
          btnCreateSeed.innerHTML = originalHtml;
        }
      }, 500);
    });
  }

  // 7. Khôi phục dữ liệu mẫu (Ghi đè - Danger Action)
  const btnRestoreSeed = document.getElementById('btnRestoreSeed');
  if (btnRestoreSeed) {
    btnRestoreSeed.addEventListener('click', () => {
      triggerDangerAction(
        'Hệ thống sẽ <strong class="text-danger">xóa toàn bộ phòng trọ và hóa đơn hiện tại</strong> để khôi phục lại cấu hình dữ liệu mẫu gốc ban đầu.',
        () => {
          const originalHtml = btnRestoreSeed.innerHTML;
          btnRestoreSeed.disabled = true;
          btnRestoreSeed.innerHTML = getButtonLoadingHtml('Đang khôi phục...');
          
          setTimeout(() => {
            try {
              restoreSeedData();
              showToast('Khôi phục dữ liệu mẫu gốc thành công! Đang tải lại...', 'success');
              renderRecordStats();
              setTimeout(() => {
                window.location.reload();
              }, 500);
            } catch (err) {
              showToast(err.message, 'danger');
              btnRestoreSeed.disabled = false;
              btnRestoreSeed.innerHTML = originalHtml;
            }
          }, 500);
        }
      );
    });
  }

  // 8. Xóa toàn bộ cơ sở dữ liệu ( Danger Action )
  const btnResetDatabase = document.getElementById('btnResetDatabase');
  if (btnResetDatabase) {
    btnResetDatabase.addEventListener('click', () => {
      triggerDangerAction(
        '<strong class="text-danger">❌ CẢNH BÁO CỰC KỲ NGUY HIỂM:</strong><br>Bạn sẽ mất vĩnh viễn toàn bộ phòng trọ, khách thuê, hóa đơn và lịch sử đóng tiền trong LocalStorage. Hãy chắc chắn bạn đã sao lưu trước khi thực hiện.',
        () => {
          const originalHtml = btnResetDatabase.innerHTML;
          btnResetDatabase.disabled = true;
          btnResetDatabase.innerHTML = getButtonLoadingHtml('Đang xóa dữ liệu...');
          
          setTimeout(() => {
            try {
              resetAllData();
              showToast('Đã xóa sạch cơ sở dữ liệu. Ứng dụng hiện đang trống. Đang tải lại...', 'info');
              renderRecordStats();
              setTimeout(() => {
                window.location.reload();
              }, 500);
            } catch (err) {
              showToast(err.message, 'danger');
              btnResetDatabase.disabled = false;
              btnResetDatabase.innerHTML = originalHtml;
            }
          }, 500);
        }
      );
    });
  }
}
