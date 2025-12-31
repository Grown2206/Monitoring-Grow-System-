const express = require('express');
const router = express.Router();

// Controller Imports
const { getPlants, updatePlant } = require('../controllers/plantController');
const { getHistory } = require('../controllers/dataController');
const { getLogs, getEvents, createEvent, deleteEvent } = require('../controllers/extraController');
const { getConsultation } = require('../controllers/aiController');
const { setWebhook, getWebhook, sendAlert } = require('../services/notificationService');
// NEU: Automation Config Imports
const { getAutomationConfig, updateAutomationConfig } = require('../services/automationService');

// --- PFLANZEN ROUTEN ---
router.get('/plants', getPlants);
router.put('/plants/:slotId', updatePlant);

// --- DATEN & HISTORIE ---
router.get('/history', getHistory);

// --- LOGS ---
router.get('/logs', getLogs);

// --- KALENDER ROUTEN ---
router.get('/calendar', getEvents);
router.post('/calendar', createEvent);
router.delete('/calendar/:id', deleteEvent);

// --- AI ROUTE ---
router.post('/ai/consult', getConsultation);

// --- AUTOMATION CONFIG (NEU) ---
router.get('/settings/automation', (req, res) => {
  res.json(getAutomationConfig());
});

router.post('/settings/automation', (req, res) => {
  updateAutomationConfig(req.body);
  res.json({ message: "Konfiguration aktualisiert", config: getAutomationConfig() });
});

// --- NOTIFICATION / WEBHOOK ROUTEN ---
router.post('/settings/webhook', (req, res) => {
  const { url } = req.body;
  setWebhook(url);
  sendAlert("GrowMonitor Verbunden", "Webhook erfolgreich eingerichtet!", 0x00FF00);
  res.json({ message: "Webhook gespeichert" });
});

router.get('/settings/webhook', (req, res) => {
  res.json({ url: getWebhook() });
});

module.exports = router;