package com.example.demo.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "auto_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    @Column(name = "mode", nullable = false, length = 10)
    private String mode; // "AUTO" or "MANUAL"

    @Column(name = "min_soil_moisture")
    private Integer minSoilMoisture;

    @Column(name = "max_temperature")
    private Double maxTemperature;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
