package com.example.demo.service;

import com.example.demo.model.*;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.FileSystemResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.Optional;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final AutoConfigRepository autoConfigRepository;
    private final ScheduleRepository scheduleRepository;
    private final SensorDataRepository sensorDataRepository;
    private final DataSource dataSource;

    @Override
    public void run(String... args) throws Exception {
        log.info("[DataSeeder] Recreating database schema from setup_database.sql...");
        try (Connection conn = dataSource.getConnection()) {
            conn.createStatement().execute("SET FOREIGN_KEY_CHECKS = 0;");
            FileSystemResource resource = new FileSystemResource("c:/Green Link IOT/setup_database.sql");
            ScriptUtils.executeSqlScript(conn, resource);
            conn.createStatement().execute("SET FOREIGN_KEY_CHECKS = 1;");
            log.info("[DataSeeder] Schema successfully recreated!");
        } catch (Exception e) {
            log.error("[DataSeeder] Failed to execute setup_database.sql script", e);
        }

        log.info("[DataSeeder] Seeding default records...");

        // 1. Seed Users (ADMIN & USER roles)
        User admin = seedUser("Hiệp Admin", "admin@test.com", "123", "ADMIN");
        User farmer = seedUser("Nông dân", "user@test.com", "123", "USER");

        // 2. Seed Devices (using device_id VARCHAR keys matching your MQTT topic structure)
        Device device1 = seedDevice("User_Hiep_01", farmer, "Vườn Lan");
        Device device2 = seedDevice("User_Hiep_02", farmer, "Vườn Cam");

        // 3. Seed AutoConfigs (min_soil_moisture, max_temperature)
        seedAutoConfig(device1, "AUTO", 40, 35.0);
        seedAutoConfig(device2, "MANUAL", 30, 33.0);

        // 4. Seed schedules (actuatorName PUMP/FAN/LED)
        seedSchedule(device1, "PUMP", "08:00", 15, true);
        seedSchedule(device1, "LED", "18:00", 120, true);
        seedSchedule(device2, "PUMP", "07:30", 10, false);

        // 5. Seed SensorData History (distinct telemetry for both gardens)
        seedSensorHistory(device1, 24.5, 70.0, 1200.0, 55);
        seedSensorHistory(device2, 29.5, 60.0, 800.0, 45);

        log.info("[DataSeeder] Seeded default records successfully!");
    }

    private User seedUser(String fullName, String username, String password, String role) {
        Optional<User> opt = userRepository.findByUsername(username);
        if (opt.isPresent()) {
            return opt.get();
        }
        User user = User.builder()
                .fullName(fullName)
                .username(username)
                .email(username)
                .password(password)
                .role(role)
                .build();
        userRepository.save(user);
        log.info("Seeded user: {} (role: {})", username, role);
        return user;
    }

    private Device seedDevice(String deviceId, User owner, String deviceName) {
        Optional<Device> opt = deviceRepository.findById(deviceId);
        if (opt.isPresent()) {
            return opt.get();
        }
        Device device = Device.builder()
                .deviceId(deviceId)
                .user(owner)
                .deviceName(deviceName)
                .status(true) // Seeded devices default to true/active for testing
                .build();
        deviceRepository.save(device);
        log.info("Seeded device: {} for owner {}", deviceId, owner.getUsername());
        return device;
    }

    private void seedAutoConfig(Device device, String mode, Integer minSoilMoisture, Double maxTemp) {
        Optional<AutoConfig> opt = autoConfigRepository.findByDeviceDeviceId(device.getDeviceId());
        if (opt.isPresent()) {
            return;
        }
        AutoConfig config = AutoConfig.builder()
                .device(device)
                .mode(mode)
                .minSoilMoisture(minSoilMoisture)
                .maxTemperature(maxTemp)
                .build();
        autoConfigRepository.save(config);
        log.info("Seeded auto configuration for device: {}", device.getDeviceId());
    }

    private void seedSchedule(Device device, String actuatorName, String startTime, int duration, boolean active) {
        boolean exists = scheduleRepository.findByDeviceDeviceId(device.getDeviceId()).stream()
                .anyMatch(s -> s.getActuatorName().equalsIgnoreCase(actuatorName) && s.getStartTime().equals(startTime));
        if (exists) {
            return;
        }
        Schedule schedule = Schedule.builder()
                .device(device)
                .actuatorName(actuatorName.toUpperCase())
                .startTime(startTime)
                .durationMinutes(duration)
                .isActive(active)
                .build();
        scheduleRepository.save(schedule);
        log.info("Seeded schedule: {} starting at {} for device {}", actuatorName, startTime, device.getDeviceId());
    }

    private void seedSensorHistory(Device device, double baseTemp, double baseHumi, double baseLux, int baseSoil) {
        if (sensorDataRepository.findFirstByDeviceDeviceIdOrderByTimestampDesc(device.getDeviceId()).isPresent()) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        for (int i = 11; i >= 0; i--) {
            double tempOffset = Math.sin(i / 2.0) * 1.5 + (Math.random() * 0.4);
            double humiOffset = Math.cos(i / 2.0) * 3.0 + (Math.random() * 1.0);
            double luxOffset = Math.sin(i / 3.0) * 200.0 + (Math.random() * 20.0);
            int soilOffset = (int) (Math.sin(i / 3.0) * 4.0 + (Math.random() * 1.0));

            SensorData data = SensorData.builder()
                    .device(device)
                    .temperature(Math.round((baseTemp + tempOffset) * 10.0) / 10.0)
                    .humidity(Math.round((baseHumi + humiOffset) * 10.0) / 10.0)
                    .lux((double) Math.round(baseLux + luxOffset))
                    .soilMoisture(baseSoil + soilOffset)
                    .timestamp(now.minusHours(i))
                    .build();
            sensorDataRepository.save(data);
        }
        log.info("Seeded 12 sensor history records for device {}", device.getDeviceId());
    }
}
