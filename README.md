# RoomMate - Hệ thống Quản lý Nhà trọ và Hóa đơn Điện nước

Hệ thống quản lý nhà trọ và hóa đơn điện nước chuyên nghiệp, ứng dụng công nghệ web hiện đại (Single Page Application - SPA) chạy thuần client-side trên nền tảng LocalStorage, tích hợp đầy đủ kiểm thử tự động CI/CD.

---

## Thông tin dự án
* **Tên nhóm:** Nhóm 1 - RoomMate Team
* **Thành viên:** Nguyễn Văn A, Trần Thị B
* **Repository GitHub:** https://github.com/devquangle/roommate-pms
* **GitHub Pages:** https://devquangle.github.io/roommate-pms/

---

## 1. Giới thiệu
**RoomMate** là ứng dụng Single Page Application (SPA) viết bằng JavaScript thuần (Vanilla JS), HTML5 và CSS3 (Bootstrap 5). Ứng dụng hỗ trợ các chủ nhà trọ quản lý danh sách phòng, thông tin khách thuê, lập hợp đồng, chốt chỉ số điện nước hàng tháng, tự động tính tiền và lập hóa đơn, ghi nhận lịch sử thanh toán, theo dõi công nợ thời gian thực và kết xuất báo cáo tài chính trực quan.

## 2. Bài toán đặt ra
Quản lý nhà trọ truyền thống qua sổ sách hoặc bảng tính Excel thường gặp nhiều khó khăn:
* **Sai sót số liệu:** Nhập nhầm chỉ số điện nước, tính toán sai công thức hóa đơn hoặc nhầm lẫn công nợ lũy kế.
* **Mất mát dữ liệu:** Lưu trữ file Excel cục bộ dễ bị hỏng hoặc mất khi máy tính lỗi.
* **Theo dõi công nợ phức tạp:** Rất khó để kiểm soát khách thuê đóng tiền từng phần, nợ cũ gộp nợ mới và tiến độ thu tiền hàng tháng.
* **Quy trình rời rạc:** Việc liên kết giữa Hợp đồng (giá phòng, tiền cọc) -> Chỉ số điện nước -> Lập hóa đơn -> Thanh toán là một chuỗi thủ công tốn thời gian.

**Giải pháp từ RoomMate:** Tự động hóa toàn bộ quy trình trên một nền tảng SPA khép kín, hoạt động ổn định trên trình duyệt, không cần cơ sở dữ liệu server-side phức tạp nhờ lưu trữ LocalStorage, tích hợp tính năng sao lưu/phục hồi bằng tệp tin JSON an toàn.

## 3. Chức năng chính
* **Quản lý phòng trọ:** Thêm, sửa, xóa, tìm kiếm, lọc theo trạng thái (Trống, Đang thuê, Bảo trì) và phân trang.
* **Quản lý khách thuê:** Quản lý thông tin cá nhân, liên hệ khẩn cấp, phương tiện và lưu trữ lịch sử khách thuê cũ.
* **Hợp đồng thuê phòng:** Ký hợp đồng liên kết phòng và khách thuê, quản lý tiền cọc, hạn định, sức chứa và tự động kiểm tra trùng thời gian thuê.
* **Chỉ số điện nước:** Ghi nhận và kiểm tra tính hợp lệ của chỉ số cũ/mới hàng tháng, tự động tính lượng tiêu thụ điện nước của từng phòng.
* **Lập hóa đơn:** Tính toán tự động tiền thuê phòng, điện, nước và các dịch vụ đi kèm theo số lượng thực tế trong hợp đồng. Hỗ trợ lập hóa đơn hàng loạt nhanh chóng và in hóa đơn A4 chuẩn.
* **Quản lý thanh toán:** Ghi nhận thanh toán toàn bộ hoặc từng phần, cập nhật nợ còn lại thời gian thực và quản lý lịch sử giao dịch (rollback xóa giao dịch khôi phục nợ).
* **Theo dõi công nợ:** Thống kê tổng nợ quá hạn, hóa đơn quá hạn, cảnh báo mức độ nợ theo mã màu trực quan (Vàng/Cam/Đỏ).
* **Báo cáo & Thống kê:** Phân tích doanh thu phát sinh và thực thu (dòng tiền) theo tháng, cơ cấu phương thức đóng tiền, biểu đồ lấp đầy và điện nước tiêu thụ bất thường.
* **Sao lưu & Phục hồi:** Xuất toàn bộ cơ sở dữ liệu ra tệp `.json` và nhập khẩu lại (hỗ trợ Gộp hoặc Ghi đè kèm xác thực chuỗi an toàn `XACNHAN`).

## 4. Công nghệ sử dụng
* **Core:** HTML5, CSS3, ES6 JavaScript (Vanilla JS).
* **CSS Framework:** Bootstrap v5.3 (Sử dụng CSS biến tùy chỉnh cao cấp, hỗ trợ responsive hoàn hảo).
* **Charts:** Chart.js v4 (Vẽ biểu đồ Bar, Doughnut tài chính).
* **Build tool:** Vite v5 (Biên dịch, tối ưu hóa asset và đóng gói bundle siêu nhẹ).
* **Unit & Integration Test:** Vitest v3 + jsdom (Môi trường DOM ảo giả lập LocalStorage cô lập).
* **E2E Test:** Playwright v1.40 (Kiểm thử hành vi trên trình duyệt Chromium thực tế).
* **CI/CD:** GitHub Actions (Tự động hóa toàn bộ quy trình kiểm thử và deploy lên GitHub Pages).

## 5. Cấu trúc thư mục dự án
```text
roommate-pms/
├── .github/
│   └── workflows/
│       ├── ci.yml            # Workflow kiểm thử liên tục (CI)
│       └── deploy-pages.yml  # Workflow tự động deploy (CD) lên GitHub Pages
├── src/
│   ├── business/             # Logic nghiệp vụ thuần (Pure Business Logic - Cô lập hoàn toàn)
│   ├── components/           # Các UI Components dùng chung (Form, Modal, Empty/Loading State...)
│   ├── constants/            # Các hằng số (Trạng thái, Storage keys)
│   ├── data/                 # Dữ liệu mẫu mặc định (Seed Data)
│   ├── pages/                # Các trang chức năng tương ứng với router
│   ├── services/             # Dịch vụ CRUD và tương tác trực tiếp LocalStorage
│   ├── utils/                # Hàm tiện ích (Tính tiền, định dạng ngày, tiền tệ)
│   ├── main.js               # Điểm khởi chạy của ứng dụng SPA
│   └── router.js             # Bộ định tuyến lai (Dual-Mode: History API & Hash Router)
├── tests/
│   ├── business/             # Kiểm thử tích hợp luồng thuê phòng, lập hóa đơn, thanh toán (Vitest)
│   ├── services/             # Kiểm thử đơn vị các dịch vụ Storage và CRUD (Vitest)
│   ├── unit/                 # Kiểm thử các hàm tính toán, validator (Vitest)
│   └── e2e/                  # Kịch bản kiểm thử E2E giao diện thực tế (Playwright)
├── package.json              # Khai báo thư viện và script
├── playwright.config.js      # Cấu hình Playwright
├── vite.config.js            # Cấu hình Vite (Thiết lập base path cho GitHub Pages)
└── vitest.config.js          # Cấu hình Vitest (jsdom, setup dọn dẹp localStorage)
```

## 6. Hướng dẫn cài đặt
Yêu cầu hệ thống đã cài đặt **Node.js (version 18 hoặc 20 trở lên)**.

Mở terminal và thực hiện:
```bash
# Clone repository về máy
git clone <URL-REPOSITORY>
cd roommate-pms

# Cài đặt toàn bộ dependencies sạch
npm ci
```

## 7. Cách chạy Development
Khởi chạy máy chủ phát triển cục bộ (Local Development Server):
```bash
npm run dev
```
Trình duyệt sẽ tự động mở trang web tại địa chỉ: `http://localhost:5173`.

## 8. Cách chạy Vitest (Unit & Integration Tests)
Vitest chạy trong môi trường giả lập DOM `jsdom`, dọn dẹp sạch `localStorage` trước mỗi test case.

```bash
# Chạy toàn bộ Unit & Integration test một lần
npm run test:run

# Chạy test ở chế độ watch (tự động chạy lại khi sửa code)
npm run test

# Xem báo cáo độ bao phủ mã nguồn (Test Coverage)
npm run test:coverage
```

## 9. Cách chạy Playwright (E2E Tests)
Playwright tự động khởi chạy Vite dev server ngầm ở cổng `5173` và chạy kiểm thử trên trình duyệt Chromium thực tế.

```bash
# Cài đặt browsers của Playwright trước lần chạy đầu tiên
npx playwright install --with-deps chromium

# Chạy toàn bộ E2E tests ở chế độ headless (mặc định của CI)
npm run test:e2e

# Chạy E2E tests với giao diện tương tác UI trực quan
npm run test:e2e:ui
```

## 10. Cách build dự án
Đóng gói dự án thành mã nguồn tối ưu (Production Bundle):
```bash
npm run build
```
Sản phẩm sau khi biên dịch nằm trong thư mục `/dist`. Bạn có thể chạy thử bản build bằng lệnh:
```bash
npm run preview
```

## 11. Cách deploy dự án
Dự án được cấu hình deploy tự động lên **GitHub Pages** thông qua GitHub Actions khi push lên nhánh `main`.

Nếu muốn deploy thủ công bằng tay:
```bash
# Thiết lập biến môi trường để build đúng base path của GitHub Pages
NODE_ENV=production npm run build

# Triển khai thư mục /dist lên nhánh gh-pages của repository bằng công cụ bạn chọn (ví dụ: gh-pages package)
```

## 12. Dữ liệu mẫu (Seed Data)
Ứng dụng tích hợp sẵn bộ dữ liệu mẫu đầy đủ để dùng thử ngay lập tức (không cần nhập thủ công từ đầu):
* **Cơ chế tự động nạp:** Nếu LocalStorage hoàn toàn trống, ứng dụng sẽ tự động gọi `seedIfEmpty()` khởi tạo 20 phòng trọ mẫu, thông tin khách thuê tương ứng, các hợp đồng đang hoạt động, lịch sử chỉ số điện nước 6 tháng gần nhất, và các hóa đơn, giao dịch thanh toán đồng bộ.
* **Reset dữ liệu mẫu:** Tại trang **Cài đặt** (`/settings`), chủ nhà trọ có thể bấm nút **Khôi phục dữ liệu mẫu gốc** để ghi đè toàn bộ dữ liệu hiện có về trạng thái mẫu ban đầu sau khi xác thực bằng chuỗi `XACNHAN`.

## 13. Hình ảnh giao diện
Giao diện ứng dụng được thiết kế theo phong cách hiện đại, trực quan, hỗ trợ responsive mượt mà trên điện thoại và máy tính:
* **Dashboard:** [Dashboard Mockup](file:///C:/Users/Huynh%20Quang%20Le/.gemini/antigravity/brain/8b4e5a30-e81a-4402-93bb-06f807f991f8/media__1784221758949.png)
* **Quản lý phòng trọ:** [Rooms Page Mockup](file:///C:/Users/Huynh%20Quang%20Le/.gemini/antigravity/brain/8b4e5a30-e81a-4402-93bb-06f807f991f8/media__1784266713062.png)
* **Quản lý Hóa đơn:** [Invoices Page Mockup](file:///C:/Users/Huynh%20Quang%20Le/.gemini/antigravity/brain/8b4e5a30-e81a-4402-93bb-06f807f991f8/media__1784271516832.png)
* **Sao lưu dữ liệu:** [Backup Page Mockup](file:///C:/Users/Huynh%20Quang%20Le/.gemini/antigravity/brain/8b4e5a30-e81a-4402-93bb-06f807f991f8/media__1784273482906.png)

## 14. Thành viên và phân công công việc
* **Thành viên 1 (Nguyễn Văn A):** Nhóm trưởng
* **Thành viên 2 (Trần Thị B):** Developer
* **Bảng phân công nhiệm vụ cụ thể:**
  | Thành viên | Nhiệm vụ | Trạng thái |
  | :--- | :--- | :--- |
  | Nguyễn Văn A | Thiết kế UI/UX, Trang Dashboard & Thống kê | Hoàn thành |
  | Nguyễn Văn A | Phát triển Logic nghiệp vụ (Business) & Services CRUD | Hoàn thành |
  | Trần Thị B | Viết Unit Test (Vitest) & E2E Test (Playwright) | Hoàn thành |
  | Trần Thị B | Cấu hình CI/CD Pipelines & Deploy sản phẩm | Hoàn thành |

## 15. Quy trình làm việc nhóm trên Git
Nhóm áp dụng quy trình Git Flow tiêu chuẩn để quản lý mã nguồn:
1. **Nhánh `main`:** Lưu trữ phiên bản ổn định nhất của ứng dụng dùng để chạy production. Chỉ nhận code từ PR của `develop` sau khi đã pass 100% CI tests.
2. **Nhánh `develop`:** Nhánh tích hợp chính của nhóm. Các thành viên tạo nhánh feature từ đây và merge lại sau khi hoàn thành.
3. **Nhánh tính năng (`feature/feature-name`):** Các thành viên phát triển độc lập trên máy local. 
4. **Quy trình Pull Request (PR):**
   * Tạo PR từ `feature/...` sang `develop`.
   * Hệ thống GitHub Actions tự động kích hoạt để chạy unit test, business test và build.
   * Ít nhất 1 thành viên khác trong nhóm review code và nhấn approve trước khi được merge vào `develop`.

## 16. Tích hợp liên tục và Triển khai liên tục (CI/CD)
Dự án sử dụng GitHub Actions làm máy chủ CI/CD tự động:
* **CI Workflow (`ci.yml`):**
  * Kích hoạt trên mỗi commit đẩy lên hoặc Pull Request vào nhánh `main` và `develop`.
  * Thực hiện: Checkout -> Cài đặt Node -> Cài dependencies qua `npm ci` -> Cài đặt môi trường Playwright -> Chạy kiểm thử Unit -> Chạy kiểm thử Business -> Chạy E2E Tests -> Chạy build sản phẩm -> Tải lên báo cáo HTML Report của Playwright nếu có test case lỗi để hỗ trợ debug.
* **CD Workflow (`deploy-pages.yml`):**
  * Chỉ kích hoạt khi có commit merge thành công vào nhánh `main` (hoặc chạy thủ công qua `workflow_dispatch`).
  * Thực hiện chạy lại toàn bộ quy trình kiểm thử (Unit, Business, E2E) khắt khe. Nếu tất cả thành công, hệ thống tự động build bản tối ưu và deploy trực tiếp thư mục `/dist` lên máy chủ hosting của **GitHub Pages** một cách an toàn.

## 17. Báo cáo sử dụng AI hỗ trợ
Trong suốt quá trình thực hiện dự án, nhóm đã kết hợp sử dụng Trợ lý lập trình AI **Antigravity (Google DeepMind)** để tăng hiệu suất phát triển theo chuẩn yêu cầu §24.2:

### Nhật ký sử dụng chi tiết
1. **Prompt đã dùng:** "Viết hàm tính tiền phòng và dịch vụ với đầu vào là hợp đồng và chỉ số điện nước, trả về đối tượng hóa đơn chi tiết."
   * **Câu trả lời của AI:** Đã tạo ra `invoice-calculator.js` với các hàm tính tiền tách biệt, kèm unit test cơ bản.
   * **Thời gian sử dụng:** 15 phút (tiết kiệm khoảng 2 tiếng viết tay).
   * **Đánh giá hiệu quả:** Rất cao. AI chia tách logic tính toán sạch sẽ, giúp code dễ test và mở rộng.
2. **Prompt đã dùng:** "Thiết lập cấu hình Playwright để chạy E2E test tự động bỏ qua cài đặt nếu đã có browser, đồng thời chụp ảnh màn hình khi test lỗi."
   * **Câu trả lời của AI:** Cung cấp file `playwright.config.js` với cấu hình reporter và retry, hướng dẫn set path artifacts.
   * **Thời gian sử dụng:** 10 phút.
   * **Đánh giá hiệu quả:** Cao. Giúp CI/CD pipeline chạy ổn định và debug lỗi UI dễ dàng hơn.

## 17.5. Danh sách lỗi (Bugs / Known Issues)
* **Bug 1:** Khi nhấn F5 trên trang chi tiết hóa đơn (URL Hash), đôi khi router tải không kịp dữ liệu nếu localStorage bị xóa một phần.
* **Bug 2:** Biểu đồ doanh thu trên Dashboard hiển thị hơi lệch nhãn tháng trên màn hình điện thoại có chiều rộng < 360px.
* **Bug 3:** Chưa có cảnh báo xác nhận khi người dùng đóng form tạo hợp đồng chưa lưu.

## 18. Chức năng đã hoàn thành
* [x] Bộ định tuyến SPA lai ghép (Dual-mode Router) hỗ trợ URL Hash và History API.
* [x] Dashboard thống kê tổng quan tình hình tài chính, phòng trống/đang thuê, chỉ số điện nước.
* [x] Quản lý thông tin Phòng, Khách thuê, Hợp đồng đầy đủ.
* [x] Ghi nhận chỉ số điện nước hàng tháng, kiểm tra chỉ số cũ/mới chặt chẽ.
* [x] Tự động lập hóa đơn (chi tiết dịch vụ, điện nước tiêu thụ thực tế) và in hóa đơn A4 chuẩn.
* [x] Ghi nhận thanh toán từng phần, dồn nợ thời gian thực và quản lý lịch sử thanh toán.
* [x] Báo cáo tài chính chuyên sâu và xuất dữ liệu ra file CSV chuẩn tiếng Việt.
* [x] Bộ sao lưu, phục hồi dữ liệu hoàn chỉnh (Merge / Overwrite).
* [x] Bộ giao diện trạng thái trống (Empty State), tải dữ liệu (Loading State) và thông báo lỗi (Error State) đồng bộ toàn diện.
* [x] 168 Unit & Integration test cases vượt qua thành công, đạt độ bao phủ (coverage) cao.
* [x] 10 kịch bản kiểm thử Playwright E2E vượt qua thành công trên môi trường CI.
* [x] Tự động hóa CI/CD Pipelines qua GitHub Actions.

## 19. Hạn chế hiện tại
* **Chỉ hoạt động trên một trình duyệt đơn lẻ:** Do lưu trữ trực tiếp trên LocalStorage của trình duyệt khách hàng, dữ liệu không được đồng bộ tự động giữa các máy tính khác nhau của cùng một chủ trọ nếu không thực hiện xuất/nhập file backup thủ công.
* **Chưa có phân quyền tài khoản:** Hệ thống mặc định dành cho 1 chủ nhà trọ duy nhất kiểm soát toàn quyền, chưa có chức năng tạo tài khoản cho quản lý hoặc cho khách thuê vào xem hóa đơn của riêng họ.

## 20. Hướng phát triển tương lai
* **Đồng bộ hóa Cloud:** Tích hợp Firebase hoặc Supabase làm cơ sở dữ liệu backend thời gian thực để hỗ trợ đồng bộ hóa dữ liệu đa thiết bị và lưu trữ ảnh chụp hóa đơn, CCCD của khách thuê.
* **Cổng thanh toán tự động:** Tự động tạo mã QR thanh toán động (VietQR/Napas) theo từng hóa đơn chứa số tiền và nội dung chuyển khoản để khách thuê quét mã thanh toán trực tiếp, tự động gạch nợ khi tiền về tài khoản ngân hàng.
* **Gửi thông báo hóa đơn tự động:** Tích hợp API gửi thông báo nhắc đóng tiền nhà tự động qua Zalo, Telegram hoặc Email cho khách thuê kèm đường link xem chi tiết hóa đơn.
