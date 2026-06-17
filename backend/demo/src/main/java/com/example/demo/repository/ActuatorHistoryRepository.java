package com.example.demo.repository;

import com.example.demo.model.ActuatorHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ActuatorHistoryRepository extends JpaRepository<ActuatorHistory, Long> {
    List<ActuatorHistory> findTop15ByDeviceDeviceIdOrderByTimestampDesc(String deviceId);
}
