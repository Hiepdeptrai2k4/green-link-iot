package com.example.demo.controller;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        log.info("Attempting login for user: {}", email);
        Optional<User> userOpt = userRepository.findByUsername(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Match plain password since seeder uses unencrypted strings
            if (user.getPassword().equals(password)) {
                String role = user.getRole().toUpperCase();
                // Match the expected format for MockJwtAuthenticationFilter: mock-jwt:{role}:{email}:{timestamp}
                String mockToken = "mock-jwt:" + role.toLowerCase() + ":" + email + ":" + System.currentTimeMillis();
                
                log.info("User {} successfully authenticated with role: {}", email, role);
                return ResponseEntity.ok(Map.of(
                    "email", user.getUsername(),
                    "name", user.getFullName(),
                    "role", role,
                    "token", mockToken
                ));
            }
        }
        
        log.warn("Authentication failed for user: {}", email);
        return ResponseEntity.status(401).body(Map.of("message", "Email hoặc mật khẩu không chính xác!"));
    }
}
