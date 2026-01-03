const SensorLog = require('../models/SensorLog');

// INTERNE Funktion zum Speichern (wird von MQTT/Sensor-Service aufgerufen)
const DeviceState = require('../models/DeviceState');

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

    // PWM & RPM Daten separat speichern (wenn vorhanden)
    if (dataPayload.fanPWM !== undefined || dataPayload.lightPWM !== undefined || dataPayload.fanRPM !== undefined) {
      await DeviceState.updateState({
        pwm: {
          fan_exhaust: dataPayload.fanPWM || 0,
          grow_light: dataPayload.lightPWM || 0
        },
        feedback: {
          fan_exhaust_rpm: dataPayload.fanRPM || 0
        }
      });
    }

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
      limit, // Wird unten dynamisch gesetzt wenn nicht angegeben
      sort = 'timestamp',
      order = 'asc'
    } = req.query;

    // Zeitraum berechnen
    const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Hole ALLE Daten im Zeitraum ohne Limit (Performance: Recharts kann 2000+ Punkte problemlos handlen)
    const [history, total] = await Promise.all([
      SensorLog.find({ timestamp: { $gte: hoursAgo } })
        .sort({ timestamp: 1 }) // Chronologisch (ASC)
        .lean(), // .lean() für bessere Performance
      SensorLog.countDocuments({ timestamp: { $gte: hoursAgo } })
    ]);

    res.json({
      success: true,
      data: history,
      pagination: {
        total: history.length,
        page: 1,
        limit: history.length,
        pages: 1,
        hasMore: false
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
