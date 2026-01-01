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

// API Route: Gibt Sensor-Historie mit Pagination zurück
const getHistory = async (req, res, next) => {
  try {
    // Query-Parameter (werden bereits durch Joi validiert)
    const {
      hours = 24,
      page = 1,
      limit = 100,
      sort = 'timestamp',
      order = 'asc'
    } = req.query;

    // Zeitraum berechnen
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Pagination berechnen
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort-Order bestimmen
    const sortOrder = order === 'desc' ? -1 : 1;

    // Query ausführen
    const [history, total] = await Promise.all([
      SensorLog.find({ timestamp: { $gte: hoursAgo } })
        .sort({ [sort]: sortOrder })
        .limit(parseInt(limit))
        .skip(skip)
        .lean(), // .lean() für bessere Performance (gibt plain JS objects zurück)
      SensorLog.countDocuments({ timestamp: { $gte: hoursAgo } })
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
        hasMore: skip + history.length < total
      },
      meta: {
        hours: parseInt(hours),
        from: hoursAgo,
        to: new Date(),
        count: history.length
      }
    });
  } catch (error) {
    console.error("❌ Fehler in getHistory:", error);
    next(error); // Nutze zentrale Error-Handling
  }
};

module.exports = {
  saveSensorData,
  getHistory
};