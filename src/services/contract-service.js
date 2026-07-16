// src/services/contract-service.js

import * as StorageService from './storage-service.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { ROOM_STATUS, CONTRACT_STATUS } from '../constants/statuses.js';
import { generateId } from '../utils/id-utils.js';
import { toNumberOrDefault } from '../utils/number-utils.js';
import { isValidDate } from '../utils/validation-utils.js';
import { validateContract } from '../business/contract-validator.js';
import {
  isContractActive,
  isContractExpiringSoon,
  hasOverlappingContract,
} from '../business/contract-utils.js';
import { getRoomById } from './room-service.js';

const KEY = STORAGE_KEYS.CONTRACTS;
const ROOMS_KEY = STORAGE_KEYS.ROOMS;

// ─── HELPERS (private) ────────────────────────────────────────

/**
 * Cập nhật trạng thái phòng trong LocalStorage.
 * Dùng nội bộ để đồng bộ trạng thái phòng khi thay đổi hợp đồng.
 *
 * @param {string} roomId
 * @param {string} newStatus
 */
function updateRoomStatus(roomId, newStatus) {
  StorageService.update(ROOMS_KEY, roomId, { status: newStatus });
}

/**
 * Kiểm tra phòng còn hợp đồng active nào khác không (ngoại trừ contractId).
 *
 * @param {string} roomId
 * @param {string} excludeContractId - ID hợp đồng cần loại trừ.
 * @returns {boolean}
 */
function roomHasOtherActiveContracts(roomId, excludeContractId) {
  const contracts = StorageService.getAll(KEY);
  return contracts.some(
    c => c.roomId === roomId &&
         c.id !== excludeContractId &&
         c.status === CONTRACT_STATUS.ACTIVE
  );
}

// ─── READ ──────────────────────────────────────────────────────

/**
 * Lấy toàn bộ danh sách hợp đồng.
 *
 * @returns {Array<Object>}
 */
export function getContracts() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy một hợp đồng theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getContractById(id) {
  return StorageService.getById(KEY, id);
}

/**
 * Lấy hợp đồng đang active của một phòng.
 *
 * @param {string} roomId
 * @returns {Object|null} Hợp đồng active hoặc null.
 */
export function getActiveContractByRoom(roomId) {
  const contracts = getContracts();
  return contracts.find(
    c => c.roomId === roomId && c.status === CONTRACT_STATUS.ACTIVE
  ) || null;
}

/**
 * Lấy danh sách hợp đồng sắp hết hạn trong N ngày tới.
 *
 * @param {number} [days=30] - Số ngày cảnh báo.
 * @returns {Array<Object>}
 */
export function getExpiringContracts(days = 30) {
  const contracts = getContracts();
  const now = new Date();
  return contracts.filter(c => isContractExpiringSoon(c, now, days));
}

// ─── SEARCH & FILTER ───────────────────────────────────────────

/**
 * Tìm kiếm hợp đồng theo từ khóa.
 * So khớp trên ID hợp đồng, roomId, tenantId (case-insensitive).
 * Cũng tìm theo tên phòng nếu có.
 *
 * @param {string} keyword
 * @returns {Array<Object>}
 */
export function searchContracts(keyword) {
  const contracts = getContracts();
  if (!keyword || keyword.trim() === '') {
    return contracts;
  }

  const kw = keyword.trim().toLowerCase();
  const rooms = StorageService.getAll(ROOMS_KEY);
  const tenants = StorageService.getAll(STORAGE_KEYS.TENANTS);

  return contracts.filter(c => {
    const cId = (c.id || '').toLowerCase();
    const room = rooms.find(r => r.id === c.roomId);
    const tenant = tenants.find(t => t.id === c.tenantId);
    const roomName = room ? room.name.toLowerCase() : '';
    const tenantName = tenant ? tenant.fullName.toLowerCase() : '';

    return (
      cId.includes(kw) ||
      roomName.includes(kw) ||
      tenantName.includes(kw)
    );
  });
}

/**
 * Lọc hợp đồng theo bộ lọc.
 *
 * @param {Object} filters
 * @param {string} [filters.status] - Trạng thái (active | expired | terminated).
 * @param {string} [filters.roomId] - ID phòng.
 * @param {string} [filters.tenantId] - ID người thuê.
 * @returns {Array<Object>}
 */
export function filterContracts(filters = {}) {
  let contracts = getContracts();

  if (filters.status) {
    contracts = contracts.filter(c => c.status === filters.status);
  }
  if (filters.roomId) {
    contracts = contracts.filter(c => c.roomId === filters.roomId);
  }
  if (filters.tenantId) {
    contracts = contracts.filter(c => c.tenantId === filters.tenantId);
  }

  return contracts;
}

// ─── CREATE ────────────────────────────────────────────────────

/**
 * Tạo hợp đồng mới.
 * Hợp đồng mới luôn có status = 'active' và phòng được chuyển thành 'rented'.
 *
 * @param {Object} data
 * @param {string} data.roomId      - ID phòng (bắt buộc).
 * @param {string} data.tenantId    - ID người thuê (bắt buộc).
 * @param {string} data.startDate   - Ngày bắt đầu (bắt buộc).
 * @param {string} data.endDate     - Ngày kết thúc (bắt buộc).
 * @param {number} data.roomPrice   - Giá thuê ghi trên HĐ (>= 0).
 * @param {number} data.deposit     - Tiền cọc (>= 0).
 * @param {string} [data.status]    - Trạng thái (draft, active).
 * @param {Array<string>} [data.coTenantIds] - Danh sách người ở cùng.
 * @param {number} [data.paymentDay] - Ngày thanh toán hàng tháng.
 * @param {number} [data.vehicles]  - Số xe.
 * @param {string} [data.terms]     - Điều khoản bổ sung.
 * @param {string} [data.notes]     - Ghi chú.
 * @returns {Object} Hợp đồng vừa tạo.
 * @throws {Error} Nếu dữ liệu không hợp lệ.
 */
export function createContract(data) {
  const room = getRoomById(data.roomId);
  const existingContracts = getContracts();

  // Validate đầy đủ qua validator thuần
  const result = validateContract(data, {
    room,
    existingContracts,
  });

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const newContract = {
    id: generateId('c-'),
    roomId: data.roomId,
    tenantId: data.tenantId,
    startDate: data.startDate,
    endDate: data.endDate,
    roomPrice: toNumberOrDefault(data.roomPrice, 0),
    deposit: toNumberOrDefault(data.deposit, 0),
    status: data.status || CONTRACT_STATUS.ACTIVE,
    coTenantIds: Array.isArray(data.coTenantIds) ? data.coTenantIds : [],
    paymentDay: toNumberOrDefault(data.paymentDay, 1),
    vehicles: toNumberOrDefault(data.vehicles, 0),
    terms: data.terms || '',
    notes: data.notes || '',
  };

  // Ghi hợp đồng trước
  const created = StorageService.create(KEY, newContract);

  // Đồng bộ trạng thái phòng → rented (chỉ khi HĐ là active)
  if (room && room.status !== ROOM_STATUS.RENTED && newContract.status === CONTRACT_STATUS.ACTIVE) {
    updateRoomStatus(room.id, ROOM_STATUS.RENTED);
  }

  return created;
}

// ─── UPDATE ────────────────────────────────────────────────────

/**
 * Cập nhật thông tin hợp đồng.
 * Không cho sửa hợp đồng đã kết thúc (expired/terminated).
 *
 * @param {string} id - ID hợp đồng.
 * @param {Object} data - Dữ liệu cần cập nhật.
 * @returns {Object} Hợp đồng sau khi cập nhật.
 * @throws {Error}
 */
export function updateContract(id, data) {
  const contract = getContractById(id);
  if (!contract) {
    throw new Error('Hợp đồng không tồn tại.');
  }

  if (contract.status === CONTRACT_STATUS.EXPIRED) {
    throw new Error('Không thể sửa hợp đồng đã hết hạn.');
  }
  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    throw new Error('Không thể sửa hợp đồng đã thanh lý.');
  }

  // Merge dữ liệu mới với dữ liệu cũ để validate toàn bộ
  const merged = {
    id: contract.id,
    roomId: data.roomId !== undefined ? data.roomId : contract.roomId,
    tenantId: data.tenantId !== undefined ? data.tenantId : contract.tenantId,
    startDate: data.startDate !== undefined ? data.startDate : contract.startDate,
    endDate: data.endDate !== undefined ? data.endDate : contract.endDate,
    roomPrice: data.roomPrice !== undefined ? data.roomPrice : contract.roomPrice,
    deposit: data.deposit !== undefined ? data.deposit : contract.deposit,
  };

  const room = getRoomById(merged.roomId);
  const existingContracts = getContracts();

  const result = validateContract(merged, {
    room,
    existingContracts,
  });

  if (!result.valid) {
    throw new Error(result.errors.join(' '));
  }

  const changes = {
    roomId: merged.roomId,
    tenantId: merged.tenantId,
    startDate: merged.startDate,
    endDate: merged.endDate,
    roomPrice: toNumberOrDefault(merged.roomPrice, contract.roomPrice),
    deposit: toNumberOrDefault(merged.deposit, contract.deposit),
    status: data.status || contract.status,
    coTenantIds: Array.isArray(data.coTenantIds) ? data.coTenantIds : contract.coTenantIds,
    paymentDay: data.paymentDay !== undefined ? toNumberOrDefault(data.paymentDay, 1) : contract.paymentDay,
    vehicles: data.vehicles !== undefined ? toNumberOrDefault(data.vehicles, 0) : contract.vehicles,
    terms: data.terms !== undefined ? data.terms : contract.terms,
    notes: data.notes !== undefined ? data.notes : contract.notes,
  };

  const updated = StorageService.update(KEY, id, changes);

  // Đồng bộ trạng thái phòng nếu đổi phòng hoặc kích hoạt HĐ
  if (changes.status === CONTRACT_STATUS.ACTIVE) {
    if (contract.roomId !== changes.roomId) {
      // Phòng cũ -> available (nếu không còn HĐ active nào khác)
      if (!roomHasOtherActiveContracts(contract.roomId, id)) {
        updateRoomStatus(contract.roomId, ROOM_STATUS.AVAILABLE);
      }
      // Phòng mới -> rented
      updateRoomStatus(changes.roomId, ROOM_STATUS.RENTED);
    } else {
      updateRoomStatus(changes.roomId, ROOM_STATUS.RENTED);
    }
  }

  return updated;
}

// ─── ACTIVATE ──────────────────────────────────────────────────

/**
 * Kích hoạt hợp đồng (chuyển status thành active).
 * Phòng tương ứng sẽ được chuyển thành 'rented'.
 *
 * @param {string} id - ID hợp đồng.
 * @returns {Object} Hợp đồng sau khi kích hoạt.
 * @throws {Error}
 */
export function activateContract(id) {
  const contract = getContractById(id);
  if (!contract) {
    throw new Error('Hợp đồng không tồn tại.');
  }

  if (contract.status === CONTRACT_STATUS.ACTIVE) {
    throw new Error('Hợp đồng đã đang hiệu lực.');
  }
  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    throw new Error('Không thể kích hoạt lại hợp đồng đã thanh lý.');
  }

  // Kiểm tra phòng có đang bảo trì không
  const room = getRoomById(contract.roomId);
  if (room && room.status === ROOM_STATUS.MAINTENANCE) {
    throw new Error('Không thể kích hoạt hợp đồng cho phòng đang bảo trì.');
  }

  // Kiểm tra trùng thời gian trước khi kích hoạt lại
  const existingContracts = getContracts();
  const { overlap, conflictWith } = hasOverlappingContract(contract, existingContracts);
  if (overlap) {
    throw new Error(
      `Hợp đồng trùng thời gian với hợp đồng ${conflictWith?.id} trên cùng phòng.`
    );
  }

  // Cập nhật hợp đồng
  const updated = StorageService.update(KEY, id, { status: CONTRACT_STATUS.ACTIVE });

  // Đồng bộ phòng → rented
  if (room && room.status !== ROOM_STATUS.RENTED) {
    updateRoomStatus(contract.roomId, ROOM_STATUS.RENTED);
  }

  return updated;
}

// ─── EXTEND ────────────────────────────────────────────────────

/**
 * Gia hạn hợp đồng bằng cách cập nhật ngày kết thúc mới.
 *
 * @param {string} id - ID hợp đồng.
 * @param {string} newEndDate - Ngày kết thúc mới (phải sau endDate hiện tại).
 * @returns {Object} Hợp đồng sau khi gia hạn.
 * @throws {Error}
 */
export function extendContract(id, newEndDate) {
  const contract = getContractById(id);
  if (!contract) {
    throw new Error('Hợp đồng không tồn tại.');
  }

  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    throw new Error('Không thể gia hạn hợp đồng đã thanh lý.');
  }

  if (!isValidDate(newEndDate)) {
    throw new Error('Ngày kết thúc mới không hợp lệ.');
  }

  const currentEnd = new Date(contract.endDate).getTime();
  const newEnd = new Date(newEndDate).getTime();

  if (newEnd <= currentEnd) {
    throw new Error('Ngày kết thúc mới phải sau ngày kết thúc hiện tại.');
  }

  // Kiểm tra trùng thời gian với khoảng mới
  const existingContracts = getContracts();
  const extendedContract = { ...contract, endDate: newEndDate };
  const { overlap, conflictWith } = hasOverlappingContract(extendedContract, existingContracts);
  if (overlap) {
    throw new Error(
      `Gia hạn gây trùng thời gian với hợp đồng ${conflictWith?.id} trên cùng phòng.`
    );
  }

  // Cập nhật hợp đồng: endDate mới + đảm bảo active
  const updated = StorageService.update(KEY, id, {
    endDate: newEndDate,
    status: CONTRACT_STATUS.ACTIVE,
  });

  // Đồng bộ phòng → rented
  const room = getRoomById(contract.roomId);
  if (room && room.status !== ROOM_STATUS.RENTED) {
    updateRoomStatus(contract.roomId, ROOM_STATUS.RENTED);
  }

  return updated;
}

// ─── END ───────────────────────────────────────────────────────

/**
 * Kết thúc hợp đồng trước hoặc đúng hạn.
 * Nếu phòng không còn hợp đồng active khác → chuyển phòng thành available.
 *
 * @param {string} id - ID hợp đồng.
 * @param {string} [actualEndDate] - Ngày kết thúc thực tế (mặc định = ngày hôm nay).
 * @returns {Object} Hợp đồng sau khi kết thúc.
 * @throws {Error}
 */
export function endContract(id, actualEndDate) {
  const contract = getContractById(id);
  if (!contract) {
    throw new Error('Hợp đồng không tồn tại.');
  }

  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    throw new Error('Hợp đồng đã được thanh lý.');
  }
  if (contract.status === CONTRACT_STATUS.EXPIRED) {
    throw new Error('Hợp đồng đã hết hạn.');
  }

  const endDate = actualEndDate || new Date().toISOString().split('T')[0];

  if (actualEndDate && !isValidDate(actualEndDate)) {
    throw new Error('Ngày kết thúc thực tế không hợp lệ.');
  }

  // Cập nhật hợp đồng → expired, ghi nhận endDate thực tế
  const updated = StorageService.update(KEY, id, {
    status: CONTRACT_STATUS.EXPIRED,
    endDate: endDate,
  });

  // Nếu phòng không còn HĐ active nào khác → available
  if (!roomHasOtherActiveContracts(contract.roomId, id)) {
    updateRoomStatus(contract.roomId, ROOM_STATUS.AVAILABLE);
  }

  return updated;
}

// ─── CANCEL / TERMINATE ────────────────────────────────────────

/**
 * Hủy / thanh lý hợp đồng.
 * Khác với endContract: đánh dấu 'terminated' thay vì 'expired'.
 * Nếu phòng không còn HĐ active → chuyển phòng thành available.
 *
 * @param {string} id - ID hợp đồng.
 * @returns {Object} Hợp đồng sau khi thanh lý.
 * @throws {Error}
 */
export function cancelContract(id) {
  const contract = getContractById(id);
  if (!contract) {
    throw new Error('Hợp đồng không tồn tại.');
  }

  if (contract.status === CONTRACT_STATUS.TERMINATED) {
    throw new Error('Hợp đồng đã được thanh lý trước đó.');
  }

  // Cập nhật → terminated
  const updated = StorageService.update(KEY, id, {
    status: CONTRACT_STATUS.TERMINATED,
  });

  // Đồng bộ phòng nếu không còn HĐ active
  if (!roomHasOtherActiveContracts(contract.roomId, id)) {
    updateRoomStatus(contract.roomId, ROOM_STATUS.AVAILABLE);
  }

  return updated;
}
