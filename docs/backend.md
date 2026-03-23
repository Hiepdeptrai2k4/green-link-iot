# Backend - Hệ thống máy chủ APIs & WebSockets

Backend đóng vai trò kiểm soát truy cập (Auth), cung cấp API quản lý danh sách mô hình (Multi-Garden), và nhận/truyền tải dữ liệu thời gian thực giữa Web và thiết bị ESP32 (IoT).

## 1. Công nghệ sử dụng
- **Runtime / Framework:** Node.js với ExpressJS (REST API) & Socket.io (Realtime).
- **Database:** MongoDB (Dễ dàng lưu cấu trúc dạng JSON cho dữ liệu cảm biến và User).
- **Bảo mật:**
  - `bcrypt`: Mã hóa mật khẩu một chiều trước khi lưu vào CSDL.
  - `jsonwebtoken` (JWT): Token để xác thực người dùng trên mỗi request.

## 2. Thiết kế Cơ Sở Dữ Liệu (Database Schema)

1. **User Schema:**
   - `_id`, `username`, `email`, `password` (hashed).
   - `role`: `Enum['admin', 'user']`.
     - *Admin:* Quản lý toàn hệ thống, xem tất cả vườn.
     - *User:* Quản lý khu vườn cá nhân.
   - `created_at`.
2. **Garden Schema:**
   - `garden_id`: UID duy nhất, sẽ map với ID của mạch ESP32 phía dưới phần cứng.
   - `user_id`: Reference tới User sở hữu cái vườn này.
   - `name`: Tên khu vườn (ví dụ: "Vườn hoa hồng ban công").
   - `status`: `Enum['online', 'offline']` (xác định qua Websocket connection status).
3. **SensorData Schema:**
   - `garden_id`, `temperature`, `soil_moisture`, `light_lux`, `timestamp`.

## 3. Tính năng cốt lõi

### 3.1. Authentication & User Management
- **POST /api/auth/register:** Băm password bằng bcrypt (`saltRounds=10`), lưu User mới. Mặc định role là `user`.
- **POST /api/auth/login:** Kiểm tra email/password. Trả về `accessToken` (JWT) lưu lại thông tin `{ userId, role }`.
- **Middleware `verifyToken`:** Chặn các API cần bảo mật. Token được gửi trong `Authorization: Bearer <token>`.
- **Middleware `isAdmin`:** Chỉ cấp phép truy cập cho user có quyền Admin gọi các API như danh sách tài khoản, vườn của người khác.

### 3.2. Multi-Garden CRUD
- **POST /api/gardens:** User thêm một vườn bằng cách gõ `Garden_ID` (Device ID) và đặt Tên. Backend gán Garden_ID này với `user_id` hiện tại.
- **GET /api/gardens/:id:** Lấy chi tiết thông tin và lịch sử cảm biến của 1 vườn thuộc sở hữu User.
- **PUT /api/gardens/:id:** User đổi tên vườn.
- **DELETE /api/gardens/:id:** User xóa liên kết vườn khỏi tài khoản.
- *Admin API:* `GET /api/admin/gardens` (Lấy toàn bộ vườn trong hệ thống để quản trị).

### 3.3. Real-time Monitoring & Control (Socket.io)
**Xử lý kết nối (Web & ESP32 đều connect vào Socket):**
- Khi ESP32 kết nối -> Đăng ký Room theo `Garden_ID`.
- Khi Web Client kết nối -> Bắt buộc gửi JWT qua query hoặc header để xác thực quyền. Tham gia vào Room theo `Garden_ID` của vườn đang view.

**Uplink (Nhận dữ liệu Cảm biến):**
- `socket.on('esp_sensor_data')`: Nhận dữ liệu nhiệt độ, độ ẩm... từ ESP32.
- Lưu trữ vào vào DB (SensorData Model).
- Forward dữ liệu sang Web: `io.to(Garden_ID).emit('web_update_data', payload)`.

**Downlink (Truyền Lệnh Điều Khiển):**
- `socket.on('web_control_device')`: Web truyền lệnh (VD: bật bơm).
- Server Validate người dùng có quyền quản lý cái vườn đó không.
- Gửi lệnh xuống đúng mạch: `io.to(Garden_ID).emit('esp_execute_command', action)`.

**Connection Status (Online/Offline):**
- `socket.on('disconnect')`: Nếu kết nối bị rớt xuất phát từ ESP32, cập nhật `status: 'offline'` trong database cho Garden_ID đó và báo tới Web. Mới connect thì cập nhật `'online'`.
