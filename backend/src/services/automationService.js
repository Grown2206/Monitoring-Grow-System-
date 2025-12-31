const { sendAlert } = require('./notificationService');

// --- STATUS SPEICHER ---
let lastWatering = { 1: 0, 2: 0 };
let lastLightState = null;      // Damit wir nicht unnötig Befehle senden
let manualOverrideUntil = 0;    // Timestamp: Bis wann ist Automatik pausiert?

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

// Helper: VPD Berechnung
const calculateVPD = (temp, humidity) => {
  if (!temp || !humidity) return 0;
  const svp = 0.61078 * Math.exp((17.27 * temp) / (temp + 237.3));
  return svp * (1 - humidity / 100);
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
const checkAutomationRules = (sensorData, espSocket, broadcast) => {
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

  // 4. VPD LÜFTER STEUERUNG
  checkEnvironmentalControl(sensorData, espSocket);

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

const checkEnvironmentalControl = (data, socket) => {
  const vpd = calculateVPD(data.temp, data.humidity);
  
  if (vpd < autoConfig.vpdMin) {
      socket.send(JSON.stringify({ command: "FAN_EXHAUST", state: true }));
  } else if (vpd > autoConfig.vpdMax) {
      socket.send(JSON.stringify({ command: "FAN_EXHAUST", state: false }));
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