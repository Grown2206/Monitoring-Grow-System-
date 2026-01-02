const mqtt = require('mqtt');
const { checkAutomationRules } = require('./automationService');

// Öffentlicher Broker
const BROKER_URL = 'mqtt://test.mosquitto.org';

const options = {
  reconnectPeriod: 5000,
  connectTimeout: 30000,
  clientId: 'backend_drexl_' + Math.random().toString(16).substr(2, 8)
};

console.log(`Verbinde zu öffentlichem Broker: ${BROKER_URL}`);
const client = mqtt.connect(BROKER_URL, options);

// Topic Definitionen (MÜSSEN MIT ARDUINO ÜBEREINSTIMMEN)
const TOPIC_DATA = 'grow_drexl_v2/data';
const TOPIC_NUTRIENT_STATUS = 'grow/esp32/nutrients/status';
const TOPIC_NUTRIENT_SENSORS = 'grow/esp32/nutrients/sensors';

client.on('connect', () => {
  console.log('✅ MQTT Verbunden (Cloud)');
  // Wir abonnieren alle Topics
  client.subscribe(TOPIC_DATA, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPIC_DATA}`);
  });
  client.subscribe(TOPIC_NUTRIENT_STATUS, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPIC_NUTRIENT_STATUS}`);
  });
  client.subscribe(TOPIC_NUTRIENT_SENSORS, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPIC_NUTRIENT_SENSORS}`);
  });
});

// Lazy-Load io instance to avoid circular dependency
let io = null;
const getIO = () => {
  if (!io) {
    try {
      const server = require('../server');
      io = server.io;
    } catch (e) {
      // Server not yet initialized
    }
  }
  return io;
};

client.on('message', async (topic, message) => {
  if (topic === TOPIC_DATA) {
    try {
      const data = JSON.parse(message.toString());

      // Daten in DB speichern
      try {
        const { saveSensorData } = require('../controllers/dataController');
        if (typeof saveSensorData === 'function') {
          await saveSensorData(data);
          // console.log("Sensordaten empfangen & gespeichert");
        }
      } catch (e) { console.error("Controller Error:", e.message); }

      // Broadcast an alle Socket.io Clients
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('sensorData', data);
      }

      // Trigger Automation Rules (VPD Control, etc.)
      // Mock ESP32 socket mit publish-Funktion für MQTT-Befehle
      const mockESP32Socket = {
        send: (msg) => {
          // Konvertiere WebSocket-Befehle zu MQTT-Befehlen
          try {
            const cmd = JSON.parse(msg);
            client.publish('grow_drexl_v2/command', JSON.stringify(cmd));
          } catch (e) {
            console.error('❌ Mock Socket Error:', e.message);
          }
        }
      };

      // Automation Rules ausführen (inkl. VPD Control)
      await checkAutomationRules(data, mockESP32Socket, (msg) => {
        if (socketIO) {
          socketIO.emit('automation', msg);
        }
      });
    } catch (e) { console.error("JSON Parse Error:", e.message); }
  }
  else if (topic === TOPIC_NUTRIENT_STATUS) {
    try {
      const data = JSON.parse(message.toString());
      console.log('🧪 Nährstoff-Status:', data);

      // Broadcast an alle Socket.io Clients für Live-Updates
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('nutrientStatus', data);
      }
    } catch (e) { console.error("Nutrient Status Parse Error:", e.message); }
  }
  else if (topic === TOPIC_NUTRIENT_SENSORS) {
    try {
      const data = JSON.parse(message.toString());
      console.log('🧪 Nährstoff-Sensoren:', data);

      // Save to database if EC/pH data is present
      if (data.ec !== undefined && data.ph !== undefined) {
        try {
          const NutrientReading = require('../models/NutrientReading');

          const reading = new NutrientReading({
            ec: {
              value: data.ec,
              unit: data.ecUnit || 'mS/cm',
              compensated: data.tempCompensated || false
            },
            ph: {
              value: data.ph,
              temperature: data.temp || data.temperature
            },
            temperature: data.temp || data.temperature || 25,
            reservoir: {
              id: data.reservoirId || 'main',
              level: data.reservoirLevel_percent || data.reservoirLevel || 0,
              volume: data.reservoirVolume
            },
            quality: {
              ecValid: data.ecValid !== false,
              phValid: data.phValid !== false,
              calibrated: data.calibrated || false
            },
            source: 'esp32'
          });

          // Check thresholds
          const DEFAULT_THRESHOLDS = {
            ec: { min: 0.8, max: 2.5, critical: { min: 0.5, max: 3.5 } },
            ph: { min: 5.5, max: 6.5, critical: { min: 4.5, max: 7.5 } },
            temperature: { max: 28, critical: 32 },
            reservoir: { minLevel: 20 }
          };
          reading.checkThresholds(DEFAULT_THRESHOLDS);

          await reading.save();
          console.log(`💾 EC/pH Reading saved: EC=${data.ec} pH=${data.ph}`);
        } catch (dbError) {
          console.error('❌ Error saving nutrient reading:', dbError.message);
        }
      }

      // Broadcast an alle Socket.io Clients
      const socketIO = getIO();
      if (socketIO) {
        socketIO.emit('nutrientSensors', data);
      }
    } catch (e) { console.error("Nutrient Sensors Parse Error:", e.message); }
  }
});

const publish = (topic, message) => {
  if (client.connected) {
    client.publish(topic, typeof message === 'object' ? JSON.stringify(message) : message);
  }
};

module.exports = { client, publish };