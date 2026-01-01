const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const connectDB = require('./config/db'); // 1. DB Konfiguration importieren
require('./services/mqttService'); // Startet MQTT

// 2. Datenbankverbindung initialisieren
// Das hat gefehlt! Ohne das weiß der Server nicht, wo er speichern soll.
connectDB();

const app = express();
const server = http.createServer(app);

// 1. CORS erlauben (Wichtig für Frontend-Verbindung)
app.use(cors({
  origin: "*", // Erlaubt Zugriff von überall (Handy, PC, etc.)
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// 2. Socket.io (Echtzeit-Verbindung) konfigurieren
const io = new Server(server, {
  cors: {
    origin: "*", // WICHTIG: Erlaubt dem Frontend die Verbindung
    methods: ["GET", "POST"]
  }
});

// Wenn sich ein Browser verbindet
io.on('connection', (socket) => {
  console.log('?? Frontend verbunden:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('?? Frontend getrennt:', socket.id);
  });
});

// MQTT Daten an das Frontend weiterleiten (Brücke)
const { client: mqttClient } = require('./services/mqttService');
mqttClient.on('message', (topic, message) => {
  if (topic.includes('/data')) {
    try {
      const data = JSON.parse(message.toString());
      // Sende Daten per Websocket an alle verbundenen Browser
      io.emit('sensorData', data);
    } catch (e) {}
  }
});

// API Routen
app.use('/api', apiRoutes);

// Server starten
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ?? Server läuft!
  ---------------------------------------
  Lokal:   http://localhost:${PORT}
  Netzwerk: http://<DEINE-PC-IP>:${PORT}
  ---------------------------------------
  `);
});