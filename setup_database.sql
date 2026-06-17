
CREATE DATABASE IF NOT EXISTS smart_garden_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE smart_garden_db;


DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS auto_configs;
DROP TABLE IF EXISTS actuator_history;
DROP TABLE IF EXISTS sensor_data;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS users;


CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL, -- Email đăng nhập (Ví dụ: admin@test.com, user@test.com)
    password VARCHAR(255) NOT NULL,       -- Chuỗi ký tự mật khẩu (Tương thích mã hóa BCrypt của Spring Security)
    full_name VARCHAR(100) NOT NULL,      -- Tên hiển thị người dùng
    role VARCHAR(20) DEFAULT 'USER',       
    email VARCHAR(100),                   
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE devices (
    device_id VARCHAR(50) PRIMARY KEY, -- Mã định danh duy nhất của mạch (Ví dụ: 'GARDEN_LAN_01')
    user_id INT NULL,                   -- Khóa ngoại nối sang tài khoản sở hữu
    device_name VARCHAR(100) NOT NULL, -- Tên đặt cho khu vườn (Ví dụ: 'Vườn Lan', 'Vườn Cam')
    status BOOLEAN DEFAULT TRUE,        -- Trạng thái thiết bị: TRUE (Online), FALSE (Offline)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;


CREATE TABLE sensor_data (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    temperature FLOAT NOT NULL,        -- Nhiệt độ không khí (°C)
    humidity FLOAT NOT NULL,           -- Độ ẩm không khí (%)
    lux FLOAT NOT NULL,                -- Cường độ ánh sáng (Lux)
    soil_moisture INT NOT NULL,        -- Độ ẩm đất (%)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE actuator_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    actuator_name VARCHAR(20) NOT NULL, -- Định danh loại thiết bị: 'PUMP', 'FAN', 'LED'
    action BOOLEAN NOT NULL,            -- Trạng thái điều khiển: 1 (TRUE - BẬT), 0 (FALSE - TẮT)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE auto_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL, -- Mỗi khu vườn sở hữu duy nhất 1 bộ cấu hình ngưỡng
    mode VARCHAR(10) DEFAULT 'AUTO',       -- Chế độ hoạt động hiện tại: 'AUTO' hoặc 'MANUAL'
    min_soil_moisture INT DEFAULT 30,      -- Ngưỡng độ ẩm đất tối thiểu (Dưới mức này -> Tự bật Bơm)
    max_temperature FLOAT DEFAULT 35.0,    -- Ngưỡng nhiệt độ tối đa (Trên mức này -> Tự bật Quạt)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    actuator_name VARCHAR(20) NOT NULL,  -- Định danh loại thiết bị: 'PUMP', 'FAN', 'LED'
    start_time TIME NOT NULL,            -- Mốc thời gian kích hoạt trong ngày 
    duration_minutes INT NOT NULL,       -- Thời gian chạy (phút) trước khi tự động tắt
    is_active BOOLEAN DEFAULT TRUE,      -- Trạng thái lịch biểu: 1 (Kích hoạt), 0 (Tạm dừng)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB;
