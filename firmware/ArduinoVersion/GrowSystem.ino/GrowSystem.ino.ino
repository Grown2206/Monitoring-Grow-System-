/*
 * GROW MONITORING SYSTEM v2.4 - FIXED FOR ESP32 CORE 3.0+
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

// Relais Pins (ON/OFF)
#define PIN_PUMP_1 16
#define PIN_PUMP_2 17
#define PIN_LIGHT 4
#define PIN_FAN 5

// PWM Pins (Erweiterte Steuerung)
#define PIN_FAN_PWM 18       // PWM für Abluftfilter (zu 0-10V Converter)
#define PIN_FAN_TACH 19      // Tachometer Input (FG Signal)

// RJ11 Grow Light Pins
#define PIN_RJ11_PWM 23      // PWM Dimming
#define PIN_RJ11_ENABLE 27   // Enable/Disable 

// ==========================================
// 3. OBJEKTE & GLOBALE VARIABLEN
// ==========================================
WiFiClient espClient;
PubSubClient client(espClient);
Adafruit_SHT31 sht31 = Adafruit_SHT31();
BH1750 lightMeter;

unsigned long lastMsg = 0;
#define MSG_INTERVAL 5000

// PWM Konfiguration
#define PWM_FREQ 25000        // 25 kHz PWM Frequenz
#define PWM_RESOLUTION 8      // 8-bit (0-255)

// HINWEIS: In ESP32 Core 3.0 werden "Channels" nicht mehr manuell definiert.
// Wir nutzen direkt die Pins. Die Definitionen für PWM_CHANNEL_... wurden entfernt.

// Aktuelle PWM Werte (0-100%)
int fanPWMValue = 0;
int lightPWMValue = 0;

// Tachometer
volatile unsigned long fanTachPulses = 0;
unsigned long lastTachCheck = 0;
int fanRPM = 0;

// ==========================================
// 4. FUNKTIONEN
// ==========================================

// Tachometer Interrupt Handler
void IRAM_ATTR tachISR() {
  // FIX: Warnung bei volatile ++ behoben
  fanTachPulses = fanTachPulses + 1;
}

// PWM Wert setzen (0-100%)
void setFanPWM(int percent) {
  fanPWMValue = constrain(percent, 0, 100);
  int dutyCycle = map(fanPWMValue, 0, 100, 0, 255);
  
  // FIX: Nutzung von PIN statt CHANNEL (ESP32 v3.0)
  ledcWrite(PIN_FAN_PWM, dutyCycle);
  
  Serial.print("Fan PWM gesetzt: ");
  Serial.print(fanPWMValue);
  Serial.println("%");
}

// RJ11 Light PWM setzen (0-100%)
void setLightPWM(int percent) {
  lightPWMValue = constrain(percent, 0, 100);
  int dutyCycle = map(lightPWMValue, 0, 100, 0, 255);
  
  // FIX: Nutzung von PIN statt CHANNEL (ESP32 v3.0)
  ledcWrite(PIN_RJ11_PWM, dutyCycle);
  
  Serial.print("Light PWM gesetzt: ");
  Serial.print(lightPWMValue);
  Serial.println("%");
}

// RJ11 Light Enable/Disable
void setLightEnable(bool enabled) {
  digitalWrite(PIN_RJ11_ENABLE, enabled ? HIGH : LOW);
  Serial.print("RJ11 Light: ");
  Serial.println(enabled ? "ENABLED" : "DISABLED");
}

// RPM aus Tachometer berechnen
void updateFanRPM() {
  unsigned long now = millis();
  if (now - lastTachCheck >= 1000) { // Jede Sekunde
    // Annahme: 2 Pulse pro Umdrehung (typisch für PC-Lüfter)
    fanRPM = (fanTachPulses * 60) / 2;
    fanTachPulses = 0;
    lastTachCheck = now;
  }
}

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
        else if (strcmp(action, "set_fan_pwm") == 0) {
          int pwmValue = doc["value"];
          setFanPWM(pwmValue);
        }
        else if (strcmp(action, "set_light_pwm") == 0) {
          int pwmValue = doc["value"];
          setLightPWM(pwmValue);
        }
        else if (strcmp(action, "set_light_enable") == 0) {
          bool enabled = doc["enabled"];
          setLightEnable(enabled);
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

  // Analog Inputs
  for(int i=0; i<6; i++) pinMode(PINS_SOIL_MOISTURE[i], INPUT);
  pinMode(PIN_TANK_LEVEL, INPUT);
  pinMode(PIN_GAS_SENSOR, INPUT);

  // Relais Outputs (ON/OFF)
  pinMode(PIN_PUMP_1, OUTPUT);
  pinMode(PIN_PUMP_2, OUTPUT);
  pinMode(PIN_LIGHT, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);

  // === PWM SETUP (FIXED FOR ESP32 CORE 3.0) ===
  
  // 1. Fan PWM Setup
  // Neue Syntax: ledcAttach(pin, freq, resolution)
  if (!ledcAttach(PIN_FAN_PWM, PWM_FREQ, PWM_RESOLUTION)) {
      Serial.println("Fehler beim Fan PWM Setup!");
  }
  ledcWrite(PIN_FAN_PWM, 0); // Start bei 0%

  // 2. Grow Light PWM Setup (Fehlerbehebung)
  // Alte Syntax (ledcSetup/ledcAttachPin) entfernt.
  // Neue Syntax:
  if (!ledcAttach(PIN_RJ11_PWM, PWM_FREQ, PWM_RESOLUTION)) {
      Serial.println("Fehler beim Light PWM Setup!");
  }
  ledcWrite(PIN_RJ11_PWM, 0); // Start bei 0%

  // RJ11 Enable Pin
  pinMode(PIN_RJ11_ENABLE, OUTPUT);
  digitalWrite(PIN_RJ11_ENABLE, LOW); // Start disabled

  // Tachometer Interrupt
  pinMode(PIN_FAN_TACH, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FAN_TACH), tachISR, FALLING);

  // Sensoren
  if (!sht31.begin(0x44)) Serial.println("SHT31 Fehler");
  if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) Serial.println("BH1750 Fehler");

  setup_wifi();
  client.setServer(MQTT_SERVER, MQTT_PORT);
  client.setCallback(callback);

  Serial.println("✅ PWM & RJ11 Steuerung initialisiert (Core 3.0)");
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // RPM kontinuierlich berechnen
  updateFanRPM();

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

    // PWM & RPM Daten hinzufügen
    doc["fanPWM"] = fanPWMValue;
    doc["lightPWM"] = lightPWMValue;
    doc["fanRPM"] = fanRPM;

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