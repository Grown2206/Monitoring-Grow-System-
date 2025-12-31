const Plant = require('../models/Plant');
const mongoose = require('mongoose');

// Helper: Prüfen ob DB verbunden ist
const isDBConnected = () => mongoose.connection.readyState === 1;

// GET: Alle Pflanzen holen
const getPlants = async (req, res) => {
  if (!isDBConnected()) {
    // Fallback für Live-Only Modus (ohne Datenbank)
    return res.json([
      { slotId: 1, name: "Demo Pflanze 1", strain: "Indica", stage: "Live-Mode" },
      { slotId: 2, name: "Demo Pflanze 2", strain: "Sativa", stage: "Live-Mode" },
      { slotId: 3, name: "Leer", strain: "-", stage: "-" },
      { slotId: 4, name: "Leer", strain: "-", stage: "-" },
      { slotId: 5, name: "Leer", strain: "-", stage: "-" },
      { slotId: 6, name: "Leer", strain: "-", stage: "-" },
    ]);
  }

  try {
    let plants = await Plant.find().sort({ slotId: 1 });
    
    // Falls DB leer ist, initialisieren wir 6 leere Slots
    if (plants.length === 0) {
      for (let i = 1; i <= 6; i++) {
        await Plant.create({ slotId: i, name: `Pflanze ${i}`, strain: 'Unbekannt' });
      }
      plants = await Plant.find().sort({ slotId: 1 });
    }
    
    res.json(plants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT: Eine Pflanze aktualisieren
const updatePlant = async (req, res) => {
  if (!isDBConnected()) {
    return res.status(503).json({ message: "Speichern im Live-Mode nicht möglich." });
  }

  const { slotId } = req.params;
  const { name, strain, stage, notes } = req.body;

  try {
    const updatedPlant = await Plant.findOneAndUpdate(
      { slotId: parseInt(slotId) },
      { name, strain, stage, notes },
      { new: true, upsert: true } // Erstellen falls nicht vorhanden
    );
    res.json(updatedPlant);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getPlants, updatePlant };