// src/pages/rooms/index.js

export function renderRoomsPage(container) {
  container.innerHTML = `
    <div data-testid="rooms-page">
      <h4>Quản lý phòng</h4>
      <p class="text-muted">Danh sách phòng trọ sẽ hiển thị ở đây.</p>
    </div>
  `;
}
