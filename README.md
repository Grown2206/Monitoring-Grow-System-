🌱 Grow Monitoring System v1.1

Ein professionelles, IoT-basiertes Überwachungs- und Steuerungssystem für Indoor-Pflanzenzucht.
Basiert auf ESP32 (Hardware), Node.js (Backend) und React (Frontend).

✨ Features

Live-Monitoring: Temperatur, Luftfeuchte (SHT3x), Licht (BH1750), Bodenfeuchte (Kapazitiv), Tank-Level, Gas/CO2.

Automatisierung:

Bewässerung basierend auf Trockenheit (< 30%).

Lichtsteuerung (Zeitplan).

Klima-Steuerung (Lüfter nach VPD-Wert).

Not-Aus bei Überhitzung (> 40°C) oder Rauch.

Data Intelligence:

AI Consultant: Integrierte KI-Analyse der Pflanzenwerte (via Gemini API).

Analytics: Historische Diagramme, Stromkosten-Rechner, PDF-Export.

Dashboard: Berechnung von VPD (Vapor Pressure Deficit) und DLI.

Management:

Pflanzen-Profile mit QR-Code Generator.

Kalender mit automatischem Düngeplan-Wizard.

Externe Alarme via Discord Webhooks.

🛠️ Hardware Setup

Controller: ESP32 DevKit V1

Sensoren:

6x Kapazitive Bodenfeuchtesensoren v1.2 (an Pins 32, 33, 34, 35, 36, 39)

SHT3x (I2C 0x44)

BH1750 (I2C 0x23)

Wasserstandssensor (Pin 25)

MQ-Gas Sensor (Pin 26)

Aktoren: 4-Kanal Relais Modul (Pumpen, Licht, Lüfter)

🚀 Installation & Start

1. Backend (Server)

Benötigt Node.js und MongoDB.

cd backend
npm install
# Erstelle eine .env Datei mit: GEMINI_API_KEY=dein_key
npm start


Der Server läuft auf http://localhost:3000.

2. Frontend (App)

Das React Dashboard.

cd frontend
npm install
npm run dev


Die App läuft auf http://localhost:5173.

3. Firmware (ESP32)

Öffne den Ordner firmware mit VS Code und PlatformIO (oder nutze die .ino in Arduino IDE).

Passe WLAN-Daten in config.h an.

Upload auf den ESP32.

⚠️ Wichtige Hinweise

Sensoren müssen kalibriert werden (Werte in config.h anpassen).

Für die Datenbank muss MongoDB lokal laufen (mongod).