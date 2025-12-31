require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const setupWebSocket = require('./config/websocket');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/apiRoutes'); // <--- NEU: Import

const app = express();
const server = http.createServer(app);

// Datenbank verbinden
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routen einbinden
app.use('/api', apiRoutes); // <--- NEU: Alle Routen unter /api verfügbar machen

// Basis Route
app.get('/', (req, res) => {
  res.send('Grow System Backend v1.1 läuft!');
});

setupWebSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server läuft auf Port ${PORT}`);
});