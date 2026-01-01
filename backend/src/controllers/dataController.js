const SensorLog = require('../models/SensorLog');

// INTERNE Funktion zum Speichern (wird von MQTT/Sensor-Service aufgerufen)
const saveSensorData = async (dataPayload) => {
  try {
    if (!dataPayload) return;

    const newLog = new SensorLog({
      device: "esp32_main",
      readings: {
        temp: dataPayload.temp,
        humidity: dataPayload.humidity,
        lux: dataPayload.lux,
        tankLevel: dataPayload.tank,
        gasLevel: dataPayload.gas,
        soilMoisture: dataPayload.soil
      }
    });

    await newLog.save();
    console.log(`💾 Daten gespeichert (Temp: ${dataPayload.temp}°C)`);
    return true;

  } catch (error) {
    console.error('Fehler beim Speichern der Sensordaten:', error.message);
    return false;
  }
};

// API Route: Gibt Daten der letzten 24 Stunden zurück
const getHistory = async (req, res) => {
  try {
    // 1. Berechne den Zeitpunkt vor 24 Stunden (Jetzt - 24h * 60m * 60s * 1000ms)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 2. Finde alle Einträge, deren Timestamp größer (neuer) ist als vor 24h
    const history = await SensorLog.find({
      timestamp: { $gte: twentyFourHoursAgo }
    }).sort({ timestamp: 1 }); // Sortierung: Älteste zuerst (links im Graph) bis Neueste (rechts)

    // Info: Das .limit(50) wurde entfernt, damit wirklich alle Daten des Tages kommen.

    res.json(history);
  } catch (error) {
    console.error("Fehler in getHistory:", error);
    res.status(500).json({ message: "Fehler beim Laden der Historie", error: error.message });
  }
};

module.exports = {
  saveSensorData,
  getHistory
};