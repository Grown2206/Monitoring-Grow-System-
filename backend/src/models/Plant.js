const mongoose = require('mongoose');

const PlantSchema = new mongoose.Schema({
  slotId: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 6
  },
  name: {
    type: String,
    required: true,
    default: "Unbenannte Pflanze"
  },
  strain: String,
  type: String, // Indica/Sativa
  stage: {
    type: String,
    enum: ['Keimling', 'Vegetation', 'Blüte', 'Ernte', 'Trocknen'],
    default: 'Vegetation'
  },
  // --- NEUE FELDER ---
  germinatedAt: Date, // Keimdatum
  plantedAt: Date,    // Einpflanzdatum
  floweringStart: Date, // Beginn Blüte
  harvestExpected: Date, // Geplantes Erntedatum
  potSize: Number,    // Topfgröße in Litern
  notes: String
});

module.exports = mongoose.model('Plant', PlantSchema);