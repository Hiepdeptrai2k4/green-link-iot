package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otpCode) {
        log.info("Preparing to send OTP email to: {} from: {}", toEmail, fromEmail);
        log.info("[OTP DEBUG] >>> MA OTP CHO TAI KHOAN {} LA: {} <<<", toEmail, otpCode);
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("[Green Link IOT] Ma xac thuc OTP dat lai mat khau");
            message.setText("Xin chao,\n\n"
                    + "Ban da yeu cau dat lai mat khau cho tai khoan Green Link IOT.\n"
                    + "Ma OTP xac nhan cua ban la: " + otpCode + "\n"
                    + "Ma nay co hieu luc trong vong 5 phut. Vui long khong chia se ma nay voi bat ky ai.\n\n"
                    + "Tran trong,\n"
                    + "Doi ngu Green Link IOT.");

            mailSender.send(message);
            log.info("OTP email sent successfully to: {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send OTP email via SMTP relay to: {}. Error: {}", toEmail, e.getMessage());
            // Log OTP code clearly in console so developer can copy it for offline testing
            log.warn("[OTP DEBUG] >>> MA OTP CHO TAI KHOAN {} LA: {} <<<", toEmail, otpCode);
        }
    }
}
