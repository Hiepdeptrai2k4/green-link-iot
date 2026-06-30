package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class TelegramAlertService {

    @Value("${telegram.bot.token}")
    private String botToken;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendAlert(String chatId, String messageText) {
        if (chatId == null || chatId.trim().isEmpty()) {
            log.warn("Telegram chatId is null or empty, skipping alert.");
            return;
        }

        if (botToken == null || "YOUR_BOT_TOKEN_HERE".equals(botToken) || botToken.trim().isEmpty()) {
            log.warn("Telegram bot token is not configured (equals placeholder), skipping alert.");
            return;
        }

        String url = "https://api.telegram.org/bot" + botToken + "/sendMessage";

        Map<String, Object> request = new HashMap<>();
        request.put("chat_id", chatId);
        request.put("text", messageText);
        request.put("parse_mode", "HTML");

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Telegram alert sent successfully to chatId: {}", chatId);
            } else {
                log.error("Failed to send Telegram alert. HTTP Status: {}", response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Error invoking Telegram Bot API: {}", e.getMessage());
        }
    }
}
