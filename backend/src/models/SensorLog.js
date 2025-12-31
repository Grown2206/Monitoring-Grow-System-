const mongoose = require('mongoose');

const SensorLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now // Automatischer Zeitstempel
  },
  device: {
    type: String,
    required: true // z.B. "esp32_main"
  },
  readings: {
    temp: Number,       // Lufttemperatur
    humidity: Number,   // Luftfeuchte
    lux: Number,        // Helligkeit
    tankLevel: Number,  // Wasserstand (Raw 0-4095)
    gasLevel: Number,   // CO2/Gas (Raw)
    soilMoisture: [Number] // Array für die 6 Pflanzen [50, 40, 20, 0, 0, 0]
  }
});

// Index setzen, damit Abfragen nach Zeit schnell gehen
SensorLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorLog', SensorLogSchema);