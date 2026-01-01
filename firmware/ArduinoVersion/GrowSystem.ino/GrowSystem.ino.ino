/*
 * GROW MONITORING SYSTEM v2.4 - FINAL VERSION
 * Für Arduino IDE
 * Benötigte Bibliotheken:
 * - PubSubClient (für MQTT)
 * - ArduinoJson (v7 kompatibel)
 * - Adafruit SHT31
 * - BH1750
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <ArduinoJson.h>

// ==========================================
// 1. KONFIGURATION
// ==========================================
const char* WIFI_SSID = "WLAN-915420";
const char* WIFI_PASSWORD = "78118805138223696181";

const char* MQTT_SERVER = "test.mosquitto.org"; 
const int MQTT_PORT = 1883;

// EINZIGARTIGE TOPICS (MÜSSEN MIT BACKEND ÜBEREINSTIMMEN)
const char* MQTT_TOPIC_DATA = "grow_drexl_v2/data";
const char* MQTT_TOPIC_CONFIG = "grow_drexl_v2/config";
const char* MQTT_TOPIC_COMMAND = "grow_drexl_v2/command";

// ==========================================
// 2. PIN DEFINITIONEN
// ==========================================
const int PINS_SOIL_MOISTURE[6] = { 36, 39, 34, 35, 32, 33 };
#define PIN_TANK_LEVEL 25
#define PIN_GAS_SENSOR 26

#define PIN_PUMP_1 16
#define PIN_PUMP_2 17
#define PIN_LIGHT 4 
#define PIN_FAN 5 

// ==========================================
// 3. OBJEKTE
// ==========================================
WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_SHT31 sht31 = Adafruit_SHT31();
BH1750 lightMeter;

unsigned long lastMsg = 0;
#define MSG_INTERVAL 5000 

// ==========================================
// 4. FUNKTIONEN
// ==========================================
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Verbinde mit WLAN: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWLAN verbunden!");
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message;
  for (int i = 0; i < length; i++) message += (char)payload[i];
  
  Serial.print("Nachricht auf ["); Serial.print(topic); Serial.print("]: ");
  Serial.println(message);

  // ArduinoJson v7 Syntax
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message);

  if (!error) {
    if (String(topic) == MQTT_TOPIC_COMMAND) {
      const char* action = doc["action"];
      
      if (action) {
        if (strcmp(action, "reboot") == 0) {
          Serial.println("REBOOT BEFEHL ERHALTEN!");
          ESP.restart();
        }
        else if (strcmp(action, "set_relay") == 0) {
          const char* relay = doc["relay"];
          bool state = doc["state"];
          
          int pinToSwitch = -1;
          
          if (strcmp(relay, "light") == 0) pinToSwitch = PIN_LIGHT;
          else if (strcmp(relay, "fan_exhaust") == 0) pinToSwitch = PIN_FAN;
          else if (strcmp(relay, "pump_main") == 0) pinToSwitch = PIN_PUMP_1;
          else if (strcmp(relay, "pump_mix") == 0) pinToSwitch = PIN_PUMP_2;

          if (pinToSwitch != -1) {
            digitalWrite(pinToSwitch, state ? HIGH : LOW);
            Serial.print("Relais geschaltet: ");
            Serial.print(relay);
            Serial.print(" -> ");
            Serial.println(state ? "AN" : "AUS");
          }
        }
      }
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Verbinde mit MQTT (Cloud)...");
    String clientId = "ESP32-Drexl-" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      Serial.println("verbunden!");
      client.subscribe(MQTT_TOPIC_CONFIG);
      client.subscribe(MQTT_TOPIC_COMMAND);
    } else {
      Serial.print("Fehler, rc="); Serial.print(client.state());
      Serial.println(" warte 5s...");
      delay(5000);
    }
  }
}

// ==========================================
// 5. SETUP & LOOP
// ==========================================
void setup() {
  Serial.begin(115200);
  
  for(int i=0; i<6; i++) pinMode(PINS_SOIL_MOISTURE[i], INPUT);
  pinMode(PIN_TANK_LEVEL, INPUT);
  pinMode(PIN_GAS_SENSOR, INPUT);
  
  pinMode(PIN_PUMP_1, OUTPUT);
  pinMode(PIN_PUMP_2, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);

  if (!sht31.begin(0x44)) Serial.println("SHT31 Fehler");
  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) Serial.println("BH1750 Fehler");

  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  unsigned long now = millis();
  if (now - lastMsg > MSG_INTERVAL) {
    lastMsg = now;

    // ArduinoJson v7 Syntax
    JsonDocument doc;
    
    float t = sht31.readTemperature();
    float h = sht31.readHumidity();
    
    doc["temp"] = isnan(t) ? 0.0 : t;
    doc["humidity"] = isnan(h) ? 0.0 : h;
    doc["lux"] = lightMeter.readLightLevel();
    doc["tank"] = analogRead(PIN_TANK_LEVEL);
    doc["gas"] = analogRead(PIN_GAS_SENSOR);

    JsonArray soil = doc["soil"].to<JsonArray>();
    for(int i=0; i<6; i++) {
      soil.add(analogRead(PINS_SOIL_MOISTURE[i]));
    }

    char buffer[1024];
    serializeJson(doc, buffer);
    
    if(client.publish(MQTT_TOPIC_DATA, buffer)) {
      Serial.print("Daten gesendet an: ");
      Serial.println(MQTT_TOPIC_DATA);
    } else {
      Serial.println("Fehler beim Senden");
    }
  }
}