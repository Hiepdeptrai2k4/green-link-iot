# Frontend - Giao diện Web Application

Frontend là ứng dụng Single Page Application (SPA), giúp người dùng (User) và quản trị viên (Admin) tương tác với hệ thống. Nó được bảo mật thông qua luồng Đăng nhập (Auth Flow) sử dụng JWT.

## 1. Tính năng theo phân quyền (Role-based UI)
- **Role User:**
  - Có trang đăng ký / đăng nhập riêng.
  - Sau khi đăng nhập vào Dashboard, chỉ nhìn thấy danh sách các Vườn (`Garden`) mà họ đã tạo.
  - Có thể Thêm/Sửa/Xóa (CRUD) Vườn cho tài khoản của mình bằng ID thiết bị ESP32.
  - Xem thông số thời gian thực và nhấn nút bật tắt thiết bị thông qua WebSockets.
- **Role Admin:**
  - Không thể tự đăng ký tự do (Hoặc đăng ký xong phải set DB thành `admin`).
  - Có bảng Admin Dashboard hiển thị danh sách tất cả người dùng và tất cả các Garden trên toàn mạng lưới hệ thống.

## 2. Quản lý Authentication (JWT Flow)
- Token trả về từ API Login (JWT Access Token) được lưu trữ an toàn trong **LocalStorage** (hoặc Cookies nếu dự án chặt hơn về SSR/XSS).
- Sử dụng *Axios Interceptors*: Mọi API gọi đi tự động attach header `Authorization: Bearer <token>` từ LocalStorage.
- Nếu token hết hạn (mã lỗi 401), Frontend tự động clear LocalStorage và redirect người dùng về trang `/login` (Đăng xuất).

## 3. Kiến trúc Giao diện & Routing
Sử dụng **React Router DOM** kết hợp **Private Routing**:
```text
/login                 - Trang đăng nhập
/register              - Trang đăng ký thành viên
/                      - (Private) Trang chọn Garden hoặc hiển thị tổng quan tài khoản
/garden/:id            - (Private) Bảng điều khiển (Control Panel) của 1 vườn cụ thể
/admin                 - (Private + Admin Only) Dashboard dành cho Quản trị viên
```

## 4. Bảng điều khiển Real-time (IoT Workspace)
Khi người dùng truy cập vào trang `/garden/GARDEN_123`:
1. **Lấy lịch sử ngay lập tức:** Dùng Axios fetch data cũ (vd 100 dòng trạng thái thời tiết mới nhất) để vẽ Chart (Thư viện Chart.js / Recharts).
2. **Mở kết nối WebSockets:** Khởi tạo `socket = io("ws://backend-url", { auth: { token: "JWT" } })`.
3. **Cập nhật giao diện (Uplink):** 
   - Lắng nghe event `web_update_data`. Khi có dữ liệu mới, State/Chart sẽ tự động re-render append dòng dữ liệu này vào cuối bảng.
4. **Trạng thái kết nối (Status):**
   - Đèn LED nhỏ xíu góc phải màn hình hiển thị: Xanh lá (`Online`) - ESP32 đang bật nguồn và kết nối vs Backend, Đỏ (`Offline`) - Thiết bị đã mất kết nối.
5. **Điều khiển trực tiếp (Downlink):**
   - Giao diện gồm các nút Toggle/Button (Ví dụ: "Bơm Nước", "Mở Quạt").
   - Nhấn nút -> `socket.emit('web_control_device', { action: 'pump_on' })` -> Nút trên UI chuyển sang trạng thái "Đang xử lý...". Khi server confirm thì nút bật xanh.
