const { sendAlert } = require('./notificationService');
const VPDConfig = require('../models/VPDConfig');
const vpdService = require('./vpdService');

// Lazy-load MQTT client to avoid circular dependency
let mqttClient = null;
const getMQTTClient = () => {
  if (!mqttClient) {
    try {
      const mqttService = require('./mqttService');
      mqttClient = mqttService.client;
    } catch (e) {
      console.error('⚠️ MQTT Client nicht verfügbar:', e.message);
    }
  }
  return mqttClient;
};

// --- STATUS SPEICHER ---
let lastWatering = { 1: 0, 2: 0 };
let lastLightState = null;      // Damit wir nicht unnötig Befehle senden
let manualOverrideUntil = 0;    // Timestamp: Bis wann ist Automatik pausiert?

// VPD Control State
let lastVPDUpdate = 0;          // Timestamp der letzten VPD-Anpassung
let currentFanSpeed = 50;       // Aktuelle Lüftergeschwindigkeit (0-100)
let lastVPD = null;             // Letzter VPD-Wert

// --- DYNAMISCHE KONFIGURATION ---
// Diese Werte können jetzt zur Laufzeit geändert werden (z.B. via App)
let autoConfig = {
  cooldownMinutes: 60,      // Gieß-Pause
  dryThreshold: 30,         // Gieß-Start bei %
  manualPauseMinutes: 30,   // Pause nach manuellem Eingriff
  
  lightStartHour: 6,        // 06:00 Uhr
  lightDuration: 18,        // 18h (Vegetation)
  
  vpdMin: 0.8,              // kPa
  vpdMax: 1.2,              // kPa
  
  maxTempSafe: 40.0,        // °C Not-Aus
  maxGasSafe: 3500          // Raw Not-Aus
};

// Helper: VPD Berechnung (Deprecated - use vpdService.calculateVPD instead)
// Kept for backward compatibility with autoConfig
const calculateVPD = (temp, humidity) => {
  return vpdService.calculateVPD(temp, humidity);
};

// --- EXTERNE FUNKTION: MANUELLER EINGRIFF ---
// Muss aufgerufen werden, wenn User im Frontend einen Button drückt
const notifyManualAction = () => {
  manualOverrideUntil = Date.now() + (autoConfig.manualPauseMinutes * 60 * 1000);
  console.log(`🖐️ Manuelle Steuerung erkannt. Automatik pausiert für ${autoConfig.manualPauseMinutes} Min.`);
};

// --- EXTERNE FUNKTION: CONFIG UPDATE ---
// Wird aufgerufen, wenn User Einstellungen in der App ändert
const updateAutomationConfig = (newConfig) => {
  autoConfig = { ...autoConfig, ...newConfig };
  console.log("⚙️ Automation Config aktualisiert:", autoConfig);
};

const getAutomationConfig = () => autoConfig;

// --- HAUPTFUNKTION ---
const checkAutomationRules = async (sensorData, espSocket, broadcast) => {
  if (!espSocket) return;

  // 1. SAFETY CHECK (Priorität 1: Immer aktiv, auch bei manuellem Override!)
  if (checkSafetyRules(sensorData, espSocket, broadcast)) {
    return;
  }

  // 2. MANUELLER OVERRIDE PRÜFEN
  if (Date.now() < manualOverrideUntil) {
    // Optional: Frontend informieren, dass Automatik pausiert ist
    return;
  }

  // 3. LICHT ZEITSTEUERUNG
  checkLightSchedule(espSocket);

  // 4. VPD LÜFTER STEUERUNG (Async - Advanced PID Control)
  await checkEnvironmentalControl(sensorData, espSocket);

  // 5. BEWÄSSERUNG
  checkGroup(1, [sensorData.soil[0], sensorData.soil[1], sensorData.soil[2]], espSocket);
  checkGroup(2, [sensorData.soil[3], sensorData.soil[4], sensorData.soil[5]], espSocket);
};

// --- SUBSYSTEME ---

const checkSafetyRules = (data, socket, broadcast) => {
  let safetyTriggered = false;
  let reason = "";

  if (data.temp > autoConfig.maxTempSafe) {
    reason = `🔥 KRITISCHE HITZE: ${data.temp}°C`;
    safetyTriggered = true;
  } else if (data.gas > autoConfig.maxGasSafe) {
    reason = `☠️ GAS/RAUCH ALARM: Level ${data.gas}`;
    safetyTriggered = true;
  }

  if (safetyTriggered) {
    console.log(`🚨 SAFETY TRIGGER: ${reason}. Not-Aus aktiviert!`);
    
    const offCmd = (cmd) => JSON.stringify({ command: cmd, state: false });
    
    socket.send(offCmd("LIGHT"));
    socket.send(JSON.stringify({ command: "PUMP", id: 1, state: false }));
    socket.send(JSON.stringify({ command: "PUMP", id: 2, state: false }));
    socket.send(offCmd("FAN_INTAKE"));
    socket.send(offCmd("FAN_EXHAUST"));
    socket.send(offCmd("HUMID"));

    if (broadcast) {
        broadcast({
            type: 'alert',
            level: 'critical',
            message: `NOT-AUS AKTIVIERT: ${reason}`
        });
    }
    sendAlert("🚨 SYSTEM NOT-AUS", `Das System wurde abgeschaltet.\nGrund: **${reason}**`, 0xFF0000);
    
    return true;
  }
  return false;
};

const checkLightSchedule = (socket) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Berechnung des End-Zeitpunkts
    const endHour = (autoConfig.lightStartHour + autoConfig.lightDuration) % 24;
    
    let shouldBeOn = false;
    
    if (autoConfig.lightStartHour < endHour) {
        // Gleicher Tag (z.B. 06:00 bis 22:00)
        shouldBeOn = currentHour >= autoConfig.lightStartHour && currentHour < endHour;
    } else {
        // Über Mitternacht (z.B. 18:00 bis 12:00)
        shouldBeOn = currentHour >= autoConfig.lightStartHour || currentHour < endHour;
    }

    // Nur senden, wenn sich der Zustand ändert (vermeidet Traffic)
    if (lastLightState !== shouldBeOn) {
        console.log(`💡 AUTO: Licht Zeitplan -> ${shouldBeOn ? 'AN' : 'AUS'} (${currentHour}:00 Uhr)`);
        socket.send(JSON.stringify({ command: "LIGHT", state: shouldBeOn }));
        lastLightState = shouldBeOn;
    }
};

const checkEnvironmentalControl = async (data, socket) => {
  try {
    // VPD-Config aus DB holen
    const vpdConfig = await VPDConfig.getOrCreate();

    // Prüfen ob Auto-VPD aktiviert ist
    if (!vpdConfig.enabled) {
      // Fallback auf alte einfache Steuerung
      const vpd = vpdService.calculateVPD(data.temp, data.humidity);
      if (vpd < autoConfig.vpdMin) {
        socket.send(JSON.stringify({ command: "FAN_EXHAUST", state: true }));
      } else if (vpd > autoConfig.vpdMax) {
        socket.send(JSON.stringify({ command: "FAN_EXHAUST", state: false }));
      }
      return;
    }

    const now = Date.now();

    // Update-Intervall prüfen (Standard: 30 Sekunden)
    const timeSinceLastUpdate = (now - lastVPDUpdate) / 1000;
    if (timeSinceLastUpdate < vpdConfig.updateInterval) {
      return; // Noch nicht Zeit für Update
    }

    // VPD berechnen
    const currentVPD = vpdService.calculateVPD(data.temp, data.humidity);
    if (!currentVPD) {
      console.log('⚠️ VPD: Keine gültigen Sensordaten');
      return;
    }

    // Zielbereich ermitteln
    const targetRange = vpdConfig.targetRange;

    // Hysterese prüfen - verhindert zu häufige Anpassungen
    if (vpdConfig.hysteresis.enabled && lastVPD !== null) {
      const vpdChange = Math.abs(currentVPD - lastVPD);
      const timeSinceChange = (now - lastVPDUpdate) / 1000;

      if (vpdChange < vpdConfig.hysteresis.threshold &&
          timeSinceChange < vpdConfig.hysteresis.minTimeBetweenChanges) {
        return; // Änderung zu gering oder zu früh
      }
    }

    // Analyse durchführen
    const analysis = vpdService.analyzeVPD(currentVPD, targetRange);

    // Notfall-Modi prüfen
    if (vpdConfig.emergency.enabled) {
      if (currentVPD < vpdConfig.emergency.criticalLowVPD.threshold) {
        handleEmergencyVPD('low', currentVPD, vpdConfig);
        lastVPDUpdate = now;
        lastVPD = currentVPD;
        return;
      }
      if (currentVPD > vpdConfig.emergency.criticalHighVPD.threshold) {
        handleEmergencyVPD('high', currentVPD, vpdConfig);
        lastVPDUpdate = now;
        lastVPD = currentVPD;
        return;
      }
    }

    // Neue Fan-Geschwindigkeit berechnen (PID-Controller)
    const newFanSpeed = vpdService.calculateFanSpeed(
      currentVPD,
      targetRange,
      currentFanSpeed,
      vpdConfig.aggressiveness
    );

    // Fan-Limits anwenden
    const limitedFanSpeed = Math.max(
      vpdConfig.fanLimits.min,
      Math.min(vpdConfig.fanLimits.max, newFanSpeed)
    );

    // Nur senden wenn sich Geschwindigkeit geändert hat
    if (limitedFanSpeed !== currentFanSpeed) {
      // MQTT-Command an ESP32 senden
      const client = getMQTTClient();
      if (client) {
        client.publish('grow_drexl_v2/command', JSON.stringify({
          action: 'set_fan_pwm',
          value: limitedFanSpeed
        }));
      }

      console.log(`🌡️ VPD: ${currentVPD.toFixed(2)} kPa (${analysis.status}) → Fan: ${currentFanSpeed}% → ${limitedFanSpeed}%`);

      // Statistiken aktualisieren
      vpdConfig.updateStatistics(currentVPD, analysis.inRange);
      vpdConfig.logAction(currentVPD, limitedFanSpeed, `${analysis.status}: ${analysis.recommendation}`);

      // Logging
      if (vpdConfig.logging.enabled && vpdConfig.logging.logChanges) {
        console.log(`📊 VPD-Anpassung: VPD=${currentVPD.toFixed(2)} kPa, Fan=${limitedFanSpeed}%, Status=${analysis.status}`);
      }

      // Speichern
      await vpdConfig.save();

      currentFanSpeed = limitedFanSpeed;
    }

    lastVPDUpdate = now;
    lastVPD = currentVPD;

  } catch (error) {
    console.error('❌ VPD Control Error:', error);
  }
};

// Notfall-Handler für kritische VPD-Werte
const handleEmergencyVPD = (type, vpd, config) => {
  const emergency = type === 'low'
    ? config.emergency.criticalLowVPD
    : config.emergency.criticalHighVPD;

  console.log(`🚨 VPD EMERGENCY: ${type.toUpperCase()} - ${vpd.toFixed(2)} kPa`);

  const client = getMQTTClient();

  switch (emergency.action) {
    case 'min_fan':
      currentFanSpeed = config.fanLimits.min;
      if (client) {
        client.publish('grow_drexl_v2/command', JSON.stringify({
          action: 'set_fan_pwm',
          value: config.fanLimits.min
        }));
      }
      console.log(`🔧 Emergency: Fan auf Minimum (${config.fanLimits.min}%)`);
      break;

    case 'max_fan':
      currentFanSpeed = config.fanLimits.max;
      if (client) {
        client.publish('grow_drexl_v2/command', JSON.stringify({
          action: 'set_fan_pwm',
          value: config.fanLimits.max
        }));
      }
      console.log(`🔧 Emergency: Fan auf Maximum (${config.fanLimits.max}%)`);
      break;

    case 'disable':
      config.enabled = false;
      config.save();
      console.log('🔧 Emergency: Auto-VPD deaktiviert');
      break;

    case 'alert_only':
      console.log('🔧 Emergency: Nur Alert, keine Aktion');
      break;
  }

  // Benachrichtigung senden
  if (config.notifications.enabled && config.notifications.onCritical) {
    sendAlert(
      `🚨 Kritisches VPD: ${type === 'low' ? 'Zu niedrig' : 'Zu hoch'}`,
      `VPD: **${vpd.toFixed(2)} kPa**\nAktion: ${emergency.action}`,
      type === 'low' ? 0xFFA500 : 0xFF0000
    );
  }
};

const checkGroup = (pumpId, moistures, socket) => {
  const validReadings = moistures.filter(m => m > 1 && m <= 100);
  if (validReadings.length === 0) return;

  const avg = validReadings.reduce((a, b) => a + b, 0) / validReadings.length;

  if (avg < autoConfig.dryThreshold) {
    const now = Date.now();
    const lastRun = lastWatering[pumpId];
    
    if (now - lastRun > autoConfig.cooldownMinutes * 60 * 1000) {
      console.log(`🤖 AUTO: Gruppe ${pumpId} zu trocken (${avg.toFixed(1)}%). Starte Pumpe!`);
      
      socket.send(JSON.stringify({ command: "PUMP", id: pumpId, state: true }));
      
      sendAlert(
        `💧 Automatische Bewässerung (Pumpe ${pumpId})`,
        `Durchschnittsfeuchte: **${avg.toFixed(1)}%**`,
        0x3498DB
      );

      lastWatering[pumpId] = now;
    }
  }
};

module.exports = { checkAutomationRules, notifyManualAction, updateAutomationConfig, getAutomationConfig };