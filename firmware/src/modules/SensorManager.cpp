#include "SensorManager.h"

void SensorManager::begin() {
    Wire.begin(I2C_SDA, I2C_SCL);

    // I2C Geräte starten
    if (!sht31.begin(ADDR_SHT3X)) Serial.println("[ERR] SHT31 Fehler");
    if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) Serial.println("[OK] BH1750");
    if (dac.begin(ADDR_MCP4725)) dac.setVoltage(0, false);

    // Pin Modes für Sensoren
    for(int i=0; i < MAX_PLANTS; i++) {
        pinMode(PINS_SOIL_MOISTURE[i], INPUT);
    }
    pinMode(PIN_TANK_LEVEL, INPUT);
    pinMode(PIN_GAS_SENSOR, INPUT);
}

SensorData SensorManager::readAll() {
    SensorData data;

    // 1. Umgebung
    data.temp = sht31.readTemperature();
    data.humidity = sht31.readHumidity();
    if(isnan(data.temp)) data.temp = 0.0;

    // 2. Licht
    data.lux = lightMeter.readLightLevel();

    // 3. Bodenfeuchtigkeit (Loop durch alle Pflanzen)
    for(int i=0; i < ACTIVE_PLANTS; i++) {
        // Map: 4095 (Trocken) -> 0%, 1500 (Nass) -> 100%
        int raw = analogRead(PINS_SOIL_MOISTURE[i]);
        int pct = map(raw, 4095, 1200, 0, 100); 
        data.soilMoisture[i] = constrain(pct, 0, 100);
    }
    // Restliche Werte auf 0 setzen
    for(int i=ACTIVE_PLANTS; i < MAX_PLANTS; i++) {
        data.soilMoisture[i] = 0;
    }

    // 4. Tank & Gas
    data.tankLevel = analogRead(PIN_TANK_LEVEL);
    data.gasLevel = analogRead(PIN_GAS_SENSOR);

    return data;
}