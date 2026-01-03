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
const quickActionController = require('../controllers/quickActionController');
const nutrientRoutes = require('./nutrientRoutes');
const vpdRoutes = require('./vpdRoutes');
const sensorRoutes = require('./sensorRoutes');
const timelapseRoutes = require('./timelapseRoutes');

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
// 1. PFLANZEN MANAGEMENT (Public - optional auth)
// ==========================================
router.get('/plants', optionalAuth, getPlants);
router.put('/plants/:slotId', optionalAuth, updatePlant);

// ==========================================
// 2. DATEN & HISTORIE (Public - optional auth)
// ==========================================
router.get('/history', optionalAuth, getHistory);
router.get('/logs', optionalAuth, getLogs);

// ==========================================
// 3. KALENDER & EVENTS (Public - optional auth)
// ==========================================
router.get('/calendar', optionalAuth, getEvents);
router.post('/calendar', optionalAuth, createEvent);
router.delete('/calendar/:id', optionalAuth, validateObjectId('id'), deleteEvent);

// ==========================================
// 4. AI CONSULTANT (Public - optional auth)
// ==========================================
router.post('/ai/consult', optionalAuth, getConsultation);

// ==========================================
// 5. EINSTELLUNGEN (Public - optional auth)
// ==========================================
// Automation abrufen
router.get('/settings/automation', optionalAuth, (req, res) => {
  res.json(automationConfig);
});

// Automation speichern & an ESP senden
router.post('/settings/automation',
  optionalAuth,
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
router.get('/settings/webhook', optionalAuth, (req, res) => {
  res.json({ url: webhookUrl });
});

// Webhook speichern
router.post('/settings/webhook', optionalAuth, (req, res) => {
  webhookUrl = req.body.url;
  console.log("✅ Webhook URL gespeichert:", webhookUrl);
  res.json({
    success: true,
    message: "Webhook gespeichert"
  });
});

// ==========================================
// 6. STEUERUNG & SYSTEM (Public - optional auth)
// ==========================================
// Relais manuell schalten
router.post('/controls/relay', optionalAuth, (req, res) => {
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

// PWM Steuerung - Abluftfilter
router.post('/controls/fan-pwm', optionalAuth, (req, res) => {
  const { value } = req.body;

  if (value === undefined || value < 0 || value > 100) {
    return res.status(400).json({
      success: false,
      message: "PWM Wert muss zwischen 0-100 liegen"
    });
  }

  const command = {
    action: 'set_fan_pwm',
    value: parseInt(value)
  };

  mqttService.publish(TOPIC_COMMAND, JSON.stringify(command));

  console.log(`🌀 Fan PWM gesetzt: ${value}%`);
  res.json({
    success: true,
    message: "Fan PWM gesetzt",
    value: parseInt(value)
  });
});

// PWM Steuerung - RJ11 Grow Light
router.post('/controls/light-pwm', optionalAuth, (req, res) => {
  const { value } = req.body;

  if (value === undefined || value < 0 || value > 100) {
    return res.status(400).json({
      success: false,
      message: "PWM Wert muss zwischen 0-100 liegen"
    });
  }

  const command = {
    action: 'set_light_pwm',
    value: parseInt(value)
  };

  mqttService.publish(TOPIC_COMMAND, JSON.stringify(command));

  console.log(`💡 Light PWM gesetzt: ${value}%`);
  res.json({
    success: true,
    message: "Light PWM gesetzt",
    value: parseInt(value)
  });
});

// RJ11 Light Enable/Disable
router.post('/controls/light-enable', optionalAuth, (req, res) => {
  const { enabled } = req.body;

  if (enabled === undefined) {
    return res.status(400).json({
      success: false,
      message: "Fehlender Parameter (enabled)"
    });
  }

  const command = {
    action: 'set_light_enable',
    enabled: !!enabled
  };

  mqttService.publish(TOPIC_COMMAND, JSON.stringify(command));

  console.log(`💡 RJ11 Light: ${enabled ? 'ENABLED' : 'DISABLED'}`);
  res.json({
    success: true,
    message: `Light ${enabled ? 'aktiviert' : 'deaktiviert'}`,
    enabled: !!enabled
  });
});

// Device Status abrufen (PWM, RPM, etc.)
router.get('/controls/device-state', optionalAuth, async (req, res, next) => {
  try {
    const DeviceState = require('../models/DeviceState');
    const state = await DeviceState.getLatest();

    res.json({
      success: true,
      data: state || {
        relays: {},
        pwm: { fan_exhaust: 0, grow_light: 0 },
        feedback: { fan_exhaust_rpm: 0 },
        rj11: { enabled: false, dimLevel: 100, mode: 'off' }
      }
    });
  } catch (error) {
    next(error);
  }
});

// ESP Neustart (Reboot)
router.post('/system/reboot', optionalAuth, (req, res) => {
  mqttService.publish(TOPIC_COMMAND, JSON.stringify({ action: 'reboot' }));
  console.log("🔄 Reboot Befehl gesendet");
  res.json({
    success: true,
    message: "Reboot initiiert"
  });
});

// ESP Factory Reset
router.post('/system/reset', optionalAuth, (req, res) => {
  mqttService.publish(TOPIC_COMMAND, JSON.stringify({ action: 'factory_reset' }));
  console.log("⚠️ Factory Reset Befehl gesendet");
  res.json({
    success: true,
    message: "Reset initiiert"
  });
});

// ==========================================
// 7. PUSH-NOTIFICATIONS (Public - optional auth)
// ==========================================
router.post('/notifications/subscribe', optionalAuth, notificationController.subscribe);
router.post('/notifications/unsubscribe', optionalAuth, notificationController.unsubscribe);
router.post('/notifications/test', optionalAuth, notificationController.sendTest);
router.get('/notifications/public-key', notificationController.getPublicKey); // Public
router.get('/notifications/stats', optionalAuth, notificationController.getStats);
router.post('/notifications/cleanup', optionalAuth, notificationController.cleanup);

// ==========================================
// 8. WETTER-API (Public mit optionalAuth)
// ==========================================
router.get('/weather/current', optionalAuth, weatherController.getCurrent);
router.get('/weather/forecast', optionalAuth, weatherController.getForecast);
router.get('/weather/recommendations', optionalAuth, weatherController.getRecommendations);

// ==========================================
// 9. GROW-REZEPTE (Public - optional auth)
// ==========================================
router.get('/recipes', optionalAuth, recipeController.getAll);
router.get('/recipes/:id', optionalAuth, validateObjectId('id'), recipeController.getById);
router.post('/recipes', optionalAuth, recipeController.create);
router.put('/recipes/:id', optionalAuth, validateObjectId('id'), recipeController.update);
router.delete('/recipes/:id', optionalAuth, validateObjectId('id'), recipeController.delete);
router.post('/recipes/:id/use', optionalAuth, validateObjectId('id'), recipeController.use);
router.post('/recipes/:id/like', optionalAuth, validateObjectId('id'), recipeController.like);

// ==========================================
// 10. ANALYTICS & AI (Public - optional auth)
// ==========================================
router.get('/analytics/anomalies', optionalAuth, analyticsController.getAnomalies);
router.get('/analytics/predictions', optionalAuth, analyticsController.getPredictions);
router.get('/analytics/optimizations', optionalAuth, analyticsController.getOptimizations);

// ==========================================
// 11. NÄHRSTOFF-MANAGEMENT (Public - optional auth)
// ==========================================
router.use('/nutrients', nutrientRoutes);

// ==========================================
// 12. VPD-STEUERUNG (Public - optional auth)
// ==========================================
router.use('/vpd', vpdRoutes);

// ==========================================
// 13. EC/pH SENSOREN (Public - optional auth)
// ==========================================
router.use('/sensors', sensorRoutes);

// ==========================================
// 14. TIMELAPSE (Public - optional auth)
// ==========================================
router.use('/timelapse', timelapseRoutes);

// ==========================================
// 15. QUICK ACTIONS (Public - optional auth)
// ==========================================
router.post('/quick-actions/fan', optionalAuth, quickActionController.setFan);
router.post('/quick-actions/light', optionalAuth, quickActionController.setLight);
router.post('/quick-actions/humidifier', optionalAuth, quickActionController.setHumidifier);
router.post('/quick-actions/vpd-optimize', optionalAuth, quickActionController.optimizeVPD);
router.post('/quick-actions/nutrients', optionalAuth, quickActionController.doseNutrients);
router.post('/quick-actions/emergency-stop', optionalAuth, quickActionController.emergencyStop);
router.get('/quick-actions/history', optionalAuth, quickActionController.getHistory);

module.exports = router;
