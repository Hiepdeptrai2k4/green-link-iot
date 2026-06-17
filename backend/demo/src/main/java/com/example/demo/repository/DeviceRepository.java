package com.example.demo.repository;

import com.example.demo.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface DeviceRepository extends JpaRepository<Device, String> {
    List<Device> findByUserId(Integer userId);
    List<Device> findByUserUsername(String username);
    List<Device> findByUserIdAndStatus(Integer userId, Boolean status);
    List<Device> findByUserUsernameAndStatus(String username, Boolean status);
}
