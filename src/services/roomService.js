import { Repository } from '../data/repository.js';
import { RoomBusiness } from '../business/roomBusiness.js';
import { LOCAL_STORAGE_KEYS } from '../constants/index.js';

const roomRepository = new Repository(LOCAL_STORAGE_KEYS.ROOMS);
const contractRepository = new Repository(LOCAL_STORAGE_KEYS.CONTRACTS);
const roomBusiness = new RoomBusiness(roomRepository, contractRepository);

export const RoomService = {
  getAllRooms: () => roomBusiness.getAllRooms(),
  getRoomById: (id) => roomBusiness.getRoomById(id),
  createRoom: (data) => roomBusiness.createRoom(data),
  updateRoom: (id, data) => roomBusiness.updateRoom(id, data),
  deleteRoom: (id) => roomBusiness.deleteRoom(id),
};
