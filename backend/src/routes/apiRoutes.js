const express = require('express');
const router = express.Router();
const mqttService = require('../services/mqttService');

// Controller Imports
const { getPlants, updatePlant } = require('../controllers/plantController');
const { getHistory } = require('../controllers/dataController');
const { getLogs, getEvents, createEvent, deleteEvent } = require('../controllers/extraController');
const { getConsultation } = require('../controllers/aiController');
const notificationController = require('../controllers/notificationController');
const weatherController = require('../controllers/weatherController');
const recipeController = require('../controllers/recipeController');
const analyticsController = require('../controllers/analyticsController');

// MQTT Topics (M�SSEN MIT ARDUINO �BEREINSTIMMEN)
const TOPIC_CONFIG = 'grow_drexl_v2/config';
const TOPIC_COMMAND = 'grow_drexl_v2/command';

// Config Speicher (Mockup f�r Laufzeit, wird bei Neustart zur�ckgesetzt - idealerweise DB nutzen)
let automationConfig = {
  lightStart: "06:00",
  lightDuration: 18,
  tempTarget: 24,
  tempHysteresis: 2,
  pumpInterval: 4,
  pumpDuration: 30
};
let webhookUrl = "";

// ==========================================
// 1. PFLANZEN MANAGEMENT
// ==========================================
router.get('/plants', getPlants);
router.put('/plants/:slotId', updatePlant);

// ==========================================
// 2. DATEN & HISTORIE
// ==========================================
router.get('/history', getHistory);
router.get('/logs', getLogs);

// ==========================================
// 3. KALENDER & EVENTS
// ==========================================
router.get('/calendar', getEvents);
router.post('/calendar', createEvent);
router.delete('/calendar/:id', deleteEvent);

// ==========================================
// 4. AI CONSULTANT
// ==========================================
router.post('/ai/consult', getConsultation);

// ==========================================
// 5. EINSTELLUNGEN (AUTOMATION & WEBHOOK)
// ==========================================
// Automation abrufen
router.get('/settings/automation', (req, res) => {
  res.json(automationConfig);
});

// Automation speichern & an ESP senden
router.post('/settings/automation', (req, res) => {
  automationConfig = req.body;
  
  // Sende Config per MQTT an ESP
  mqttService.publish(TOPIC_CONFIG, JSON.stringify(automationConfig));
  
  console.log("Neue Config an ESP gesendet:", automationConfig);
  res.json({ message: "Konfiguration aktualisiert", config: automationConfig });
});

// Webhook abrufen
router.get('/settings/webhook', (req, res) => {
  res.json({ url: webhookUrl });
});

// Webhook speichern
router.post('/settings/webhook', (req, res) => {
  webhookUrl = req.body.url;
  // Hier k�nnte man den Notification Service updaten
  console.log("Webhook URL gespeichert:", webhookUrl);
  res.json({ message: "Webhook gespeichert" });
});

// ==========================================
// 6. STEUERUNG & SYSTEM (RELAIS & RESET)
// ==========================================
// Relais manuell schalten
router.post('/controls/relay', (req, res) => {
  const { relay, state } = req.body; // z.B. { relay: "light", state: true }
  
  if (!relay || state === undefined) {
    return res.status(400).json({ message: "Fehlende Parameter (relay, state)" });
  }

  // MQTT Befehl bauen
  // Format: { action: "set_relay", relay: "light", state: true }
  const command = { 
    action: 'set_relay', 
    relay: relay, 
    state: state 
  };
  
  mqttService.publish(TOPIC_COMMAND, JSON.stringify(command));
  
  console.log(`Relais Befehl gesendet: ${relay} -> ${state ? 'AN' : 'AUS'}`);
  res.json({ message: "Befehl gesendet", command });
});

// ESP Neustart (Reboot)
router.post('/system/reboot', (req, res) => {
  mqttService.publish(TOPIC_COMMAND, JSON.stringify({ action: 'reboot' }));
  console.log("Reboot Befehl gesendet");
  res.json({ message: "Reboot initiiert" });
});

// ESP Factory Reset
router.post('/system/reset', (req, res) => {
  mqttService.publish(TOPIC_COMMAND, JSON.stringify({ action: 'factory_reset' }));
  console.log("Factory Reset Befehl gesendet");
  res.json({ message: "Reset initiiert" });
});

// ==========================================
// 7. PUSH-NOTIFICATIONS
// ==========================================
router.post('/notifications/subscribe', notificationController.subscribe);
router.post('/notifications/unsubscribe', notificationController.unsubscribe);
router.post('/notifications/test', notificationController.sendTest);
router.get('/notifications/public-key', notificationController.getPublicKey);
router.get('/notifications/stats', notificationController.getStats);
router.post('/notifications/cleanup', notificationController.cleanup);

// ==========================================
// 8. WETTER-API
// ==========================================
router.get('/weather/current', weatherController.getCurrent);
router.get('/weather/forecast', weatherController.getForecast);
router.get('/weather/recommendations', weatherController.getRecommendations);

// ==========================================
// 9. GROW-REZEPTE & TEMPLATES
// ==========================================
router.get('/recipes', recipeController.getAll);
router.get('/recipes/:id', recipeController.getById);
router.post('/recipes', recipeController.create);
router.put('/recipes/:id', recipeController.update);
router.delete('/recipes/:id', recipeController.delete);
router.post('/recipes/:id/use', recipeController.use);
router.post('/recipes/:id/like', recipeController.like);

// ==========================================
// 10. ANALYTICS & AI
// ==========================================
router.get('/analytics/anomalies', analyticsController.getAnomalies);
router.get('/analytics/predictions', analyticsController.getPredictions);
router.get('/analytics/optimizations', analyticsController.getOptimizations);

module.exports = router;