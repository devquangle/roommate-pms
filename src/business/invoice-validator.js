// src/business/invoice-validator.js

/**
 * InvoiceValidator – Kiểm tra tính hợp lệ của dữ liệu hóa đơn (pure function).
 *
 * Quy tắc:
 * - Không chấp nhận số âm.
 * - Giảm giá không lớn hơn tạm tính.
 * - Tổng tiền không nhỏ hơn 0.
 * - Không thao tác DOM.
 * - Không thao tác LocalStorage.
 */

/**
 * Kiểm tra một giá trị có phải là số không âm hay không.
 * @param {*} value
 * @returns {boolean}
 */
function isNonNegativeNumber(value) {
  const num = Number(value);
  return !isNaN(num) && num >= 0;
}

/**
 * Kiểm tra một chuỗi có rỗng (hoặc null/undefined) hay không.
 * @param {*} value
 * @returns {boolean}
 */
function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

/**
 * Validate toàn bộ dữ liệu hóa đơn.
 *
 * Trả về object { valid: boolean, errors: string[] }.
 * Hàm thuần, không có side-effect.
 *
 * Các trường được kiểm tra:
 * - roomId          : Bắt buộc.
 * - month           : Bắt buộc, 1-12.
 * - year            : Bắt buộc, >= 2000.
 * - dueDate         : Bắt buộc, phải là ngày hợp lệ.
 * - roomFee         : Bắt buộc, >= 0.
 * - electricityFee  : Nếu có, phải >= 0.
 * - waterFee        : Nếu có, phải >= 0.
 * - otherServicesFee: Nếu có, phải >= 0.
 * - totalAmount     : Bắt buộc, >= 0.
 * - paidAmount      : Nếu có, phải >= 0.
 * - remainingDebt   : Nếu có, phải >= 0.
 * - discount        : Nếu có, phải >= 0 và không lớn hơn tạm tính.
 * - serviceDetails  : Nếu có, mỗi mục phải có name, total >= 0.
 *
 * @param {Object} invoice - Đối tượng hóa đơn cần validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInvoice(invoice) {
  const errors = [];

  if (!invoice || typeof invoice !== 'object') {
    return { valid: false, errors: ['Dữ liệu hóa đơn không hợp lệ.'] };
  }

  // ── roomId ──────────────────────────────────────────────────
  if (isEmpty(invoice.roomId)) {
    errors.push('Mã phòng (roomId) không được để trống.');
  }

  // ── month ───────────────────────────────────────────────────
  if (isEmpty(invoice.month)) {
    errors.push('Tháng (month) không được để trống.');
  } else {
    const month = Number(invoice.month);
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.push('Tháng (month) phải là số nguyên từ 1 đến 12.');
    }
  }

  // ── year ────────────────────────────────────────────────────
  if (isEmpty(invoice.year)) {
    errors.push('Năm (year) không được để trống.');
  } else {
    const year = Number(invoice.year);
    if (!Number.isInteger(year) || year < 2000) {
      errors.push('Năm (year) phải là số nguyên >= 2000.');
    }
  }

  // ── dueDate ─────────────────────────────────────────────────
  if (isEmpty(invoice.dueDate)) {
    errors.push('Hạn thanh toán (dueDate) không được để trống.');
  } else {
    const due = new Date(invoice.dueDate);
    if (isNaN(due.getTime())) {
      errors.push('Hạn thanh toán (dueDate) không phải là ngày hợp lệ.');
    }
  }

  // ── roomFee ─────────────────────────────────────────────────
  if (invoice.roomFee === undefined || invoice.roomFee === null || invoice.roomFee === '') {
    errors.push('Tiền phòng (roomFee) không được để trống.');
  } else if (!isNonNegativeNumber(invoice.roomFee)) {
    errors.push('Tiền phòng (roomFee) phải là số không âm.');
  }

  // ── electricityFee ──────────────────────────────────────────
  if (invoice.electricityFee !== undefined && invoice.electricityFee !== null && invoice.electricityFee !== '') {
    if (!isNonNegativeNumber(invoice.electricityFee)) {
      errors.push('Tiền điện (electricityFee) phải là số không âm.');
    }
  }

  // ── waterFee ────────────────────────────────────────────────
  if (invoice.waterFee !== undefined && invoice.waterFee !== null && invoice.waterFee !== '') {
    if (!isNonNegativeNumber(invoice.waterFee)) {
      errors.push('Tiền nước (waterFee) phải là số không âm.');
    }
  }

  // ── otherServicesFee ────────────────────────────────────────
  if (invoice.otherServicesFee !== undefined && invoice.otherServicesFee !== null && invoice.otherServicesFee !== '') {
    if (!isNonNegativeNumber(invoice.otherServicesFee)) {
      errors.push('Phí dịch vụ khác (otherServicesFee) phải là số không âm.');
    }
  }

  // ── totalAmount ─────────────────────────────────────────────
  if (invoice.totalAmount === undefined || invoice.totalAmount === null || invoice.totalAmount === '') {
    errors.push('Tổng tiền (totalAmount) không được để trống.');
  } else if (!isNonNegativeNumber(invoice.totalAmount)) {
    errors.push('Tổng tiền (totalAmount) phải là số không âm.');
  }

  // ── paidAmount ──────────────────────────────────────────────
  if (invoice.paidAmount !== undefined && invoice.paidAmount !== null && invoice.paidAmount !== '') {
    if (!isNonNegativeNumber(invoice.paidAmount)) {
      errors.push('Số tiền đã trả (paidAmount) phải là số không âm.');
    }
  }

  // ── remainingDebt ───────────────────────────────────────────
  if (invoice.remainingDebt !== undefined && invoice.remainingDebt !== null && invoice.remainingDebt !== '') {
    if (!isNonNegativeNumber(invoice.remainingDebt)) {
      errors.push('Số tiền còn nợ (remainingDebt) phải là số không âm.');
    }
  }

  // ── discount ────────────────────────────────────────────────
  if (invoice.discount !== undefined && invoice.discount !== null && invoice.discount !== '') {
    if (!isNonNegativeNumber(invoice.discount)) {
      errors.push('Giảm giá (discount) phải là số không âm.');
    } else {
      const discount = Number(invoice.discount);
      // Tính tạm tính để so sánh giảm giá
      const roomFee = Number(invoice.roomFee) || 0;
      const electricityFee = Number(invoice.electricityFee) || 0;
      const waterFee = Number(invoice.waterFee) || 0;
      const otherServicesFee = Number(invoice.otherServicesFee) || 0;
      const subtotal = roomFee + electricityFee + waterFee + otherServicesFee;

      if (discount > subtotal) {
        errors.push('Giảm giá (discount) không được lớn hơn tổng tạm tính.');
      }
    }
  }

  // ── serviceDetails ──────────────────────────────────────────
  if (invoice.serviceDetails !== undefined && invoice.serviceDetails !== null) {
    if (!Array.isArray(invoice.serviceDetails)) {
      errors.push('Chi tiết dịch vụ (serviceDetails) phải là một mảng.');
    } else {
      invoice.serviceDetails.forEach((item, index) => {
        const pos = index + 1;
        if (!item || typeof item !== 'object') {
          errors.push(`Mục dịch vụ #${pos} không hợp lệ.`);
          return;
        }
        if (isEmpty(item.name)) {
          errors.push(`Mục dịch vụ #${pos}: Tên dịch vụ (name) không được để trống.`);
        }
        if (item.total !== undefined && item.total !== null && item.total !== '') {
          if (!isNonNegativeNumber(item.total)) {
            errors.push(`Mục dịch vụ #${pos}: Thành tiền (total) phải là số không âm.`);
          }
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
