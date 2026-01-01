const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { sanitizeInput } = require('./middleware/validation');
require('dotenv').config();
require('./services/mqttService'); // Startet MQTT

// Datenbankverbindung initialisieren
connectDB().then(() => {
  // Initialisiere Grow-Rezept Templates nach erfolgreicher DB-Verbindung
  const recipeController = require('./controllers/recipeController');
  recipeController.initializeTemplates();
});

const app = express();
const server = http.createServer(app);

// ========================================
// 🔒 SECURITY MIDDLEWARE
// ========================================

// 1. Helmet - Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Deaktiviert für Socket.io
  crossOriginEmbedderPolicy: false
}));

// 2. CORS - Beschränkt auf Frontend-URL
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Erlaube Requests ohne Origin (z.B. mobile Apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked request from: ${origin}`);
      callback(new Error('CORS-Fehler: Zugriff von dieser Domain nicht erlaubt'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true
}));

// 3. Rate Limiting - Schutz vor Brute-Force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100, // Max 100 Requests pro IP
  message: {
    success: false,
    message: 'Zu viele Anfragen von dieser IP, bitte versuche es in 15 Minuten erneut'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strengeres Limit für Auth-Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 Login-Versuche in 15 Minuten
  message: {
    success: false,
    message: 'Zu viele Login-Versuche, bitte versuche es in 15 Minuten erneut'
  },
  skipSuccessfulRequests: true // Erfolgreiche Requests nicht zählen
});

// Rate Limiter anwenden
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Input Sanitization - NoSQL Injection Schutz
app.use(sanitizeInput);

// ========================================
// 🔌 SOCKET.IO - Echtzeit-Verbindung
// ========================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Gleiche CORS-Regeln wie für REST API
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Wenn sich ein Browser verbindet
io.on('connection', (socket) => {
  console.log('?? Frontend verbunden:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('?? Frontend getrennt:', socket.id);
  });
});

// MQTT Daten an das Frontend weiterleiten (Br�cke)
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

// ========================================
// 📡 API ROUTEN
// ========================================
app.use('/api', apiRoutes);

// ========================================
// ⚠️ ERROR HANDLING
// ========================================
// 404 Handler (muss NACH allen Routes kommen)
app.use(notFoundHandler);

// Zentraler Error Handler (muss als LETZTES kommen)
app.use(errorHandler);

// ========================================
// 🚀 SERVER STARTEN
// ========================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ✅ Grow Monitoring System Server läuft!
  ========================================
  🌐 Lokal:     http://localhost:${PORT}
  🌍 Netzwerk:  http://<DEINE-PC-IP>:${PORT}
  🔒 Security:  Helmet, CORS, Rate-Limiting ✓
  🔐 Auth:      JWT-Authentifizierung ✓
  📊 Database:  MongoDB verbunden ✓
  ========================================
  Environment: ${process.env.NODE_ENV || 'development'}
  `);
});