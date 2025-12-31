const SensorLog = require('../models/SensorLog');

// Funktion zum Speichern neuer Daten
const saveSensorData = async (dataPayload) => {
  try {
    // Validierung: Hat das Payload Daten?
    if (!dataPayload) return;

    // Erstelle neuen Datenbank-Eintrag
    const newLog = new SensorLog({
      device: "esp32_main", // Könnte auch aus payload kommen
      readings: {
        temp: dataPayload.temp,
        humidity: dataPayload.humidity,
        lux: dataPayload.lux,
        tankLevel: dataPayload.tank, // Achtung: Im ESP JSON heißt es "tank", im Schema "tankLevel"
        gasLevel: dataPayload.gas,
        soilMoisture: dataPayload.soil // Array
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

// Funktion um die letzten 50 Werte für Graphen zu holen (für API)
const getHistory = async () => {
  return await SensorLog.find().sort({ timestamp: -1 }).limit(50);
};

module.exports = {
  saveSensorData,
  getHistory
};