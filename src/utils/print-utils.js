// src/utils/print-utils.js

import { formatCurrency } from './currency-utils.js';
import { formatDateToDisplay } from './date-utils.js';

/**
 * Mở cửa sổ in hợp đồng chuẩn A4 pháp lý.
 *
 * @param {Object} contract - Đối tượng hợp đồng.
 * @param {Object} room - Đối tượng phòng.
 * @param {Object} tenant - Đối tượng người đại diện.
 * @param {Array<Object>} coTenants - Danh sách người ở cùng.
 */
export function printContract(contract, room, tenant, coTenants = []) {
  if (!contract) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Không thể mở cửa sổ in. Vui lòng tắt trình chặn pop-up.');
    return;
  }

  const roomName = room ? (room.name.startsWith('Phòng') ? room.name : 'Phòng ' + room.name) : 'N/A';
  const tenantName = tenant ? tenant.fullName : 'N/A';
  const tenantPhone = tenant ? (tenant.phone || 'N/A') : 'N/A';
  const tenantIdCard = tenant ? (tenant.idCard || 'N/A') : 'N/A';
  const tenantAddress = tenant ? (tenant.address || 'N/A') : 'N/A';

  const coTenantsStr = coTenants.length > 0
    ? coTenants.map(ct => ct ? `${ct.fullName} (${ct.phone || 'N/A'})` : '').filter(Boolean).join(', ')
    : 'Không có';

  const now = new Date();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hợp đồng thuê phòng - ${roomName}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .national-title {
            font-weight: bold;
            font-size: 15px;
            text-transform: uppercase;
            margin: 0 0 5px 0;
          }
          .national-subtitle {
            font-weight: bold;
            font-size: 13px;
            margin: 0 0 10px 0;
          }
          .document-title {
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 30px;
            margin-bottom: 5px;
            letter-spacing: 1px;
          }
          .document-id {
            font-style: italic;
            margin-bottom: 25px;
            color: #555;
          }
          .section-title {
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 20px;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 4px;
            font-size: 14px;
          }
          .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .info-table td {
            padding: 6px 0;
            vertical-align: top;
          }
          .info-label {
            width: 180px;
            font-weight: 500;
          }
          .info-colon {
            width: 15px;
          }
          .info-value {
            font-weight: bold;
          }
          .terms-box {
            padding: 10px 15px;
            background-color: #f9f9f9;
            border-left: 3px solid #ccc;
            margin-bottom: 20px;
            font-style: italic;
            white-space: pre-wrap;
          }
          .signature-section {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature-box {
            text-align: center;
            width: 45%;
          }
          .signature-box p {
            margin: 4px 0;
          }
          .signature-space {
            height: 80px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p class="national-subtitle">Độc lập - Tự do - Hạnh phúc</p>
          <div style="border-top: 1px solid #000; width: 120px; margin: 0 auto 20px auto;"></div>
          <p class="document-title">HỢP ĐỒNG THUÊ PHÒNG TRỌ</p>
          <p class="document-id">Mã hợp đồng: ${contract.id}</p>
        </div>

        <p>Hôm nay, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}, tại văn phòng quản lý trọ, các bên thỏa thuận ký kết hợp đồng thuê phòng với nội dung chi tiết dưới đây:</p>

        <div class="section-title">Bên Cho Thuê (Bên A)</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Đại diện cho thuê</td>
            <td class="info-colon">:</td>
            <td class="info-value">Ban quản lý vận hành RoomMate PMS</td>
          </tr>
          <tr>
            <td class="info-label">Dịch vụ vận hành</td>
            <td class="info-colon">:</td>
            <td>Hệ thống Quản lý nhà trọ & Căn hộ dịch vụ RoomMate</td>
          </tr>
        </table>

        <div class="section-title">Bên Thuê (Bên B)</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Người đại diện thuê</td>
            <td class="info-colon">:</td>
            <td class="info-value">${tenantName}</td>
          </tr>
          <tr>
            <td class="info-label">Số điện thoại liên hệ</td>
            <td class="info-colon">:</td>
            <td>${tenantPhone}</td>
          </tr>
          <tr>
            <td class="info-label">Số CCCD / Hộ chiếu</td>
            <td class="info-colon">:</td>
            <td>${tenantIdCard}</td>
          </tr>
          <tr>
            <td class="info-label">Địa chỉ thường trú</td>
            <td class="info-colon">:</td>
            <td>${tenantAddress}</td>
          </tr>
          <tr>
            <td class="info-label">Thành viên cùng phòng</td>
            <td class="info-colon">:</td>
            <td>${coTenantsStr}</td>
          </tr>
        </table>

        <div class="section-title">Điều 1: Thông tin phòng & Thời hạn thuê</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Phòng thuê</td>
            <td class="info-colon">:</td>
            <td class="info-value">${roomName}</td>
          </tr>
          <tr>
            <td class="info-label">Thời hạn hợp đồng</td>
            <td class="info-colon">:</td>
            <td>Từ ngày <strong>${formatDateToDisplay(contract.startDate)}</strong> đến ngày <strong>${formatDateToDisplay(contract.endDate)}</strong></td>
          </tr>
          <tr>
            <td class="info-label">Ngày đóng tiền hàng tháng</td>
            <td class="info-colon">:</td>
            <td>Ngày ${contract.paymentDay || 1} hàng tháng</td>
          </tr>
          <tr>
            <td class="info-label">Số xe đăng ký</td>
            <td class="info-colon">:</td>
            <td>${contract.vehicles || 0} xe</td>
          </tr>
        </table>

        <div class="section-title">Điều 2: Giá thuê, đặt cọc & Phương thức thanh toán</div>
        <table class="info-table">
          <tr>
            <td class="info-label">Giá thuê tại thời điểm ký</td>
            <td class="info-colon">:</td>
            <td class="info-value" style="color: #d9534f; font-size: 15px;">${formatCurrency(contract.roomPrice)} / tháng</td>
          </tr>
          <tr>
            <td class="info-label">Tiền đặt cọc phòng</td>
            <td class="info-colon">:</td>
            <td class="info-value" style="color: #2b542c;">${formatCurrency(contract.deposit)}</td>
          </tr>
        </table>

        <div class="section-title">Điều 3: Điều khoản thỏa thuận bổ sung</div>
        <div class="terms-box">${contract.terms || 'Các quy tắc sinh hoạt chung áp dụng theo Quy chế tòa nhà của Ban Quản Lý.'}</div>
        
        ${contract.notes ? `
        <div class="section-title">Ghi chú thêm</div>
        <p style="font-style: italic;">${contract.notes}</p>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <p><strong>ĐẠI DIỆN BÊN CHO THUÊ (BÊN A)</strong></p>
            <p style="font-size: 11px; color: #777;">(Ký và ghi rõ họ tên)</p>
            <div class="signature-space"></div>
            <p><strong>RoomMate PMS Manager</strong></p>
          </div>
          <div class="signature-box">
            <p><strong>ĐẠI DIỆN BÊN THUÊ (BÊN B)</strong></p>
            <p style="font-size: 11px; color: #777;">(Ký và ghi rõ họ tên)</p>
            <div class="signature-space"></div>
            <p><strong>${tenantName}</strong></p>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
