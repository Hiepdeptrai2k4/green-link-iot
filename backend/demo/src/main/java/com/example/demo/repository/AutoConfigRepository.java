package com.example.demo.repository;

import com.example.demo.model.AutoConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AutoConfigRepository extends JpaRepository<AutoConfig, Integer> {
    Optional<AutoConfig> findByDeviceDeviceId(String deviceId);
}
