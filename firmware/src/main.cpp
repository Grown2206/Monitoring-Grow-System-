#include <Arduino.h>
#include "config.h"
#include "SensorManager.h"
#include "PumpController.h"
#include "NetworkManager.h"

SensorManager sensors;
PumpController actors;
NetworkManager network;

unsigned long lastSensorRead = 0;

void setup() {
    Serial.begin(115200);
    
    sensors.begin();
    actors.begin();
    network.begin();

    // Befehls-Handling
    network.onCommand([](String cmd, int id, bool state) {
        Serial.printf("CMD: %s ID: %d State: %d\n", cmd.c_str(), id, state);

        if (cmd == "LIGHT") {
            actors.switchRelay(PIN_RELAY_LIGHT, state);
        }
        else if (cmd == "FAN_EXHAUST") {
            actors.switchRelay(PIN_RELAY_EXHAUST, state);
        }
        else if (cmd == "FAN_INTAKE") {
            actors.switchRelay(PIN_RELAY_INTAKE, state);
        }
        else if (cmd == "PUMP") {
            // id sollte 1 oder 2 sein
            // state=true startet Timer (Standard 5s, oder Wert aus Payload wenn erweitert)
            if(state) actors.activatePump(id, 5000); 
        }
    });
}

void loop() {
    unsigned long now = millis();

    network.loop();
    actors.update();

    if (now - lastSensorRead >= INTERVAL_SENSOR) {
        lastSensorRead = now;
        
        // Lesen & Senden
        SensorData data = sensors.readAll();
        network.sendSensorData(data);
    }
}