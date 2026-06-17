package com.example.demo.repository;

import com.example.demo.model.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, Long> {
    Optional<SensorData> findFirstByDeviceDeviceIdOrderByTimestampDesc(String deviceId);
    List<SensorData> findTop15ByDeviceDeviceIdOrderByTimestampDesc(String deviceId);
}
