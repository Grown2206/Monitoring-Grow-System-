const express = require('express');
const router = express.Router();
const mqttService = require('../services/mqttService');

// Middleware Imports
const { authenticate, optionalAuth } = require('../middleware/auth');
const { validateBody, validateQuery, validateObjectId, schemas } = require('../middleware/validation');

// Controller Imports
const authController = require('../controllers/authController');
const { getPlants, updatePlant } = require('../controllers/plantController');
const { getHistory } = require('../controllers/dataController');
const { getLogs, getEvents, createEvent, deleteEvent } = require('../controllers/extraController');
const { getConsultation } = require('../controllers/aiController');
const notificationController = require('../controllers/notificationController');
const weatherController = require('../controllers/weatherController');
const recipeController = require('../controllers/recipeController');
const analyticsController = require('../controllers/analyticsController');

// MQTT Topics (MÜSSEN MIT ARDUINO ÜBEREINSTIMMEN)
const TOPIC_CONFIG = 'grow_drexl_v2/config';
const TOPIC_COMMAND = 'grow_drexl_v2/command';

// Config Speicher (Mockup für Laufzeit, wird bei Neustart zurückgesetzt - idealerweise DB nutzen)
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
// 0. AUTHENTIFIZIERUNG (Public Routes)
// ==========================================
router.post('/auth/register', validateBody(schemas.register), authController.register);
router.post('/auth/login', validateBody(schemas.login), authController.login);
router.get('/auth/validate', authenticate, authController.validateToken);
router.post('/auth/refresh', authenticate, authController.refreshToken);

// ==========================================
// 1. PFLANZEN MANAGEMENT (Protected)
// ==========================================
router.get('/plants', authenticate, getPlants);
router.put('/plants/:slotId', authenticate, validateBody(schemas.plant), updatePlant);

// ==========================================
// 2. DATEN & HISTORIE (Protected)
// ==========================================
router.get('/history', authenticate, validateQuery(schemas.pagination), getHistory);
router.get('/logs', authenticate, getLogs);

// ==========================================
// 3. KALENDER & EVENTS (Protected)
// ==========================================
router.get('/calendar', authenticate, getEvents);
router.post('/calendar', authenticate, createEvent);
router.delete('/calendar/:id', authenticate, validateObjectId('id'), deleteEvent);

// ==========================================
// 4. AI CONSULTANT (Protected)
// ==========================================
router.post('/ai/consult', authenticate, getConsultation);

// ==========================================
// 5. EINSTELLUNGEN (Protected)
// ==========================================
// Automation abrufen
router.get('/settings/automation', authenticate, (req, res) => {
  res.json(automationConfig);
});

// Automation speichern & an ESP senden
router.post('/settings/automation',
  authenticate,
  validateBody(schemas.automationConfig),
  (req, res) => {
    automationConfig = req.body;

    // Sende Config per MQTT an ESP
    mqttService.publish(TOPIC_CONFIG, JSON.stringify(automationConfig));

    console.log("✅ Neue Config an ESP gesendet:", automationConfig);
    res.json({
      success: true,
      message: "Konfiguration aktualisiert",
      config: automationConfig
    });
  }
);

// Webhook abrufen
router.get('/settings/webhook', authenticate, (req, res) => {
  res.json({ url: webhookUrl });
});

// Webhook speichern
router.post('/settings/webhook', authenticate, (req, res) => {
  webhookUrl = req.body.url;
  console.log("✅ Webhook URL gespeichert:", webhookUrl);
  res.json({
    success: true,
    message: "Webhook gespeichert"
  });
});

// ==========================================
// 6. STEUERUNG & SYSTEM (Protected)
// ==========================================
// Relais manuell schalten
router.post('/controls/relay', authenticate, (req, res) => {
  const { relay, state } = req.body;

  if (!relay || state === undefined) {
    return res.status(400).json({
      success: false,
      message: "Fehlende Parameter (relay, state)"
    });
  }

  // MQTT Befehl bauen
  const command = {
    action: 'set_relay',
    relay: relay,
    state: state
  };

  mqttService.publish(TOPIC_COMMAND, JSON.stringify(command));

  console.log(`⚡ Relais Befehl gesendet: ${relay} -> ${state ? 'AN' : 'AUS'}`);
  res.json({
    success: true,
    message: "Befehl gesendet",
    command
  });
});

// ESP Neustart (Reboot)
router.post('/system/reboot', authenticate, (req, res) => {
  mqttService.publish(TOPIC_COMMAND, JSON.stringify({ action: 'reboot' }));
  console.log("🔄 Reboot Befehl gesendet");
  res.json({
    success: true,
    message: "Reboot initiiert"
  });
});

// ESP Factory Reset
router.post('/system/reset', authenticate, (req, res) => {
  mqttService.publish(TOPIC_COMMAND, JSON.stringify({ action: 'factory_reset' }));
  console.log("⚠️ Factory Reset Befehl gesendet");
  res.json({
    success: true,
    message: "Reset initiiert"
  });
});

// ==========================================
// 7. PUSH-NOTIFICATIONS (Protected)
// ==========================================
router.post('/notifications/subscribe', authenticate, notificationController.subscribe);
router.post('/notifications/unsubscribe', authenticate, notificationController.unsubscribe);
router.post('/notifications/test', authenticate, notificationController.sendTest);
router.get('/notifications/public-key', notificationController.getPublicKey); // Public
router.get('/notifications/stats', authenticate, notificationController.getStats);
router.post('/notifications/cleanup', authenticate, notificationController.cleanup);

// ==========================================
// 8. WETTER-API (Public mit optionalAuth)
// ==========================================
router.get('/weather/current', optionalAuth, weatherController.getCurrent);
router.get('/weather/forecast', optionalAuth, weatherController.getForecast);
router.get('/weather/recommendations', optionalAuth, weatherController.getRecommendations);

// ==========================================
// 9. GROW-REZEPTE (Mixed - Read Public, Write Protected)
// ==========================================
router.get('/recipes', optionalAuth, recipeController.getAll);
router.get('/recipes/:id', optionalAuth, validateObjectId('id'), recipeController.getById);
router.post('/recipes', authenticate, validateBody(schemas.recipe), recipeController.create);
router.put('/recipes/:id', authenticate, validateObjectId('id'), validateBody(schemas.recipe), recipeController.update);
router.delete('/recipes/:id', authenticate, validateObjectId('id'), recipeController.delete);
router.post('/recipes/:id/use', authenticate, validateObjectId('id'), recipeController.use);
router.post('/recipes/:id/like', optionalAuth, validateObjectId('id'), recipeController.like);

// ==========================================
// 10. ANALYTICS & AI (Protected)
// ==========================================
router.get('/analytics/anomalies', authenticate, analyticsController.getAnomalies);
router.get('/analytics/predictions', authenticate, analyticsController.getPredictions);
router.get('/analytics/optimizations', authenticate, analyticsController.getOptimizations);

module.exports = router;
