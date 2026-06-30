package com.example.demo.controller;

import com.example.demo.model.AutoConfig;
import com.example.demo.model.Device;
import com.example.demo.model.User;
import com.example.demo.repository.AutoConfigRepository;
import com.example.demo.repository.DeviceRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.model.SensorData;
import com.example.demo.repository.SensorDataRepository;
import com.example.demo.service.MqttGatewayService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final AutoConfigRepository autoConfigRepository;
    private final SensorDataRepository sensorDataRepository;
    private final PasswordEncoder passwordEncoder;
    private final MqttGatewayService mqttGatewayService;

    // ==========================================
    // USER MANAGEMENT
    // ==========================================

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    /**
     * Admin-only registration endpoint
     */
    @PostMapping("/users/create")
    public ResponseEntity<?> createUserAccount(@RequestBody Map<String, String> payload) {
        String username = payload.get("username"); // gmail address
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String role = payload.get("role");
        String telegramChatId = payload.get("telegramChatId");
        String phoneNumber = payload.get("phoneNumber");
        String email = payload.get("email");

        if (username == null || password == null || fullName == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields"));
        }

        if (role == null) {
            role = "USER";
        }

        if (email == null || email.trim().isEmpty()) {
            email = username;
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email/Username already exists"));
        }

        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .fullName(fullName)
                .role(role.toUpperCase())
                .telegramChatId(telegramChatId)
                .phoneNumber(phoneNumber)
                .build();

        User saved = userRepository.save(user);
        log.info("Admin created new user account: {} (role: {})", username, role);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email/Username already exists"));
        }
        if (user.getEmail() == null || user.getEmail().trim().isEmpty()) {
            user.setEmail(user.getUsername());
        }
        // Hash the password before saving
        if (user.getPassword() != null && !user.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        }
        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Integer id, @RequestBody User userDetails) {
        Optional<User> opt = userRepository.findById(id);
        if (!opt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        User user = opt.get();
        user.setUsername(userDetails.getUsername());
        user.setEmail(userDetails.getEmail() != null ? userDetails.getEmail() : userDetails.getUsername());
        user.setFullName(userDetails.getFullName());
        user.setRole(userDetails.getRole());
        user.setTelegramChatId(userDetails.getTelegramChatId());
        user.setPhoneNumber(userDetails.getPhoneNumber());
        if (userDetails.getPassword() != null && !userDetails.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
        }
        return ResponseEntity.ok(userRepository.save(user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    // ==========================================
    // DEVICE / GARDEN MANAGEMENT
    // ==========================================

    @GetMapping("/gardens")
    public ResponseEntity<?> getAllGardens() {
        return getAllDevices();
    }

    @GetMapping("/devices")
    public ResponseEntity<?> getAllDevices() {
        List<Device> devices = deviceRepository.findAll();
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (Device d : devices) {
            Map<String, Object> map = new HashMap<>();
            map.put("deviceId", d.getDeviceId());
            map.put("deviceName", d.getDeviceName());
            map.put("status", d.getStatus());
            map.put("createdAt", d.getCreatedAt());
            
            if (d.getUser() != null) {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", d.getUser().getId());
                userMap.put("fullName", d.getUser().getFullName());
                userMap.put("username", d.getUser().getUsername());
                userMap.put("role", d.getUser().getRole());
                userMap.put("createdAt", d.getUser().getCreatedAt());
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

    /**
     * Endpoint to activate device (Admin Connection Activation)
     */
    @PostMapping("/devices/{deviceId}/connect")
    public ResponseEntity<?> connectDevice(@PathVariable String deviceId) {
        Optional<Device> deviceOpt = deviceRepository.findById(deviceId);
        if (!deviceOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        Device device = deviceOpt.get();
        device.setStatus(true); // Set to active (Connected)
        deviceRepository.save(device);

        // Ensure default AutoConfig exists for this device
        Optional<AutoConfig> configOpt = autoConfigRepository.findByDeviceDeviceId(deviceId);
        if (!configOpt.isPresent()) {
            AutoConfig config = AutoConfig.builder()
                    .device(device)
                    .mode("MANUAL")
                    .minSoilMoisture(40)
                    .maxTemperature(35.0)
                    .build();
            autoConfigRepository.save(config);
        }

        log.info("Admin activated device connection: {}", deviceId);
        return ResponseEntity.ok(Map.of("deviceId", deviceId, "status", true, "message", "Device activated successfully"));
    }

    @PostMapping("/gardens/{deviceId}/connect")
    public ResponseEntity<?> connectGardenCompatibility(@PathVariable String deviceId) {
        return connectDevice(deviceId);
    }

    @PostMapping("/devices")
    public ResponseEntity<?> createDevice(@RequestBody Map<String, Object> payload) {
        try {
            String deviceId = (String) payload.get("deviceId");
            if (deviceId == null) {
                deviceId = (String) payload.get("device_id");
            }
            String deviceName = (String) payload.get("deviceName");
            if (deviceName == null) {
                deviceName = (String) payload.get("device_name");
            }
            Object userIdObj = payload.get("userId");
            if (userIdObj == null) {
                userIdObj = payload.get("user_id");
            }
            Integer userId = null;
            if (userIdObj instanceof Number) {
                userId = ((Number) userIdObj).intValue();
            } else if (userIdObj != null && !userIdObj.toString().trim().isEmpty()) {
                try {
                    userId = Integer.parseInt(userIdObj.toString().trim());
                } catch (NumberFormatException ignored) {}
            }

            if (deviceId == null || deviceName == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Missing required fields (deviceId, deviceName)"));
            }

            User owner = null;
            if (userId != null && userId > 0) {
                Optional<User> ownerOpt = userRepository.findById(userId);
                if (ownerOpt.isPresent()) {
                    owner = ownerOpt.get();
                } else {
                    return ResponseEntity.badRequest().body(Map.of("message", "User owner not found"));
                }
            }

            if (deviceRepository.existsById(deviceId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Device ID already exists"));
            }

            Device device = Device.builder()
                    .deviceId(deviceId)
                    .user(owner)
                    .deviceName(deviceName)
                    .status(false) // Visibility set to Inactive/Pending by default
                    .build();

            Device savedDevice = deviceRepository.save(device);

            // Automatically provision a default AutoConfig configuration
            AutoConfig autoConfig = AutoConfig.builder()
                    .device(savedDevice)
                    .mode("MANUAL")
                    .minSoilMoisture(40)
                    .maxTemperature(35.0)
                    .build();
            autoConfigRepository.save(autoConfig);

            log.info("Admin registered new device (pending connection): {}", deviceId);
            return ResponseEntity.ok(savedDevice);
        } catch (Exception e) {
            log.error("Error creating device", e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/gardens")
    public ResponseEntity<?> createGardenCompatibility(@RequestBody Map<String, Object> payload) {
        return createDevice(payload);
    }

    @PutMapping("/devices/{deviceId}")
    public ResponseEntity<?> updateDevice(@PathVariable String deviceId, @RequestBody Map<String, Object> payload) {
        try {
            Optional<Device> deviceOpt = deviceRepository.findById(deviceId);
            if (!deviceOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }
            Device device = deviceOpt.get();

            if (payload.containsKey("deviceName")) device.setDeviceName((String) payload.get("deviceName"));
            if (payload.containsKey("status")) device.setStatus((Boolean) payload.get("status"));

            if (payload.containsKey("userId")) {
                Object userIdObj = payload.get("userId");
                Integer userId = null;
                if (userIdObj instanceof Number) {
                    userId = ((Number) userIdObj).intValue();
                } else if (userIdObj != null && !userIdObj.toString().trim().isEmpty()) {
                    try {
                        userId = Integer.parseInt(userIdObj.toString().trim());
                    } catch (NumberFormatException ignored) {}
                }
                if (userId == null || userId <= 0) {
                    device.setUser(null);
                } else {
                    Optional<User> ownerOpt = userRepository.findById(userId);
                    if (!ownerOpt.isPresent()) {
                        return ResponseEntity.badRequest().body(Map.of("message", "User owner not found"));
                    }
                    device.setUser(ownerOpt.get());
                }
            }

            return ResponseEntity.ok(deviceRepository.save(device));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/gardens/{deviceId}")
    public ResponseEntity<?> updateGardenCompatibility(@PathVariable String deviceId, @RequestBody Map<String, Object> payload) {
        return updateDevice(deviceId, payload);
    }

    @DeleteMapping("/devices/{deviceId}")
    public ResponseEntity<?> deleteDevice(@PathVariable String deviceId) {
        if (!deviceRepository.existsById(deviceId)) {
            return ResponseEntity.notFound().build();
        }
        deviceRepository.deleteById(deviceId);
        return ResponseEntity.ok(Map.of("message", "Device deleted successfully"));
    }

    @DeleteMapping("/gardens/{deviceId}")
    public ResponseEntity<?> deleteGardenCompatibility(@PathVariable String deviceId) {
        return deleteDevice(deviceId);
    }
}
