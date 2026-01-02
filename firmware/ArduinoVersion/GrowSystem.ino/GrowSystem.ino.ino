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

// NÄHRSTOFF-TOPICS
const char* MQTT_TOPIC_NUTRIENT_CMD = "grow/esp32/nutrients/command";
const char* MQTT_TOPIC_NUTRIENT_STATUS = "grow/esp32/nutrients/status";
const char* MQTT_TOPIC_NUTRIENT_SENSORS = "grow/esp32/nutrients/sensors";

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

// Nährstoff-Pumpe (neu hinzugefügt)
#define PIN_NUTRIENT_PUMP 21     // Relais für Nährstoff-Pumpe
#define PIN_LEVEL_SENSOR 22      // Analog-Füllstands-Sensor (optional) 

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

// Nährstoff-Pumpen-Variablen
bool nutrientPumpRunning = false;
unsigned long nutrientPumpStartTime = 0;
unsigned long nutrientPumpDuration = 0;
float totalDosed_ml = 0;
#define DEFAULT_FLOW_RATE 100    // ml/min (muss kalibriert werden!)

// Sensor-Werte (simuliert wenn keine Sensoren vorhanden)
float currentEC = 0.0;
float currentPH = 0.0;
int reservoirLevel_percent = 100;

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

// ==========================================
// NÄHRSTOFF-PUMPEN FUNKTIONEN
// ==========================================

// Sensoren lesen (simuliert - später durch echte Sensoren ersetzen)
void readNutrientSensors() {
  // Füllstands-Sensor (Analog 0-4095)
  int levelRaw = analogRead(PIN_LEVEL_SENSOR);
  reservoirLevel_percent = map(levelRaw, 0, 4095, 0, 100);

  // EC/pH simuliert (später: Atlas Scientific Integration)
  currentEC = 1.2 + random(-10, 10) / 100.0;
  currentPH = 6.0 + random(-5, 5) / 100.0;
}

// Nährstoff-Pumpe starten
void startNutrientPump() {
  digitalWrite(PIN_NUTRIENT_PUMP, HIGH);
  nutrientPumpRunning = true;
  nutrientPumpStartTime = millis();

  Serial.println("▶ Nährstoff-Pumpe GESTARTET");

  // Status publishen
  JsonDocument doc;
  doc["status"] = "dosing";
  doc["pumpRunning"] = true;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);
}

// Nährstoff-Pumpe stoppen
void stopNutrientPump() {
  digitalWrite(PIN_NUTRIENT_PUMP, LOW);
  nutrientPumpRunning = false;

  unsigned long elapsed = millis() - nutrientPumpStartTime;
  float dosed_ml = (elapsed / 1000.0 / 60.0) * DEFAULT_FLOW_RATE;
  totalDosed_ml += dosed_ml;

  Serial.printf("■ Nährstoff-Pumpe GESTOPPT (%.1f ml dosiert)\n", dosed_ml);

  // Status publishen
  JsonDocument doc;
  doc["status"] = "idle";
  doc["pumpRunning"] = false;
  doc["timestamp"] = millis();

  char buffer[256];
  serializeJson(doc, buffer);
  client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);
}

// Dosierungs-Command verarbeiten
void handleNutrientDoseCommand(JsonDocument& doc) {
  Serial.println("=== Nährstoff-Dosierungs-Command empfangen ===");

  // Sicherheits-Check: Pumpe läuft bereits?
  if (nutrientPumpRunning) {
    Serial.println("✗ Pumpe läuft bereits!");
    JsonDocument errorDoc;
    errorDoc["status"] = "error";
    errorDoc["error"] = "Pump already running";
    char buffer[256];
    serializeJson(errorDoc, buffer);
    client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);
    return;
  }

  // Parameter extrahieren
  JsonArray dosageArray = doc["dosage"];
  if (dosageArray.size() == 0) {
    Serial.println("✗ Keine Dosierungs-Daten!");
    return;
  }

  JsonObject firstDosage = dosageArray[0];
  float volume_ml = firstDosage["volume_ml"] | 0;
  int flowRate = firstDosage["flowRate_ml_per_min"] | DEFAULT_FLOW_RATE;
  bool measureAfter = doc["measureAfter"] | false;

  Serial.printf("Volumen: %.1f ml, Flow-Rate: %d ml/min\n", volume_ml, flowRate);

  // Validierung
  if (volume_ml <= 0 || volume_ml > 1000) {
    Serial.println("✗ Ungültiges Volumen!");
    return;
  }

  // Sensor-Werte VOR Dosierung messen
  readNutrientSensors();
  float ecBefore = currentEC;
  float phBefore = currentPH;

  // Dauer berechnen
  float duration_seconds = (volume_ml / (float)flowRate) * 60.0;
  nutrientPumpDuration = (unsigned long)(duration_seconds * 1000);

  Serial.printf("Berechnete Dauer: %.1f Sekunden\n", duration_seconds);

  // Pumpe starten
  startNutrientPump();

  // Warten bis fertig (non-blocking über loop)
  // Die loop() prüft ob nutrientPumpDuration abgelaufen ist
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
    // Haupt-System Commands
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

    // Nährstoff-Pumpen Commands
    else if (String(topic) == MQTT_TOPIC_NUTRIENT_CMD) {
      const char* action = doc["action"];
      if (action) {
        if (strcmp(action, "dose") == 0) {
          handleNutrientDoseCommand(doc);
        }
        else if (strcmp(action, "stop") == 0) {
          if (nutrientPumpRunning) {
            stopNutrientPump();
          }
        }
        else if (strcmp(action, "measure") == 0) {
          readNutrientSensors();
          // Sensor-Daten publishen
          JsonDocument sensorDoc;
          sensorDoc["ec"] = currentEC;
          sensorDoc["ph"] = currentPH;
          sensorDoc["temp"] = sht31.readTemperature();  // Nutze vorhandenen SHT31 Temp-Sensor
          sensorDoc["reservoirLevel_percent"] = reservoirLevel_percent;
          sensorDoc["totalDosed_ml"] = totalDosed_ml;

          char buffer[512];
          serializeJson(sensorDoc, buffer);
          client.publish(MQTT_TOPIC_NUTRIENT_SENSORS, buffer);
          Serial.println("Nährstoff-Sensordaten gesendet");
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
      client.subscribe(MQTT_TOPIC_NUTRIENT_CMD);  // Nährstoff-Commands
      Serial.println("Subscribed: Haupt-System + Nährstoffe");
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

  // Nährstoff-Pumpe (neu)
  pinMode(PIN_NUTRIENT_PUMP, OUTPUT);
  digitalWrite(PIN_NUTRIENT_PUMP, LOW);  // Pumpe aus
  pinMode(PIN_LEVEL_SENSOR, INPUT);      // Füllstands-Sensor

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

  // Nährstoff-Pumpen-Timer prüfen
  if (nutrientPumpRunning) {
    unsigned long elapsed = millis() - nutrientPumpStartTime;

    if (elapsed >= nutrientPumpDuration) {
      stopNutrientPump();

      // Nach Dosierung: Sensoren messen & Completion-Response senden
      delay(5000);  // 5 Sek warten bis Werte stabil
      readNutrientSensors();

      JsonDocument response;
      response["status"] = "completed";
      response["volume_ml"] = (nutrientPumpDuration / 1000.0 / 60.0) * DEFAULT_FLOW_RATE;
      response["duration_seconds"] = nutrientPumpDuration / 1000.0;
      response["ec"] = currentEC;
      response["ph"] = currentPH;
      response["temp"] = sht31.readTemperature();

      char buffer[512];
      serializeJson(response, buffer);
      client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);

      Serial.println("=== Dosierung abgeschlossen ===");
    }

    // Progress alle 500ms publishen
    static unsigned long lastProgress = 0;
    if (millis() - lastProgress > 500) {
      JsonDocument progressDoc;
      progressDoc["status"] = "dosing";
      progressDoc["progress_percent"] = (int)((elapsed / (float)nutrientPumpDuration) * 100);
      progressDoc["elapsed_ms"] = elapsed;

      char buffer[256];
      serializeJson(progressDoc, buffer);
      client.publish(MQTT_TOPIC_NUTRIENT_STATUS, buffer);

      lastProgress = millis();
    }
  }

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