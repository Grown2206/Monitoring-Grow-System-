const SystemLog = require('../models/SystemLog');
const CalendarEvent = require('../models/CalendarEvent');

// --- LOGS ---
const getLogs = async (req, res) => {
  try {
    // Letzte 100 Logs holen
    const logs = await SystemLog.find().sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createLog = async (type, source, message) => {
  // Interne Funktion zum Erstellen von Logs
  try {
    await SystemLog.create({ type, source, message });
  } catch (e) {
    console.error("Log Error:", e);
  }
};

// --- KALENDER ---
const getEvents = async (req, res) => {
  try {
    const events = await CalendarEvent.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    await CalendarEvent.findByIdAndDelete(req.params.id);
    res.json({ message: "Gelöscht" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getLogs, createLog, getEvents, createEvent, deleteEvent };