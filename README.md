# Green Link IOT - Hệ thống vườn thông minh

Dự án IoT kết nối và điều khiển khu vườn thông minh, ứng dụng các công nghệ hiện đại ở cả 3 phần: Frontend (React/Vue), Backend (Node.js) và Hardware (ESP32).

## 🛠️ System Architecture & Requirements

Dự án được phát triển với các yêu cầu cốt lõi như sau:

1. **User Management & Authentication (Auth):**
   - Phân quyền theo Role: `Admin` (giám sát toàn hệ thống) và `User` (quản lý vườn cá nhân).
   - Đăng ký, Đăng nhập, Đăng xuất sử dụng **JWT (JSON Web Token)**.
   - Bảo mật mật khẩu bằng thuật toán **bcrypt** (Hashed Password). Lưu trữ phiên bằng LocalStorage ở Client.
2. **Multi-Garden Management (Core Logic):**
   - Một người dùng có thể sở hữu nhiều tổ hợp khu vườn (Nhiều mạch ESP32).
   - Định danh mạch cứng bằng `Garden_ID` duy nhất.
   - Hỗ trợ thao tác CRUD đầy đủ: Thêm mới, Sửa tên, Xóa vườn. 
3. **Real-time Monitoring & Control (IoT):**
   - Sự giao tiếp giữa Web và Mạch ESP32 đều sử dụng **WebSockets (Socket.io)** với độ trễ thấp nhất.
   - **Downlink:** Điều khiển các Rơ-le bơm/quạt ngay lập tức từ giao diện web thông suốt qua Server.
   - **Uplink:** Truyền tín hiệu nhiệt độ, độ ẩm liên tục, cập nhật Dashboard thời gian thực mà không cần tải lại trang.
   - Trạng thái trực tiếp **Online/Offline** của từng khu vườn.
4. **Hardware Requirements (Firmware ESP32):**
   - Hỗ trợ đa cảm biến: Nhiệt ẩm (`DHT11`), Cường độ sáng (`BH1750`), Cảm biến độ ẩm đất.
   - Giao diện trực tiếp tại vườn hiển thị thông qua **LCD 1602 (I2C)**.
   - Tự động hóa nội tại kết hợp cơ chế **Fail-safe**: Tự động tưới tiêu theo logic được nạp sẵn khi mất kết nối mạng (WiFi rớt hoặc tắt Server).

## 📂 Tổ chức mã nguồn

```text
Green Link IOT/
├── frontend/    # Mã nguồn Single Page Application (SPA), Fetch API, WebSocket client...
├── backend/     # Máy chủ REST API, kết nối DB MongoDB, Auth logic, WebSockets Server...
├── hardware/    # Mã firmware C++, quản lý LCD, Sensor, Fail-safe logic trên ESP32...
├── docs/        # Chứa tài liệu chi tiết cho Developer:
│   ├── frontend.md
│   ├── backend.md
│   └── hardware.md
└── README.md
```

*Vui lòng xem các file `.md` trong thư mục `docs/` để nắm rõ luồng công nghệ từng bộ phận.*
