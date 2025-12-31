#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "SensorManager.h" // Import SensorData struct

typedef std::function<void(String, int, bool)> CommandCallback; // command, id/value, state

class NetworkManager {
public:
    void begin();
    void loop();
    
    // Übernimmt jetzt das komplette Struct statt Einzelwerte
    void sendSensorData(const SensorData& data);
    
    void onCommand(CommandCallback callback);

private:
    WebSocketsClient webSocket;
    CommandCallback cmdCallback;
    
    void connectWiFi();
    void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
};