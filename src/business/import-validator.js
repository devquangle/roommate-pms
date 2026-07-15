// src/business/import-validator.js

/**
 * Validator cho dữ liệu nhập khẩu (import JSON).
 * Đảm bảo file cấu trúc đúng chuẩn, không gây hỏng cơ sở dữ liệu LocalStorage.
 */

/**
 * Validate cấu trúc của dữ liệu backup nhập vào.
 *
 * @param {*} data - Dữ liệu parsed từ file JSON.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBackupData(data) {
  const errors = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('Dữ liệu nhập vào phải là một đối tượng JSON hợp lệ.');
    return { valid: false, errors };
  }

  // Danh sách các collection bắt buộc phải có dạng Array
  const requiredArrayKeys = [
    'rooms',
    'tenants',
    'contracts',
    'meterReadings',
    'serviceConfigs',
    'invoices',
    'payments'
  ];

  requiredArrayKeys.forEach(key => {
    if (data[key] === undefined) {
      errors.push(`Thiếu nhóm dữ liệu bắt buộc: "${key}".`);
    } else if (!Array.isArray(data[key])) {
      errors.push(`Nhóm dữ liệu "${key}" phải là một danh sách (mảng dữ liệu).`);
    } else {
      // Kiểm tra tất cả phần tử trong mảng phải có trường id bắt buộc
      const hasMissingId = data[key].some(item => !item || typeof item !== 'object' || !item.id);
      if (hasMissingId) {
        errors.push(`Phát hiện bản ghi không hợp lệ (thiếu trường "id") trong nhóm "${key}".`);
      }
    }
  });

  // Kiểm tra cài đặt ứng dụng (nếu có, phải là object)
  if (data.appSettings !== undefined && (typeof data.appSettings !== 'object' || Array.isArray(data.appSettings))) {
    errors.push('Thông tin cấu hình "appSettings" phải là một đối tượng.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
export default validateBackupData;
