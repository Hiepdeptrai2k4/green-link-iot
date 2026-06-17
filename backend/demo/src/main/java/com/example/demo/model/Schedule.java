package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "schedules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(name = "actuator_name", nullable = false, length = 20)
    private String actuatorName; // "PUMP", "FAN", "LED"

    @Column(name = "start_time", nullable = false)
    private String startTime; // format "HH:mm:ss" or "HH:mm"

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive; // 1 = Active, 0 = Inactive

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
