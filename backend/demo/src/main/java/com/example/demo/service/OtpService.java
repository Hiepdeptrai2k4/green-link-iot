package com.example.demo.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static class OtpData {
        String code;
        LocalDateTime expiryTime;

        OtpData(String code, LocalDateTime expiryTime) {
            this.code = code;
            this.expiryTime = expiryTime;
        }
    }

    private final Map<String, OtpData> otpMap = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public String generateOtp(String username) {
        String otp = String.format("%06d", random.nextInt(1000000));
        LocalDateTime expiry = LocalDateTime.now().plusMinutes(5); // 5 minutes expiration
        otpMap.put(username, new OtpData(otp, expiry));
        return otp;
    }

    public boolean verifyOtp(String username, String code) {
        OtpData data = otpMap.get(username);
        if (data == null) {
            return false;
        }
        if (LocalDateTime.now().isAfter(data.expiryTime)) {
            otpMap.remove(username); // Clean up expired OTP
            return false;
        }
        return data.code.equals(code);
    }

    public void clearOtp(String username) {
        otpMap.remove(username);
    }
}
