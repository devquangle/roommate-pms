import { RoomService } from '../../services/roomService.js';
import { formatMoney } from '../../utils/index.js';
import { ROOM_STATUS } from '../../constants/index.js';

export function renderRoomsPage(container) {
  container.innerHTML = `
    <div class="rooms-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2>Quản lý phòng</h2>
      <button class="btn btn-primary" id="btn-add-room">+ Thêm phòng</button>
    </div>
    
    <div id="room-alert" style="color: var(--danger); margin-bottom: 10px; font-weight: 500;"></div>

    <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Tên phòng</th>
            <th>Giá thuê</th>
            <th>Sức chứa</th>
            <th>Trạng thái</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody id="rooms-tbody">
        </tbody>
      </table>
    </div>
  `;

  loadRoomsTable();

  document.getElementById('btn-add-room').addEventListener('click', () => {
    const name = prompt('Nhập tên phòng:');
    if (!name) return;
    const price = prompt('Nhập giá phòng (VNĐ):');
    if (!price) return;
    const maxTenants = prompt('Nhập sức chứa tối đa (số người):');
    if (!maxTenants) return;

    try {
      RoomService.createRoom({
        name,
        price: Number(price),
        maxTenants: Number(maxTenants)
      });
      loadRoomsTable();
      document.getElementById('room-alert').innerText = '';
    } catch (error) {
      document.getElementById('room-alert').innerText = error.message;
    }
  });
}

function loadRoomsTable() {
  const tbody = document.getElementById('rooms-tbody');
  if (!tbody) return;

  const rooms = RoomService.getAllRooms();
  if (rooms.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted)">Chưa có dữ liệu phòng</td></tr>';
    return;
  }

  tbody.innerHTML = rooms.map(room => {
    let badgeClass = 'badge-success';
    let statusText = 'Trống';
    if (room.status === ROOM_STATUS.RENTED) {
      badgeClass = 'badge-warning';
      statusText = 'Đang thuê';
    } else if (room.status === ROOM_STATUS.MAINTENANCE) {
      badgeClass = 'badge-danger';
      statusText = 'Bảo trì';
    }

    return `
      <tr>
        <td><strong>${room.name}</strong></td>
        <td>${formatMoney(room.price)}</td>
        <td>${room.maxTenants} người</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td>
          <button class="btn btn-delete-room" data-id="${room.id}" style="color: var(--danger); background: none; border: none; cursor: pointer; text-decoration: underline;">Xóa</button>
        </td>
      </tr>
    `;
  }).join('');

  document.querySelectorAll('.btn-delete-room').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Bạn có chắc chắn muốn xóa phòng này?')) {
        try {
          RoomService.deleteRoom(id);
          loadRoomsTable();
          document.getElementById('room-alert').innerText = '';
        } catch (error) {
          document.getElementById('room-alert').innerText = error.message;
        }
      }
    });
  });
}
