#pragma once
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_SHT31.h>
#include <BH1750.h>
#include <Adafruit_MCP4725.h>
#include "config.h"

struct SensorData {
    float temp;
    float humidity;
    float lux;
    int soilMoisture[MAX_PLANTS]; // Array für bis zu 6 Pflanzen
    int tankLevel;
    int gasLevel;
};

class SensorManager {
public:
    void begin();
    SensorData readAll();

private:
    Adafruit_SHT31 sht31;
    BH1750 lightMeter;
    Adafruit_MCP4725 dac;
    
    int readSoilMoisture(int pin);
    int readTankLevel();
};