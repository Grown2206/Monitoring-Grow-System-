const SystemLog = require('../models/SystemLog');
const CalendarEvent = require('../models/CalendarEvent');

// --- SYSTEM LOGS ---
const getLogs = async (req, res) => {
  try {
    // Die letzten 100 System-Logs
    const logs = await SystemLog.find()
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
    const newEvent = new CalendarEvent(req.body);
    const savedEvent = await newEvent.save();
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    await CalendarEvent.findByIdAndDelete(id);
    res.json({ message: "Event gelöscht" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLogs,
  getEvents,
  createEvent,
  deleteEvent
};