#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <BH1750.h>
#include <DHT.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h> // Nhớ cài thư viện này để xử lý chuỗi JSON dễ dàng


const char* mqtt_server = "851f3e8bbdcd4048b1cf2c692d982b0d.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "hivemq.webclient.1775647448370";
const char* mqtt_pass = "5ApgFKBo.hMx17*,i3X%";

const char* topicData = "hiep/User_Hiep_01/data";       // Topic gửi dữ liệu lên
const char* topicControl = "hiep/User_Hiep_01/control"; // Topic nhận lệnh điều khiển về

WiFiClientSecure espClient;
PubSubClient client(espClient);


#define LCD_SDA 21     
#define LCD_SCL 22
#define BH_SDA 18      
#define BH_SCL 16
#define DHTPIN 4       
#define DHTTYPE DHT11
#define SOIL_PIN 34    

#define RELAY_LIGHT 14 
#define RELAY_PUMP 23  
#define RELAY_FAN 19   

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2); 
TwoWire I2C_BH1750 = TwoWire(1); 
BH1750 lightMeter;

// Ngưỡng tự động
const float NGUONG_NONG = 32.0;    
const int NGUONG_KHO = 40;         
const float NGUONG_TOI = 150.0;    

// Biến điều khiển
unsigned long lastUpdate = 0;
unsigned long lastReconnectAttempt = 0;
const long interval = 3000; // Đọc cảm biến mỗi 3 giây
bool heartbeatState = false;
bool isAutoMode = true;     // Chế độ: Tự động (true) hoặc Thủ công (false)


void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Co tin nhan moi tu topic: ");
  Serial.println(topic);

  // Chuyển payload thành chuỗi String
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Noi dung: " + message);

  // Giải mã JSON. 
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);

  if (error) {
    Serial.println("Loi giai ma JSON!");
    return;
  }

  String device = doc["device"]; 
  String status = doc["status"]; 

  // Chuyển lệnh thành hành động phần cứng 
  if (device == "system" && status == "AUTO") {
    isAutoMode = true;
    Serial.println("-> CHUYEN VE CHE DO TU DONG");
  } 
  else {
    // Nếu có lệnh can thiệp thủ công, tắt chế độ Auto
    isAutoMode = false; 
    Serial.println("-> CHUYEN SANG CHE DO THU CONG");

    if (device == "fan") {
      if (status == "ON") digitalWrite(RELAY_FAN, HIGH);
      else if (status == "OFF") digitalWrite(RELAY_FAN, LOW);
    } 
    else if (device == "pump") {
      if (status == "ON") digitalWrite(RELAY_PUMP, HIGH);
      else if (status == "OFF") digitalWrite(RELAY_PUMP, LOW);
    } 
    else if (device == "light" || device == "led") {
      if (status == "ON") digitalWrite(RELAY_LIGHT, HIGH);
      else if (status == "OFF") digitalWrite(RELAY_LIGHT, LOW);
    }
  }
}


void setup() {
  Serial.begin(115200);

  // 1. Setup Relay
  pinMode(RELAY_LIGHT, OUTPUT);
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_FAN, OUTPUT);
  digitalWrite(RELAY_LIGHT, LOW);
  digitalWrite(RELAY_PUMP, LOW);
  digitalWrite(RELAY_FAN, LOW);

  // 2. Setup I2C & Màn hình LCD trước tiên
  Wire.begin(LCD_SDA, LCD_SCL);
  I2C_BH1750.begin(BH_SDA, BH_SCL);
  delay(500); 

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Ket noi WiFi...");

  // 3. Khởi tạo WiFiManager
  WiFiManager wm;
  wm.resetSettings(); // Xóa Wi-Fi cũ để luôn hiển thị Captive Portal khi cấu hình lại
  if (!wm.autoConnect("ESP32_GARDEN_HIEP", "12345678")) {
    Serial.println("Loi ket noi WiFi!");
    delay(3000);
    ESP.restart();
  }
  lcd.setCursor(0, 0);
  lcd.print("WiFi OK!        ");

  // 4. Khởi tạo MQTT
  espClient.setInsecure(); // Bắt buộc cho port 8883
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);

  // 5. Khởi tạo Cảm biến
  dht.begin();
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &I2C_BH1750)) {
    Serial.println("BH1750 OK!");
  }

  delay(1500);
  lcd.clear();
}

// Hàm kết nối lại MQTT mà không làm treo mạch
void reconnectMQTT() {
  if (!client.connected()) {
    if (millis() - lastReconnectAttempt > 5000) { // Thử lại sau mỗi 5s
      lastReconnectAttempt = millis();
      Serial.print("Dang ket noi HiveMQ...");
      String clientId = "ESP32_Hiep_" + String(random(0, 0xffff), HEX);
      
      if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
        Serial.println("Thanh cong!");
        // Đăng ký nhận lệnh từ Backend
        client.subscribe(topicControl); 
      } else {
        Serial.print("Loi, rc=");
        Serial.println(client.state());
      }
    }
  }
}


void loop() {
  // Giữ kết nối MQTT và lắng nghe tin nhắn
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      reconnectMQTT();
    } else {
      client.loop(); // Lắng nghe Callback
    }
  }

  unsigned long currentMillis = millis();

  // Cập nhật cảm biến và logic mỗi 3 giây
  if (currentMillis - lastUpdate >= interval) {
    lastUpdate = currentMillis;

    // --- ĐỌC CẢM BIẾN ---
    float temp = dht.readTemperature();
    float humi = dht.readHumidity();
    float lux = lightMeter.readLightLevel();
    int rawSoil = analogRead(SOIL_PIN);
    int soilPercent = map(rawSoil, 4095, 0, 0, 100);

    if(soilPercent < 0) soilPercent = 0;
    if(soilPercent > 100) soilPercent = 100;

    // Hiệu chuẩn độ ẩm đất:
    // rawSoil khi khô hoàn toàn trong không khí ~ 4095 (0% độ ẩm)
    // rawWetLimit là giá trị thô đo được khi ngập nước hoàn toàn (100% độ ẩm)
    // Bạn hãy điều chỉnh số 1500 dưới đây khớp với giá trị rawSoil nhỏ nhất đo được khi nhúng cảm biến vào nước.
    int rawWetLimit = 1500; 
    int calibratedPercent = map(rawSoil, 4095, rawWetLimit, 0, 100);
    if(calibratedPercent < 0) calibratedPercent = 0;
    if(calibratedPercent > 100) calibratedPercent = 100;

    // In ra Serial Console để theo dõi hiệu chuẩn
    Serial.print("[SOIL SENSOR] Raw Analog: ");
    Serial.print(rawSoil);
    Serial.print(" | LCD Percent (0-4095): ");
    Serial.print(soilPercent);
    Serial.print("% | Calibrated Percent (1500-4095): ");
    Serial.print(calibratedPercent);
    Serial.println("%");

    if (lux < 0 || lux > 65000) {
      I2C_BH1750.begin(BH_SDA, BH_SCL);
      lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, 0x23, &I2C_BH1750);
      lux = 0;
    }

    // --- LOGIC ĐIỀU KHIỂN ---
    if (isAutoMode) {
      // Chỉ tự động điều khiển khi ở chế độ AUTO
      if (!isnan(lux)) {
        if (lux < NGUONG_TOI) digitalWrite(RELAY_LIGHT, HIGH);
        else digitalWrite(RELAY_LIGHT, LOW);
      }
      if (!isnan(temp)) {
        if (temp > NGUONG_NONG) digitalWrite(RELAY_FAN, HIGH);
        else digitalWrite(RELAY_FAN, LOW);
      }
      if (soilPercent < NGUONG_KHO) digitalWrite(RELAY_PUMP, HIGH);
      else digitalWrite(RELAY_PUMP, LOW);
    }

    // --- ĐÓNG GÓI JSON & GỬI LÊN HIVEMQ ---
    if (client.connected()) {
      StaticJsonDocument<200> docOut;
      docOut["temp"] = isnan(temp) ? 0 : temp;
      docOut["humi"] = isnan(humi) ? 0 : humi;
      docOut["lux"] = (int)lux;
      docOut["soil"] = soilPercent;
      
      // Gửi kèm trạng thái rơ le thực tế và chế độ để Backend theo dõi
      docOut["led"] = digitalRead(RELAY_LIGHT);
      docOut["fan"] = digitalRead(RELAY_FAN);
      docOut["pump"] = digitalRead(RELAY_PUMP);
      docOut["mode"] = isAutoMode ? "AUTO" : "MANUAL";

      char jsonBuffer[200];
      serializeJson(docOut, jsonBuffer);
      client.publish(topicData, jsonBuffer);
    }

    // --- HIỂN THỊ LCD ---
    lcd.setCursor(0, 0);
    lcd.print("T:");
    if (isnan(temp)) lcd.print("ERR ");
    else { lcd.print(temp, 1); lcd.print("C"); }
    lcd.print(" ");

    lcd.setCursor(8, 0);
    lcd.print("H:");
    if (isnan(humi)) lcd.print("ERR ");
    else { lcd.print(humi, 0); lcd.print("%"); }
    lcd.print("  ");

    lcd.setCursor(0, 1);
    lcd.print("Lx:");
    if (lux < 0) lcd.print("ERR ");
    else lcd.print((int)lux);
    lcd.print("  ");

    lcd.setCursor(8, 1);
    lcd.print("Dat:");
    lcd.print(soilPercent);
    lcd.print("%  ");

    heartbeatState = !heartbeatState;
    lcd.setCursor(15, 0);
    if (heartbeatState) lcd.print("*");
    else lcd.print(" ");
  }
}