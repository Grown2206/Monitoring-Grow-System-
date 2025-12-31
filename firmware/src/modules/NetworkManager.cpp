#include "NetworkManager.h"

void NetworkManager::begin() {
    connectWiFi();
    webSocket.begin(WEBSOCKET_HOST, WEBSOCKET_PORT, "/");
    webSocket.onEvent(std::bind(&NetworkManager::webSocketEvent, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3));
    webSocket.setReconnectInterval(5000);
}

void NetworkManager::connectWiFi() {
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n[WIFI] Connected.");
}

void NetworkManager::loop() {
    webSocket.loop();
}

void NetworkManager::sendSensorData(const SensorData& data) {
    if (!WiFi.isConnected()) return;

    StaticJsonDocument<1024> doc; // Größerer Buffer für Arrays
    doc["type"] = "sensor_update";
    doc["device"] = "esp32_main";
    
    JsonObject d = doc.createNestedObject("data");
    d["temp"] = data.temp;
    d["humidity"] = data.humidity;
    d["lux"] = data.lux;
    d["tank"] = data.tankLevel;
    d["gas"] = data.gasLevel;

    // Array für Feuchtigkeit erstellen
    JsonArray soil = d.createNestedArray("soil");
    for(int i=0; i < ACTIVE_PLANTS; i++) {
        soil.add(data.soilMoisture[i]);
    }

    String output;
    serializeJson(doc, output);
    webSocket.sendTXT(output);
}

void NetworkManager::webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    if (type == WStype_TEXT) {
        StaticJsonDocument<512> doc;
        deserializeJson(doc, payload);

        const char* cmd = doc["command"]; // z.B. "PUMP"
        int id = doc["id"] | 0;           // z.B. 1 oder 2
        bool state = doc["state"];        // z.B. true/false

        if (cmdCallback) cmdCallback(String(cmd), id, state);
    }
}

void NetworkManager::onCommand(CommandCallback callback) {
    this->cmdCallback = callback;
}