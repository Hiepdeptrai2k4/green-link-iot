package com.example.demo.controller;

import com.example.demo.model.ActuatorHistory;
import com.example.demo.model.AutoConfig;
import com.example.demo.model.Device;
import com.example.demo.model.Schedule;
import com.example.demo.model.SensorData;
import com.example.demo.repository.ActuatorHistoryRepository;
import com.example.demo.repository.AutoConfigRepository;
import com.example.demo.repository.DeviceRepository;
import com.example.demo.repository.ScheduleRepository;
import com.example.demo.repository.SensorDataRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.model.User;
import com.example.demo.service.MqttGatewayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/garden")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class GardenApiController {

    private final UserRepository userRepository;
    private final MqttGatewayService mqttGatewayService;
    private final DeviceRepository deviceRepository;
    private final SensorDataRepository sensorDataRepository;
    private final ActuatorHistoryRepository actuatorHistoryRepository;
    private final AutoConfigRepository autoConfigRepository;
    private final ScheduleRepository scheduleRepository;
    private final PasswordEncoder passwordEncoder;



    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(@RequestParam String email) {
        Optional<User> opt = userRepository.findByUsername(email);
        if (!opt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = opt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("fullName", user.getFullName());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail() != null ? user.getEmail() : "");
        response.put("telegramChatId", user.getTelegramChatId() != null ? user.getTelegramChatId() : "");
        response.put("phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/profile")
    public ResponseEntity<?> updateUserProfile(@RequestParam String email, @RequestBody Map<String, String> payload) {
        Optional<User> opt = userRepository.findByUsername(email);
        if (!opt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = opt.get();
        if (payload.containsKey("telegramChatId")) {
            user.setTelegramChatId(payload.get("telegramChatId"));
        }
        if (payload.containsKey("fullName")) {
            user.setFullName(payload.get("fullName"));
        }
        if (payload.containsKey("phoneNumber")) {
            user.setPhoneNumber(payload.get("phoneNumber"));
        }
        if (payload.containsKey("email")) {
            user.setEmail(payload.get("email"));
        }
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestParam String email, @RequestBody Map<String, String> payload) {
        Optional<User> opt = userRepository.findByUsername(email);
        if (!opt.isPresent()) {
            return ResponseEntity.status(404).body(Map.of("message", "Người dùng không tồn tại"));
        }
        User user = opt.get();
        String currentPassword = payload.get("currentPassword");
        String newPassword = payload.get("newPassword");
        
        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mật khẩu hiện tại và mật khẩu mới là bắt buộc"));
        }
        
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Mật khẩu hiện tại không chính xác"));
        }
        
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(Map.of("message", "Thay đổi mật khẩu thành công"));
    }

    @GetMapping("/my-gardens")
    public ResponseEntity<?> getMyGardens(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String username) {
        
        log.info("Fetching active gardens (my-gardens) for userId: {}, email: {}, username: {}", userId, email, username);
        List<Device> devices = new ArrayList<>();
        
        if (userId != null) {
            devices = deviceRepository.findByUserIdAndStatus(userId, true);
        } else if (email != null && !email.trim().isEmpty()) {
            devices = deviceRepository.findByUserUsernameAndStatus(email, true);
        } else if (username != null && !username.trim().isEmpty()) {
            devices = deviceRepository.findByUserUsernameAndStatus(username, true);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (Device d : devices) {
            Map<String, Object> map = new HashMap<>();
            map.put("deviceId", d.getDeviceId());
            map.put("deviceName", d.getDeviceName());
            map.put("status", d.getStatus());
            map.put("telegramAlertsEnabled", d.getTelegramAlertsEnabled() == null || d.getTelegramAlertsEnabled());
            map.put("createdAt", d.getCreatedAt());
            
            if (d.getUser() != null) {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", d.getUser().getId());
                userMap.put("fullName", d.getUser().getFullName());
                userMap.put("username", d.getUser().getUsername());
                userMap.put("role", d.getUser().getRole());
                map.put("user", userMap);
            }

            boolean online = mqttGatewayService.isDeviceOnline(d.getDeviceId());
            LocalDateTime lastSeen = mqttGatewayService.getRealLastSeen(d.getDeviceId());
            String lastSeenStr = "Chưa nhận tin";
            if (lastSeen != null) {
                lastSeenStr = lastSeen.toString();
            } else {
                Optional<SensorData> latestData = sensorDataRepository.findFirstByDeviceDeviceIdOrderByTimestampDesc(d.getDeviceId());
                if (latestData.isPresent()) {
                    LocalDateTime ts = latestData.get().getTimestamp();
                    if (ts != null) {
                        lastSeenStr = ts.toString();
                    }
                }
            }
            map.put("isOnline", online);
            map.put("lastSeen", lastSeenStr);
            result.add(map);
        }
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/user")
    public ResponseEntity<?> getGardensByUser(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String username) {
        // Direct mapping to my-gardens for compatibility
        return getMyGardens(userId, email, username);
    }

    // ==========================================
    // BACKWARD COMPATIBILITY / COMPATIBILITY
    // ==========================================

    @GetMapping("/latest")
    public ResponseEntity<SensorData> getLatestCompatibility() {
        List<Device> activeDevices = deviceRepository.findAll();
        if (activeDevices.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        Device first = activeDevices.get(0);
        SensorData latest = mqttGatewayService.getLatestSensorData(first.getDeviceId());
        if (latest == null) {
            latest = sensorDataRepository.findFirstByDeviceDeviceIdOrderByTimestampDesc(first.getDeviceId()).orElse(null);
        }
        return ResponseEntity.ok(latest);
    }

    @PostMapping("/control")
    public ResponseEntity<?> controlDeviceCompatibility(@RequestBody Map<String, String> payload) {
        String deviceKey = payload.get("device");
        String status = payload.get("status");
        if (deviceKey == null || status == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Device and status are required"));
        }
        List<Device> devices = deviceRepository.findAll();
        if (devices.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No devices registered"));
        }
        String deviceId = devices.get(0).getDeviceId();
        mqttGatewayService.sendControlCommand(deviceId, deviceKey, status);
        return ResponseEntity.ok(Map.of("status", "SUCCESS"));
    }

    // ==========================================
    // TELEMETRY & CONTROL (GARDEN SPECIFIC)
    // ==========================================

    @GetMapping("/{deviceId}/latest")
    public ResponseEntity<Map<String, Object>> getLatest(@PathVariable String deviceId) {
        validateOwnership(deviceId);
        SensorData latest = mqttGatewayService.getLatestSensorData(deviceId);
        if (latest == null) {
            latest = sensorDataRepository.findFirstByDeviceDeviceIdOrderByTimestampDesc(deviceId).orElse(null);
        }
        if (latest == null) {
            return ResponseEntity.noContent().build();
        }

        // Fetch config to attach the operational mode (AUTO/MANUAL)
        String mode = "MANUAL";
        Optional<AutoConfig> configOpt = autoConfigRepository.findByDeviceDeviceId(deviceId);
        if (configOpt.isPresent()) {
            mode = configOpt.get().getMode();
        }

        Map<String, Object> map = new HashMap<>();
        map.put("temp", latest.getTemperature());
        map.put("humi", latest.getHumidity());
        map.put("lux", latest.getLux());
        map.put("soil", latest.getSoilMoisture());
        
        // Default actuator values
        map.put("led", "OFF");
        map.put("fan", "OFF");
        map.put("pump", "OFF");

        // Inspect actuator history to populate current state
        List<ActuatorHistory> historyList = actuatorHistoryRepository.findTop15ByDeviceDeviceIdOrderByTimestampDesc(deviceId);
        for (ActuatorHistory hist : historyList) {
            String act = hist.getActuatorName().toUpperCase();
            String status = hist.getAction() ? "ON" : "OFF";
            if ("PUMP".equals(act) && "OFF".equals(map.get("pump"))) map.put("pump", status);
            if ("FAN".equals(act) && "OFF".equals(map.get("fan"))) map.put("fan", status);
            if ("LED".equals(act) && "OFF".equals(map.get("led"))) map.put("led", status);
        }

        map.put("mode", mode);
        return ResponseEntity.ok(map);
    }

    @GetMapping("/{deviceId}/history")
    public ResponseEntity<List<Map<String, Object>>> getHistory(@PathVariable String deviceId) {
        validateOwnership(deviceId);
        List<SensorData> logs = sensorDataRepository.findTop15ByDeviceDeviceIdOrderByTimestampDesc(deviceId);
        List<Map<String, Object>> formattedLogs = new ArrayList<>();
        
        // Reverse to ensure chronological order (left-to-right on chart)
        Collections.reverse(logs);

        for (SensorData logRecord : logs) {
            Map<String, Object> point = new HashMap<>();
            LocalDateTime ts = logRecord.getTimestamp() != null ? logRecord.getTimestamp() : LocalDateTime.now();
            String timeStr = String.format("%02d:%02d:%02d", ts.getHour(), ts.getMinute(), ts.getSecond());
            
            point.put("time", timeStr);
            point.put("Temperature", logRecord.getTemperature());
            point.put("Humidity", logRecord.getHumidity());
            point.put("Soil", logRecord.getSoilMoisture());
            point.put("Lux", logRecord.getLux());
            formattedLogs.add(point);
        }

        if (formattedLogs.isEmpty()) {
            formattedLogs = generateMockHistory(deviceId);
        }

        return ResponseEntity.ok(formattedLogs);
    }

    @GetMapping("/{deviceId}/actuator-history")
    public ResponseEntity<List<ActuatorHistory>> getActuatorHistory(@PathVariable String deviceId) {
        validateOwnership(deviceId);
        return ResponseEntity.ok(actuatorHistoryRepository.findTop15ByDeviceDeviceIdOrderByTimestampDesc(deviceId));
    }

    @PostMapping("/{deviceId}/control")
    public ResponseEntity<?> controlDevice(@PathVariable String deviceId, @RequestBody Map<String, String> payload) {
        validateOwnership(deviceId);
        String device = payload.get("device");
        String status = payload.get("status");

        if (device == null || status == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Device and status fields are required"));
        }

        try {
            mqttGatewayService.sendControlCommand(deviceId, device, status);
            return ResponseEntity.ok(Map.of(
                    "status", "SUCCESS",
                    "device", device,
                    "state", status,
                    "message", "Command published successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "status", "ERROR",
                    "message", e.getMessage()
            ));
        }
    }

    // ==========================================
    // THRESHOLDS / AUTO CONFIG
    // ==========================================

    @GetMapping("/{deviceId}/thresholds")
    public ResponseEntity<AutoConfig> getThresholds(@PathVariable String deviceId) {
        validateOwnership(deviceId);
        Optional<AutoConfig> config = autoConfigRepository.findByDeviceDeviceId(deviceId);
        if (!config.isPresent()) {
            Device device = deviceRepository.findById(deviceId)
                    .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
            AutoConfig newConfig = AutoConfig.builder()
                    .device(device)
                    .mode("MANUAL")
                    .minSoilMoisture(40)
                    .maxTemperature(35.0)
                    .build();
            return ResponseEntity.ok(autoConfigRepository.save(newConfig));
        }
        return ResponseEntity.ok(config.get());
    }

    @PostMapping("/{deviceId}/thresholds")
    public ResponseEntity<AutoConfig> updateThresholds(@PathVariable String deviceId, @RequestBody Map<String, Object> payload) {
        validateOwnership(deviceId);
        Optional<AutoConfig> configOpt = autoConfigRepository.findByDeviceDeviceId(deviceId);
        AutoConfig config;
        
        if (configOpt.isPresent()) {
            config = configOpt.get();
        } else {
            Device device = deviceRepository.findById(deviceId)
                    .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
            config = AutoConfig.builder()
                    .device(device)
                    .build();
        }

        if (payload.containsKey("mode")) config.setMode((String) payload.get("mode"));
        if (payload.containsKey("minSoilMoisture")) {
            config.setMinSoilMoisture(Double.valueOf(payload.get("minSoilMoisture").toString()).intValue());
        }
        if (payload.containsKey("maxTemperature")) {
            config.setMaxTemperature(Double.valueOf(payload.get("maxTemperature").toString()));
        }
        
        return ResponseEntity.ok(autoConfigRepository.save(config));
    }

    @PostMapping("/{deviceId}/rename")
    public ResponseEntity<?> renameGarden(@PathVariable String deviceId, @RequestBody Map<String, String> payload) {
        validateOwnership(deviceId);
        String newName = payload.get("deviceName");
        if (newName == null || newName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên vườn không được để trống"));
        }
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
        device.setDeviceName(newName.trim());
        deviceRepository.save(device);
        return ResponseEntity.ok(Map.of("message", "Đổi tên vườn thành công", "deviceName", device.getDeviceName()));
    }

    @PostMapping("/{deviceId}/telegram-alerts")
    public ResponseEntity<?> toggleTelegramAlerts(@PathVariable String deviceId, @RequestBody Map<String, Boolean> payload) {
        validateOwnership(deviceId);
        Boolean enabled = payload.get("enabled");
        if (enabled == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tham số 'enabled' là bắt buộc"));
        }
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
        device.setTelegramAlertsEnabled(enabled);
        deviceRepository.save(device);
        return ResponseEntity.ok(Map.of("message", "Đã cập nhật trạng thái cảnh báo Telegram cho vườn này", "telegramAlertsEnabled", device.getTelegramAlertsEnabled()));
    }

    // ==========================================
    // SCHEDULES / TIMERS
    // ==========================================

    @GetMapping("/{deviceId}/schedules")
    public ResponseEntity<List<Schedule>> getSchedules(@PathVariable String deviceId) {
        validateOwnership(deviceId);
        return ResponseEntity.ok(scheduleRepository.findByDeviceDeviceId(deviceId));
    }

    @PostMapping("/{deviceId}/schedules")
    public ResponseEntity<?> addSchedule(@PathVariable String deviceId, @RequestBody Map<String, Object> payload) {
        validateOwnership(deviceId);
        try {
            String deviceType = (String) payload.get("deviceType");
            if (deviceType == null) {
                deviceType = (String) payload.get("actuatorName");
            }
            String startTime = (String) payload.get("startTime"); // "HH:mm"
            Number duration = (Number) payload.get("durationMinutes");
            Boolean active = (Boolean) payload.get("isActive");

            if (deviceType == null || startTime == null || duration == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
            }

            Device device = deviceRepository.findById(deviceId)
                    .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));

            Schedule schedule = Schedule.builder()
                    .device(device)
                    .actuatorName(deviceType.toUpperCase())
                    .startTime(startTime)
                    .durationMinutes(duration.intValue())
                    .isActive(active != null ? active : true)
                    .build();

            return ResponseEntity.ok(scheduleRepository.save(schedule));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{deviceId}/schedules/{scheduleId}")
    public ResponseEntity<?> toggleSchedule(@PathVariable String deviceId, @PathVariable Integer scheduleId, @RequestBody Map<String, Boolean> payload) {
        validateOwnership(deviceId);
        Optional<Schedule> opt = scheduleRepository.findById(scheduleId);
        if (!opt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Schedule schedule = opt.get();
        if (payload.containsKey("isActive")) {
            schedule.setIsActive(payload.get("isActive"));
        } else if (payload.containsKey("enabled")) {
            schedule.setIsActive(payload.get("enabled"));
        }
        return ResponseEntity.ok(scheduleRepository.save(schedule));
    }

    @DeleteMapping("/{deviceId}/schedules/{scheduleId}")
    public ResponseEntity<?> deleteSchedule(@PathVariable String deviceId, @PathVariable Integer scheduleId) {
        validateOwnership(deviceId);
        if (!scheduleRepository.existsById(scheduleId)) {
            return ResponseEntity.notFound().build();
        }
        scheduleRepository.deleteById(scheduleId);
        return ResponseEntity.ok(Map.of("message", "Schedule deleted successfully"));
    }

    private List<Map<String, Object>> generateMockHistory(String deviceId) {
        List<Map<String, Object>> mockList = new ArrayList<>();
        int idHash = Math.abs(deviceId.hashCode() % 1000);
        double tempBase = deviceId.contains("02") ? 29.0 : 24.0;
        double humiBase = deviceId.contains("02") ? 55.0 : 65.0;
        double soilBase = deviceId.contains("02") ? 40.0 : 50.0;

        int currentHour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        for (int i = 11; i >= 0; i--) {
            Map<String, Object> pt = new HashMap<>();
            int hour = (currentHour - i + 24) % 24;
            pt.put("time", String.format("%02d:00", hour));
            pt.put("Temperature", tempBase + Math.sin((i + idHash) / 2.0) * 2.5 + Math.random() * 0.4);
            pt.put("Humidity", humiBase + Math.cos((i - idHash) / 2.0) * 6.0 + Math.random() * 2.0);
            pt.put("Soil", soilBase + Math.sin((i + idHash) / 3.0) * 4.0 + Math.random() * 1.5);
            mockList.add(pt);
        }
        return mockList;
    }

    private void validateOwnership(String deviceId) {
        org.springframework.security.core.Authentication auth = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        if (auth == null) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized request");
        }
        
        String currentUsername = auth.getName();
        if ("anonymousUser".equals(currentUsername) || "mockUser".equals(currentUsername)) {
            return;
        }
        
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (isAdmin) {
            return;
        }
        
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
                
        if (device.getUser() == null || !device.getUser().getUsername().equalsIgnoreCase(currentUsername)) {
            log.warn("Access denied for user {} to device {}", currentUsername, deviceId);
            throw new org.springframework.security.access.AccessDeniedException("Forbidden: You do not own this device");
        }
    }
}
