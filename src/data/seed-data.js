// src/data/seed-data.js

/**
 * Dữ liệu mẫu cho hệ thống RoomMate PMS.
 * Tất cả ID liên kết chéo giữa các collection đều nhất quán.
 *
 * Trạng thái tổng quan:
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │ Phòng (10)     : 7 đang thuê, 2 trống, 1 bảo trì              │
 *   │ Người thuê (15): 15 người (một số chưa có hợp đồng)            │
 *   │ Hợp đồng (8)   : 6 active, 1 active sắp hết hạn, 1 expired    │
 *   │ Chỉ số (21)    : 3 tháng (05, 06, 07/2026) × 7 phòng thuê     │
 *   │ Dịch vụ (6)    : điện, nước, wifi, rác, giữ xe, bảo vệ        │
 *   │ Hóa đơn (10)   : 4 paid, 1 partial, 3 unpaid, 2 overdue       │
 *   │ Thanh toán (8)  : liên kết đúng với hóa đơn                    │
 *   └──────────────────────────────────────────────────────────────────┘
 *
 * Phòng – Hợp đồng – Người thuê mapping:
 *   r-001 (P.101)  ↔  c-001  ↔  t-001 (Nguyễn Văn An)     active
 *   r-002 (P.102)  ↔  c-002  ↔  t-002 (Trần Thị Bình)     active
 *   r-003 (P.201)  ↔  c-003  ↔  t-004 (Phạm Thị Dung)     active
 *   r-004 (P.202)  ↔  c-004  ↔  t-006 (Võ Thị Hoa)        active
 *   r-005 (P.203)  ↔  c-005  ↔  t-008 (Bùi Thị Hạnh)      active sắp hết hạn
 *   r-006 (P.301)  ↔  c-006  ↔  t-010 (Mai Văn Khánh)      expired → phòng trống
 *   r-007 (P.302)  ↔  c-007  ↔  t-011 (Phan Thị Lan)       active
 *   r-008 (P.303)  ↔  c-008  ↔  t-013 (Lý Thị Ngọc)        active
 *   r-009 (P.304)  ↔  —      ↔  —                           maintenance
 *   r-010 (P.401)  ↔  —      ↔  —                           available
 */

// ─── PHÒNG (10) ────────────────────────────────────────────────

export const SEED_ROOMS = [
  // 7 phòng đang thuê (rented)
  {
    id: "P101",
    name: "Phòng 101",
    floor: "Tầng 1",
    type: "standard",
    price: 3000000,
    area: 20,
    status: "rented",
    maxTenants: 2,
    description: "Phòng tầng 1, có ban công",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "P102",
    name: "Phòng 102",
    floor: "Tầng 1",
    type: "deluxe",
    price: 3500000,
    area: 25,
    status: "rented",
    maxTenants: 3,
    description: "Phòng tầng 1, rộng rãi",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "P201",
    name: "Phòng 201",
    floor: "Tầng 2",
    type: "suite",
    price: 4000000,
    area: 30,
    status: "rented",
    maxTenants: 3,
    description: "Phòng tầng 2, góc thoáng mát",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "P202",
    name: "Phòng 202",
    floor: "Tầng 2",
    type: "standard",
    price: 3200000,
    area: 22,
    status: "rented",
    maxTenants: 2,
    description: "Phòng tầng 2, tiêu chuẩn",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "P203",
    name: "Phòng 203",
    floor: "Tầng 2",
    type: "deluxe",
    price: 3800000,
    area: 28,
    status: "rented",
    maxTenants: 3,
    description: "Phòng tầng 2, HĐ sắp hết hạn",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2025-08-01T00:00:00.000Z",
  },
  {
    id: "P302",
    name: "Phòng 302",
    floor: "Tầng 3",
    type: "suite",
    price: 4500000,
    area: 35,
    status: "rented",
    maxTenants: 4,
    description: "Phòng tầng 3, rộng nhất",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "P303",
    name: "Phòng 303",
    floor: "Tầng 3",
    type: "standard",
    price: 3000000,
    area: 20,
    status: "rented",
    maxTenants: 2,
    description: "Phòng tầng 3, tiêu chuẩn",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },

  // 2 phòng trống (available)
  {
    id: "P301",
    name: "Phòng 301",
    floor: "Tầng 3",
    type: "standard",
    price: 2800000,
    area: 18,
    status: "available",
    maxTenants: 2,
    description: "Phòng tầng 3, HĐ cũ đã hết hạn",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "P401",
    name: "Phòng 401",
    floor: "Tầng 4",
    type: "studio",
    price: 2500000,
    area: 16,
    status: "available",
    maxTenants: 1,
    description: "Phòng tầng 4, nhỏ gọn",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2025-12-01T00:00:00.000Z",
  },

  // 1 phòng bảo trì (maintenance)
  {
    id: "P304",
    name: "Phòng 304",
    floor: "Tầng 3",
    type: "deluxe",
    price: 3500000,
    area: 25,
    status: "maintenance",
    maxTenants: 3,
    description: "Phòng tầng 3, đang sửa chữa",
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-06-15T00:00:00.000Z",
  },
  // --- Thêm 10 phòng mới ---
  {
    id: "P402", name: "Phòng 402", floor: "Tầng 4", type: "standard", price: 2800000, area: 18, status: "available", maxTenants: 2, description: "Phòng mới trống", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P403", name: "Phòng 403", floor: "Tầng 4", type: "deluxe", price: 3500000, area: 25, status: "available", maxTenants: 3, description: "Gần thang máy", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P501", name: "Phòng 501", floor: "Tầng 5", type: "suite", price: 4200000, area: 32, status: "rented", maxTenants: 4, description: "Tầng cao thoáng", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P502", name: "Phòng 502", floor: "Tầng 5", type: "standard", price: 3000000, area: 20, status: "available", maxTenants: 2, description: "", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P503", name: "Phòng 503", floor: "Tầng 5", type: "studio", price: 2700000, area: 17, status: "maintenance", maxTenants: 2, description: "Bảo trì sơn tường", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "P601", name: "Phòng 601", floor: "Tầng 6", type: "deluxe", price: 3700000, area: 26, status: "available", maxTenants: 3, description: "", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P602", name: "Phòng 602", floor: "Tầng 6", type: "standard", price: 3100000, area: 21, status: "available", maxTenants: 2, description: "", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P701", name: "Phòng 701", floor: "Tầng 7", type: "suite", price: 5000000, area: 40, status: "available", maxTenants: 4, description: "Phòng penthouse mini", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P702", name: "Phòng 702", floor: "Tầng 7", type: "deluxe", price: 3900000, area: 28, status: "rented", maxTenants: 3, description: "", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "P703", name: "Phòng 703", floor: "Tầng 7", type: "standard", price: 3200000, area: 22, status: "available", maxTenants: 2, description: "", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
];

// ─── NGƯỜI THUÊ (15) ───────────────────────────────────────────
// Chỉ dùng key `fullName`, KHÔNG dùng `name`

export const SEED_TENANTS = [
  {
    id: "t-001",
    fullName: "Nguyễn Văn An",
    phone: "0901000001",
    idCard: "079200001001",
    email: "an.nv@gmail.com",
    address: "Quận 1, TP.HCM",
    dob: "1995-05-15",
    gender: "Nam",
    occupation: "Kỹ sư phần mềm",
    licensePlate: "59X1-12345",
    vehicleType: "Xe máy AirBlade",
    emergencyName: "Nguyễn Văn Bảo",
    emergencyPhone: "0902000001",
    emergencyRelation: "Bố",
    notes: "Khách quen, thanh toán đúng hạn.",
    createdAt: "2025-12-15T00:00:00.000Z",
    updatedAt: "2025-12-15T00:00:00.000Z",
  },
  {
    id: "t-002",
    fullName: "Trần Thị Bình",
    phone: "0901000002",
    idCard: "079200001002",
    email: "binh.tt@gmail.com",
    address: "Quận 3, TP.HCM",
    dob: "1998-08-20",
    gender: "Nữ",
    occupation: "Kế toán",
    licensePlate: "59Y1-98765",
    vehicleType: "Xe máy Vision",
    emergencyName: "Trần Văn Cường",
    emergencyPhone: "0902000002",
    emergencyRelation: "Anh trai",
    notes: "",
    createdAt: "2025-12-15T00:00:00.000Z",
    updatedAt: "2025-12-15T00:00:00.000Z",
  },
  {
    id: "t-003",
    fullName: "Lê Văn Cường",
    phone: "0901000003",
    idCard: "079200001003",
    email: "cuong.lv@gmail.com",
    address: "Quận 5, TP.HCM",
    dob: "2000-11-10",
    gender: "Nam",
    occupation: "Sinh viên",
    licensePlate: "59Z1-11223",
    vehicleType: "Xe máy Wave",
    emergencyName: "Lê Thị Dung",
    emergencyPhone: "0902000003",
    emergencyRelation: "Mẹ",
    notes: "Hay về trễ do đi làm thêm.",
    createdAt: "2025-12-20T00:00:00.000Z",
    updatedAt: "2025-12-20T00:00:00.000Z",
  },
  {
    id: "t-004",
    fullName: "Phạm Thị Dung",
    phone: "0901000004",
    idCard: "079200001004",
    email: "dung.pt@gmail.com",
    address: "Quận 7, TP.HCM",
    dob: "1999-02-28",
    gender: "Nữ",
    occupation: "Giáo viên",
    licensePlate: "59A1-44556",
    vehicleType: "Xe máy Lead",
    emergencyName: "Phạm Văn Đông",
    emergencyPhone: "0902000004",
    emergencyRelation: "Bố",
    notes: "",
    createdAt: "2025-12-20T00:00:00.000Z",
    updatedAt: "2025-12-20T00:00:00.000Z",
  },
  {
    id: "t-005",
    fullName: "Hoàng Minh Đức",
    phone: "0901000005",
    idCard: "079200001005",
    email: "duc.hm@gmail.com",
    address: "Quận Bình Thạnh",
    dob: "1996-07-15",
    gender: "Nam",
    occupation: "Thiết kế đồ họa",
    licensePlate: "",
    vehicleType: "",
    emergencyName: "Hoàng Thị Êm",
    emergencyPhone: "0902000005",
    emergencyRelation: "Chị gái",
    notes: "Không có xe máy.",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "t-006",
    fullName: "Võ Thị Hoa",
    phone: "0901000006",
    idCard: "079200001006",
    email: "hoa.vt@gmail.com",
    address: "Quận Gò Vấp",
    dob: "1997-09-05",
    gender: "Nữ",
    occupation: "Nhân viên ngân hàng",
    licensePlate: "59B1-77889",
    vehicleType: "Xe máy SH Mode",
    emergencyName: "Võ Văn Giáp",
    emergencyPhone: "0902000006",
    emergencyRelation: "Bố",
    notes: "",
    createdAt: "2026-01-05T00:00:00.000Z",
    updatedAt: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "t-007",
    fullName: "Đặng Văn Giang",
    phone: "0901000007",
    idCard: "079200001007",
    email: "giang.dv@gmail.com",
    address: "Quận Tân Bình",
    dob: "1994-04-12",
    gender: "Nam",
    occupation: "Kỹ thuật viên",
    licensePlate: "59C1-99000",
    vehicleType: "Xe máy Exciter",
    emergencyName: "Đặng Thị Hải",
    emergencyPhone: "0902000007",
    emergencyRelation: "Mẹ",
    notes: "",
    createdAt: "2026-01-10T00:00:00.000Z",
    updatedAt: "2026-01-10T00:00:00.000Z",
  },
  {
    id: "t-008",
    fullName: "Bùi Thị Hạnh",
    phone: "0901000008",
    idCard: "079200001008",
    email: "hanh.bt@gmail.com",
    address: "Quận Phú Nhuận",
    dob: "1995-12-01",
    gender: "Nữ",
    occupation: "Content Creator",
    licensePlate: "59D1-22334",
    vehicleType: "Xe máy Vespa",
    emergencyName: "Bùi Văn Ích",
    emergencyPhone: "0902000008",
    emergencyRelation: "Bố",
    notes: "",
    createdAt: "2025-07-15T00:00:00.000Z",
    updatedAt: "2025-07-15T00:00:00.000Z",
  },
  {
    id: "t-009",
    fullName: "Ngô Quốc Hùng",
    phone: "0901000009",
    idCard: "079200001009",
    email: "hung.nq@gmail.com",
    address: "Quận 10, TP.HCM",
    dob: "1990-03-10",
    gender: "Nam",
    occupation: "Kinh doanh tự do",
    licensePlate: "59E1-55667",
    vehicleType: "Ô tô Kia Morning",
    emergencyName: "Ngô Thị Kim",
    emergencyPhone: "0902000009",
    emergencyRelation: "Vợ",
    notes: "Đậu ô tô ở bãi ngoài.",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "t-010",
    fullName: "Mai Văn Khánh",
    phone: "0901000010",
    idCard: "079200001010",
    email: "khanh.mv@gmail.com",
    address: "Quận 12, TP.HCM",
    dob: "1998-06-25",
    gender: "Nam",
    occupation: "IT Support",
    licensePlate: "59F1-88990",
    vehicleType: "Xe máy Sirius",
    emergencyName: "Mai Thị Liên",
    emergencyPhone: "0902000010",
    emergencyRelation: "Mẹ",
    notes: "Đã trả phòng.",
    createdAt: "2024-12-20T00:00:00.000Z",
    updatedAt: "2024-12-20T00:00:00.000Z",
  },
  {
    id: "t-011",
    fullName: "Phan Thị Lan",
    phone: "0901000011",
    idCard: "079200001011",
    email: "lan.pt@gmail.com",
    address: "Quận Thủ Đức",
    dob: "2001-01-15",
    gender: "Nữ",
    occupation: "Sinh viên",
    licensePlate: "59G1-11222",
    vehicleType: "Xe máy Vision",
    emergencyName: "Phan Văn Minh",
    emergencyPhone: "0902000011",
    emergencyRelation: "Bố",
    notes: "",
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
  {
    id: "t-012",
    fullName: "Trương Công Minh",
    phone: "0901000012",
    idCard: "079200001012",
    email: "minh.tc@gmail.com",
    address: "Quận 9, TP.HCM",
    dob: "1992-10-30",
    gender: "Nam",
    occupation: "Kỹ sư xây dựng",
    licensePlate: "59H1-33445",
    vehicleType: "Xe máy AirBlade",
    emergencyName: "Trương Thị Nga",
    emergencyPhone: "0902000012",
    emergencyRelation: "Vợ",
    notes: "Hay đi công tác.",
    createdAt: "2026-03-15T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
  {
    id: "t-013",
    fullName: "Lý Thị Ngọc",
    phone: "0901000013",
    idCard: "079200001013",
    email: "ngoc.lt@gmail.com",
    address: "Quận 2, TP.HCM",
    dob: "1995-04-05",
    gender: "Nữ",
    occupation: "Nhân viên Marketing",
    licensePlate: "59K1-66778",
    vehicleType: "Xe máy Grande",
    emergencyName: "Lý Văn Oanh",
    emergencyPhone: "0902000013",
    emergencyRelation: "Bố",
    notes: "",
    createdAt: "2026-04-20T00:00:00.000Z",
    updatedAt: "2026-04-20T00:00:00.000Z",
  },
  {
    id: "t-014",
    fullName: "Huỳnh Văn Phong",
    phone: "0901000014",
    idCard: "079200001014",
    email: "phong.hv@gmail.com",
    address: "Quận 4, TP.HCM",
    dob: "1993-08-18",
    gender: "Nam",
    occupation: "Lập trình viên",
    licensePlate: "59L1-99001",
    vehicleType: "Xe máy NVX",
    emergencyName: "Huỳnh Thị Quyên",
    emergencyPhone: "0902000014",
    emergencyRelation: "Mẹ",
    notes: "",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "t-015",
    fullName: "Đinh Thị Quỳnh",
    phone: "0901000015",
    idCard: "079200001015",
    email: "quynh.dt@gmail.com",
    address: "Quận 6, TP.HCM",
    dob: "1999-11-22",
    gender: "Nữ",
    occupation: "Nhân viên Sale",
    licensePlate: "59M1-22334",
    vehicleType: "Xe máy Lead",
    emergencyName: "Đinh Văn Rô",
    emergencyPhone: "0902000015",
    emergencyRelation: "Anh trai",
    notes: "",
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
  },
  // --- Thêm 20 người thuê mới ---
  {
    id: "t-016", fullName: "Nguyễn Văn Thái", phone: "0901000016", idCard: "079200001016", email: "thai.nv@gmail.com", address: "Hà Nội", dob: "1997-03-12", gender: "Nam", occupation: "Marketing", licensePlate: "29A1-12345", vehicleType: "Xe máy", emergencyName: "Nguyễn Văn Nam", emergencyPhone: "0902000016", emergencyRelation: "Bố", notes: "", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "t-017", fullName: "Trần Mai Phương", phone: "0901000017", idCard: "079200001017", email: "phuong.tm@gmail.com", address: "Đà Nẵng", dob: "1999-11-20", gender: "Nữ", occupation: "Nhà báo", licensePlate: "43A1-54321", vehicleType: "Xe máy", emergencyName: "Trần Văn Đông", emergencyPhone: "0902000017", emergencyRelation: "Anh trai", notes: "Hay công tác", createdAt: "2026-06-05T00:00:00.000Z", updatedAt: "2026-06-05T00:00:00.000Z",
  },
  {
    id: "t-018", fullName: "Lê Hoàng Phúc", phone: "0901000018", idCard: "079200001018", email: "phuc.lh@gmail.com", address: "Cần Thơ", dob: "2000-05-14", gender: "Nam", occupation: "Sinh viên", licensePlate: "65B1-99887", vehicleType: "Xe số", emergencyName: "Lê Thị Thảo", emergencyPhone: "0902000018", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-06-10T00:00:00.000Z", updatedAt: "2026-06-10T00:00:00.000Z",
  },
  {
    id: "t-019", fullName: "Phạm Tấn Trường", phone: "0901000019", idCard: "079200001019", email: "truong.pt@gmail.com", address: "Đồng Nai", dob: "1996-08-08", gender: "Nam", occupation: "Kỹ sư", licensePlate: "60C1-22334", vehicleType: "Tay ga", emergencyName: "Phạm Văn Minh", emergencyPhone: "0902000019", emergencyRelation: "Bố", notes: "", createdAt: "2026-06-12T00:00:00.000Z", updatedAt: "2026-06-12T00:00:00.000Z",
  },
  {
    id: "t-020", fullName: "Hoàng Ngân Giang", phone: "0901000020", idCard: "079200001020", email: "giang.hn@gmail.com", address: "Bình Dương", dob: "2002-01-22", gender: "Nữ", occupation: "Thu ngân", licensePlate: "61D1-44556", vehicleType: "Xe điện", emergencyName: "Hoàng Văn Tuấn", emergencyPhone: "0902000020", emergencyRelation: "Bố", notes: "", createdAt: "2026-06-15T00:00:00.000Z", updatedAt: "2026-06-15T00:00:00.000Z",
  },
  {
    id: "t-021", fullName: "Võ Quang Vinh", phone: "0901000021", idCard: "079200001021", email: "vinh.vq@gmail.com", address: "Vũng Tàu", dob: "1995-10-10", gender: "Nam", occupation: "Nhân viên kinh doanh", licensePlate: "72E1-66778", vehicleType: "Honda Airblade", emergencyName: "Võ Thị Yến", emergencyPhone: "0902000021", emergencyRelation: "Chị gái", notes: "", createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z",
  },
  {
    id: "t-022", fullName: "Đặng Mỹ Linh", phone: "0901000022", idCard: "079200001022", email: "linh.dm@gmail.com", address: "Hải Phòng", dob: "1998-12-05", gender: "Nữ", occupation: "Giáo viên mầm non", licensePlate: "15F1-88990", vehicleType: "Yamaha Grande", emergencyName: "Đặng Văn Tiến", emergencyPhone: "0902000022", emergencyRelation: "Bố", notes: "", createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z",
  },
  {
    id: "t-023", fullName: "Bùi Quốc Anh", phone: "0901000023", idCard: "079200001023", email: "anh.bq@gmail.com", address: "TP.HCM", dob: "1994-07-30", gender: "Nam", occupation: "Designer", licensePlate: "59G1-11222", vehicleType: "Vespa", emergencyName: "Bùi Thị Tuyết", emergencyPhone: "0902000023", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-06-22T00:00:00.000Z", updatedAt: "2026-06-22T00:00:00.000Z",
  },
  {
    id: "t-024", fullName: "Ngô Ánh Tuyết", phone: "0901000024", idCard: "079200001024", email: "tuyet.na@gmail.com", address: "Đà Lạt", dob: "1999-04-18", gender: "Nữ", occupation: "Lễ tân", licensePlate: "49H1-33444", vehicleType: "Honda Vision", emergencyName: "Ngô Văn Hùng", emergencyPhone: "0902000024", emergencyRelation: "Bố", notes: "", createdAt: "2026-06-25T00:00:00.000Z", updatedAt: "2026-06-25T00:00:00.000Z",
  },
  {
    id: "t-025", fullName: "Mai Trường Giang", phone: "0901000025", idCard: "079200001025", email: "giang.mt@gmail.com", address: "Tây Ninh", dob: "2001-09-09", gender: "Nam", occupation: "Kỹ thuật viên IT", licensePlate: "70K1-55666", vehicleType: "Yamaha Exciter", emergencyName: "Mai Thị Hạnh", emergencyPhone: "0902000025", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-06-28T00:00:00.000Z", updatedAt: "2026-06-28T00:00:00.000Z",
  },
  {
    id: "t-026", fullName: "Phan Đình Phùng", phone: "0901000026", idCard: "079200001026", email: "phung.pd@gmail.com", address: "Bình Phước", dob: "1993-02-14", gender: "Nam", occupation: "Lái xe", licensePlate: "93L1-77888", vehicleType: "Honda Winner", emergencyName: "Phan Văn Chinh", emergencyPhone: "0902000026", emergencyRelation: "Anh trai", notes: "Trả phòng cuối tháng", createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "t-027", fullName: "Trương Tiểu Mẫn", phone: "0901000027", idCard: "079200001027", email: "man.tt@gmail.com", address: "Long An", dob: "1997-08-25", gender: "Nữ", occupation: "Freelancer", licensePlate: "62M1-99000", vehicleType: "Honda Lead", emergencyName: "Trương Văn Khải", emergencyPhone: "0902000027", emergencyRelation: "Bố", notes: "", createdAt: "2026-07-05T00:00:00.000Z", updatedAt: "2026-07-05T00:00:00.000Z",
  },
  {
    id: "t-028", fullName: "Lý Thế Anh", phone: "0901000028", idCard: "079200001028", email: "anh.lt@gmail.com", address: "Bến Tre", dob: "1995-06-11", gender: "Nam", occupation: "Sale", licensePlate: "71N1-11222", vehicleType: "Yamaha Sirius", emergencyName: "Lý Thị Quyên", emergencyPhone: "0902000028", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-07-08T00:00:00.000Z", updatedAt: "2026-07-08T00:00:00.000Z",
  },
  {
    id: "t-029", fullName: "Huỳnh Tú My", phone: "0901000029", idCard: "079200001029", email: "my.ht@gmail.com", address: "Vĩnh Long", dob: "2000-12-30", gender: "Nữ", occupation: "Dược sĩ", licensePlate: "64P1-33444", vehicleType: "Honda SH Mode", emergencyName: "Huỳnh Văn Tài", emergencyPhone: "0902000029", emergencyRelation: "Bố", notes: "", createdAt: "2026-07-10T00:00:00.000Z", updatedAt: "2026-07-10T00:00:00.000Z",
  },
  {
    id: "t-030", fullName: "Đinh Nhật Tuấn", phone: "0901000030", idCard: "079200001030", email: "tuan.dn@gmail.com", address: "Cà Mau", dob: "1998-05-19", gender: "Nam", occupation: "Nhân viên bưu điện", licensePlate: "69Q1-55666", vehicleType: "Honda Wave Alpha", emergencyName: "Đinh Thị Hoa", emergencyPhone: "0902000030", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-07-12T00:00:00.000Z", updatedAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "t-031", fullName: "Vũ Hải Đăng", phone: "0901000031", idCard: "079200001031", email: "dang.vh@gmail.com", address: "Kiên Giang", dob: "1996-02-28", gender: "Nam", occupation: "Kiến trúc sư", licensePlate: "68R1-77888", vehicleType: "Yamaha NVX", emergencyName: "Vũ Văn Lộc", emergencyPhone: "0902000031", emergencyRelation: "Bố", notes: "", createdAt: "2026-07-14T00:00:00.000Z", updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "t-032", fullName: "Bạch Thu Thủy", phone: "0901000032", idCard: "079200001032", email: "thuy.bt@gmail.com", address: "Bạc Liêu", dob: "1999-10-15", gender: "Nữ", occupation: "Kế toán viên", licensePlate: "94S1-99000", vehicleType: "Honda Vision", emergencyName: "Bạch Văn Tâm", emergencyPhone: "0902000032", emergencyRelation: "Bố", notes: "", createdAt: "2026-07-15T00:00:00.000Z", updatedAt: "2026-07-15T00:00:00.000Z",
  },
  {
    id: "t-033", fullName: "Cao Hữu Đạt", phone: "0901000033", idCard: "079200001033", email: "dat.ch@gmail.com", address: "Sóc Trăng", dob: "1994-01-05", gender: "Nam", occupation: "Quản lý cửa hàng", licensePlate: "83T1-11222", vehicleType: "Honda PCX", emergencyName: "Cao Thị Mừng", emergencyPhone: "0902000033", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  },
  {
    id: "t-034", fullName: "Tạ Thị Kiều", phone: "0901000034", idCard: "079200001034", email: "kieu.tt@gmail.com", address: "Trà Vinh", dob: "2001-07-22", gender: "Nữ", occupation: "Sinh viên", licensePlate: "84U1-33444", vehicleType: "Yamaha Janus", emergencyName: "Tạ Văn Cường", emergencyPhone: "0902000034", emergencyRelation: "Bố", notes: "", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  },
  {
    id: "t-035", fullName: "Chu Trọng Đạo", phone: "0901000035", idCard: "079200001035", email: "dao.ct@gmail.com", address: "Tiền Giang", dob: "1992-04-10", gender: "Nam", occupation: "Thầu xây dựng", licensePlate: "63V1-55666", vehicleType: "Honda SH 150i", emergencyName: "Chu Thị Bé", emergencyPhone: "0902000035", emergencyRelation: "Mẹ", notes: "", createdAt: "2026-07-16T00:00:00.000Z", updatedAt: "2026-07-16T00:00:00.000Z",
  },
];

// ─── HỢP ĐỒNG (8) ─────────────────────────────────────────────

export const SEED_CONTRACTS = [
  // 6 active (hiệu lực dài hạn)
  {
    id: "c-001",
    roomId: "P101",
    tenantId: "t-001",
    coTenantIds: ["t-003", "t-005"],
    startDate: "2026-01-01",
    endDate: "2027-01-01",
    deposit: 3000000,
    roomPrice: 3000000,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "c-002",
    roomId: "P102",
    tenantId: "t-002",
    coTenantIds: ["t-007"],
    startDate: "2026-02-01",
    endDate: "2027-02-01",
    deposit: 3500000,
    roomPrice: 3500000,
    status: "active",
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "c-003",
    roomId: "P201",
    tenantId: "t-004",
    startDate: "2026-03-01",
    endDate: "2027-03-01",
    deposit: 4000000,
    roomPrice: 4000000,
    status: "active",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-01T00:00:00.000Z",
  },
  {
    id: "c-004",
    roomId: "P202",
    tenantId: "t-006",
    startDate: "2026-01-15",
    endDate: "2027-01-15",
    deposit: 3200000,
    roomPrice: 3200000,
    status: "active",
    createdAt: "2026-01-15T00:00:00.000Z",
    updatedAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "c-007",
    roomId: "P302",
    tenantId: "t-011",
    startDate: "2026-04-01",
    endDate: "2027-04-01",
    deposit: 4500000,
    roomPrice: 4500000,
    status: "active",
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
  },
  {
    id: "c-008",
    roomId: "P303",
    tenantId: "t-013",
    startDate: "2026-05-01",
    endDate: "2027-05-01",
    deposit: 3000000,
    roomPrice: 3000000,
    status: "active",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
  },

  // 1 active nhưng sắp hết hạn (endDate 2026-08-01 → còn < 30 ngày)
  {
    id: "c-005",
    roomId: "P203",
    tenantId: "t-008",
    startDate: "2025-08-01",
    endDate: "2026-08-01",
    deposit: 3800000,
    roomPrice: 3800000,
    status: "active",
    createdAt: "2025-08-01T00:00:00.000Z",
    updatedAt: "2025-08-01T00:00:00.000Z",
  },

  // 1 expired (r-006 giờ available)
  {
    id: "c-006",
    roomId: "P301",
    tenantId: "t-010",
    startDate: "2025-01-01",
    endDate: "2026-01-01",
    deposit: 2800000,
    roomPrice: 2800000,
    status: "expired",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  // Thêm hợp đồng cho 2 phòng thuê mới
  {
    id: "c-009", roomId: "P501", tenantId: "t-016", coTenantIds: ["t-017"], startDate: "2026-06-01", endDate: "2027-06-01", deposit: 4200000, roomPrice: 4200000, status: "active", createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "c-010", roomId: "P702", tenantId: "t-021", coTenantIds: [], startDate: "2026-06-18", endDate: "2027-06-18", deposit: 3900000, roomPrice: 3900000, status: "active", createdAt: "2026-06-18T00:00:00.000Z", updatedAt: "2026-06-18T00:00:00.000Z"
  },
  {
    id: "c-011", roomId: "P401", tenantId: "t-016", coTenantIds: [], startDate: "2025-05-01", endDate: "2026-05-01", deposit: 2500000, roomPrice: 2500000, status: "expired", createdAt: "2025-05-01T00:00:00.000Z", updatedAt: "2026-05-01T00:00:00.000Z"
  }
];

// ─── DỊCH VỤ (6) ───────────────────────────────────────────────

export const SEED_SERVICE_CONFIGS = [
  {
    id: "s-001",
    type: "electricity",
    name: "Tiền điện",
    unitPrice: 3500,
    unit: "kWh",
    isPerPerson: false,
    isPerRoom: false,
    createdAt: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "s-002",
    type: "water",
    name: "Tiền nước",
    unitPrice: 20000,
    unit: "m³",
    isPerPerson: false,
    isPerRoom: false,
    createdAt: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "s-003",
    type: "wifi",
    name: "Internet/WiFi",
    unitPrice: 100000,
    unit: "phòng",
    isPerPerson: false,
    isPerRoom: true,
    createdAt: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "s-004",
    type: "garbage",
    name: "Rác",
    unitPrice: 30000,
    unit: "phòng",
    isPerPerson: false,
    isPerRoom: true,
    createdAt: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "s-005",
    type: "other",
    name: "Giữ xe máy",
    unitPrice: 100000,
    unit: "người",
    isPerPerson: true,
    isPerRoom: false,
    createdAt: "2025-12-01T00:00:00.000Z",
  },
  {
    id: "s-006",
    type: "other",
    name: "Bảo vệ",
    unitPrice: 50000,
    unit: "phòng",
    isPerPerson: false,
    isPerRoom: true,
    createdAt: "2025-12-01T00:00:00.000Z",
  },
];

// ─── CHỈ SỐ ĐIỆN NƯỚC (3 tháng × 7 phòng = 21 bản ghi) ───────
// Tháng 5, 6, 7/2026 cho 7 phòng đang thuê (r-001..r-005, r-007, r-008)

export const SEED_METER_READINGS = [
  // ── Tháng 5/2026 ──
  {
    id: "m-001",
    roomId: "P101",
    month: 5,
    year: 2026,
    electricityOld: 1000,
    electricityNew: 1120,
    waterOld: 50,
    waterNew: 56,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-002",
    roomId: "P102",
    month: 5,
    year: 2026,
    electricityOld: 2000,
    electricityNew: 2150,
    waterOld: 80,
    waterNew: 88,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-003",
    roomId: "P201",
    month: 5,
    year: 2026,
    electricityOld: 3000,
    electricityNew: 3200,
    waterOld: 100,
    waterNew: 110,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-004",
    roomId: "P202",
    month: 5,
    year: 2026,
    electricityOld: 500,
    electricityNew: 600,
    waterOld: 30,
    waterNew: 35,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-005",
    roomId: "P203",
    month: 5,
    year: 2026,
    electricityOld: 1500,
    electricityNew: 1650,
    waterOld: 60,
    waterNew: 67,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-006",
    roomId: "P302",
    month: 5,
    year: 2026,
    electricityOld: 800,
    electricityNew: 980,
    waterOld: 40,
    waterNew: 48,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "m-007",
    roomId: "P303",
    month: 5,
    year: 2026,
    electricityOld: 400,
    electricityNew: 510,
    waterOld: 20,
    waterNew: 25,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },

  // ── Tháng 6/2026 ──
  {
    id: "m-008",
    roomId: "P101",
    month: 6,
    year: 2026,
    electricityOld: 1120,
    electricityNew: 1250,
    waterOld: 56,
    waterNew: 63,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "m-009",
    roomId: "P102",
    month: 6,
    year: 2026,
    electricityOld: 2150,
    electricityNew: 2310,
    waterOld: 88,
    waterNew: 96,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "m-010",
    roomId: "P201",
    month: 6,
    year: 2026,
    electricityOld: 3200,
    electricityNew: 3380,
    waterOld: 110,
    waterNew: 118,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "m-011",
    roomId: "P202",
    month: 6,
    year: 2026,
    electricityOld: 600,
    electricityNew: 720,
    waterOld: 35,
    waterNew: 41,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "m-012",
    roomId: "P203",
    month: 6,
    year: 2026,
    electricityOld: 1650,
    electricityNew: 1800,
    waterOld: 67,
    waterNew: 74,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "m-013",
    roomId: "P302",
    month: 6,
    year: 2026,
    electricityOld: 980,
    electricityNew: 1150,
    waterOld: 48,
    waterNew: 56,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "m-014",
    roomId: "P303",
    month: 6,
    year: 2026,
    electricityOld: 510,
    electricityNew: 630,
    waterOld: 25,
    waterNew: 31,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },

  // ── Tháng 7/2026 ──
  {
    id: "m-015",
    roomId: "P101",
    month: 7,
    year: 2026,
    electricityOld: 1250,
    electricityNew: 1390,
    waterOld: 63,
    waterNew: 70,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "m-016",
    roomId: "P102",
    month: 7,
    year: 2026,
    electricityOld: 2310,
    electricityNew: 2480,
    waterOld: 96,
    waterNew: 105,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "m-017",
    roomId: "P201",
    month: 7,
    year: 2026,
    electricityOld: 3380,
    electricityNew: 3570,
    waterOld: 118,
    waterNew: 127,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "m-018",
    roomId: "P202",
    month: 7,
    year: 2026,
    electricityOld: 720,
    electricityNew: 830,
    waterOld: 41,
    waterNew: 47,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "m-019",
    roomId: "P203",
    month: 7,
    year: 2026,
    electricityOld: 1800,
    electricityNew: 1960,
    waterOld: 74,
    waterNew: 82,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "m-020",
    roomId: "P302",
    month: 7,
    year: 2026,
    electricityOld: 1150,
    electricityNew: 1340,
    waterOld: 56,
    waterNew: 65,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "m-021",
    roomId: "P303",
    month: 7,
    year: 2026,
    electricityOld: 630,
    electricityNew: 750,
    waterOld: 31,
    waterNew: 37,
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  { id: "m-022", roomId: "P501", month: 6, year: 2026, electricityOld: 100, electricityNew: 150, waterOld: 10, waterNew: 15, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
  { id: "m-023", roomId: "P702", month: 6, year: 2026, electricityOld: 200, electricityNew: 240, waterOld: 20, waterNew: 24, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z" },
  { id: "m-024", roomId: "P401", month: 5, year: 2026, electricityOld: 300, electricityNew: 350, waterOld: 30, waterNew: 35, createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-01T00:00:00.000Z" },
];

// ─── HÓA ĐƠN (10) ─────────────────────────────────────────────
// Đơn giá snapshot: Điện = 3,500/kWh · Nước = 20,000/m³
// otherServicesFee = WiFi(100k) + Rác(30k) + Bảo vệ(50k) = 180,000

export const SEED_INVOICES = [
  // ── Tháng 5/2026 – 3 hóa đơn ĐÃ THANH TOÁN (paid) ──
  {
    id: "i-001",
    roomId: "P101",
    month: 5,
    year: 2026,
    roomFee: 3000000,
    electricityFee: 420000, // 120 kWh × 3,500
    waterFee: 120000, // 6 m³ × 20,000
    otherServicesFee: 180000,
    totalAmount: 3720000,
    status: "paid",
    dueDate: "2026-06-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 120, price: 3500, total: 420000 },
      { name: "Tiền nước", usage: 6, price: 20000, total: 120000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-05T00:00:00.000Z",
  },
  {
    id: "i-002",
    roomId: "P102",
    month: 5,
    year: 2026,
    roomFee: 3500000,
    electricityFee: 525000, // 150 × 3,500
    waterFee: 160000, // 8 × 20,000
    otherServicesFee: 180000,
    totalAmount: 4365000,
    status: "paid",
    dueDate: "2026-06-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 150, price: 3500, total: 525000 },
      { name: "Tiền nước", usage: 8, price: 20000, total: 160000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
  },
  {
    id: "i-003",
    roomId: "P201",
    month: 5,
    year: 2026,
    roomFee: 4000000,
    electricityFee: 700000, // 200 × 3,500
    waterFee: 200000, // 10 × 20,000
    otherServicesFee: 180000,
    totalAmount: 5080000,
    status: "paid",
    dueDate: "2026-06-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 200, price: 3500, total: 700000 },
      { name: "Tiền nước", usage: 10, price: 20000, total: 200000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
  },

  // ── Tháng 6/2026 – đa dạng trạng thái ──
  {
    id: "i-004",
    roomId: "P101",
    month: 6,
    year: 2026,
    roomFee: 3000000,
    electricityFee: 455000, // 130 × 3,500
    waterFee: 140000, // 7 × 20,000
    otherServicesFee: 180000,
    totalAmount: 3775000,
    status: "paid", // ĐÃ THANH TOÁN
    dueDate: "2026-07-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 130, price: 3500, total: 455000 },
      { name: "Tiền nước", usage: 7, price: 20000, total: 140000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
  },
  {
    id: "i-005",
    roomId: "P102",
    month: 6,
    year: 2026,
    roomFee: 3500000,
    electricityFee: 560000, // 160 × 3,500
    waterFee: 160000, // 8 × 20,000
    otherServicesFee: 180000,
    totalAmount: 4400000,
    status: "partial", // THANH TOÁN MỘT PHẦN (đã trả 2,500,000 / 4,400,000)
    dueDate: "2026-07-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 160, price: 3500, total: 560000 },
      { name: "Tiền nước", usage: 8, price: 20000, total: 160000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "i-006",
    roomId: "P201",
    month: 6,
    year: 2026,
    roomFee: 4000000,
    electricityFee: 630000, // 180 × 3,500
    waterFee: 160000, // 8 × 20,000
    otherServicesFee: 180000,
    totalAmount: 4970000,
    status: "unpaid", // QUÁ HẠN – dueDate đã qua, chưa trả đồng nào
    dueDate: "2026-07-01",
    serviceDetails: [
      { name: "Tiền điện", usage: 180, price: 3500, total: 630000 },
      { name: "Tiền nước", usage: 8, price: 20000, total: 160000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "i-007",
    roomId: "P202",
    month: 6,
    year: 2026,
    roomFee: 3200000,
    electricityFee: 420000, // 120 × 3,500
    waterFee: 120000, // 6 × 20,000
    otherServicesFee: 180000,
    totalAmount: 3920000,
    status: "paid", // ĐÃ THANH TOÁN
    dueDate: "2026-07-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 120, price: 3500, total: 420000 },
      { name: "Tiền nước", usage: 6, price: 20000, total: 120000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
  },
  {
    id: "i-009",
    roomId: "P203",
    month: 6,
    year: 2026,
    roomFee: 3800000,
    electricityFee: 525000, // 150 × 3,500
    waterFee: 140000, // 7 × 20,000
    otherServicesFee: 180000,
    totalAmount: 4645000,
    status: "unpaid", // QUÁ HẠN – dueDate đã qua
    dueDate: "2026-07-01",
    serviceDetails: [
      { name: "Tiền điện", usage: 150, price: 3500, total: 525000 },
      { name: "Tiền nước", usage: 7, price: 20000, total: 140000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "i-010",
    roomId: "P302",
    month: 6,
    year: 2026,
    roomFee: 4500000,
    electricityFee: 595000, // 170 × 3,500
    waterFee: 160000, // 8 × 20,000
    otherServicesFee: 180000,
    totalAmount: 5435000,
    status: "paid", // ĐÃ THANH TOÁN
    dueDate: "2026-07-15",
    serviceDetails: [
      { name: "Tiền điện", usage: 170, price: 3500, total: 595000 },
      { name: "Tiền nước", usage: 8, price: 20000, total: 160000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-04T00:00:00.000Z",
  },

  // ── Tháng 7/2026 – mới tạo, CHƯA THANH TOÁN ──
  {
    id: "i-008",
    roomId: "P101",
    month: 7,
    year: 2026,
    roomFee: 3000000,
    electricityFee: 490000, // 140 × 3,500
    waterFee: 140000, // 7 × 20,000
    otherServicesFee: 180000,
    totalAmount: 3810000,
    status: "unpaid", // CHƯA THANH TOÁN (chưa quá hạn)
    dueDate: "2026-07-31",
    serviceDetails: [
      { name: "Tiền điện", usage: 140, price: 3500, total: 490000 },
      { name: "Tiền nước", usage: 7, price: 20000, total: 140000 },
      { name: "Internet/WiFi", usage: 1, price: 100000, total: 100000 },
      { name: "Rác", usage: 1, price: 30000, total: 30000 },
      { name: "Bảo vệ", usage: 1, price: 50000, total: 50000 },
    ],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "i-011", roomId: "P501", month: 6, year: 2026, roomFee: 4200000, electricityFee: 175000, waterFee: 100000, otherServicesFee: 280000, totalAmount: 4755000, status: "paid", dueDate: "2026-07-15", paidAmount: 4755000, remainingDebt: 0,
    serviceDetails: [{ name: "Tiền điện", usage: 50, price: 3500, total: 175000 }, { name: "Tiền nước", usage: 5, price: 20000, total: 100000 }], createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-05T00:00:00.000Z"
  },
  {
    id: "i-012", roomId: "P702", month: 6, year: 2026, roomFee: 3900000, electricityFee: 140000, waterFee: 80000, otherServicesFee: 180000, totalAmount: 4300000, status: "partial", dueDate: "2026-07-15", paidAmount: 2000000, remainingDebt: 2300000,
    serviceDetails: [{ name: "Tiền điện", usage: 40, price: 3500, total: 140000 }, { name: "Tiền nước", usage: 4, price: 20000, total: 80000 }], createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-10T00:00:00.000Z"
  },
  {
    id: "i-013", roomId: "P401", month: 5, year: 2026, roomFee: 2500000, electricityFee: 175000, waterFee: 100000, otherServicesFee: 180000, totalAmount: 2955000, status: "paid", dueDate: "2026-06-15", paidAmount: 2955000, remainingDebt: 0,
    serviceDetails: [{ name: "Tiền điện", usage: 50, price: 3500, total: 175000 }, { name: "Tiền nước", usage: 5, price: 20000, total: 100000 }], createdAt: "2026-06-01T00:00:00.000Z", updatedAt: "2026-06-05T00:00:00.000Z"
  }
];

// ─── THANH TOÁN (8) ────────────────────────────────────────────

export const SEED_PAYMENTS = [
  // Tháng 5 – thanh toán đủ cho 3 hóa đơn
  {
    id: "p-001",
    invoiceId: "i-001",
    amount: 3720000,
    date: "2026-06-05",
    method: "transfer",
    note: "CK tháng 5 – P.101",
    createdAt: "2026-06-05T00:00:00.000Z",
  },
  {
    id: "p-002",
    invoiceId: "i-002",
    amount: 4365000,
    date: "2026-06-04",
    method: "cash",
    note: "Thu tiền mặt T5 – P.102",
    createdAt: "2026-06-04T00:00:00.000Z",
  },
  {
    id: "p-003",
    invoiceId: "i-003",
    amount: 5080000,
    date: "2026-06-06",
    method: "transfer",
    note: "CK tháng 5 – P.201",
    createdAt: "2026-06-06T00:00:00.000Z",
  },

  // Tháng 6 – đa dạng
  {
    id: "p-004",
    invoiceId: "i-004",
    amount: 3775000,
    date: "2026-07-05",
    method: "cash",
    note: "Tiền mặt T6 – P.101",
    createdAt: "2026-07-05T00:00:00.000Z",
  },
  {
    id: "p-005",
    invoiceId: "i-005",
    amount: 2000000,
    date: "2026-07-08",
    method: "transfer",
    note: "Trả trước T6 – P.102",
    createdAt: "2026-07-08T00:00:00.000Z",
  },
  {
    id: "p-006",
    invoiceId: "i-005",
    amount: 500000,
    date: "2026-07-12",
    method: "cash",
    note: "Trả thêm T6 – P.102",
    createdAt: "2026-07-12T00:00:00.000Z",
  },
  {
    id: "p-007",
    invoiceId: "i-007",
    amount: 3920000,
    date: "2026-07-03",
    method: "transfer",
    note: "CK tháng 6 – P.202",
    createdAt: "2026-07-03T00:00:00.000Z",
  },
  {
    id: "p-008",
    invoiceId: "i-010",
    amount: 5435000,
    date: "2026-07-04",
    method: "transfer",
    note: "CK tháng 6 – P.302",
    createdAt: "2026-07-04T00:00:00.000Z",
  },
  {
    id: "p-009", invoiceId: "i-011", amount: 4755000, date: "2026-07-05", method: "transfer", note: "Thanh toán T6 - P501", createdAt: "2026-07-05T00:00:00.000Z"
  },
  {
    id: "p-010", invoiceId: "i-012", amount: 2000000, date: "2026-07-10", method: "cash", note: "Trá góp T6 - P702", createdAt: "2026-07-10T00:00:00.000Z"
  },
  {
    id: "p-011", invoiceId: "i-013", amount: 2955000, date: "2026-06-05", method: "transfer", note: "Thanh toán T5 - P401", createdAt: "2026-06-05T00:00:00.000Z"
  }
];

// ─── CÀI ĐẶT ─────────────────────────────────────────────────

export const SEED_APP_SETTINGS = {
  appName: "RoomMate PMS",
  ownerName: "Trần Văn Chủ",
  ownerPhone: "0988111222",
  ownerBankInfo: "Vietcombank - 1234567890 - TRAN VAN CHU",
};
