import { generateId, getCurrentISODate } from '../utils/index.js';
import { ROOM_STATUS } from '../constants/index.js';

export class RoomBusiness {
  constructor(roomRepository, contractRepository = null) {
    this.roomRepository = roomRepository;
    this.contractRepository = contractRepository;
  }

  getAllRooms() {
    return this.roomRepository.getAll();
  }

  getRoomById(id) {
    return this.roomRepository.getById(id);
  }

  createRoom(roomData) {
    this.validateRoomData(roomData);
    
    const existingRooms = this.roomRepository.getAll();
    if (existingRooms.some(r => r.name.trim().toLowerCase() === roomData.name.trim().toLowerCase())) {
      throw new Error('ROOM-01: Tên phòng đã tồn tại.');
    }

    const newRoom = {
      id: generateId('r-'),
      name: roomData.name.trim(),
      price: Number(roomData.price),
      area: Number(roomData.area) || 0,
      status: ROOM_STATUS.AVAILABLE,
      maxTenants: Number(roomData.maxTenants),
      description: roomData.description || '',
      createdAt: getCurrentISODate(),
      updatedAt: getCurrentISODate()
    };

    return this.roomRepository.insert(newRoom);
  }

  updateRoom(id, roomData) {
    const existingRoom = this.roomRepository.getById(id);
    if (!existingRoom) throw new Error('Phòng không tồn tại.');

    this.validateRoomData(roomData);

    const existingRooms = this.roomRepository.getAll();
    if (existingRooms.some(r => r.id !== id && r.name.trim().toLowerCase() === roomData.name.trim().toLowerCase())) {
      throw new Error('ROOM-01: Tên phòng đã tồn tại.');
    }

    const updatedData = {
      name: roomData.name.trim(),
      price: Number(roomData.price),
      area: Number(roomData.area) || 0,
      maxTenants: Number(roomData.maxTenants),
      description: roomData.description || '',
      updatedAt: getCurrentISODate()
    };

    return this.roomRepository.update(id, updatedData);
  }

  deleteRoom(id) {
    const existingRoom = this.roomRepository.getById(id);
    if (!existingRoom) throw new Error('Phòng không tồn tại.');

    if (existingRoom.status !== ROOM_STATUS.AVAILABLE) {
       throw new Error('ROOM-03: Không thể xóa phòng đang không ở trạng thái trống.');
    }

    if (this.contractRepository) {
      const contracts = this.contractRepository.getAll();
      const hasActiveContract = contracts.some(c => c.roomId === id && c.status === 'active');
      if (hasActiveContract) {
         throw new Error('ROOM-03: Không thể xóa phòng đang có hợp đồng hiệu lực.');
      }
    }

    return this.roomRepository.remove(id);
  }

  validateRoomData(roomData) {
    if (!roomData.name || roomData.name.trim() === '') {
      throw new Error('ROOM-01: Tên phòng không được để trống.');
    }
    if (isNaN(roomData.price) || Number(roomData.price) <= 0) {
      throw new Error('ROOM-02: Giá phòng phải lớn hơn 0.');
    }
    if (isNaN(roomData.maxTenants) || Number(roomData.maxTenants) < 1) {
      throw new Error('ROOM-05: Sức chứa tối đa của phòng phải lớn hơn hoặc bằng 1.');
    }
  }
}
