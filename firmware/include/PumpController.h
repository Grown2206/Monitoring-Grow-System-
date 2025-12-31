#pragma once
#include <Arduino.h>
#include "config.h"

class PumpController {
public:
    void begin();
    
    // Relais schalten
    void switchRelay(int pin, bool state);
    
    // Pumpen Steuerung: pumpId = 1 oder 2
    void activatePump(int pumpId, int durationMs);
    
    // Timer Check
    void update();

private:
    struct PumpState {
        bool isRunning;
        unsigned long startTime;
        int duration;
        int pin;
    };

    PumpState pumps[2]; // Index 0 = Pumpe 1, Index 1 = Pumpe 2
};