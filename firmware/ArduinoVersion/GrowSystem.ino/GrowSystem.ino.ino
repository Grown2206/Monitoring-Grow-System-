/*
 * GROW MONITORING SYSTEM v1.1 - ALL-IN-ONE VERSION
 * Für Arduino IDE
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <Adafruit_MCP4725.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ==========================================
// 1. KONFIGURATION (Hier anpassen!)
// ==========================================
// Bitte hier deine WLAN-Daten eintragen
const char* WIFI_SSID = "WLAN-915420";
const char* WIFI_PASSWORD = "78118805138223696181";

// Adresse deines Backend-Servers (IP Adresse des PCs, auf dem Node.js läuft)
const char* WEBSOCKET_HOST = "192.168.2.100"; 
const int WEBSOCKET_PORT = 3000;

#define MAX_PLANTS 6
const int ACTIVE_PLANTS = 6; // Wieviele Sensoren sind angeschlossen?

// Pins
const int PINS_SOIL_MOISTURE[MAX_PLANTS] = { 36, 39, 34, 35, 32, 33 };
#define PIN_TANK_LEVEL 25
#define PIN_GAS_SENSOR 26
#define PIN_PUMP_1 16
#define PIN_PUMP_2 17
#define PIN_RELAY_LIGHT 18
#define PIN_RELAY_EXHAUST 19
#define PIN_RELAY_INTAKE 5
#define PIN_RELAY_HUMID 23

// Intervalle
const unsigned long INTERVAL_SENSOR = 2000;

// Globale Objekte
Adafruit_SHT31 sht31;
BH1750 lightMeter;
Adafruit_MCP4725 dac;
WebSocketsClient webSocket;

// Daten Struktur
struct SensorData {
    float temp;
    float humidity;
    float lux;
    int soilMoisture[MAX_PLANTS];
    int tankLevel;
    int gasLevel;
};

// Pumpen Status
struct PumpState {
    bool isRunning;
    unsigned long startTime;
    int duration;
    int pin;
};
PumpState pumps[2];

unsigned long lastSensorRead = 0;

// ==========================================
// 2. FUNKTIONEN
// ==========================================

void setupWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Verbinde WLAN");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n[WIFI] Verbunden!");
}

void activatePump(int pumpId, int durationMs) {
    int idx = pumpId - 1;
    if (idx < 0 || idx > 1) return;
    if (pumps[idx].isRunning) return;

    Serial.printf("[PUMP] Pumpe %d AN fuer %d ms\n", pumpId, durationMs);
    digitalWrite(pumps[idx].pin, HIGH);
    
    pumps[idx].isRunning = true;
    pumps[idx].startTime = millis();
    pumps[idx].duration = durationMs;
}

void updatePumps() {
    unsigned long now = millis();
    for(int i=0; i<2; i++) {
        if (pumps[i].isRunning) {
            if (now - pumps[i].startTime >= pumps[i].duration) {
                digitalWrite(pumps[i].pin, LOW);
                pumps[i].isRunning = false;
                Serial.printf("[PUMP] Pumpe %d AUS\n", i+1);
            }
        }
    }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    if (type == WStype_CONNECTED) {
        Serial.println("[WS] Verbunden mit Server!");
        webSocket.sendTXT("{\"type\":\"auth\", \"device\":\"esp32_main\"}");
    }
    else if (type == WStype_TEXT) {
        StaticJsonDocument<512> doc;
        deserializeJson(doc, payload);
        
        String cmd = doc["command"].as<String>();
        int id = doc["id"] | 0;
        bool state = doc["state"];

        Serial.println("Befehl: " + cmd);

        if (cmd == "LIGHT") digitalWrite(PIN_RELAY_LIGHT, state ? HIGH : LOW);
        else if (cmd == "FAN_EXHAUST") digitalWrite(PIN_RELAY_EXHAUST, state ? HIGH : LOW);
        else if (cmd == "FAN_INTAKE") digitalWrite(PIN_RELAY_INTAKE, state ? HIGH : LOW);
        else if (cmd == "PUMP") {
            if (state) activatePump(id, 5000);
        }
    }
}

// ==========================================
// 3. SETUP
// ==========================================
void setup() {
    Serial.begin(115200);
    Wire.begin(21, 22); // SDA, SCL

    // I2C Sensoren Starten
    if (!sht31.begin(0x44)) Serial.println("SHT31 nicht gefunden");
    if (!lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) Serial.println("BH1750 Fehler");
    dac.begin(0x60);

    // Pins
    pinMode(PIN_PUMP_1, OUTPUT);
    pinMode(PIN_PUMP_2, OUTPUT);
    pinMode(PIN_RELAY_LIGHT, OUTPUT);
    pinMode(PIN_RELAY_EXHAUST, OUTPUT);
    pinMode(PIN_RELAY_INTAKE, OUTPUT);
    pinMode(PIN_RELAY_HUMID, OUTPUT);
    
    // Init Zustand: Alles AUS
    digitalWrite(PIN_PUMP_1, LOW);
    digitalWrite(PIN_PUMP_2, LOW);
    digitalWrite(PIN_RELAY_LIGHT, LOW);
    
    // Pumpen Structs
    pumps[0] = {false, 0, 0, PIN_PUMP_1};
    pumps[1] = {false, 0, 0, PIN_PUMP_2};

    // Sensoren Input
    for(int i=0; i<MAX_PLANTS; i++) pinMode(PINS_SOIL_MOISTURE[i], INPUT);
    pinMode(PIN_TANK_LEVEL, INPUT);

    // Netzwerk
    setupWiFi();
    webSocket.begin(WEBSOCKET_HOST, WEBSOCKET_PORT, "/");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
}

// ==========================================
// 4. LOOP
// ==========================================
void loop() {
    webSocket.loop();
    updatePumps(); // Timer prüfen

    unsigned long now = millis();
    if (now - lastSensorRead >= INTERVAL_SENSOR) {
        lastSensorRead = now;

        // Daten Sammeln
        StaticJsonDocument<1024> doc;
        doc["type"] = "sensor_update";
        JsonObject d = doc.createNestedObject("data");

        float t = sht31.readTemperature();
        float h = sht31.readHumidity();
        d["temp"] = isnan(t) ? 0.0 : t;
        d["humidity"] = isnan(h) ? 0.0 : h;
        d["lux"] = lightMeter.readLightLevel();
        d["tank"] = analogRead(PIN_TANK_LEVEL);
        d["gas"] = analogRead(PIN_GAS_SENSOR);

        JsonArray soil = d.createNestedArray("soil");
        for(int i=0; i < ACTIVE_PLANTS; i++) {
            // Mapping anpassen! 4095=Trocken, 1500=Nass
            int val = map(analogRead(PINS_SOIL_MOISTURE[i]), 4095, 1200, 0, 100);
            soil.add(constrain(val, 0, 100));
        }

        String output;
        serializeJson(doc, output);
        webSocket.sendTXT(output);
        
        Serial.println("Daten gesendet: " + output);
    }
}