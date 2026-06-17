package com.example.demo.service;

import com.example.demo.model.ActuatorHistory;
import com.example.demo.model.AutoConfig;
import com.example.demo.model.Device;
import com.example.demo.model.SensorData;
import com.example.demo.repository.ActuatorHistoryRepository;
import com.example.demo.repository.AutoConfigRepository;
import com.example.demo.repository.DeviceRepository;
import com.example.demo.repository.SensorDataRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class MqttGatewayService implements MqttCallback {

    private static final String BROKER_URI = "ssl://851f3e8bbdcd4048b1cf2c692d982b0d.s1.eu.hivemq.cloud:8883";
    private static final String USERNAME = "hivemq.webclient.1775647448370";
    private static final String PASSWORD = "5ApgFKBo.hMx17*,i3X%";
    private static final String WILDCARD_TOPIC = "hiep/#";

    private final DeviceRepository deviceRepository;
    private final SensorDataRepository sensorDataRepository;
    private final ActuatorHistoryRepository actuatorHistoryRepository;
    private final AutoConfigRepository autoConfigRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;

    private IMqttClient mqttClient;
    private final Map<String, SensorData> latestSensorDataMap = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    @PostConstruct
    public void init() {
        new Thread(this::connectToMqttBroker).start();
        startSimulationLoop();
    }

    private void startSimulationLoop() {
        scheduler.scheduleAtFixedRate(() -> {
            try {
                if (mqttClient == null || !mqttClient.isConnected()) {
                    return;
                }
                
                List<Device> devices = deviceRepository.findAll();
                LocalDateTime now = LocalDateTime.now();
                
                for (Device d : devices) {
                    // Check if this device has sent telemetry data in the last 15 seconds
                    Optional<SensorData> latestData = sensorDataRepository.findFirstByDeviceDeviceIdOrderByTimestampDesc(d.getDeviceId());
                    boolean needsSimulation = true;
                    if (latestData.isPresent()) {
                        LocalDateTime ts = latestData.get().getTimestamp();
                        if (ts != null && ts.isAfter(now.minusSeconds(15))) {
                            needsSimulation = false;
                        }
                    }
                    
                    if (needsSimulation) {
                        int idHash = Math.abs(d.getDeviceId().hashCode() % 1000);
                        double baseTempOffset = (d.getDeviceId().contains("02")) ? 4.0 : 0.0;
                        double baseHumiOffset = (d.getDeviceId().contains("02")) ? -10.0 : 0.0;
                        double baseLuxOffset = (d.getDeviceId().contains("02")) ? -400.0 : 0.0;
                        double baseSoilOffset = (d.getDeviceId().contains("02")) ? -10.0 : 0.0;

                        double temp = 25.0 + baseTempOffset + Math.sin((System.currentTimeMillis() + idHash * 1000L) / 100000.0) * 4.0 + Math.random() * 0.5;
                        double humi = 68.0 + baseHumiOffset + Math.cos((System.currentTimeMillis() - idHash * 1000L) / 100000.0) * 8.0 + Math.random();
                        double lux = 1200.0 + baseLuxOffset + Math.sin((System.currentTimeMillis() + idHash * 500L) / 50000.0) * 300.0 + Math.random() * 10.0;
                        if (lux < 0) lux = 0;
                        int soil = (int) (55 + baseSoilOffset + Math.sin((System.currentTimeMillis() - idHash * 800L) / 80000.0) * 10 + Math.random() * 2);
                        
                        Map<String, Object> payloadMap = new HashMap<>();
                        payloadMap.put("temp", Math.round(temp * 10.0) / 10.0);
                        payloadMap.put("humi", Math.round(humi * 10.0) / 10.0);
                        payloadMap.put("lux", Math.round(lux));
                        payloadMap.put("soil", soil);
                        payloadMap.put("led", "OFF");
                        payloadMap.put("fan", "OFF");
                        payloadMap.put("pump", "OFF");
                        payloadMap.put("mode", "MANUAL");

                        String jsonPayload = objectMapper.writeValueAsString(payloadMap);
                        MqttMessage mqttMessage = new MqttMessage(jsonPayload.getBytes(StandardCharsets.UTF_8));
                        mqttMessage.setQos(0);
                        
                        String topic = "hiep/" + d.getDeviceId() + "/data";
                        mqttClient.publish(topic, mqttMessage);
                        log.info("[SIMULATOR] Published mock telemetry for inactive device {} to topic [{}]: {}", d.getDeviceId(), topic, jsonPayload);
                    }
                }
            } catch (Exception e) {
                log.error("Error in simulator loop", e);
            }
        }, 10, 5, TimeUnit.SECONDS);
    }

    private void connectToMqttBroker() {
        try {
            String clientId = "GreenLinkBackend_" + MqttClient.generateClientId();
            mqttClient = new MqttClient(BROKER_URI, clientId, new MemoryPersistence());
            
            MqttConnectOptions connOpts = new MqttConnectOptions();
            connOpts.setCleanSession(true);
            connOpts.setUserName(USERNAME);
            connOpts.setPassword(PASSWORD.toCharArray());
            connOpts.setAutomaticReconnect(true);
            connOpts.setConnectionTimeout(30);
            connOpts.setKeepAliveInterval(60);

            log.info("Connecting to HiveMQ Cloud Broker: {}", BROKER_URI);
            mqttClient.setCallback(this);
            mqttClient.connect(connOpts);
            log.info("Successfully connected to HiveMQ Broker!");

            mqttClient.subscribe(WILDCARD_TOPIC, 1);
            log.info("Subscribed to wildcard topic: {}", WILDCARD_TOPIC);

        } catch (MqttException e) {
            log.error("Failed to connect to HiveMQ Cloud Broker", e);
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.warn("MQTT Connection lost: {}", cause.getMessage());
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        String payload = new String(message.getPayload(), StandardCharsets.UTF_8);
        log.debug("Received MQTT message on topic [{}]: {}", topic, payload);

        // Filter and process sensor data topic (contains "/data" or is the default compatibility topic)
        if (topic.endsWith("/data") || topic.equals("hiep/User_Hiep_01/data")) {
            try {
                // Dynamically extract deviceId from topic: e.g. "hiep/User_Hiep_01/data" -> parts[1] = "User_Hiep_01"
                String deviceId = "User_Hiep_01"; // default fallback
                String[] parts = topic.split("/");
                if (parts.length >= 3) {
                    deviceId = parts[1];
                }

                // Look up device in database
                Optional<Device> deviceOpt = deviceRepository.findById(deviceId);
                if (deviceOpt.isPresent()) {
                    Device device = deviceOpt.get();
                    
                    // Parse incoming JSON telemetry
                    TelemetryPayload rawData = objectMapper.readValue(payload, TelemetryPayload.class);
                    
                    // Process AUTO mode logic for thresholds
                    runAutoLogic(device, rawData);

                    // Map DTO payload to SensorData JPA entity
                    SensorData sensorData = SensorData.builder()
                            .device(device)
                            .temperature(rawData.getTemp())
                            .humidity(rawData.getHumi())
                            .lux(rawData.getLux())
                            .soilMoisture(rawData.getSoil() != null ? rawData.getSoil().intValue() : 0)
                            .timestamp(LocalDateTime.now())
                            .build();

                    // Persist to MySQL sensor_data table
                    sensorDataRepository.save(sensorData);

                    // Update latest in-memory cache
                    latestSensorDataMap.put(device.getDeviceId(), sensorData);

                    // Build and broadcast UI telemetry update payload
                    Map<String, Object> uiPayload = new HashMap<>();
                    uiPayload.put("temp", sensorData.getTemperature());
                    uiPayload.put("humi", sensorData.getHumidity());
                    uiPayload.put("lux", sensorData.getLux());
                    uiPayload.put("soil", sensorData.getSoilMoisture());
                    uiPayload.put("led", rawData.getLed());
                    uiPayload.put("fan", rawData.getFan());
                    uiPayload.put("pump", rawData.getPump());
                    uiPayload.put("mode", rawData.getMode());

                    if (device.getStatus() != null && device.getStatus()) {
                        String wsTopic = "/topic/garden/" + device.getDeviceId();
                        messagingTemplate.convertAndSend(wsTopic, uiPayload);
                        log.info("Broadcasted live data to WebSocket topic: {}", wsTopic);
                    } else {
                        log.debug("Skipping WebSocket broadcast: Device '{}' is not active/connected.", device.getDeviceId());
                    }
                } else {
                    log.warn("Received data for unregistered device ID: {}", deviceId);
                }
                
            } catch (Exception e) {
                log.error("Failed to parse and record MQTT telemetry payload", e);
            }
        }
    }

    private void runAutoLogic(Device device, TelemetryPayload rawData) {
        Optional<AutoConfig> configOpt = autoConfigRepository.findByDeviceDeviceId(device.getDeviceId());
        if (configOpt.isPresent()) {
            AutoConfig config = configOpt.get();
            if ("AUTO".equalsIgnoreCase(config.getMode())) {
                
                // 1. Soil moisture trigger -> Pump ON
                if (rawData.getSoil() != null && config.getMinSoilMoisture() != null) {
                    if (rawData.getSoil() < config.getMinSoilMoisture()) {
                        log.info("[AUTO IRRIGATION] Soil moisture {}% < minimum {}% on device {}. Activating pump.",
                                rawData.getSoil(), config.getMinSoilMoisture(), device.getDeviceId());
                        sendControlCommandSilent(device, "pump", "ON");
                        rawData.setPump("ON");
                    }
                }

                // 2. High temperature trigger -> Fan ON
                if (rawData.getTemp() != null && config.getMaxTemperature() != null) {
                    if (rawData.getTemp() > config.getMaxTemperature()) {
                        log.info("[AUTO COOLING] Temperature {}°C > maximum {}°C on device {}. Activating fan.",
                                rawData.getTemp(), config.getMaxTemperature(), device.getDeviceId());
                        sendControlCommandSilent(device, "fan", "ON");
                        rawData.setFan("ON");
                    }
                }
            }
        }
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        log.debug("MQTT Delivery complete");
    }

    /**
     * Fetch latest sensor telemetry from in-memory cache
     */
    public SensorData getLatestSensorData(String deviceId) {
        return latestSensorDataMap.computeIfAbsent(deviceId, id -> 
            sensorDataRepository.findFirstByDeviceDeviceIdOrderByTimestampDesc(id).orElse(null)
        );
    }

    /**
     * Publishes a control command payload and logs the action to database actuator_history.
     */
    public void sendControlCommand(String deviceId, String device, String status) {
        Device dev = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new IllegalArgumentException("Device not found: " + deviceId));
        sendControlCommandSilent(dev, device, status);
    }

    /**
     * Internal command publisher that publishes to "hiep/{deviceId}/control"
     * and logs to MySQL actuator_history.
     */
    private void sendControlCommandSilent(Device device, String deviceKey, String status) {
        if (mqttClient == null || !mqttClient.isConnected()) {
            log.error("Cannot publish message. MQTT Client is not connected!");
            throw new IllegalStateException("MQTT Client is not connected to broker");
        }

        try {
            Map<String, String> commandMap = new HashMap<>();
            commandMap.put("device", deviceKey);
            commandMap.put("status", status);

            String jsonPayload = objectMapper.writeValueAsString(commandMap);
            MqttMessage mqttMessage = new MqttMessage(jsonPayload.getBytes(StandardCharsets.UTF_8));
            mqttMessage.setQos(1);
            
            // Dynamic outbound control topic matching your broker setup: "hiep/{deviceId}/control"
            String outboundTopic = "hiep/" + device.getDeviceId() + "/control";
            log.info("Publishing control command to [{}]: {}", outboundTopic, jsonPayload);
            mqttClient.publish(outboundTopic, mqttMessage);

            // Save to MySQL actuator_history
            ActuatorHistory history = ActuatorHistory.builder()
                    .device(device)
                    .actuatorName(deviceKey.toUpperCase())
                    .action("ON".equalsIgnoreCase(status))
                    .timestamp(LocalDateTime.now())
                    .build();
            actuatorHistoryRepository.save(history);
            log.info("Logged actuator action to DB: {} -> {}", deviceKey.toUpperCase(), status);

        } catch (Exception e) {
            log.error("Failed to publish control command or save actuator history", e);
            throw new RuntimeException("Failed to send command to device", e);
        }
    }

    @PreDestroy
    public void cleanup() {
        try {
            scheduler.shutdown();
        } catch (Exception e) {
            log.error("Error shutting down scheduler", e);
        }
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                log.info("Disconnecting from MQTT Broker...");
                mqttClient.disconnect();
                mqttClient.close();
            }
        } catch (MqttException e) {
            log.error("Error cleaning up MQTT Client", e);
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TelemetryPayload {
        private Double temp;
        private Double humi;
        private Double lux;
        private Double soil;
        private String led;
        private String fan;
        private String pump;
        private String mode;
    }
}
