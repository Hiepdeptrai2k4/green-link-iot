package com.example.demo.service;

import com.example.demo.model.Schedule;
import com.example.demo.repository.ScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@EnableScheduling
@RequiredArgsConstructor
public class IrrigationSchedulerService {

    private final ScheduleRepository scheduleRepository;
    private final MqttGatewayService mqttGatewayService;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    @Scheduled(cron = "0 * * * * *")
    public void runSchedules() {
        LocalTime now = LocalTime.now();
        String currentTimeStr = now.format(TIME_FORMATTER);
        log.debug("[SCHEDULER LOOP] Running check at server time: {}", currentTimeStr);

        try {
            List<Schedule> activeSchedules = scheduleRepository.findByIsActive(true);
            for (Schedule schedule : activeSchedules) {
                // Verify if device is active before executing schedule commands
                if (schedule.getDevice() == null || schedule.getDevice().getStatus() == null || !schedule.getDevice().getStatus()) {
                    log.debug("Skipping schedule {} for inactive/pending device.", schedule.getId());
                    continue;
                }

                String rawStartTime = schedule.getStartTime();
                String startTime = rawStartTime;
                if (rawStartTime != null && rawStartTime.contains(":")) {
                    String[] parts = rawStartTime.split(":");
                    if (parts.length >= 2) {
                        startTime = String.format("%02d:%02d", Integer.parseInt(parts[0]), Integer.parseInt(parts[1]));
                    }
                }
                String endTime = addMinutes(startTime, schedule.getDurationMinutes());
                
                // Map DB type ('PUMP', 'LIGHT', 'FAN') to MQTT command keys ('pump', 'led', 'fan')
                String rawDevice = schedule.getActuatorName().toLowerCase();
                if ("light".equals(rawDevice) || "led".equals(rawDevice)) {
                    rawDevice = "led";
                }

                // Match start time
                if (currentTimeStr.equals(startTime)) {
                    log.info("[TIMER TRIGGER ON] Device '{}' actuator '{}' -> ON", schedule.getDevice().getDeviceId(), rawDevice);
                    mqttGatewayService.sendControlCommand(schedule.getDevice().getDeviceId(), rawDevice, "ON");
                }

                // Match end time (after duration has elapsed)
                if (currentTimeStr.equals(endTime)) {
                    log.info("[TIMER TRIGGER OFF] Device '{}' actuator '{}' -> OFF", schedule.getDevice().getDeviceId(), rawDevice);
                    mqttGatewayService.sendControlCommand(schedule.getDevice().getDeviceId(), rawDevice, "OFF");
                }
            }
        } catch (Exception e) {
            log.error("Failed to run active timer schedules", e);
        }
    }

    private String addMinutes(String timeStr, int minutes) {
        try {
            String[] parts = timeStr.split(":");
            int hours = Integer.parseInt(parts[0]);
            int mins = Integer.parseInt(parts[1]);
            int totalMins = (hours * 60 + mins + minutes) % 1440;
            if (totalMins < 0) {
                totalMins += 1440;
            }
            int newHours = totalMins / 60;
            int newMins = totalMins % 60;
            return String.format("%02d:%02d", newHours, newMins);
        } catch (Exception e) {
            log.error("Failed to compute time math: {}", timeStr, e);
            return timeStr;
        }
    }
}
