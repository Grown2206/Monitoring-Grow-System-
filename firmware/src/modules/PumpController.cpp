#include "PumpController.h"

void PumpController::begin() {
    // Pins definieren
    pinMode(PIN_PUMP_1, OUTPUT);
    pinMode(PIN_PUMP_2, OUTPUT);
    
    pinMode(PIN_RELAY_LIGHT, OUTPUT);
    pinMode(PIN_RELAY_EXHAUST, OUTPUT);
    pinMode(PIN_RELAY_INTAKE, OUTPUT);
    pinMode(PIN_RELAY_HUMID, OUTPUT);

    // Alles AUS
    digitalWrite(PIN_PUMP_1, LOW);
    digitalWrite(PIN_PUMP_2, LOW);
    digitalWrite(PIN_RELAY_LIGHT, LOW);
    digitalWrite(PIN_RELAY_EXHAUST, LOW);
    digitalWrite(PIN_RELAY_INTAKE, LOW);
    digitalWrite(PIN_RELAY_HUMID, LOW);

    // Structs init
    pumps[0] = {false, 0, 0, PIN_PUMP_1};
    pumps[1] = {false, 0, 0, PIN_PUMP_2};
}

void PumpController::switchRelay(int pin, bool state) {
    digitalWrite(pin, state ? HIGH : LOW);
    // Debug
    Serial.printf("[IO] Pin %d -> %s\n", pin, state ? "ON" : "OFF");
}

void PumpController::activatePump(int pumpId, int durationMs) {
    // pumpId 1 -> Index 0, pumpId 2 -> Index 1
    int idx = pumpId - 1;
    if (idx < 0 || idx > 1) return;

    if (pumps[idx].isRunning) return; // Läuft bereits

    Serial.printf("[PUMP] Pumpe %d AN für %d ms\n", pumpId, durationMs);
    digitalWrite(pumps[idx].pin, HIGH);
    
    pumps[idx].isRunning = true;
    pumps[idx].startTime = millis();
    pumps[idx].duration = durationMs;
}

void PumpController::update() {
    unsigned long now = millis();

    // Loop durch beide Pumpen
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