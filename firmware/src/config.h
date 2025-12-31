#pragma once
#include <Arduino.h>

// ==========================================
// 1. NETZWERK EINSTELLUNGEN
// ==========================================
// Bitte hier deine WLAN-Daten eintragen
const char* WIFI_SSID = "WLAN-915420";
const char* WIFI_PASSWORD = "78118805138223696181";

// Adresse deines Backend-Servers (IP Adresse des PCs, auf dem Node.js läuft)
const char* WEBSOCKET_HOST = "192.168.2.100"; 
const int WEBSOCKET_PORT = 5000;


// ==========================================
// 2. I2C SENSOREN (SHT3X, BH1750, MCP4725)
// ==========================================
// ESP32 Standard I2C: SDA=21, SCL=22
#define I2C_SDA              21
#define I2C_SCL              22

// Adressen (bitte ggf. mit I2C Scanner prüfen)
#define ADDR_SHT3X           0x44 
#define ADDR_BH1750          0x23
#define ADDR_MCP4725         0x60 

// ==========================================
// 3. ANALOGE SENSOREN
// ==========================================
#define PIN_SOIL_MOISTURE    34  // V1.2 Kapazitiv
#define PIN_TANK_LEVEL       35  // Füllstand
#define PIN_GAS_SENSOR       32  // B33_1 Gas (MQ-X)

// ==========================================
// 4. DIGITALE SENSOREN / BACKUP
// ==========================================
#define PIN_DHT_SENSOR       4   // B24_1 DHT22 (Backup für Temp)

// ==========================================
// 5. AKTOREN (Relais & Pumpen)
// ==========================================
#define PIN_PUMP_MAIN        18  // 12V Pumpe via Relais
#define PIN_RELAY_LIGHT      19  // Licht
#define PIN_RELAY_FAN        5   // Abluft

// ==========================================
// 6. EINSTELLUNGEN
// ==========================================
const unsigned long INTERVAL_SENSOR = 2000; // ms