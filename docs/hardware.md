# Hardware - Firmware ESP32

Phần cứng chịu trách nhiệm thu thập dữ liệu bằng cảm biến và điều khiển các thiết bị chấp hành, duy trì kết nối WebSocket liên tục với Backend Server.

## 1. Yêu cầu thiết bị

- **Vi điều khiển:** ESP32 (Hỗ trợ WiFi, đa luồng FreeRTOS nếu cần).
- **Cảm biến (Sensors):**
  - Nhiệt độ & Độ ẩm không khí: **DHT11**.
  - Độ ẩm đất: Cảm biến độ ẩm đất (Analog).
  - Cảm biến ánh sáng: **BH1750** (I2C) đo cường độ sáng (Lux).
- **Hiển thị tại chỗ (Local Display):** Màn hình **LCD 1602** giao tiếp qua I2C.
- **Thiết bị điều khiển (Actuators):** Relay điều khiển Bơm nước, Quạt, Đèn.

## 2. Các chức năng chính (Core logic)

### 2.1. Giao tiếp Real-time (WebSocket)
ESP32 sử dụng thư viện Socket.io-client (hoặc WebSocketsClient) để kết nối trực tiếp đến Node.js Server.
- Mỗi bảng mạch sẽ có một mã định danh cứng `Garden_ID` (sử dụng MAC Address của ESP32 hoặc nạp tĩnh tùy cấu hình).
- **Uplink:** Đọc dữ liệu từ DHT11, Soil, BH1750 mỗi X giây -> Đóng gói chuỗi JSON -> Gửi qua WebSocket (emit sự kiện `sensor_data`).
- **Downlink:** Lắng nghe sự kiện `control_device` từ Server để bật/tắt Relay ngay lập tức.
- **Heartbeat:** Gửi tín hiệu Keep-Alive định kỳ để Server cập nhật trạng thái Online/Offline.

### 2.2. Cơ chế Fail-safe (Chạy độc lập khi rớt mạng)
Trong trường hợp mất kết nối WiFi hoặc Server sập, ESP32 phải tự động chuyển sang chế độ Local Auto (Tự động cục bộ):
- Nếu độ ẩm đất < ngưỡng cài đặt (ví dụ 30%) -> Tự động bật bơm nước trong Y giây rồi tắt.
- Nếu nhiệt độ > ngưỡng giới hạn (ví dụ 35°C) -> Tự động bật quạt.
- Nếu ánh sáng < ngưỡng cho phép -> Bật đèn.
*(Ngưỡng cài đặt này có thể được đồng bộ và lưu trong EEPROM để ESP32 ghi nhớ mỗi khi khởi động lại).*

### 2.3. Hiển thị LCD 1602
LCD 1602 sử dụng bus I2C (chung với BH1750), tiết kiệm chân trên ESP32.
- **Dòng 1:** Trạng thái WiFi (`Wifi: OK` / `Wifi: Err`), và Trạng thái Server (`Srv: OK` / `Srv: Err`).
- **Dòng 2:** Cuộn thông tin nhiệt độ, độ ẩm, và cường độ sáng.

## 3. Cấu trúc mã nguồn đề xuất (PlatformIO / Arduino IDE)

```cpp
src/
├── main.cpp          // Init WiFi, WebSocket, Setup routine & Loop
├── sensors.h         // Logic khởi tạo và đọc DHT11, BH1750, Mức đất
├── display.h         // Thư viện LiquidCrystal_I2C và logic cập nhật LCD
├── websocket.h       // Xử lý kết nối Socket.io, reconnect, emit, on event
├── eeprom_config.h   // Lưu trữ Garden_ID, WiFi config, Ngưỡng Fail-safe vào Flash
└── failsafe_logic.h  // Chứa IF-ELSE điều khiển rơ le dựa trên giá trị cảm biến
```
