const mqtt = require('mqtt');

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

client.on('connect', () => {
  console.log('✅ MQTT Verbunden (Cloud)');
  // Wir abonnieren nur UNSER Topic
  client.subscribe(TOPIC_DATA, (err) => {
    if(!err) console.log(`📡 Höre auf ${TOPIC_DATA}`);
  });
});

client.on('message', async (topic, message) => {
  if (topic === TOPIC_DATA) {
    try {
      const data = JSON.parse(message.toString());
      // Daten speichern
      try {
        const { saveSensorData } = require('../controllers/dataController');
        if (typeof saveSensorData === 'function') {
          await saveSensorData(data);
          // console.log("Sensordaten empfangen & gespeichert");
        }
      } catch (e) { console.error("Controller Error:", e.message); }
    } catch (e) { console.error("JSON Parse Error:", e.message); }
  }
});

const publish = (topic, message) => {
  if (client.connected) {
    client.publish(topic, typeof message === 'object' ? JSON.stringify(message) : message);
  }
};

module.exports = { client, publish };