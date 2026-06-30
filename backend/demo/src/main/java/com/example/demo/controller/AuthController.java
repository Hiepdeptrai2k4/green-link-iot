package com.example.demo.controller;

import com.example.demo.config.JwtTokenProvider;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.EmailService;
import com.example.demo.service.OtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
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
    private final OtpService otpService;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        log.info("Attempting login for identifier: {}", email);
        Optional<User> userOpt = userRepository.findByUsername(email.trim());
        if (!userOpt.isPresent()) {
            userOpt = userRepository.findByEmail(email.trim());
        }

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Match password using BCrypt encoder
            if (passwordEncoder.matches(password, user.getPassword())) {
                String role = user.getRole().toUpperCase();
                // Generate a signed JWT token instead of mock token
                String jwtToken = jwtTokenProvider.generateToken(user.getUsername(), role);
                
                log.info("User {} (username: {}) successfully authenticated with role: {}", email, user.getUsername(), role);
                return ResponseEntity.ok(Map.of(
                    "email", user.getUsername(),
                    "name", user.getFullName(),
                    "role", role,
                    "token", jwtToken
                ));
            }
        }
        
        log.warn("Authentication failed for identifier: {}", email);
        return ResponseEntity.status(401).body(Map.of("message", "Tài khoản hoặc mật khẩu không chính xác!"));
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email la bat buoc"));
        }

        log.info("Received OTP request for email: {}", email);
        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (!userOpt.isPresent()) {
            userOpt = userRepository.findByUsername(email.trim());
        }

        if (!userOpt.isPresent()) {
            return ResponseEntity.status(404).body(Map.of("message", "Email khong ton tai tre he thong"));
        }

        User user = userOpt.get();
        String otp = otpService.generateOtp(user.getUsername());
        String targetEmail = user.getEmail() != null && !user.getEmail().trim().isEmpty() ? user.getEmail() : user.getUsername();
        emailService.sendOtpEmail(targetEmail, otp);
        return ResponseEntity.ok(Map.of("message", "Ma OTP da duoc gui thanh cong qua email cua ban!"));
    }

    @PostMapping("/verify-otp-reset")
    public ResponseEntity<?> verifyOtpAndResetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String otp = payload.get("otp");
        String newPassword = payload.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Thieu thong tin yeu cau"));
        }

        log.info("Received password reset request using OTP for email: {}", email);
        Optional<User> userOpt = userRepository.findByEmail(email.trim());
        if (!userOpt.isPresent()) {
            userOpt = userRepository.findByUsername(email.trim());
        }

        if (!userOpt.isPresent()) {
            return ResponseEntity.status(404).body(Map.of("message", "Nguoi dung khong ton tai"));
        }

        User user = userOpt.get();
        boolean valid = otpService.verifyOtp(user.getUsername(), otp.trim());
        if (!valid) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ma OTP khong chinh xac hoac da het han"));
        }

        // Hash the new password before saving
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        otpService.clearOtp(user.getUsername());
        log.info("Password successfully updated using OTP for user: {}", user.getUsername());
        return ResponseEntity.ok(Map.of("message", "Dat lai mat khau thanh cong!"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String username = payload.get("username"); // login email/username
        String password = payload.get("password");
        String fullName = payload.get("fullName");
        String email = payload.get("email");
        String phoneNumber = payload.get("phoneNumber");
        String telegramChatId = payload.get("telegramChatId");

        if (username == null || username.trim().isEmpty() ||
            password == null || password.trim().isEmpty() ||
            fullName == null || fullName.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập đầy đủ các trường bắt buộc"));
        }

        if (userRepository.findByUsername(username.trim()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tên đăng nhập / Email này đã tồn tại"));
        }

        if (email == null || email.trim().isEmpty()) {
            email = username.trim();
        }

        User user = User.builder()
                .username(username.trim())
                .password(passwordEncoder.encode(password)) // Hash password with BCrypt
                .fullName(fullName.trim())
                .role("USER") // Default role for registering users is USER
                .email(email.trim())
                .phoneNumber(phoneNumber != null ? phoneNumber.trim() : null)
                .telegramChatId(telegramChatId != null ? telegramChatId.trim() : null)
                .build();

        userRepository.save(user);
        log.info("New user registered successfully: {}", username);
        return ResponseEntity.ok(Map.of("message", "Đăng ký tài khoản thành công!"));
    }
}
